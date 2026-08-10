import { afterEach, describe, expect, jest, test } from '@jest/globals';
import {
  checkTeamSize,
  MIN_METRIC_CONTRIBUTORS,
  MIN_TEAM_SIZE,
  suppressMetricIfTooFew,
} from '../utils/privacyGate.js';
import {
  classifyEmployeeCandidate,
  classifyUserDirectoryRecord,
} from '../utils/employeeIdentity.js';
import { normalizeDepartmentName } from '../services/employeeSyncService.js';
import {
  fetchGraphCollection,
  GoogleCalendarAdapter,
} from '../services/coreIntegrationAdapters.js';
import {
  getNextWeeklyRun,
  getPreviousWeekStart,
  getWeekStart,
} from '../services/weeklySchedulerService.js';
import { calculateConfidenceScore } from '../services/engagementScoringService.js';
import Team from '../models/team.js';
import User from '../models/user.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('small-team configuration', () => {
  test('enforces the five-person privacy floor by default', () => {
    expect(MIN_TEAM_SIZE).toBe(5);
    expect(MIN_METRIC_CONTRIBUTORS).toBe(5);
    expect(checkTeamSize(1)).toBe(false);
    expect(checkTeamSize(4)).toBe(false);
    expect(checkTeamSize(5)).toBe(true);
    expect(suppressMetricIfTooFew(4)).toBe(true);
  });

  test('new teams are active by default', () => {
    const team = new Team({ name: 'Nobel team', orgId: '507f1f77bcf86cd799439011' });
    expect(team.isActive).toBe(true);
  });
});

describe('directory mapping', () => {
  test('normalizes department names without inventing a department', () => {
    expect(normalizeDepartmentName('  Customer   Success ')).toBe('Customer Success');
    expect(normalizeDepartmentName('Customer Success\u200B')).toBe('Customer Success');
    expect(normalizeDepartmentName('   ')).toBeNull();
    expect(normalizeDepartmentName(null)).toBeNull();
  });

  test('accepts only real employees with first name and surname', () => {
    expect(
      classifyEmployeeCandidate({
        email: 'ada@example.com',
        displayName: 'Ada Lovelace',
      })
    ).toMatchObject({
      ok: true,
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    expect(
      classifyEmployeeCandidate({
        email: 'room-4@example.com',
        displayName: 'Meeting Room 4',
      })
    ).toMatchObject({
      ok: false,
      reason: 'non_employee_resource_or_service_account',
    });

    expect(
      classifyEmployeeCandidate({
        email: 'support@example.com',
        displayName: 'Support',
      })
    ).toMatchObject({
      ok: false,
      reason: 'non_employee_resource_or_service_account',
    });

    expect(
      classifyEmployeeCandidate({
        email: 'prince@example.com',
        displayName: 'Prince',
      })
    ).toMatchObject({
      ok: false,
      reason: 'missing_first_name_or_surname',
    });
  });

  test('rejects Microsoft resource names that look like two-word display names', () => {
    const invalidMicrosoftRows = [
      ['ISE - Iseturundaja.ee äriklienditugi', 'iseturundajaeeriklienditugi@nobeldigital.ee'],
      ['Nobel bookings test', 'nobelbookingstest@nobeldigital.ee'],
      ['Seo Haldus', 'seo.haldus@nobeldigital.ee'],
      ['Seo kalender', 'seo_kalender@nobeldigital.ee'],
      ['SyncMe - Klienditugi', 'sync_me@nobeldigital.ee'],
      ['Tasuta 1-tunnine konsultatsioon', 'tasuta1tunninekonsultatsioon@nobeldigital.ee'],
      ['Videokonsultatsioon (Johann)', 'broneerivideokonsultatsioon@nobeldigital.ee'],
    ];

    for (const [displayName, email] of invalidMicrosoftRows) {
      expect(
        classifyEmployeeCandidate({
          email,
          displayName,
        })
      ).toMatchObject({
        ok: false,
        reason: 'non_employee_resource_or_service_account',
      });
    }

    expect(
      classifyEmployeeCandidate({
        email: 'karola.mitt@nobeldigital.ee',
        firstName: 'Karola',
        lastName: 'Mitt',
        displayName: 'Karola Mitt',
      })
    ).toMatchObject({
      ok: true,
      firstName: 'Karola',
      lastName: 'Mitt',
    });
  });

  test('can require source-provided first name and surname for Microsoft users', () => {
    expect(
      classifyEmployeeCandidate(
        {
          email: 'ada@example.com',
          displayName: 'Ada Lovelace',
        },
        { requireExplicitNameParts: true }
      )
    ).toMatchObject({
      ok: false,
      reason: 'missing_first_name_or_surname',
    });

    expect(
      classifyEmployeeCandidate(
        {
          email: 'ada@example.com',
          firstName: 'Ada',
          lastName: 'Lovelace',
          displayName: 'Ada Lovelace',
        },
        { requireExplicitNameParts: true }
      )
    ).toMatchObject({
      ok: true,
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
  });

  test('existing Microsoft records can be cleaned without deleting real display names', () => {
    expect(
      classifyUserDirectoryRecord({
        email: 'alo.latt@nobeldigital.ee',
        name: 'Alo Lätt',
        source: 'microsoft',
        profile: { department: 'Klienditugi' },
      })
    ).toMatchObject({
      ok: true,
      firstName: 'Alo',
      lastName: 'Lätt',
    });

    expect(
      classifyUserDirectoryRecord({
        email: 'seo.haldus@nobeldigital.ee',
        name: 'Seo Haldus',
        source: 'microsoft',
      })
    ).toMatchObject({
      ok: false,
      reason: 'non_employee_resource_or_service_account',
    });
  });
});

describe('Microsoft Graph pagination', () => {
  test('follows next links and combines every page', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [{ id: 'one' }], '@odata.nextLink': 'page-2' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [{ id: 'two' }] }),
      });

    await expect(fetchGraphCollection('page-1', 'token')).resolves.toEqual([
      { id: 'one' },
      { id: 'two' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith('page-2', {
      headers: { Authorization: 'Bearer token' },
      signal: expect.any(Object),
    });
  });
});

describe('Google Calendar attribution', () => {
  test('expands a meeting to mapped internal attendees without storing their emails', async () => {
    jest.spyOn(User, 'find').mockReturnValue({
      select: () => ({
        lean: async () => [
          {
            _id: '507f1f77bcf86cd799439011',
            email: 'ada@example.com',
            teamId: '507f1f77bcf86cd799439021',
          },
          {
            _id: '507f1f77bcf86cd799439012',
            email: 'grace@example.com',
            teamId: '507f1f77bcf86cd799439021',
          },
        ],
      }),
    });
    const adapter = new GoogleCalendarAdapter();
    const events = await adapter.transformToWorkEvents(
      [
        {
          id: 'meeting-1',
          start: { dateTime: '2026-08-03T09:00:00Z' },
          end: { dateTime: '2026-08-03T10:00:00Z' },
          organizer: { email: 'ada@example.com' },
          attendees: [
            { email: 'ada@example.com' },
            { email: 'grace@example.com' },
            { email: 'client@outside.example' },
          ],
        },
      ],
      '507f1f77bcf86cd799439001'
    );

    expect(events).toHaveLength(2);
    expect(events.map((event) => String(event.actorUserId))).toEqual([
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
    ]);
    expect(events[0].metadata.organizer).toBeUndefined();
    expect(events[0].metadata.organizerHash).toHaveLength(64);
    expect(events[0].metadata.externalAttendeeCount).toBe(1);
  });
});

describe('weekly reporting period', () => {
  test('selects the previous completed week', () => {
    const thursday = new Date('2026-06-11T12:00:00Z');
    const current = getWeekStart(thursday);
    const previous = getPreviousWeekStart(thursday);
    expect([
      current.getFullYear(),
      current.getMonth(),
      current.getDate(),
      current.getDay(),
    ]).toEqual([2026, 5, 8, 1]);
    expect([
      previous.getFullYear(),
      previous.getMonth(),
      previous.getDate(),
      previous.getDay(),
    ]).toEqual([2026, 5, 1, 1]);
  });

  test('schedules the current Monday when startup is before 5:30', () => {
    const beforeRun = new Date(2026, 5, 8, 4, 0, 0);
    const next = getNextWeeklyRun(beforeRun);
    expect([next.getDate(), next.getDay(), next.getHours(), next.getMinutes()]).toEqual([
      8, 1, 5, 30,
    ]);
  });
});

describe('confidence scoring', () => {
  test('uses the accepted organization minimum for an eligible team', () => {
    const input = {
      baseline: { baselineQuality: { qualityScore: 80 } },
      weeklyMetrics: { activitySpikeDays: 0 },
      activePeopleCount: 5,
      integrationCoverage: { hasCalendar: true },
      subscores: { recoveryDebt: 30, focusErosion: 35 },
    };
    const accepted = calculateConfidenceScore({ ...input, minimumTeamSize: 5 });
    const belowPolicy = calculateConfidenceScore({ ...input, minimumTeamSize: 8 });
    expect(accepted.score).toBeGreaterThan(belowPolicy.score);
  });
});
