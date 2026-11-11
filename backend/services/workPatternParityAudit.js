import { computeMeetingMetrics, computeMessagingMetrics } from './integrationMetricsService.js';

const trackedFields = [
  ['meetingInstanceCount7d', 'meetingInstanceCount7d', 'calendar', 0],
  ['meetingDurationTotalHours7d', 'meetingDurationTotalHours7d', 'calendar', 0.05],
  ['messageCount7d', 'messageCount7d', 'messaging', 0],
  ['afterHoursMessageRatio', 'afterHoursMessageRatio', 'messaging', 0.001],
  ['focusTimeAvailabilityHours', 'focusTimeAvailabilityHours', 'calendar', 0.05],
];

/** Recompute only content-free aggregate evidence with the same UTC rolling
 * seven-day definition used by IntegrationMetricsDaily. This makes reports
 * auditable without logging people, messages, meeting subjects or event IDs.
 */
export function compareStoredWorkPatternMetrics({ events = [], snapshot, workSchedule }) {
  if (!snapshot?.date) return { status: 'NO_SNAPSHOT', checks: [], period: null };
  const day = new Date(snapshot.date);
  if (!Number.isFinite(day.getTime())) return { status: 'INVALID_DATE', checks: [], period: null };
  day.setUTCHours(0, 0, 0, 0);
  const start = new Date(day.getTime() - 6 * 86400000);
  const end = new Date(day.getTime() + 86400000);
  const matchedEvents = events.filter(e => {
    const t = new Date(e.timestamp).getTime();
    return Number.isFinite(t) && t >= start.getTime() && t < end.getTime();
  });
  // The canonical calculator accepts explicit meeting events even when they
  // originate in a collaboration source (e.g. Teams). Filtering only Outlook
  // here incorrectly reports a discrepancy against a correctly computed
  // org-wide meeting snapshot.
  const calendarEventSources = ['microsoft-outlook', 'google-calendar', 'calendar', 'meet'];
  const calendarEvents = matchedEvents.filter(e =>
    e.eventType === 'meeting' ||
    (e.eventType === 'meet_started' && calendarEventSources.includes(e.source)));
  // Match computeMessagingMetrics exactly. In particular, its current
  // implementation includes every event from a messaging source, even when
  // that event has a different type. The audit should expose any such
  // unexpected rows rather than silently narrow the denominator.
  const messagingSources = ['microsoft-teams', 'slack', 'google-chat'];
  const messageEvents = matchedEvents.filter(e =>
    messagingSources.includes(e.source) || e.eventType === 'message');
  const meeting = calendarEvents.length ? computeMeetingMetrics(calendarEvents, day, workSchedule) : {};
  const messaging = messageEvents.length ? computeMessagingMetrics(messageEvents, day, workSchedule) : {};
  const checks = trackedFields.map(([field, metric, source, tolerance]) => {
    const stored = snapshot[field];
    const recalculated = source === 'calendar' ? meeting[metric] : messaging[metric];
    const observed = source === 'calendar' ? calendarEvents.length : messageEvents.length;
    const complete = typeof stored === 'number' && Number.isFinite(stored) &&
      typeof recalculated === 'number' && Number.isFinite(recalculated) && observed > 0;
    return {
      field,
      stored: complete ? stored : null,
      recomputed: complete ? recalculated : null,
      discrepancy: complete ? Number((recalculated - stored).toFixed(4)) : null,
      status: !complete ? 'UNVERIFIED' :
        Math.abs(recalculated - stored) <= tolerance ? 'PASS' : 'FAIL',
    };
  });
  return {
    status: checks.some(c => c.status === 'FAIL') ? 'FAIL' :
      checks.some(c => c.status !== 'PASS') ? 'INCOMPLETE' : 'PASS',
    period: { start: start.toISOString(), endExclusive: end.toISOString() },
    sourceEvidence: {
      calendarRows: calendarEvents.length,
      teamsOriginMeetingRows: calendarEvents.filter(e => e.source === 'microsoft-teams').length,
      outlookOriginMeetingRows: calendarEvents.filter(e => e.source === 'microsoft-outlook').length,
      otherOriginMeetingRows: calendarEvents.filter(e =>
        !['microsoft-outlook', 'microsoft-teams'].includes(e.source)).length,
      otherMeetingSources: [...new Set(calendarEvents
        .filter(e => !['microsoft-outlook', 'microsoft-teams'].includes(e.source))
        .map(e => e.source))].sort(),
      messagingRows: messageEvents.length,
      nonMessageRowsInMessagingSource: messageEvents.filter(e => e.eventType !== 'message').length,
      actorAttributedCalendarRows: calendarEvents.filter(e => e.actorUserId).length,
      actorAttributedMessagingRows: messageEvents.filter(e => e.actorUserId).length,
    },
    checks,
  };
}
