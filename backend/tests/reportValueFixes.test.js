import { describe, expect, test } from '@jest/globals';
import { buildWorkConfig, buildLocalDayWindow, computeFocusBlocks } from '../services/engagementDailyAggregationService.js';
import { getTehnopolRecoveryDays, isEligibleTehnopolRecovery } from '../services/tehnopolMeasurementRecovery.js';

import {
  computeMeetingMetrics,
  computeMessagingMetrics,
  isOutsideWorkingHours,
  resolveTeamWorkSchedule,
} from '../services/integrationMetricsService.js';
import {
  extractPublicTeamPage,
  shouldAutoApplyTeamSuggestion,
  suggestPublicWebsiteUrl,
  validatePublicWebsiteUrl,
} from '../services/publicTeamEnrichmentService.js';
import {
  generateMonthlyEmailHTML,
  selectWeeklySnapshots,
} from '../services/monthlyReportService.js';

const objectId = (suffix) => `507f1f77bcf86cd7994390${suffix}`;

describe('messaging metric correctness', () => {
  test('counts hashed conversations without needing channel names or message bodies', () => {
    const date = new Date('2026-11-06T20:00:00Z');
    const events = [
      { source: 'microsoft-teams', eventType: 'message', timestamp: new Date('2026-11-06T08:00:00Z'), metadata: { channelHash: 'conversation-a' } },
      { source: 'microsoft-teams', eventType: 'message', timestamp: new Date('2026-11-06T09:00:00Z'), metadata: { channelHash: 'conversation-a' } },
      { source: 'microsoft-teams', eventType: 'message', timestamp: new Date('2026-11-06T16:00:00Z'), metadata: { channelHash: 'conversation-b' } },
    ];
    const result = computeMessagingMetrics(events, date, {
      timezone: 'Europe/Tallinn',
      workdayStart: '09:00',
      workdayEnd: '17:00',
    });
    expect(result.messageCount7d).toBe(3);
    expect(result.uniqueChannels7d).toBe(2);
    expect(result.afterHoursMessageCount).toBe(1);
  });

  test('inherits the organisation timezone and hours when team overrides are absent', () => {
    const org = { timezone: 'Europe/Tallinn', workdayStart: '08:30', workdayEnd: '17:30' };
    expect(resolveTeamWorkSchedule({ workConfig: {} }, org)).toEqual(org);
    const override = resolveTeamWorkSchedule({ timezone: 'Europe/Helsinki', workConfig: { workdayStart: '10:00' } }, org);
    expect(override).toEqual({ timezone: 'Europe/Helsinki', workdayStart: '10:00', workdayEnd: '17:30' });
  });
});

describe('Tehnopol bounded reporting recovery', () => {
  test('accepts only canonical active Tallinn tenant with both Microsoft sources', () => {
    const good = {
      _id: '6a509c2e85ba56cdc945b3c7',
      domain: 'tehnopol.ee',
      lifecycleStatus: 'active',
      settings: { timezone: 'Europe/Tallinn' },
      integrations: { microsoft: { tenantId: 'tenant-id', scope: 'both' } },
    };
    expect(isEligibleTehnopolRecovery(good)).toBe(true);
    expect(isEligibleTehnopolRecovery({ ...good, settings: { timezone: 'UTC' } })).toBe(false);
    expect(isEligibleTehnopolRecovery({ ...good, _id: '6aaa75e4f457f5b1015dd4d7' })).toBe(false);
    expect(isEligibleTehnopolRecovery({ ...good, lifecycleStatus: 'retired' })).toBe(false);
  });

  test('uses 21 days of source evidence for 14 days of rolling metrics', () => {
    const range = getTehnopolRecoveryDays(new Date('2026-11-06T09:00:00Z'));
    expect(range.sourceSince.toISOString()).toBe('2026-10-16T00:00:00.000Z');
    expect(range.firstDay.toISOString()).toBe('2026-10-23T00:00:00.000Z');
    expect(range.lastDay.toISOString()).toBe('2026-11-05T00:00:00.000Z');
  });
});

describe('engagement local-day windows and focus gaps', () => {
  test('local day query uses Tallinn day boundaries across winter and summer', () => {
    const winter = buildLocalDayWindow('2026-11-02', 'Europe/Tallinn');
    expect(winter.start.toISOString()).toBe('2026-11-01T22:00:00.000Z');
    expect(winter.end.toISOString()).toBe('2026-11-02T22:00:00.000Z');
    const summer = buildLocalDayWindow('2026-07-02', 'Europe/Tallinn');
    expect(summer.start.toISOString()).toBe('2026-07-01T21:00:00.000Z');
    expect(summer.end.toISOString()).toBe('2026-07-02T21:00:00.000Z');
    const dst = buildLocalDayWindow('2026-10-25', 'Europe/Tallinn');
    expect((dst.end - dst.start) / 3600000).toBe(25);
  });

  test('focus gaps use the sorted timeline and Tallinn clock rather than UTC', () => {
    const config = buildWorkConfig({ timezone: 'Europe/Tallinn', workConfig: {
      workdayStart: '09:00', workdayEnd: '17:00',
    } });
    const blocks = computeFocusBlocks([
      { startMs: Date.parse('2026-11-02T08:00:00Z'), endMs: Date.parse('2026-11-02T09:00:00Z') },
      { startMs: Date.parse('2026-11-02T11:00:00Z'), endMs: Date.parse('2026-11-02T12:00:00Z') },
    ], config, '2026-11-02');
    expect(blocks).toEqual([120, 180]);
  });
});

describe('engagement metric timezone', () => {
  test('inherits confirmed Tallinn timezone from organisation when team carries UTC schema default', () => {
    const config = buildWorkConfig(
      { timezone: 'UTC', workConfig: { workdayStart: '09:00', workdayEnd: '17:00' } },
      { timezone: 'Europe/Tallinn' }
    );
    expect(config.timezone).toBe('Europe/Tallinn');
    expect(config.workStartMinute).toBe(540);
    expect(config.workEndMinute).toBe(1020);
  });

  test('preserves explicit team timezone and minute-precision schedule', () => {
    const config = buildWorkConfig(
      { timezone: 'Europe/Helsinki', workConfig: { workdayStart: '08:30', workdayEnd: '16:45' } },
      { timezone: 'Europe/Tallinn' }
    );
    expect(config.timezone).toBe('Europe/Helsinki');
    expect(config.workStartMinute).toBe(510);
    expect(config.workEndMinute).toBe(1005);
  });
});

describe('meeting semantics', () => {
  test('deduplicates attendee-expanded meetings and detects back-to-back blocks per person', () => {
    const date = new Date('2026-08-03T12:00:00.000Z');
    const meeting = ({ id, actor, start, end }) => ({
      source: 'microsoft-outlook',
      eventType: 'meeting',
      actorUserId: objectId(actor),
      timestamp: new Date(start),
      externalId: `outlook-${id}-${objectId(actor)}`,
      metadata: {
        meetingInstanceIdHash: id,
        startTime: new Date(start),
        endTime: new Date(end),
        durationMinutes: 60,
      },
    });
    const events = [
      meeting({
        id: 'shared-a',
        actor: '01',
        start: '2026-08-03T08:00:00Z',
        end: '2026-08-03T09:00:00Z',
      }),
      meeting({
        id: 'shared-a',
        actor: '02',
        start: '2026-08-03T08:00:00Z',
        end: '2026-08-03T09:00:00Z',
      }),
      meeting({
        id: 'actor-one-b',
        actor: '01',
        start: '2026-08-03T09:00:00Z',
        end: '2026-08-03T10:00:00Z',
      }),
      meeting({
        id: 'actor-two-b',
        actor: '02',
        start: '2026-08-03T10:00:00Z',
        end: '2026-08-03T11:00:00Z',
      }),
    ];

    const result = computeMeetingMetrics(events, date);

    expect(result.meetingInstanceCount7d).toBe(3);
    expect(result.meetingParticipantHours7d).toBe(4);
    expect(result.backToBackMeetingBlocks).toBe(1);
  });

  test('excludes cancelled, declined and free meetings and duplicate mailbox rows', () => {
    const date = new Date('2026-11-02T12:00:00Z');
    const meeting = (id, metadata = {}) => ({
      source: 'microsoft-outlook',
      eventType: 'meeting',
      actorUserId: objectId('01'),
      externalId: `outlook-${id}`,
      timestamp: new Date('2026-11-02T08:00:00Z'),
      metadata: { meetingInstanceIdHash: id, durationMinutes: 60, ...metadata },
    });
    const result = computeMeetingMetrics(
      [
        meeting('same'),
        meeting('same'),
        meeting('declined', { attendeeResponseStatus: 'declined' }),
        meeting('cancelled', { isCancelled: true }),
        meeting('free', { isFreeCalendarEvent: true }),
      ],
      date
    );
    expect(result.meetingCount7d).toBe(1);
    expect(result.meetingParticipantHours7d).toBe(1);
  });

  test('reports only observed meeting-free gaps and recurring load', () => {
    const date = new Date('2026-11-02T12:00:00Z');
    const meeting = (id, start, end, metadata = {}) => ({
      source: 'microsoft-outlook',
      eventType: 'meeting',
      actorUserId: objectId('01'),
      externalId: `outlook-${id}`,
      timestamp: new Date(start),
      metadata: {
        meetingInstanceIdHash: id,
        startTime: new Date(start),
        endTime: new Date(end),
        ...metadata,
      },
    });
    const result = computeMeetingMetrics(
      [
        meeting('a', '2026-11-02T07:00:00Z', '2026-11-02T08:00:00Z'),
        meeting('b', '2026-11-02T10:00:00Z', '2026-11-02T11:00:00Z', {
          isRecurring: true,
        }),
      ],
      date,
      { timezone: 'Europe/Tallinn', workdayStart: '09:00', workdayEnd: '17:00' }
    );
    expect(result.focusTimeAvailabilityHours).toBe(2);
    expect(result.focusTimeBlocks).toBe(1);
    expect(result.calendarDaysObserved).toBe(1);
    expect(result.recurringMeetingBurden).toBeCloseTo(0.5);
    expect(result.afterHoursMeetingCount7d).toBe(0);
  });

  test('excludes evenings and weekends from observed meeting-free work gaps', () => {
    const date = new Date('2026-11-02T12:00:00Z');
    const meeting = (id, start, end) => ({
      source: 'microsoft-outlook',
      eventType: 'meeting',
      actorUserId: objectId('01'),
      externalId: `outlook-${id}`,
      timestamp: new Date(start),
      metadata: {
        meetingInstanceIdHash: id,
        startTime: new Date(start),
        endTime: new Date(end),
      },
    });
    const result = computeMeetingMetrics(
      [
        meeting('early', '2026-11-02T05:00:00Z', '2026-11-02T06:00:00Z'),
        meeting('late', '2026-11-02T17:00:00Z', '2026-11-02T18:00:00Z'),
      ],
      date,
      { timezone: 'Europe/Tallinn', workdayStart: '09:00', workdayEnd: '17:00' }
    );
    expect(result.focusTimeAvailabilityHours).toBe(8);
    expect(result.focusTimeBlocks).toBe(1);
    expect(result.afterHoursMeetingCount7d).toBe(2);
  });

  test('uses the configured IANA timezone and working hours', () => {
    const timestamp = '2026-01-05T07:30:00.000Z';
    expect(
      isOutsideWorkingHours(timestamp, {
        timezone: 'Europe/Tallinn',
        workdayStart: '09:00',
        workdayEnd: '17:00',
      })
    ).toBe(false);
    expect(
      isOutsideWorkingHours(timestamp, {
        timezone: 'UTC',
        workdayStart: '09:00',
        workdayEnd: '17:00',
      })
    ).toBe(true);
  });

  test('uses internal attendee counts for legacy aggregate calendar rows', () => {
    const result = computeMeetingMetrics(
      [
        {
          source: 'google-calendar',
          eventType: 'meeting',
          timestamp: new Date('2026-08-03T09:00:00Z'),
          externalId: 'legacy-google-row',
          metadata: {
            durationMinutes: 60,
            internalAttendeeCount: 3,
          },
        },
      ],
      new Date('2026-08-03T12:00:00Z')
    );

    expect(result.meetingInstanceCount7d).toBe(1);
    expect(result.meetingParticipantHours7d).toBe(3);
  });
});

describe('public company page enrichment', () => {
  test('extracts structured people and same-origin team links without page scripts', () => {
    const html = `
      <html><body>
        <nav><a href="/about/team">Meet our team</a></nav>
        <a href="https://elsewhere.example/team">Other team</a>
        <script>secret script text</script>
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"Person","name":"Ada Example","jobTitle":"VP Engineering","department":"Engineering"}
        </script>
        <main>We build workplace software.</main>
      </body></html>`;

    const result = extractPublicTeamPage(html, 'https://company.example/');

    expect(result.people).toEqual([
      { name: 'Ada Example', title: 'VP Engineering', team: 'Engineering' },
    ]);
    expect(result.candidateLinks).toEqual(['https://company.example/about/team']);
    expect(result.text).toContain('We build workplace software.');
    expect(result.text).not.toContain('secret script text');
  });

  test('extracts visible name and title cards linked by a public work email', () => {
    const html = `
      <div class="team-grid-item">
        <div class="name">Tanel Reino</div>
        <div class="position">Creative Director</div>
        <a href="mailto:tanel.reino@company.example">Email</a>
      </div>
      <footer>
        <span>Company contact information</span>
        <a href="mailto:info@company.example">Email us</a>
      </footer>`;

    const people = extractPublicTeamPage(html, 'https://company.example/about').people;
    expect(people).toHaveLength(1);
    expect(people).toContainEqual({
      name: 'Tanel Reino',
      title: 'Creative Director',
      team: 'Design',
    });
  });

  test('infers a homepage from a work email and limits automatic application to strong evidence', () => {
    expect(suggestPublicWebsiteUrl({ domain: 'company', email: 'owner@company.example' })).toBe(
      'https://company.example'
    );
    expect(suggestPublicWebsiteUrl({ email: 'owner@gmail.com' })).toBe('');
    expect(shouldAutoApplyTeamSuggestion({ confidence: 92, sourceType: 'public_website' })).toBe(
      true
    );
    expect(
      shouldAutoApplyTeamSuggestion({ confidence: 90, sourceType: 'ai_title_inference' })
    ).toBe(false);
  });

  test('rejects LinkedIn crawling and private hosts', async () => {
    await expect(
      validatePublicWebsiteUrl('https://www.linkedin.com/company/example')
    ).rejects.toThrow('LinkedIn pages cannot be crawled');
    await expect(validatePublicWebsiteUrl('http://localhost/team')).rejects.toThrow(
      'publicly reachable'
    );
  });
});

describe('monthly report trust', () => {
  test('selects one latest rolling record per week', () => {
    const records = [
      { date: new Date('2026-07-06T08:00:00Z'), meetingCount7d: 10 },
      { date: new Date('2026-07-10T08:00:00Z'), meetingCount7d: 20 },
      { date: new Date('2026-07-13T08:00:00Z'), meetingCount7d: 30 },
      { date: new Date('2026-07-17T08:00:00Z'), meetingCount7d: 40 },
      { date: new Date('2026-07-24T08:00:00Z'), meetingCount7d: 50 },
    ];

    expect(selectWeeklySnapshots(records).map((record) => record.meetingCount7d)).toEqual([
      20, 40, 50,
    ]);
  });

  test('setup email pauses conclusions and gives a concrete recovery path', () => {
    const html = generateMonthlyEmailHTML({
      org: { name: 'Example Org' },
      report: {
        reportMode: 'setup',
        periodStart: new Date('2026-07-01'),
        periodEnd: new Date('2026-08-01'),
        dataReadiness: {
          mappedUsers: 24,
          totalUsers: 93,
          readyTeams: 0,
          eligibleTeams: 6,
          weeklySnapshots: 2,
          minimumTeamSize: 5,
        },
      },
    });

    expect(html).toContain('Leadership conclusions are paused');
    expect(html).toContain('Review team setup');
    expect(html).not.toContain('Turnover Risk');
  });

  test('decision email leads with measured outcomes and avoids unsupported causal claims', () => {
    const html = generateMonthlyEmailHTML({
      org: { name: 'Example Org' },
      report: {
        reportMode: 'decision',
        periodStart: new Date('2026-07-01'),
        periodEnd: new Date('2026-08-01'),
        dataReadiness: { weeklySnapshots: 4 },
        orgHealth: {
          avgMeetingHoursWeekly: 120,
          avgMeetingCount: 45,
          avgBackToBackBlocks: 12,
          avgAfterHoursPct: 18,
          bdiTrend: 'stable',
        },
        persistentRisks: [
          {
            riskType: 'overload',
            weeksAboveThreshold: 3,
            avgScore: 65,
            affectedTeams: [{ teamName: 'Engineering' }],
          },
        ],
        engagementSignals: { teamsInStrain: 1, avgStrainRisk: 42 },
        actionOutcomes: {
          active: 0,
          items: [
            {
              title: 'Meeting reset',
              teamName: 'Engineering',
              percentChange: -18,
              improved: true,
            },
          ],
        },
      },
    });

    expect(html).toContain("Did last month's actions work?");
    expect(html).toContain('Meeting reset');
    expect(html).toContain('Owner:');
    expect(html).toContain('Team-level metadata only');
    expect(html).not.toContain('Methods and limits');
    expect(html).not.toContain('Conditions Score');
    expect(html).not.toContain('Turnover Risk');
    expect(html).not.toContain('attrition within 6 months');
    expect(html).not.toContain('Replacing a single senior employee');
  });
});
