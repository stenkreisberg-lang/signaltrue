import { describe, expect, test } from '@jest/globals';
import {
  computeMeetingMetrics,
  isOutsideWorkingHours,
} from '../services/integrationMetricsService.js';
import {
  extractPublicTeamPage,
  validatePublicWebsiteUrl,
} from '../services/publicTeamEnrichmentService.js';
import {
  generateMonthlyEmailHTML,
  selectWeeklySnapshots,
} from '../services/monthlyReportService.js';

const objectId = (suffix) => `507f1f77bcf86cd7994390${suffix}`;

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
        <a href="/about/team">Meet our team</a>
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
        engagementSignals: { teamsInStrain: 1, avgConditionsScore: 42 },
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
    expect(html).not.toContain('attrition within 6 months');
    expect(html).not.toContain('Replacing a single senior employee');
  });
});
