import { analyzeWorkNetwork, readWorkNetworkMetric } from '../services/workNetworkService.js';

const currentStart = new Date('2026-07-01T00:00:00.000Z');
const currentEnd = new Date('2026-07-29T00:00:00.000Z');
const previousStart = new Date('2026-06-03T00:00:00.000Z');

function team(_id, name) {
  return { _id, name, isActive: true, metadata: { function: name } };
}

function user(_id, teamId) {
  return { _id, teamId, accountStatus: 'active' };
}

function meeting(meetingId, actorUserId, timestamp = '2026-07-15T10:00:00.000Z') {
  return {
    source: 'microsoft-outlook',
    eventType: 'meeting',
    actorUserId,
    timestamp: new Date(timestamp),
    metadata: {
      meetingInstanceIdHash: meetingId,
      durationMinutes: 30,
      attendeeCount: 5,
      meetingType: 'cross_team',
    },
  };
}

function meetingCopies(meetingId, participants) {
  return participants.map((participant) => meeting(meetingId, participant));
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
    expect(readWorkNetworkMetric(result, 'bridgeConcentration', ['eng', 'sales'])).toBe(100);
    expect(result.privacy.contentUsed).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/e1|s1|p1/);
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
});
