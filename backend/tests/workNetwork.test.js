import { analyzeWorkNetwork, readWorkNetworkMetric } from '../services/workNetworkService.js';
import { calculateWorkNetworkOutcome } from '../services/workNetworkActionService.js';

const currentStart = new Date('2026-07-01T00:00:00.000Z');
const currentEnd = new Date('2026-07-29T00:00:00.000Z');
const previousStart = new Date('2026-06-03T00:00:00.000Z');

function team(_id, name) {
  return { _id, name, isActive: true, metadata: { function: name } };
}

function user(_id, teamId) {
  return { _id, email: `${_id}@example.com`, teamId, accountStatus: 'active' };
}

function teamForUser(userId) {
  if (userId.startsWith('e')) return 'eng';
  if (userId.startsWith('p')) return 'product';
  if (userId.startsWith('s')) return 'sales';
  return null;
}

function meeting(meetingId, actorUserId, timestamp = '2026-07-15T10:00:00.000Z', options = {}) {
  const organizerUserId = options.organizerUserId || actorUserId;
  return {
    source: 'microsoft-outlook',
    eventType: 'meeting',
    actorUserId,
    timestamp: new Date(timestamp),
    metadata: {
      meetingInstanceIdHash: meetingId,
      organizerUserId,
      organizerTeamId: options.organizerTeamId || teamForUser(organizerUserId),
      attendeeResponseStatus:
        actorUserId === organizerUserId
          ? 'organizer'
          : options.responses?.[actorUserId] || 'accepted',
      durationMinutes: 30,
      attendeeCount: 5,
      meetingType: 'cross_team',
    },
  };
}

function meetingCopies(meetingId, participants, options = {}) {
  return participants.map((participant) =>
    meeting(meetingId, participant, options.timestamp, options)
  );
}

function channelMessage(channelHash, actorUserId, index) {
  return {
    source: 'slack',
    eventType: 'message',
    actorUserId,
    timestamp: new Date(`2026-07-15T10:${String(index).padStart(2, '0')}:00.000Z`),
    metadata: {
      channelHash,
      threadIdHash: `${channelHash}:thread`,
    },
  };
}

function baseData() {
  const teams = [team('eng', 'Engineering'), team('product', 'Product'), team('sales', 'Sales')];
  const users = [
    ...Array.from({ length: 5 }, (_, index) => user(`e${index + 1}`, 'eng')),
    ...Array.from({ length: 5 }, (_, index) => user(`p${index + 1}`, 'product')),
    ...Array.from({ length: 5 }, (_, index) => user(`s${index + 1}`, 'sales')),
  ];
  const units = users.map((item) => ({ userId: item._id, teamId: item.teamId, effectiveTo: null }));
  units.find((item) => item.userId === 'p1').managerUserId = 'e1';
  return { teams, users, units };
}

function analyze(overrides = {}) {
  return analyzeWorkNetwork({
    orgId: 'org-1',
    ...baseData(),
    currentEvents: [],
    previousEvents: [],
    currentStart,
    currentEnd,
    previousStart,
    ...overrides,
  });
}

describe('Work Network analysis', () => {
  test('overlays formal links and identifies hidden, concentrated operating dependencies', () => {
    const formalParticipants = ['e1', 'e2', 'e3', 'p1', 'p2'];
    const hiddenParticipants = ['e1', 's1', 's2', 's3', 's4'];
    const currentEvents = [
      ...meetingCopies('formal-1', formalParticipants),
      ...meetingCopies('formal-2', formalParticipants),
      ...meetingCopies('hidden-1', hiddenParticipants),
      ...meetingCopies('hidden-2', hiddenParticipants),
      ...meetingCopies('hidden-3', hiddenParticipants),
      ...meetingCopies('hidden-4', hiddenParticipants),
      ...meetingCopies('hidden-5', hiddenParticipants),
    ];

    const result = analyze({ currentEvents });

    expect(result.readiness.ready).toBe(true);
    expect(result.formalEdges).toHaveLength(1);
    expect(result.actualEdges).toHaveLength(2);
    expect(result.actualEdges.find((edge) => edge.teamBName === 'Product').formalConnection).toBe(
      true
    );
    expect(result.insights.some((item) => item.type === 'hidden_dependency')).toBe(true);
    expect(result.insights.some((item) => item.type === 'connector_concentration')).toBe(true);
    expect(result.insights.find((item) => item.type === 'hidden_dependency').metric.name).toBe(
      'meetingHours'
    );
    const engineeringDemand = result.teamDemand.find((item) => item.name === 'Engineering');
    const salesDemand = result.teamDemand.find((item) => item.name === 'Sales');
    expect(engineeringDemand.sentAttendeeHours).toBe(12);
    expect(salesDemand.receivedAttendeeHours).toBe(10);
    expect(
      result.leadershipQuestions.find((item) => item.id === 'meeting_initiators').answer
    ).toContain('Engineering');
    expect(readWorkNetworkMetric(result, 'meetingHours', ['eng', 'sales'])).toBe(2.5);
    expect(readWorkNetworkMetric(result, 'bridgeConcentration', ['eng', 'sales'])).toBe(100);
    expect(result.methodology.validationStatus).toContain('not externally validated');
    expect(result.confidence).toBeUndefined();
    expect(result.privacy.contentUsed).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/e1|s1|p1/);
  });

  test('answers meeting demand and decline-friction questions at team level', () => {
    const participants = ['e1', 's1', 's2', 's3', 's4', 's5'];
    const responses = Object.fromEntries(
      participants.slice(1).map((participant) => [participant, 'declined'])
    );
    const currentEvents = [
      ...meetingCopies('decline-1', participants, { organizerUserId: 'e1', responses }),
      ...meetingCopies('decline-2', participants, { organizerUserId: 'e1', responses }),
    ];

    const result = analyze({ currentEvents });
    const engineeringDemand = result.teamDemand.find((item) => item.name === 'Engineering');
    const salesDemand = result.teamDemand.find((item) => item.name === 'Sales');
    const edge = result.actualEdges.find((item) => item.teamBName === 'Sales');

    expect(result.readiness.ready).toBe(true);
    expect(engineeringDemand.sentInviteCount).toBe(10);
    expect(engineeringDemand.sentAttendeeHours).toBe(5);
    expect(salesDemand.receivedInviteCount).toBe(10);
    expect(salesDemand.declineRate).toBe(1);
    expect(edge.dominantDirection).toMatchObject({
      fromTeamName: 'Engineering',
      toTeamName: 'Sales',
      share: 1,
    });
    expect(result.leadershipQuestions.find((item) => item.id === 'invite_friction')).toMatchObject({
      status: 'ready',
    });
    expect(JSON.stringify(result)).not.toMatch(/e1|s1|s2/);
  });

  test('uses connector-agnostic chat metadata for cross-team correspondence', () => {
    const actors = ['e1', 'e2', 'e3', 's1', 's2', 's3', 'e4', 's4', 'e5', 's5'];
    const currentEvents = actors.map((actor, index) =>
      channelMessage('shared-growth-channel', actor, index)
    );

    const result = analyze({ currentEvents });
    const edge = result.actualEdges.find((item) => item.teamBName === 'Sales');
    const correspondence = result.leadershipQuestions.find(
      (item) => item.id === 'cross_team_correspondence'
    );

    expect(result.readiness.ready).toBe(true);
    expect(result.sourceCoverage.hasChat).toBe(true);
    expect(result.sourceCoverage.hasCalendar).toBe(false);
    expect(edge.messageCount).toBe(10);
    expect(edge.sourceLabels).toContain('Slack');
    expect(edge.sourceBasis).toContain('Chat metadata');
    expect(correspondence).toMatchObject({ status: 'ready' });
    expect(correspondence.sourceBasis).toContain('Slack');
    expect(JSON.stringify(result)).not.toMatch(/e1|s1|shared-growth-channel/);
  });

  test('suppresses the observed map when user-to-team coverage is below 80%', () => {
    const data = baseData();
    const unmapped = Array.from({ length: 5 }, (_, index) => user(`u${index + 1}`, null));
    const result = analyze({
      ...data,
      users: [...data.users, ...unmapped],
      currentEvents: meetingCopies('cross-1', ['e1', 'e2', 'e3', 'p1', 'p2']),
    });

    expect(result.readiness.ready).toBe(false);
    expect(result.readiness.score).toBe(75);
    expect(result.readiness.mappingCoverage).toBe(0.75);
    expect(result.actualEdges).toEqual([]);
    expect(result.insights).toEqual([]);
    expect(result.formalEdges).toHaveLength(1);
    expect(result.nodes.every((node) => node.outsideTeamShare == null)).toBe(true);
    expect(readWorkNetworkMetric(result, 'outsideTeamShare', ['eng'])).toBeNull();
  });

  test('suppresses team-pair measurements with fewer than five contributors', () => {
    const participants = ['e1', 'e2', 'p1', 'p2'];
    const currentEvents = [
      ...meetingCopies('small-1', participants),
      ...meetingCopies('small-2', participants),
      ...meetingCopies('small-3', participants),
    ];
    const result = analyze({ currentEvents });

    expect(result.readiness.ready).toBe(true);
    expect(result.actualEdges).toEqual([]);
    expect(result.summary.suppressedConnections).toBe(1);
  });

  test('grades rechecks in the correct direction for each network metric', () => {
    expect(calculateWorkNetworkOutcome('bridgeConcentration', 70, 45)).toMatchObject({
      percentChange: -35.7,
      improved: true,
    });
    expect(calculateWorkNetworkOutcome('directionBalance', 20, 50)).toMatchObject({
      percentChange: 150,
      improved: true,
    });
  });
});
