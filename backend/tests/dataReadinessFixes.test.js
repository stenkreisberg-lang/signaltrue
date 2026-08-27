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
import { normalizeDepartmentName, resolveOrgWorkDomain } from '../services/employeeSyncService.js';
import { isValidIanaTimezone, normalizeWorkEmailDomain } from '../utils/organizationIdentity.js';
import {
  classifyMicrosoftSyncError,
  fetchGraphCollection,
  GoogleCalendarAdapter,
  GoogleChatAdapter,
  isUnavailableMicrosoftMailboxError,
  MicrosoftAdapter,
  SlackAdapter,
  syncCoreIntegrations,
} from '../services/coreIntegrationAdapters.js';
import {
  getNextWeeklyRun,
  getPreviousWeekStart,
  getWeekStart,
} from '../services/weeklySchedulerService.js';
import { calculateConfidenceScore } from '../services/engagementScoringService.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import Organization from '../models/organizationModel.js';
import IntegrationConnection from '../models/integrationConnection.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('organization identity setup', () => {
  test('preserves the complete work-email domain', () => {
    expect(normalizeWorkEmailDomain('Helen@Tehnopol.EE')).toBe('tehnopol.ee');
    expect(normalizeWorkEmailDomain('admin@csc.ee')).toBe('csc.ee');
    expect(normalizeWorkEmailDomain('not-an-email')).toBeNull();
  });

  test('accepts IANA timezones and rejects ambiguous values', () => {
    expect(isValidIanaTimezone('Europe/Tallinn')).toBe(true);
    expect(isValidIanaTimezone('UTC')).toBe(true);
    expect(isValidIanaTimezone('Tallinn time')).toBe(false);
  });

  test('resolves the organization work-email domain for external filtering', () => {
    expect(resolveOrgWorkDomain({ domain: 'Tehnopol.EE' })).toBe('tehnopol.ee');
    expect(resolveOrgWorkDomain({ domain: '@tehnopol.ee' })).toBe('tehnopol.ee');
    expect(resolveOrgWorkDomain({})).toBeNull();
    expect(resolveOrgWorkDomain(null)).toBeNull();
  });
});

describe('small-team configuration', () => {
  test('enforces the five-person operational privacy floor by default', () => {
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

describe('metadata-only collaboration transforms', () => {
  test('Slack adapter stores hashed metadata without message text or channel names', async () => {
    const adapter = new SlackAdapter();
    const [event] = await adapter.transformToWorkEvents(
      [
        {
          ts: '1780000000.000100',
          user: 'U123',
          channelId: 'C123',
          channelType: 'private',
          thread_ts: '1780000000.000000',
          text: 'This body must not be stored',
          reactions: [{ name: 'thumbsup' }],
        },
      ],
      '507f1f77bcf86cd799439001'
    );

    expect(event.metadata.slackUserId).toBe('U123');
    expect(event.metadata.channelHash).toHaveLength(64);
    expect(event.metadata.channelName).toBeUndefined();
    expect(event.metadata.messageLengthBucket).toBe('short');
    expect(event.raw).toEqual({ ts: '1780000000.000100' });
  });

  test('Google Chat adapter stores hashed metadata without sender names or message text', async () => {
    const adapter = new GoogleChatAdapter();
    const [event] = await adapter.transformToWorkEvents(
      [
        {
          name: 'spaces/AAA/messages/BBB',
          createTime: '2026-08-03T09:00:00Z',
          sender: { name: 'users/123', displayName: 'Ada Lovelace', type: 'HUMAN' },
          spaceId: 'spaces/AAA',
          spaceType: 'SPACE',
          thread: { name: 'spaces/AAA/threads/TTT' },
          text: 'This body must not be stored either',
          attachment: [{}],
        },
      ],
      '507f1f77bcf86cd799439001'
    );

    expect(event.metadata.googleUserId).toBe('users/123');
    expect(event.metadata.channelHash).toHaveLength(64);
    expect(event.metadata.senderName).toBeUndefined();
    expect(event.metadata.messageLengthBucket).toBe('short');
    expect(event.metadata.hasAttachment).toBe(true);
    expect(event.raw).toEqual({ name: 'spaces/AAA/messages/BBB' });
  });
});

describe('directory mapping', () => {
  test('normalizes department names without inventing a department', () => {
    expect(normalizeDepartmentName('  Customer   Success ')).toBe('Customer Success');
    expect(normalizeDepartmentName('Customer Success\u200B')).toBe('Customer Success');
    expect(normalizeDepartmentName('IT osakond')).toBe('IT');
    expect(normalizeDepartmentName('it')).toBe('IT');
    expect(normalizeDepartmentName('Operations Department')).toBe('Operations');
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
        email: 'backup.user@example.com',
        displayName: 'Backup User',
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

  test('rejects Tehnopol resource and role mailboxes, keeps real people', () => {
    const invalidTehnopolRows = [
      ['Google Kalendar', 'google.kalendar@tehnopol.ee'],
      ['Tehnopol Intune', 'intune@tehnopol.ee'],
      ['Tehnopol Arved', 'tehnopol.arved@tehnopol.ee'],
      ['Tehnopol Incubator', 'tehnopolincubator@tehnopol.ee'],
      ['Web Expert', 'web.expert@tehnopol.ee'],
      ['esitlus mac', 'mac1@tehnopol.ee'],
      ['esitlus mac', 'mac2@tehnopol.ee'],
      ['adm pavel', 'adm.pavel@tehnopol.ee'],
      ['Koosolekud', 'koosolekud@tehnopol.ee'],
    ];

    for (const [displayName, email] of invalidTehnopolRows) {
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
        email: 'agnes.roos@tehnopol.ee',
        firstName: 'Agnes',
        lastName: 'Roos',
        displayName: 'Agnes Roos',
      })
    ).toMatchObject({
      ok: true,
      firstName: 'Agnes',
      lastName: 'Roos',
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

  test('returns a safe provider code without leaking Graph response details', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({
          error: {
            code: 'MailboxNotEnabledForRESTAPI',
            message: 'person@example.com is inactive',
          },
        }),
    });

    await expect(
      fetchGraphCollection('https://graph.microsoft.com/test', 'token')
    ).rejects.toMatchObject({
      status: 404,
      graphCode: 'MailboxNotEnabledForRESTAPI',
      message: 'Microsoft Graph 404 (MailboxNotEnabledForRESTAPI)',
    });
    try {
      await fetchGraphCollection('https://graph.microsoft.com/test', 'token');
    } catch (error) {
      expect(error.message).not.toContain('person@example.com');
      expect(isUnavailableMicrosoftMailboxError(error)).toBe(true);
    }
  });
});

describe('Microsoft synchronization state', () => {
  test('classifies expired authorization as a reconnect-required failure', () => {
    expect(
      classifyMicrosoftSyncError(new Error('AADSTS700082: refresh token has expired'))
    ).toEqual(
      expect.objectContaining({
        kind: 'reauthorization_required',
        status: 'error',
        disableSync: true,
      })
    );
  });

  test('writes canonical successful sync fields', async () => {
    const update = jest.spyOn(Organization, 'findByIdAndUpdate').mockResolvedValue({});
    const adapter = new MicrosoftAdapter();

    await adapter.updateSyncStatus('507f1f77bcf86cd799439001', true, 12);

    expect(update).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439001',
      expect.objectContaining({
        $set: expect.objectContaining({
          'integrations.microsoft.sync.lastStatus': 'ok',
          'integrations.microsoft.sync.error': null,
          'integrations.microsoft.sync.eventsCount': 12,
          'integrations.microsoft.sync.lastRunAt': expect.any(Date),
          'integrations.microsoft.sync.lastSync': expect.any(Date),
        }),
      })
    );
  });

  test('pauses an expired connection and records a reconnect action', async () => {
    jest.spyOn(Organization, 'findByIdAndUpdate').mockResolvedValue({});
    jest.spyOn(Organization, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ integrations: { microsoft: { scope: 'teams' } } }) }),
    });
    const connectionUpdate = jest
      .spyOn(IntegrationConnection, 'findOneAndUpdate')
      .mockResolvedValue({});
    const adapter = new MicrosoftAdapter();

    await adapter.updateSyncStatus(
      '507f1f77bcf86cd799439001',
      false,
      0,
      new Error('AADSTS700082: refresh token has expired')
    );

    expect(connectionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ integrationType: 'microsoft-teams' }),
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'error',
          'sync.enabled': false,
          'sync.lastSyncStatus': 'failed',
        }),
      }),
      { upsert: true }
    );
  });

  test('does not schedule a Microsoft adapter after synchronization is disabled', async () => {
    jest.spyOn(Organization, 'findById').mockReturnValue({
      lean: async () => ({
        integrations: {
          microsoft: {
            accessToken: 'encrypted-token',
            sync: { enabled: false },
          },
        },
      }),
    });

    await expect(
      syncCoreIntegrations(
        '507f1f77bcf86cd799439001',
        new Date('2026-08-27T06:00:00Z'),
        new Date('2026-08-27T07:00:00Z')
      )
    ).resolves.toEqual([]);
  });
});

describe('Slack channel access', () => {
  test('does not request history for channels the app has not joined', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          channels: [
            { id: 'joined', is_member: true },
            { id: 'not-joined', is_member: false },
          ],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ ok: true, messages: [] }),
      });

    const events = await new SlackAdapter().fetchEvents(
      null,
      'token',
      new Date('2026-08-27T06:00:00Z'),
      new Date('2026-08-27T07:00:00Z')
    );

    expect(events).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('channel=joined');
    expect(info).toHaveBeenCalledWith('[Slack] Skipped 1 channels because the app is not a member');
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
