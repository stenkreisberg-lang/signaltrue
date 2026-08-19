/**
 * Working schedule normalisation (spec §11.1).
 *
 * After-Hours Activity only means something against the hours a person is
 * actually expected to work. A 20:00 event is after-hours for a 9–5 team in
 * Sydney and inside the window for someone on a flexible schedule — so every
 * timestamp is resolved against a schedule before it is classified.
 *
 * Local time is derived through Intl with an IANA zone rather than a stored
 * offset, which is what makes daylight saving work without a special case.
 */

import WorkingSchedule from '../../models/controlReview/workingSchedule.js';
import HsDeploymentConfig from '../../models/controlReview/deploymentConfig.js';

const DEFAULT_DAYS = [
  { dayOfWeek: 0, working: false, startMinute: 540, endMinute: 1020 },
  { dayOfWeek: 1, working: true, startMinute: 540, endMinute: 1020 },
  { dayOfWeek: 2, working: true, startMinute: 540, endMinute: 1020 },
  { dayOfWeek: 3, working: true, startMinute: 540, endMinute: 1020 },
  { dayOfWeek: 4, working: true, startMinute: 540, endMinute: 1020 },
  { dayOfWeek: 5, working: true, startMinute: 540, endMinute: 1020 },
  { dayOfWeek: 6, working: false, startMinute: 540, endMinute: 1020 },
];

export const DEFAULT_SCHEDULE = {
  // Neutral fallback only. A tenant's real zone comes from its deployment
  // config or an explicit WorkingSchedule; assuming a country here would
  // silently misclassify after-hours activity for everyone else.
  timezone: 'UTC',
  days: DEFAULT_DAYS,
  flexible: { enabled: false, earliestMinute: 360, latestMinute: 1260 },
  publicHolidays: [],
};

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const formatterCache = new Map();

function getFormatter(timezone) {
  if (!formatterCache.has(timezone)) {
    formatterCache.set(
      timezone,
      new Intl.DateTimeFormat('en-AU', {
        timeZone: timezone,
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
    );
  }
  return formatterCache.get(timezone);
}

/**
 * Resolve a UTC instant into wall-clock parts in the schedule's timezone.
 * Returns { dayOfWeek, minuteOfDay, isoDate }.
 */
export function toLocalParts(date, timezone = DEFAULT_SCHEDULE.timezone) {
  let parts;
  try {
    parts = getFormatter(timezone).formatToParts(date);
  } catch {
    parts = getFormatter(DEFAULT_SCHEDULE.timezone).formatToParts(date);
  }
  const lookup = {};
  for (const part of parts) lookup[part.type] = part.value;

  const hour = Number(lookup.hour);
  const minute = Number(lookup.minute);

  return {
    dayOfWeek: WEEKDAY_INDEX[lookup.weekday] ?? 0,
    minuteOfDay: (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0),
    isoDate: `${lookup.year}-${lookup.month}-${lookup.day}`,
  };
}

function normaliseSchedule(doc, fallbackTimezone = DEFAULT_SCHEDULE.timezone) {
  if (!doc) return { ...DEFAULT_SCHEDULE, timezone: fallbackTimezone };
  return {
    timezone: doc.timezone || fallbackTimezone,
    days: doc.days?.length ? doc.days : DEFAULT_DAYS,
    flexible: doc.flexible || DEFAULT_SCHEDULE.flexible,
    publicHolidays: doc.publicHolidays || [],
  };
}

/**
 * Resolve the schedule that applies to a person, falling back to their team
 * and then to the organisation default. Person-level schedules exist for
 * calculation only — they are never rendered in the H&S UI (§22).
 */
export async function tenantTimezone(tenantId) {
  if (!tenantId) return DEFAULT_SCHEDULE.timezone;
  try {
    const config = await HsDeploymentConfig.findOne({ tenantId })
      .select('defaultTimezone')
      .lean();
    return config?.defaultTimezone || DEFAULT_SCHEDULE.timezone;
  } catch {
    return DEFAULT_SCHEDULE.timezone;
  }
}

export async function resolveSchedule({ tenantId, teamId = null, personId = null, at = new Date() }) {
  const timeFilter = {
    effectiveFrom: { $lte: at },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: at } }],
  };

  const fallbackTimezone = await tenantTimezone(tenantId);

  if (personId) {
    const personal = await WorkingSchedule.findOne({
      tenantId,
      scope: 'PERSON',
      personId,
      ...timeFilter,
    }).lean();
    if (personal) return normaliseSchedule(personal, fallbackTimezone);
  }

  if (teamId) {
    const team = await WorkingSchedule.findOne({
      tenantId,
      scope: 'TEAM',
      teamId,
      ...timeFilter,
    }).lean();
    if (team) return normaliseSchedule(team, fallbackTimezone);
  }

  const org = await WorkingSchedule.findOne({ tenantId, scope: 'ORG', ...timeFilter }).lean();
  return normaliseSchedule(org, fallbackTimezone);
}

/**
 * Load one schedule per person in a team in a single pass, so metric
 * calculation does not issue a query per event.
 */
export async function buildScheduleResolver({ tenantId, teamId, personIds = [], at = new Date() }) {
  const timeFilter = {
    effectiveFrom: { $lte: at },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: at } }],
  };

  const [fallbackTimezone, orgDoc, teamDoc, personDocs] = await Promise.all([
    tenantTimezone(tenantId),
    WorkingSchedule.findOne({ tenantId, scope: 'ORG', ...timeFilter }).lean(),
    teamId ? WorkingSchedule.findOne({ tenantId, scope: 'TEAM', teamId, ...timeFilter }).lean() : null,
    personIds.length
      ? WorkingSchedule.find({
          tenantId,
          scope: 'PERSON',
          personId: { $in: personIds },
          ...timeFilter,
        }).lean()
      : [],
  ]);

  const fallback = normaliseSchedule(teamDoc || orgDoc, fallbackTimezone);
  const byPerson = new Map();
  for (const doc of personDocs) {
    byPerson.set(String(doc.personId), normaliseSchedule(doc, fallbackTimezone));
  }

  return function scheduleFor(personId) {
    if (!personId) return fallback;
    return byPerson.get(String(personId)) || fallback;
  };
}

/**
 * Is this instant inside the person's configured working window?
 *
 * A flexible schedule widens the window rather than pinning start and end
 * times, so a worker active at 20:00 within a configured flexible window is
 * not counted as after-hours (§37).
 */
export function isWithinSchedule(date, schedule = DEFAULT_SCHEDULE) {
  const { dayOfWeek, minuteOfDay, isoDate } = toLocalParts(date, schedule.timezone);

  if (schedule.publicHolidays?.includes(isoDate)) return false;

  const day = (schedule.days || DEFAULT_DAYS).find((d) => d.dayOfWeek === dayOfWeek);
  if (!day || !day.working) return false;

  if (schedule.flexible?.enabled) {
    return (
      minuteOfDay >= (schedule.flexible.earliestMinute ?? 0) &&
      minuteOfDay < (schedule.flexible.latestMinute ?? 1440)
    );
  }

  return minuteOfDay >= day.startMinute && minuteOfDay < day.endMinute;
}

export function isAfterHours(date, schedule = DEFAULT_SCHEDULE) {
  return !isWithinSchedule(date, schedule);
}

/**
 * Scheduled working minutes for one local day, used as the denominator for
 * Uninterrupted Calendar Availability.
 */
export function scheduledMinutesForDay(dayOfWeek, isoDate, schedule = DEFAULT_SCHEDULE) {
  if (schedule.publicHolidays?.includes(isoDate)) return 0;
  const day = (schedule.days || DEFAULT_DAYS).find((d) => d.dayOfWeek === dayOfWeek);
  if (!day || !day.working) return 0;
  if (schedule.flexible?.enabled) {
    // A flexible policy widens when work may happen, but the expected volume
    // of work is still the configured day length.
    return Math.max(0, day.endMinute - day.startMinute);
  }
  return Math.max(0, day.endMinute - day.startMinute);
}

/**
 * The working windows inside a period, as [startUtc, endUtc) pairs in the
 * schedule's local days. Used to intersect meetings with working time.
 */
export function workingWindows(periodStart, periodEnd, schedule = DEFAULT_SCHEDULE) {
  const windows = [];
  const stepMs = 24 * 60 * 60 * 1000;

  // Walk from one day before the period to absorb timezone offset at the edges.
  let cursor = new Date(periodStart.getTime() - stepMs);
  const limit = new Date(periodEnd.getTime() + stepMs);

  const seen = new Set();

  while (cursor <= limit) {
    const { dayOfWeek, isoDate } = toLocalParts(cursor, schedule.timezone);
    if (!seen.has(isoDate)) {
      seen.add(isoDate);
      const day = (schedule.days || DEFAULT_DAYS).find((d) => d.dayOfWeek === dayOfWeek);
      const isHoliday = schedule.publicHolidays?.includes(isoDate);
      if (day?.working && !isHoliday) {
        const startMinute = schedule.flexible?.enabled
          ? schedule.flexible.earliestMinute
          : day.startMinute;
        const endMinute = schedule.flexible?.enabled
          ? schedule.flexible.latestMinute
          : day.endMinute;

        const start = localDateTimeToUtc(isoDate, startMinute, schedule.timezone);
        const end = localDateTimeToUtc(isoDate, endMinute, schedule.timezone);
        if (start && end && end > periodStart && start < periodEnd) {
          windows.push({
            start: new Date(Math.max(start.getTime(), periodStart.getTime())),
            end: new Date(Math.min(end.getTime(), periodEnd.getTime())),
            isoDate,
            dayOfWeek,
          });
        }
      }
    }
    cursor = new Date(cursor.getTime() + stepMs);
  }

  return windows.sort((a, b) => a.start - b.start);
}

/**
 * Convert a local wall-clock date and minute-of-day in an IANA zone to a UTC
 * instant. Two correction passes settle the offset, including across a DST
 * boundary where the first guess lands in the wrong offset.
 */
export function localDateTimeToUtc(isoDate, minuteOfDay, timezone = DEFAULT_SCHEDULE.timezone) {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return null;

  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;

  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  for (let i = 0; i < 2; i += 1) {
    const parts = toLocalParts(guess, timezone);
    const guessedMinutes = parts.minuteOfDay;
    const guessedDate = parts.isoDate;

    const dayDeltaMs =
      (Date.UTC(year, month - 1, day) - Date.UTC(...guessedDate.split('-').map((v, idx) => (idx === 1 ? Number(v) - 1 : Number(v)))));
    const minuteDelta = minuteOfDay - guessedMinutes;

    if (dayDeltaMs === 0 && minuteDelta === 0) break;
    guess = new Date(guess.getTime() + dayDeltaMs + minuteDelta * 60 * 1000);
  }

  return guess;
}

export default {
  DEFAULT_SCHEDULE,
  toLocalParts,
  resolveSchedule,
  buildScheduleResolver,
  isWithinSchedule,
  isAfterHours,
  scheduledMinutesForDay,
  workingWindows,
  localDateTimeToUtc,
  weeklyPeriods,
  tenantTimezone,
};

/**
 * Weekly period boundaries anchored to local Monday 00:00 in the schedule's
 * timezone. Anchoring in local time keeps a week from bleeding an hour of the
 * next week in across a UTC offset.
 */
export function weeklyPeriods({ end = new Date(), weeks = 8, schedule = DEFAULT_SCHEDULE }) {
  const { isoDate, dayOfWeek } = toLocalParts(end, schedule.timezone);
  const daysSinceMonday = (dayOfWeek + 6) % 7;

  const thisMondayUtc = localDateTimeToUtc(isoDate, 0, schedule.timezone);
  const currentWeekStart = new Date(
    thisMondayUtc.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000
  );

  const periods = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const approxStart = new Date(currentWeekStart.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    // Re-anchor to local midnight so DST shifts do not drift the boundary.
    const startIso = toLocalParts(new Date(approxStart.getTime() + 12 * 60 * 60 * 1000), schedule.timezone)
      .isoDate;
    const periodStart = localDateTimeToUtc(startIso, 0, schedule.timezone);
    const approxEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endIso = toLocalParts(new Date(approxEnd.getTime() + 12 * 60 * 60 * 1000), schedule.timezone)
      .isoDate;
    const periodEnd = localDateTimeToUtc(endIso, 0, schedule.timezone);
    periods.push({ periodStart, periodEnd });
  }
  return periods;
}
