/**
 * P0 work-pattern metrics (spec §10).
 *
 * Everything here reads the content-free canonical WorkEvent layer. No message
 * body, email body or document content is touched, and no individual value
 * survives past aggregation — per-person intermediates exist only because you
 * cannot compute per-person meeting hours any other way (§22).
 *
 * Metric names matter. Blank calendar time is "Uninterrupted Calendar
 * Availability", never "focus time"; the cross-channel figure is only produced
 * when connector coverage actually supports it (§29).
 */

import WorkEvent from '../../models/workEvent.js';
import OrgUnit from '../../models/orgUnit.js';
import TeamWorkPatternMetric from '../../models/controlReview/teamMetric.js';
import { ALGORITHM_VERSION } from '../../models/controlReview/constants.js';
import {
  buildScheduleResolver,
  workingWindows,
  isWithinSchedule,
} from './workingScheduleService.js';
import { resolveMinGroupSize, resolveParentTeamId } from './hsPrivacyService.js';
import Team from '../../models/team.js';

const MEETING_EVENT_TYPES = ['meeting', 'meet_started'];
const CHAT_EVENT_TYPES = ['message'];
const EMAIL_EVENT_TYPES = ['email_sent', 'email_received'];
const CALL_EVENT_TYPES = ['meet_started'];

// Cross-channel Uninterrupted Work Window needs calendar plus at least one
// messaging connector, and enough of each, before the name is honest.
const CROSS_CHANNEL_COVERAGE_THRESHOLD = 0.6;

// An interruption is assumed to cost this much contiguous time. Configurable
// rather than a claim about attention research.
const INTERRUPTION_COST_MINUTES = 15;

function classify(event) {
  const type = event.eventType;
  if (MEETING_EVENT_TYPES.includes(type) && event.metadata?.startTime) return 'MEETING';
  if (CHAT_EVENT_TYPES.includes(type)) return 'CHAT';
  if (EMAIL_EVENT_TYPES.includes(type)) return 'EMAIL';
  if (CALL_EVENT_TYPES.includes(type)) return 'CALL';
  if (type === 'meeting') return 'MEETING';
  return 'OTHER';
}

function meetingInterval(event) {
  const start = event.metadata?.startTime ? new Date(event.metadata.startTime) : event.timestamp;
  const durationMinutes =
    event.metadata?.durationMinutes ??
    (event.metadata?.endTime
      ? (new Date(event.metadata.endTime) - new Date(start)) / 60000
      : 30);
  const end = new Date(new Date(start).getTime() + Math.max(0, durationMinutes) * 60000);
  return { start: new Date(start), end };
}

/** Merge overlapping intervals so double-booked meetings are not counted twice. */
function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged = [sorted[0]];
  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      if (current.end > last.end) last.end = current.end;
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

function overlapMinutes(a, b) {
  const start = Math.max(a.start.getTime(), b.start.getTime());
  const end = Math.min(a.end.getTime(), b.end.getTime());
  return Math.max(0, (end - start) / 60000);
}

/** Free spans inside working windows once busy intervals are removed. */
function freeBlocks(windows, busy) {
  const blocks = [];
  for (const window of windows) {
    let cursor = window.start.getTime();
    const overlapping = busy
      .filter((b) => b.end > window.start && b.start < window.end)
      .sort((a, b) => a.start - b.start);

    for (const interval of overlapping) {
      const start = Math.max(interval.start.getTime(), window.start.getTime());
      if (start > cursor) blocks.push({ minutes: (start - cursor) / 60000 });
      cursor = Math.max(cursor, Math.min(interval.end.getTime(), window.end.getTime()));
    }
    if (window.end.getTime() > cursor) blocks.push({ minutes: (window.end.getTime() - cursor) / 60000 });
  }
  return blocks.filter((b) => b.minutes > 0);
}

/**
 * Active team membership for the period, from the effective-dated reporting
 * structure rather than a point-in-time roster.
 */
export async function getTeamMembership({ tenantId, teamId, periodStart, periodEnd }) {
  const units = await OrgUnit.find({
    orgId: tenantId,
    teamId,
    effectiveFrom: { $lt: periodEnd },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: periodStart } }],
  })
    .select('userId isManager managerUserId roleLevel')
    .lean();

  const seen = new Set();
  const members = [];
  for (const unit of units) {
    const key = String(unit.userId);
    if (!unit.userId || seen.has(key)) continue;
    seen.add(key);
    members.push(unit);
  }
  return members;
}

/** Active membership across a set of teams, de-duplicated. */
export async function getGroupMembership({ tenantId, teamIds, periodStart, periodEnd }) {
  const units = await OrgUnit.find({
    orgId: tenantId,
    teamId: { $in: teamIds },
    effectiveFrom: { $lt: periodEnd },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: periodStart } }],
  })
    .select('userId isManager managerUserId roleLevel teamId')
    .lean();

  const seen = new Set();
  const members = [];
  for (const unit of units) {
    const key = String(unit.userId);
    if (!unit.userId || seen.has(key)) continue;
    seen.add(key);
    members.push(unit);
  }
  return members;
}

/**
 * Decide which group a team's numbers may be reported against (spec §22.1:
 * "suppress output *or aggregate to parent group*").
 *
 * Blanking a small team is the lazy half of that rule. A ten-person customer
 * would open the product and see nothing at all, conclude it does not work, and
 * never reach the point of value — while learning nothing about their own work
 * patterns that the privacy rule was protecting.
 *
 * So walk outward instead: the team itself if it is large enough, else the
 * group around its manager, else the whole organisation. The reported figure
 * always describes a group of at least the minimum size, which is the actual
 * guarantee. Only an organisation smaller than the minimum has nothing
 * reportable, and that is stated plainly rather than shown as an empty chart.
 */
export async function resolveReportingGroup({
  tenantId,
  teamId,
  periodStart,
  periodEnd,
  minGroupSize,
}) {
  const own = await getTeamMembership({ tenantId, teamId, periodStart, periodEnd });
  if (own.length >= minGroupSize) {
    return { scope: 'TEAM', teamIds: [teamId], members: own, aggregatedFrom: null };
  }

  const parentTeamId = await resolveParentTeamId({ tenantId, teamId });
  if (parentTeamId) {
    const teamIds = [teamId, parentTeamId];
    const members = await getGroupMembership({ tenantId, teamIds, periodStart, periodEnd });
    if (members.length >= minGroupSize) {
      return { scope: 'PARENT_GROUP', teamIds, members, aggregatedFrom: teamId };
    }
  }

  const orgTeams = await Team.find({ orgId: tenantId }).select('_id').lean();
  const orgTeamIds = orgTeams.map((t) => t._id);
  const orgMembers = await getGroupMembership({
    tenantId,
    teamIds: orgTeamIds,
    periodStart,
    periodEnd,
  });
  if (orgMembers.length >= minGroupSize) {
    return {
      scope: 'ORGANISATION',
      teamIds: orgTeamIds,
      members: orgMembers,
      aggregatedFrom: teamId,
    };
  }

  return null;
}

/**
 * Compute every P0 metric for one team over one period.
 *
 * Returns rows shaped for TeamWorkPatternMetric. A row below the minimum group
 * size comes back suppressed with no value attached — the caller never sees a
 * number it is not allowed to show.
 */
export async function computeTeamMetricsForPeriod({
  tenantId,
  teamId,
  periodStart,
  periodEnd,
  minGroupSize = null,
}) {
  const threshold = minGroupSize ?? (await resolveMinGroupSize(tenantId));

  const group = await resolveReportingGroup({
    tenantId,
    teamId,
    periodStart,
    periodEnd,
    minGroupSize: threshold,
  });

  const base = {
    tenantId,
    teamId,
    periodStart,
    periodEnd,
    periodType: 'WEEK',
    algorithmVersion: ALGORITHM_VERSION,
  };

  if (!group) {
    // The whole organisation is smaller than the reporting minimum. Nothing can
    // be reported without describing individuals, so say that rather than
    // showing an empty chart.
    return P0_METRIC_ORDER.map((metric) => ({
      ...base,
      metric,
      value: null,
      components: {},
      contributorCount: 0,
      groupSize: null,
      dataCoverage: 0,
      dataQuality: 'INSUFFICIENT',
      suppressed: true,
      suppressionReason: `This organisation has fewer than ${threshold} people, so no team-level figure can be reported without describing individuals.`,
      reportingGroup: { scope: 'NONE', aggregatedFrom: String(teamId) },
      sources: [],
    }));
  }

  const members = group.members;
  const memberIds = members.map((m) => m.userId);
  const managerIds = new Set(members.filter((m) => m.isManager).map((m) => String(m.userId)));
  const groupSize = members.length;

  base.groupSize = groupSize;
  base.reportingGroup = {
    scope: group.scope,
    size: groupSize,
    aggregatedFrom: group.aggregatedFrom ? String(group.aggregatedFrom) : null,
    // Read by the UI so a rolled-up number is never mistaken for the team's own.
    note:
      group.scope === 'TEAM'
        ? ''
        : `This team is smaller than the reporting minimum of ${threshold}, so the figure describes the ${
            group.scope === 'PARENT_GROUP' ? 'wider group it sits in' : 'whole organisation'
          }.`,
  };

  const events = await WorkEvent.find({
    orgId: tenantId,
    actorUserId: { $in: memberIds },
    timestamp: { $gte: periodStart, $lt: periodEnd },
  })
    .select('actorUserId source eventType timestamp metadata teamId')
    .lean();

  const scheduleFor = await buildScheduleResolver({
    tenantId,
    teamId,
    personIds: memberIds,
    at: periodEnd,
  });

  const perPerson = new Map();
  for (const member of members) {
    perPerson.set(String(member.userId), {
      meetingIntervals: [],
      meetingCount: 0,
      recurringMeetingMinutes: 0,
      chatEvents: 0,
      emailEvents: 0,
      callEvents: 0,
      afterHoursEvents: 0,
      interruptionInstants: [],
      crossTeamMeetings: 0,
      distinctCounterparties: new Set(),
      activeDays: new Set(),
      hasAnyEvent: false,
    });
  }

  const sources = new Set();
  const calendarDays = new Set();
  const messagingDays = new Set();

  for (const event of events) {
    const personId = String(event.actorUserId);
    const person = perPerson.get(personId);
    if (!person) continue;

    const schedule = scheduleFor(personId);
    const kind = classify(event);
    sources.add(event.source);
    person.hasAnyEvent = true;

    const dayKey = event.timestamp.toISOString().slice(0, 10);
    person.activeDays.add(dayKey);

    if (kind === 'MEETING') {
      if (event.metadata?.isCancelled || event.metadata?.isAllDay) continue;
      calendarDays.add(dayKey);

      const interval = meetingInterval(event);
      person.meetingIntervals.push(interval);
      person.meetingCount += 1;
      if (event.metadata?.isRecurring) {
        person.recurringMeetingMinutes += (interval.end - interval.start) / 60000;
      }
      const participantTeams = (event.metadata?.participantTeamIds || []).map(String);
      if (participantTeams.some((t) => t !== String(teamId))) person.crossTeamMeetings += 1;
      if (event.metadata?.attendeeCount) {
        person.distinctCounterparties.add(event.metadata.meetingInstanceIdHash || String(event._id));
      }
      person.interruptionInstants.push(interval.start);
    } else if (kind === 'CHAT') {
      messagingDays.add(dayKey);
      person.chatEvents += 1;
      person.interruptionInstants.push(event.timestamp);
    } else if (kind === 'EMAIL') {
      messagingDays.add(dayKey);
      person.emailEvents += 1;
      person.interruptionInstants.push(event.timestamp);
    } else if (kind === 'CALL') {
      messagingDays.add(dayKey);
      person.callEvents += 1;
      person.interruptionInstants.push(event.timestamp);
    }

    // §10 — after-hours is judged against this person's own schedule.
    if (kind !== 'OTHER' && !isWithinSchedule(event.timestamp, schedule)) {
      person.afterHoursEvents += 1;
    }
  }

  // ── Aggregate ──────────────────────────────────────────────────────────────
  let totalMeetingMinutes = 0;
  let totalMeetingCount = 0;
  let totalRecurringMinutes = 0;
  let totalAvailableMinutes = 0;
  let totalScheduledMinutes = 0;
  let longestBlockMinutes = 0;
  let blocksOver60 = 0;
  let totalAfterHours = 0;
  let totalChat = 0;
  let totalEmail = 0;
  let totalCalls = 0;
  let totalWorkWindowMinutes = 0;
  let managerCoordinationEvents = 0;
  let managerAfterHours = 0;
  let managerCrossTeamMeetings = 0;
  let managerCount = 0;
  let contributorCount = 0;
  let activeDayCount = 0;
  let expectedDayCount = 0;

  for (const [personId, person] of perPerson.entries()) {
    const schedule = scheduleFor(personId);
    const windows = workingWindows(periodStart, periodEnd, schedule);
    const scheduledMinutes = windows.reduce((sum, w) => sum + (w.end - w.start) / 60000, 0);
    totalScheduledMinutes += scheduledMinutes;
    expectedDayCount += windows.length;
    activeDayCount += person.activeDays.size;

    if (person.hasAnyEvent) contributorCount += 1;

    const merged = mergeIntervals(person.meetingIntervals);
    const meetingMinutesInSchedule = merged.reduce(
      (sum, interval) => sum + windows.reduce((s, w) => s + overlapMinutes(interval, w), 0),
      0
    );
    totalMeetingMinutes += meetingMinutesInSchedule;
    totalMeetingCount += person.meetingCount;
    totalRecurringMinutes += person.recurringMeetingMinutes;

    const blocks = freeBlocks(windows, merged);
    const availableMinutes = blocks.reduce((sum, b) => sum + b.minutes, 0);
    totalAvailableMinutes += availableMinutes;
    longestBlockMinutes = Math.max(longestBlockMinutes, ...blocks.map((b) => b.minutes), 0);
    blocksOver60 += blocks.filter((b) => b.minutes >= 60).length;

    // Cross-channel: each messaging interruption also fragments the block it
    // lands in, which is why this differs from the calendar-only figure.
    const interruptionIntervals = person.interruptionInstants
      .filter((instant) => isWithinSchedule(instant, schedule))
      .map((instant) => ({
        start: new Date(instant),
        end: new Date(new Date(instant).getTime() + INTERRUPTION_COST_MINUTES * 60000),
      }));
    const busyCrossChannel = mergeIntervals([...merged, ...interruptionIntervals]);
    totalWorkWindowMinutes += freeBlocks(windows, busyCrossChannel).reduce(
      (sum, b) => sum + b.minutes,
      0
    );

    totalAfterHours += person.afterHoursEvents;
    totalChat += person.chatEvents;
    totalEmail += person.emailEvents;
    totalCalls += person.callEvents;

    if (managerIds.has(personId)) {
      managerCount += 1;
      managerCoordinationEvents +=
        person.chatEvents + person.emailEvents + person.callEvents + person.meetingCount;
      managerAfterHours += person.afterHoursEvents;
      managerCrossTeamMeetings += person.crossTeamMeetings;
    }
  }

  const coverage = expectedDayCount > 0 ? Math.min(1, activeDayCount / expectedDayCount) : 0;
  const contributorRatio = groupSize > 0 ? contributorCount / groupSize : 0;
  const dataCoverage = Number((coverage * 0.5 + contributorRatio * 0.5).toFixed(4));
  const dataQuality = qualityFromCoverage(dataCoverage);

  const perPersonWeek = (total) => (groupSize > 0 ? Number((total / groupSize).toFixed(3)) : null);
  const sourceList = [...sources];

  const hasCalendar = calendarDays.size > 0;
  const hasMessaging = messagingDays.size > 0;
  const crossChannelCoverageMet =
    hasCalendar && hasMessaging && dataCoverage >= CROSS_CHANNEL_COVERAGE_THRESHOLD;

  const rows = [
    {
      ...base,
      metric: 'MEETING_LOAD',
      value: perPersonWeek(totalMeetingMinutes / 60),
      components: {
        attendeeHours: Number((totalMeetingMinutes / 60).toFixed(2)),
        meetingCount: totalMeetingCount,
        recurringMeetingHours: Number((totalRecurringMinutes / 60).toFixed(2)),
        meetingsPerPerson: perPersonWeek(totalMeetingCount),
      },
    },
    {
      ...base,
      metric: 'UNINTERRUPTED_CALENDAR_AVAILABILITY',
      value: perPersonWeek(totalAvailableMinutes / 60),
      components: {
        totalAvailableHours: Number((totalAvailableMinutes / 60).toFixed(2)),
        scheduledHours: Number((totalScheduledMinutes / 60).toFixed(2)),
        longestBlockMinutes: Math.round(longestBlockMinutes),
        blocksOver60Minutes: blocksOver60,
        // The name is the guardrail: this is calendar evidence, not focus.
        methodology: 'Calendar time inside configured working schedules with no meeting event.',
      },
    },
    {
      ...base,
      metric: 'UNINTERRUPTED_WORK_WINDOW',
      value: crossChannelCoverageMet ? perPersonWeek(totalWorkWindowMinutes / 60) : null,
      components: crossChannelCoverageMet
        ? {
            totalHours: Number((totalWorkWindowMinutes / 60).toFixed(2)),
            interruptionCostMinutes: INTERRUPTION_COST_MINUTES,
            methodology:
              'Calendar time inside working schedules with no meeting and no adjacent chat, email or call event.',
          }
        : {
            unavailableReason:
              'Connector coverage does not yet support a cross-channel estimate. Use Uninterrupted Calendar Availability.',
            requiredCoverage: CROSS_CHANNEL_COVERAGE_THRESHOLD,
            observedCoverage: dataCoverage,
          },
    },
    {
      ...base,
      metric: 'AFTER_HOURS_ACTIVITY',
      value: perPersonWeek(totalAfterHours),
      components: {
        totalEvents: totalAfterHours,
        methodology: 'Events outside each person’s configured working schedule, team-aggregated.',
      },
    },
    {
      ...base,
      metric: 'COORDINATION_CHANNEL_LOAD',
      value: perPersonWeek(totalChat + totalEmail + totalCalls + totalMeetingCount),
      components: {
        // Volume only. Message content is never read (§22).
        meetings: totalMeetingCount,
        chat: totalChat,
        email: totalEmail,
        calls: totalCalls,
        byChannelPerPerson: {
          meetings: perPersonWeek(totalMeetingCount),
          chat: perPersonWeek(totalChat),
          email: perPersonWeek(totalEmail),
          calls: perPersonWeek(totalCalls),
        },
      },
    },
    {
      ...base,
      metric: 'MANAGEMENT_LAYER_COORDINATION_LOAD',
      // Aggregated across the management layer. A single manager is never
      // reportable on their own (§10, §22).
      value:
        managerCount >= 2
          ? Number((managerCoordinationEvents / managerCount).toFixed(3))
          : null,
      components:
        managerCount >= 2
          ? {
              managerCount,
              coordinationEvents: managerCoordinationEvents,
              afterHoursEvents: managerAfterHours,
              crossTeamMeetings: managerCrossTeamMeetings,
            }
          : {
              unavailableReason:
                'Fewer than two managers in this group; a management-layer figure would describe an individual.',
            },
    },
  ];

  return rows.map((row) => ({
    ...row,
    contributorCount,
    dataCoverage,
    dataQuality: row.value === null ? 'INSUFFICIENT' : dataQuality,
    suppressed: false,
    suppressionReason: '',
    sources: sourceList,
  }));
}

export const P0_METRIC_ORDER = [
  'MEETING_LOAD',
  'UNINTERRUPTED_CALENDAR_AVAILABILITY',
  'UNINTERRUPTED_WORK_WINDOW',
  'AFTER_HOURS_ACTIVITY',
  'COORDINATION_CHANNEL_LOAD',
  'MANAGEMENT_LAYER_COORDINATION_LOAD',
];

export function qualityFromCoverage(coverage) {
  if (coverage >= 0.85) return 'GOOD';
  if (coverage >= 0.6) return 'ACCEPTABLE';
  if (coverage >= 0.3) return 'LOW';
  return 'INSUFFICIENT';
}

/** Compute and upsert metrics for a team across a list of periods. */
export async function persistTeamMetrics({ tenantId, teamId, periods }) {
  const minGroupSize = await resolveMinGroupSize(tenantId);
  const written = [];

  for (const { periodStart, periodEnd } of periods) {
    const rows = await computeTeamMetricsForPeriod({
      tenantId,
      teamId,
      periodStart,
      periodEnd,
      minGroupSize,
    });

    for (const row of rows) {
      const doc = await TeamWorkPatternMetric.findOneAndUpdate(
        { tenantId, teamId, metric: row.metric, periodStart: row.periodStart },
        { $set: row },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      written.push(doc);
    }
  }

  return written;
}

export default {
  computeTeamMetricsForPeriod,
  persistTeamMetrics,
  getTeamMembership,
  getGroupMembership,
  resolveReportingGroup,
  qualityFromCoverage,
  P0_METRIC_ORDER,
};
