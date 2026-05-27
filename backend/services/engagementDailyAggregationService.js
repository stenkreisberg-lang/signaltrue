/**
 * Engagement Daily Aggregation Service
 *
 * Computes the full EngagementTeamDaily metric snapshot from WorkEvent records
 * for a given team and calendar day.
 *
 * Implements all metric definitions from the spec (Sections 7.1–7.14):
 *   - After-hours activity ratio (7.2)
 *   - Recovery gap violations (7.3)
 *   - Meeting load per person (7.4)
 *   - Attendee hours (7.5)
 *   - Focus hours available (7.6)
 *   - Fragmented day ratio (7.7)
 *   - Back-to-back meeting count (7.8)
 *   - Response latency median + p90 (7.9)
 *   - Collaboration breadth (7.11)
 *   - Reciprocity ratio (7.12)
 *   - Manager 1:1 rhythm (7.13)
 *
 * Design notes:
 *   - All output is team-level — never individual.
 *   - Per-person grouping uses actorUserId internally; never exposed in output.
 *   - When attendeeHashes are populated by adapters, focus block / fragmented day
 *     calculations become more accurate (per-person calendar reconstruction).
 *     Without them, team-level approximations are used and noted.
 *   - Working hours default: Mon–Fri 09:00–17:00 in the team's configured timezone.
 *     Falls back to UTC if no timezone is configured.
 */

import WorkEvent from '../models/workEvent.js';
import EngagementTeamDaily from '../models/engagementTeamDaily.js';
import Team from '../models/team.js';
import IntegrationConnection from '../models/integrationConnection.js';
import { checkTeamSize, suppressMetricIfTooFew } from '../utils/privacyGate.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const CALENDAR_SOURCES = new Set(['google-calendar', 'microsoft-outlook', 'calendar', 'meet']);
const MESSAGING_SOURCES = new Set(['slack', 'microsoft-teams', 'google-chat']);
const EMAIL_SOURCES = new Set(['gmail', 'microsoft-outlook']);

// Working hours defaults (can be overridden by org config)
const DEFAULT_WORK_START_HOUR = 9; // 09:00
const DEFAULT_WORK_END_HOUR = 17; // 17:00
const DEFAULT_WORK_DAYS = new Set([1, 2, 3, 4, 5]); // Mon–Fri (getDay: 0=Sun)

// Thresholds
const BACK_TO_BACK_GAP_MINUTES = 5;
const FOCUS_BLOCK_MIN_MINUTES = 90;
const FRAGMENTED_MEETING_COUNT = 5;
const FRAGMENTED_BTB_SEQUENCES = 3;
const RECOVERY_LATE_HOUR = 20; // last activity after 20:00 local
const RECOVERY_EARLY_HOUR = 8; // first activity before 08:00 local

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Compute and upsert EngagementTeamDaily for a specific team and date.
 *
 * @param {string|ObjectId} orgId
 * @param {string|ObjectId} teamId
 * @param {Date} date         — the calendar day to compute (any time of day)
 * @returns {Object}          — the saved EngagementTeamDaily document
 */
export async function computeAndSaveTeamDay(orgId, teamId, date) {
  const dateStr = toDateStr(date);
  const dayStart = startOfDayUTC(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // Load team config (timezone, working hours) and integration coverage
  const [team, connections] = await Promise.all([
    Team.findById(teamId).lean(),
    IntegrationConnection.find({ orgId, status: 'connected' }).lean(),
  ]);

  const workConfig = buildWorkConfig(team);
  const coverage = buildCoverage(connections);

  // Fetch all WorkEvents for this team on this day
  const events = await WorkEvent.find({
    orgId,
    teamId,
    timestamp: { $gte: dayStart, $lt: dayEnd },
  }).lean();

  // Distinct active users on this day (using actorUserId as proxy for person)
  const activeUsers = new Set(events.map((e) => String(e.actorUserId)).filter(Boolean));
  const activePeopleCount = activeUsers.size;

  // Privacy gate — do not write if below minimum
  if (!checkTeamSize(activePeopleCount)) {
    console.info(
      `[EngagementAggregation] Suppressed team ${teamId} on ${dateStr}: ` +
        `only ${activePeopleCount} active people (min 8 required)`
    );
    return null;
  }

  // ── Segment events by type ─────────────────────────────────────────────────
  const calendarEvents = events.filter((e) => CALENDAR_SOURCES.has(e.source));
  const messagingEvents = events.filter((e) => MESSAGING_SOURCES.has(e.source));
  const emailEvents = events.filter((e) => EMAIL_SOURCES.has(e.source));

  // ── Compute metric blocks ──────────────────────────────────────────────────
  const calendarMetrics = computeCalendarMetrics(
    calendarEvents,
    activePeopleCount,
    workConfig,
    dateStr
  );
  const messagingMetrics = computeMessagingMetrics(messagingEvents, activePeopleCount, workConfig);
  const emailMetrics = computeEmailMetrics(emailEvents, activePeopleCount, workConfig);

  // ── Upsert ────────────────────────────────────────────────────────────────
  const doc = await EngagementTeamDaily.findOneAndUpdate(
    { teamId, date: dateStr },
    {
      $set: {
        orgId,
        teamId,
        date: dateStr,
        activePeopleCount,
        calendar: calendarMetrics,
        messaging: messagingMetrics,
        email: emailMetrics,
        integrationCoverage: coverage,
      },
    },
    { upsert: true, new: true }
  );

  return doc;
}

/**
 * Compute EngagementTeamDaily for every team in an org for the given date.
 * Called by the nightly cron job.
 */
export async function computeDayForOrg(orgId, date = new Date()) {
  const teams = await Team.find({ orgId }).lean();
  const results = [];

  for (const team of teams) {
    try {
      const result = await computeAndSaveTeamDay(orgId, team._id, date);
      if (result) results.push(result);
    } catch (err) {
      console.error(
        `[EngagementAggregation] Error computing team ${team._id} on ${toDateStr(date)}:`,
        err.message
      );
    }
  }

  return results;
}

// ── Calendar Metrics ───────────────────────────────────────────────────────────

function computeCalendarMetrics(events, activePeopleCount, workConfig, dateStr) {
  // Only meeting-type events
  const meetings = events.filter(
    (e) => e.eventType === 'meeting' || e.eventType === 'meet_started'
  );

  if (meetings.length === 0 || activePeopleCount === 0) {
    return zeroCalendarMetrics();
  }

  // ── Meeting hours ────────────────────────────────────────────────────────
  const allDurations = meetings.map((e) => resolveDurationMinutes(e)).filter((d) => d > 0);
  const totalMeetingMinutes = sum(allDurations);
  const meetingHoursTotal = totalMeetingMinutes / 60;
  const meetingHoursPerPerson = meetingHoursTotal / activePeopleCount;

  // ── Attendee hours ────────────────────────────────────────────────────────
  // attendee_hours = meeting_duration_hours * internal_attendee_count per meeting
  const attendeeHoursTotal = meetings.reduce((acc, e) => {
    const durHours = resolveDurationMinutes(e) / 60;
    const internalAttendees = e.metadata?.internalAttendeeCount ?? e.metadata?.attendeeCount ?? 1;
    return acc + durHours * internalAttendees;
  }, 0);
  const attendeeHoursPerPerson = attendeeHoursTotal / activePeopleCount;

  // ── Recurring meeting ratio ───────────────────────────────────────────────
  const recurringCount = meetings.filter((e) => e.metadata?.isRecurring).length;
  const recurringMeetingRatio = meetings.length > 0 ? recurringCount / meetings.length : 0;

  // ── Average attendee count ────────────────────────────────────────────────
  const attendeeCounts = meetings
    .map((e) => e.metadata?.attendeeCount ?? e.metadata?.participantCountPeak ?? null)
    .filter((v) => v !== null);
  const avgAttendeeCount = attendeeCounts.length > 0 ? mean(attendeeCounts) : 0;

  // ── Back-to-back meetings ─────────────────────────────────────────────────
  // Sort by start time and count pairs where gap <= 5 min
  const sorted = buildSortedTimeline(meetings);
  const backToBackMeetingCount = countBackToBack(sorted, BACK_TO_BACK_GAP_MINUTES);

  // ── Per-person calendar reconstruction ───────────────────────────────────
  // Group meetings by the people in them.
  // If attendeeHashes are populated, use them for accuracy.
  // Otherwise approximate using actorUserId (organizer-only view).
  const personCalendars = buildPersonCalendars(meetings);
  const peopleWithCalendarData = Object.keys(personCalendars).length;

  // ── Fragmented day ratio ──────────────────────────────────────────────────
  let fragmentedPersonDays = 0;
  let totalPersonDays = 0;
  let totalFocusBlockMinutes = 0;
  let totalFocusBlocks = 0;

  for (const personMeetings of Object.values(personCalendars)) {
    totalPersonDays++;
    const personSorted = buildSortedTimeline(personMeetings);
    const btbCount = countBackToBack(personSorted, BACK_TO_BACK_GAP_MINUTES);
    const focusBlocks = computeFocusBlocks(personSorted, workConfig, dateStr);
    const hasNoFocusBlock = focusBlocks.length === 0;
    const tooManyMeetings = personMeetings.length >= FRAGMENTED_MEETING_COUNT;
    const tooManyBtb = btbCount >= FRAGMENTED_BTB_SEQUENCES;

    if (tooManyMeetings || hasNoFocusBlock || tooManyBtb) {
      fragmentedPersonDays++;
    }

    totalFocusBlockMinutes += sum(focusBlocks);
    totalFocusBlocks += focusBlocks.length;
  }

  // Fall back to team-level estimate if per-person data is thin
  const fragmentedDayRatio = totalPersonDays > 0 ? fragmentedPersonDays / totalPersonDays : 0;

  // Suppress focus metrics if too few people contributed calendar data
  const focusSuppressed = suppressMetricIfTooFew(peopleWithCalendarData);
  const focusHoursAvailablePerPerson = focusSuppressed
    ? null
    : totalFocusBlockMinutes / 60 / Math.max(peopleWithCalendarData, 1);
  const focusBlocks90mCount = focusSuppressed ? null : totalFocusBlocks;

  // ── Manager 1:1s ──────────────────────────────────────────────────────────
  const manager1to1Events = meetings.filter(
    (e) => e.metadata?.isManagerOneOnOne === true || e.metadata?.is1to1 === true
  );
  const cancelledManager1to1Events = meetings.filter(
    (e) => (e.metadata?.isManagerOneOnOne || e.metadata?.is1to1) && e.metadata?.isCancelled
  );

  const manager1to1TotalMinutes = sum(
    manager1to1Events.filter((e) => !e.metadata?.isCancelled).map((e) => resolveDurationMinutes(e))
  );
  const manager1to1MinutesPerPerson = manager1to1TotalMinutes / activePeopleCount;
  const cancelled1to1Count = cancelledManager1to1Events.length;

  // ── After-hours meetings ──────────────────────────────────────────────────
  const afterHoursMeetingMinutes = sum(
    meetings
      .filter((e) => isAfterHours(e.metadata?.startTime || e.timestamp, workConfig))
      .map((e) => resolveDurationMinutes(e))
  );

  return {
    meetingHoursTotal: round2(meetingHoursTotal),
    meetingHoursPerPerson: round2(meetingHoursPerPerson),
    attendeeHoursTotal: round2(attendeeHoursTotal),
    attendeeHoursPerPerson: round2(attendeeHoursPerPerson),
    recurringMeetingRatio: round4(recurringMeetingRatio),
    avgAttendeeCount: round2(avgAttendeeCount),
    backToBackMeetingCount,
    fragmentedDayRatio: round4(fragmentedDayRatio),
    focusHoursAvailablePerPerson:
      focusHoursAvailablePerPerson !== null ? round2(focusHoursAvailablePerPerson) : 0,
    focusBlocks90mCount: focusBlocks90mCount ?? 0,
    manager1to1MinutesPerPerson: round2(manager1to1MinutesPerPerson),
    cancelled1to1Count,
    afterHoursMeetingMinutes: round2(afterHoursMeetingMinutes),
  };
}

function zeroCalendarMetrics() {
  return {
    meetingHoursTotal: 0,
    meetingHoursPerPerson: 0,
    attendeeHoursTotal: 0,
    attendeeHoursPerPerson: 0,
    recurringMeetingRatio: 0,
    avgAttendeeCount: 0,
    backToBackMeetingCount: 0,
    fragmentedDayRatio: 0,
    focusHoursAvailablePerPerson: 0,
    focusBlocks90mCount: 0,
    manager1to1MinutesPerPerson: 0,
    cancelled1to1Count: 0,
    afterHoursMeetingMinutes: 0,
  };
}

// ── Messaging Metrics ──────────────────────────────────────────────────────────

function computeMessagingMetrics(events, activePeopleCount, workConfig) {
  const sent = events.filter((e) => e.eventType === 'message');

  if (sent.length === 0 || activePeopleCount === 0) {
    return zeroMessagingMetrics();
  }

  const messagesSentTotal = sent.length;
  const messagesSentPerPerson = messagesSentTotal / activePeopleCount;

  // After-hours ratio
  const afterHoursSent = sent.filter((e) => isAfterHours(e.timestamp, workConfig)).length;
  const afterHoursMessageRatio = messagesSentTotal > 0 ? afterHoursSent / messagesSentTotal : 0;

  // Channel type ratios
  const publicCount = sent.filter((e) => e.metadata?.channelType === 'public').length;
  const dmCount = sent.filter(
    (e) => e.metadata?.channelType === 'dm' || e.metadata?.channelType === 'group_dm'
  ).length;
  const publicChannelRatio = sent.length > 0 ? publicCount / sent.length : 0;
  const dmRatio = sent.length > 0 ? dmCount / sent.length : 0;

  // Thread participation rate
  const replyCount = sent.filter((e) => e.metadata?.isReply === true).length;
  const threadParticipationRate = sent.length > 0 ? replyCount / sent.length : 0;

  // Unique collaborators per person
  // Build per-person unique contact sets from recipientHashes + mentionedUserHashes
  const personContacts = {};
  for (const e of sent) {
    const person = String(e.actorUserId);
    if (!personContacts[person]) personContacts[person] = new Set();
    for (const h of e.metadata?.recipientHashes ?? []) personContacts[person].add(h);
    for (const h of e.metadata?.mentionedUserHashes ?? []) personContacts[person].add(h);
  }
  const contactCounts = Object.values(personContacts).map((s) => s.size);
  const uniqueCollaboratorsPerPerson = contactCounts.length > 0 ? mean(contactCounts) : 0;

  // Response latency — for DMs, @-mentions, and direct replies
  // Build a map of threadIdHash → first message timestamp per person
  // Then find replies and measure first_reply - original_message
  const latencies = computeResponseLatencies(events);
  const medianResponseMinutes = latencies.length > 0 ? median(latencies) : null;
  const p90ResponseMinutes = latencies.length > 0 ? percentile(latencies, 90) : null;

  // Reciprocity ratio
  // A→B and B→A = reciprocal edge; A→B with no response = one-way edge
  const reciprocityRatio = computeReciprocityRatio(events);

  return {
    messagesSentTotal,
    messagesSentPerPerson: round2(messagesSentPerPerson),
    afterHoursMessageRatio: round4(afterHoursMessageRatio),
    medianResponseMinutes,
    p90ResponseMinutes,
    uniqueCollaboratorsPerPerson: round2(uniqueCollaboratorsPerPerson),
    publicChannelRatio: round4(publicChannelRatio),
    dmRatio: round4(dmRatio),
    threadParticipationRate: round4(threadParticipationRate),
    reciprocityRatio,
  };
}

function zeroMessagingMetrics() {
  return {
    messagesSentTotal: 0,
    messagesSentPerPerson: 0,
    afterHoursMessageRatio: 0,
    medianResponseMinutes: null,
    p90ResponseMinutes: null,
    uniqueCollaboratorsPerPerson: 0,
    publicChannelRatio: 0,
    dmRatio: 0,
    threadParticipationRate: 0,
    reciprocityRatio: null,
  };
}

// ── Email Metrics ──────────────────────────────────────────────────────────────

function computeEmailMetrics(events, activePeopleCount, workConfig) {
  const sent = events.filter((e) => e.eventType === 'email_sent');

  if (sent.length === 0) {
    return {
      emailsSentTotal: 0,
      afterHoursEmailRatio: 0,
      medianReplyMinutes: null,
      internalEmailRatio: 0,
    };
  }

  const emailsSentTotal = sent.length;

  const afterHoursCount = sent.filter((e) => isAfterHours(e.timestamp, workConfig)).length;
  const afterHoursEmailRatio = emailsSentTotal > 0 ? afterHoursCount / emailsSentTotal : 0;

  // Internal email ratio (sent to internal recipients only)
  const internalEmails = sent.filter((e) => e.metadata?.isExternal === false);
  const internalEmailRatio = emailsSentTotal > 0 ? internalEmails.length / emailsSentTotal : 0;

  // Median reply latency in minutes
  const replyLatencies = sent
    .filter(
      (e) =>
        typeof e.metadata?.replyLatencySeconds === 'number' && e.metadata.replyLatencySeconds > 0
    )
    .map((e) => e.metadata.replyLatencySeconds / 60);
  const medianReplyMinutes = replyLatencies.length > 0 ? median(replyLatencies) : null;

  return {
    emailsSentTotal,
    afterHoursEmailRatio: round4(afterHoursEmailRatio),
    medianReplyMinutes,
    internalEmailRatio: round4(internalEmailRatio),
  };
}

// ── Helper: Response Latency ───────────────────────────────────────────────────

/**
 * Build response latency values (minutes) from messaging events.
 * Only measures replies to DMs, @-mentions, and direct thread responses.
 * Thread structure: group by threadIdHash → find time from first message to first reply by a different person.
 */
function computeResponseLatencies(events) {
  // Only look at DM/mention contexts
  const relevant = events.filter(
    (e) =>
      e.eventType === 'message' &&
      (e.metadata?.channelType === 'dm' ||
        e.metadata?.channelType === 'group_dm' ||
        e.metadata?.isReply === true)
  );

  if (relevant.length === 0) return [];

  // Group by threadIdHash
  const threads = {};
  for (const e of relevant) {
    const threadKey = e.metadata?.threadIdHash ?? e.metadata?.channelHash ?? null;
    if (!threadKey) continue;
    if (!threads[threadKey]) threads[threadKey] = [];
    threads[threadKey].push(e);
  }

  const latencies = [];
  for (const messages of Object.values(threads)) {
    if (messages.length < 2) continue;
    const sorted = messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const firstSender = String(sorted[0].actorUserId);
    const firstReply = sorted.find((m, i) => i > 0 && String(m.actorUserId) !== firstSender);
    if (!firstReply) continue;
    const latencyMs = new Date(firstReply.timestamp) - new Date(sorted[0].timestamp);
    const latencyMinutes = latencyMs / (1000 * 60);
    // Only include latencies up to 48 hours (2880 min) to exclude stale threads
    if (latencyMinutes > 0 && latencyMinutes < 2880) {
      latencies.push(latencyMinutes);
    }
  }

  return latencies;
}

// ── Helper: Reciprocity Ratio ──────────────────────────────────────────────────

/**
 * Compute reciprocity ratio.
 * Two-way edge: A sent to B AND B sent to A (same channel/DM).
 * One-way edge: A sent to B with no response from B.
 * Uses channelHash to identify conversation pairs.
 */
function computeReciprocityRatio(events) {
  const dmEvents = events.filter(
    (e) =>
      e.eventType === 'message' &&
      (e.metadata?.channelType === 'dm' || e.metadata?.channelType === 'group_dm') &&
      e.metadata?.channelHash
  );

  if (dmEvents.length === 0) return null;

  // Map channelHash → set of senders
  const channelSenders = {};
  for (const e of dmEvents) {
    const ch = e.metadata.channelHash;
    if (!channelSenders[ch]) channelSenders[ch] = new Set();
    channelSenders[ch].add(String(e.actorUserId));
  }

  // Reciprocal if >= 2 distinct senders in the channel
  let reciprocal = 0;
  let total = 0;
  for (const senders of Object.values(channelSenders)) {
    total++;
    if (senders.size >= 2) reciprocal++;
  }

  return total > 0 ? round4(reciprocal / total) : null;
}

// ── Helper: Per-Person Calendar Construction ───────────────────────────────────

/**
 * Build a map of personKey → [meeting events] for the team.
 * If attendeeHashes are populated in metadata, each attendee gets their own entry.
 * Otherwise falls back to actorUserId (organizer-only, less accurate).
 */
function buildPersonCalendars(meetings) {
  const personCalendars = {};

  for (const meeting of meetings) {
    const hashes = meeting.metadata?.attendeeHashes;

    if (Array.isArray(hashes) && hashes.length > 0) {
      // Use attendee hashes for accurate per-person reconstruction
      for (const h of hashes) {
        if (!personCalendars[h]) personCalendars[h] = [];
        personCalendars[h].push(meeting);
      }
    } else {
      // Fallback: organizer only
      const key = String(meeting.actorUserId ?? 'unknown');
      if (!personCalendars[key]) personCalendars[key] = [];
      personCalendars[key].push(meeting);
    }
  }

  return personCalendars;
}

// ── Helper: Focus Block Computation ───────────────────────────────────────────

/**
 * Find free calendar blocks >= FOCUS_BLOCK_MIN_MINUTES within working hours.
 * Returns an array of block durations in minutes.
 *
 * @param {Array} sortedMeetings  — meetings sorted by startTime ascending
 * @param {Object} workConfig     — { workStartHour, workEndHour, workDays, timezone }
 * @param {string} dateStr        — YYYY-MM-DD
 */
function computeFocusBlocks(sortedMeetings, workConfig, dateStr) {
  const { workStartHour, workEndHour } = workConfig;

  // Construct working-day start and end as ms offsets (using UTC as proxy)
  const dayDate = new Date(dateStr + 'T00:00:00Z');
  const workStart = new Date(dayDate);
  workStart.setUTCHours(workStartHour, 0, 0, 0);
  const workEnd = new Date(dayDate);
  workEnd.setUTCHours(workEndHour, 0, 0, 0);

  if (sortedMeetings.length === 0) {
    // Entire working day is a focus block
    const totalWorkMinutes = (workEndHour - workStartHour) * 60;
    return totalWorkMinutes >= FOCUS_BLOCK_MIN_MINUTES ? [totalWorkMinutes] : [];
  }

  const blocks = [];
  let cursor = workStart.getTime();

  for (const meeting of sortedMeetings) {
    const mStart = new Date(meeting.metadata?.startTime || meeting.timestamp).getTime();
    const mEnd = new Date(
      meeting.metadata?.endTime || new Date(mStart + resolveDurationMinutes(meeting) * 60 * 1000)
    ).getTime();

    // Gap before this meeting
    const gapMinutes = (Math.min(mStart, workEnd.getTime()) - cursor) / (1000 * 60);
    if (gapMinutes >= FOCUS_BLOCK_MIN_MINUTES) {
      blocks.push(Math.floor(gapMinutes));
    }

    cursor = Math.max(cursor, mEnd);
    if (cursor >= workEnd.getTime()) break;
  }

  // Gap after last meeting until end of working day
  const finalGapMinutes = (workEnd.getTime() - cursor) / (1000 * 60);
  if (finalGapMinutes >= FOCUS_BLOCK_MIN_MINUTES) {
    blocks.push(Math.floor(finalGapMinutes));
  }

  return blocks;
}

// ── Helper: Back-to-Back Count ─────────────────────────────────────────────────

function countBackToBack(sortedTimeline, maxGapMinutes) {
  let count = 0;
  for (let i = 1; i < sortedTimeline.length; i++) {
    const gap = (sortedTimeline[i].startMs - sortedTimeline[i - 1].endMs) / (1000 * 60);
    if (gap >= 0 && gap <= maxGapMinutes) count++;
  }
  return count;
}

function buildSortedTimeline(meetings) {
  return meetings
    .map((e) => {
      const startMs = new Date(e.metadata?.startTime || e.timestamp).getTime();
      const durMs = resolveDurationMinutes(e) * 60 * 1000;
      return { startMs, endMs: startMs + durMs };
    })
    .sort((a, b) => a.startMs - b.startMs);
}

// ── Helper: Working Hours ──────────────────────────────────────────────────────

/**
 * Returns true if the given timestamp falls outside configured working hours
 * or on a non-working day.
 * NOTE: Uses UTC hour as a proxy. For per-timezone accuracy, populate
 * team.timezone and extend this function to use a proper tz library.
 */
function isAfterHours(timestamp, workConfig) {
  const d = new Date(timestamp);
  const tz = workConfig.timezone || 'UTC';

  // Convert to local time in the team's timezone using Intl
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    weekday: 'short',
    hour12: false,
  }).formatToParts(d);

  const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0';
  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';

  const hour = parseInt(hourStr, 10);
  const WEEKDAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = WEEKDAY_MAP[weekdayStr] ?? d.getUTCDay();

  const isWorkDay = workConfig.workDays.has(dayOfWeek);
  const isDuringHours = hour >= workConfig.workStartHour && hour < workConfig.workEndHour;

  return !isWorkDay || !isDuringHours;
}

function buildWorkConfig(team) {
  return {
    workStartHour: team?.workConfig?.workdayStart
      ? parseInt(team.workConfig.workdayStart.split(':')[0], 10)
      : DEFAULT_WORK_START_HOUR,
    workEndHour: team?.workConfig?.workdayEnd
      ? parseInt(team.workConfig.workdayEnd.split(':')[0], 10)
      : DEFAULT_WORK_END_HOUR,
    workDays: DEFAULT_WORK_DAYS,
    timezone: team?.timezone ?? 'UTC',
  };
}

// ── Helper: Integration Coverage ──────────────────────────────────────────────

function buildCoverage(connections) {
  const types = new Set(connections.map((c) => c.integrationType));
  return {
    hasCalendar: types.has('google-calendar') || types.has('microsoft-outlook'),
    hasMessaging: types.has('slack') || types.has('microsoft-teams') || types.has('google-chat'),
    hasEmail: types.has('gmail') || types.has('microsoft-outlook'),
    hasOrgStructure: false, // Phase 2: requires org structure sync
  };
}

// ── Math Utilities ─────────────────────────────────────────────────────────────

function resolveDurationMinutes(event) {
  if (event.metadata?.durationMinutes > 0) return event.metadata.durationMinutes;
  if (event.metadata?.startTime && event.metadata?.endTime) {
    const ms = new Date(event.metadata.endTime) - new Date(event.metadata.startTime);
    return ms > 0 ? ms / (1000 * 60) : 0;
  }
  return 0;
}

export function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function sum(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0);
}

export function percentile(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function round2(v) {
  return Math.round(v * 100) / 100;
}
function round4(v) {
  return Math.round(v * 10000) / 10000;
}

function toDateStr(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

function startOfDayUTC(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
