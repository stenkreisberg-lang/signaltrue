import { describe, expect, test } from '@jest/globals';
import { summarizeObservedTeamDays } from '../services/managerIntelligenceService.js';

const day = (overrides = {}) => ({
  activePeopleCount: 10,
  integrationCoverage: { hasCalendar: true, hasMessaging: true },
  measurementEvidence: { calendarEventCount: 2, messagingEventCount: 10 },
  calendar: { meetingCount: 2, meetingHoursPerPerson: 1,
    focusHoursAvailablePerPerson: 3, fragmentedDayRatio: 0.25,
    afterHoursMeetingCount: 1 },
  messaging: { messagesSentTotal: 10, afterHoursMessageRatio: 0.2 },
  ...overrides,
});

describe('manager work-pattern evidence never substitutes connected for observed', () => {
  test('uses only recorded events and weights after-hours proportions', () => {
    const result = summarizeObservedTeamDays([
      day(),
      day({ messaging: { messagesSentTotal: 30, afterHoursMessageRatio: 0.1 },
        measurementEvidence: { calendarEventCount: 2, messagingEventCount: 30 },
        calendar: { meetingCount: 2, meetingHoursPerPerson: 2,
          focusHoursAvailablePerPerson: 1, fragmentedDayRatio: 0.75,
          afterHoursMeetingCount: 0 } }),
      day({ activePeopleCount: 2, measurementEvidence: {calendarEventCount: 200,messagingEventCount: 200} }),
    ], 8);
    const byKey = Object.fromEntries(result.metrics.map(x => [x.key,x]));
    expect(result.provenance.calendarObservedDays).toBe(2);
    expect(result.provenance.messagingObservedDays).toBe(2);
    expect(byKey.meeting_hours.value).toBe(3);
    expect(byKey.focus_availability.value).toBe(4);
    expect(byKey.teams_messages.value).toBe(40);
    expect(byKey.after_hours_messages.value).toBe(13);
    expect(byKey.after_hours_meetings.value).toBe(25);
    expect(result.provenance.calendarComplete).toBe(false);
  });

  test('connected without observed events reports unavailable, not zero', () => {
    const result = summarizeObservedTeamDays([day({
      measurementEvidence: { calendarEventCount: 0, messagingEventCount: 0 },
    })], 8);
    expect(result.metrics.every(metric => metric.available === false && metric.value == null)).toBe(true);
    expect(result.provenance.calendarObservedDays).toBe(0);
  });
});
