import OrgUnit from '../models/orgUnit.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import WorkEvent from '../models/workEvent.js';
import {
  CONCENTRATION_THRESHOLD,
  MIN_METRIC_CONTRIBUTORS,
  evaluateChange,
} from '../utils/privacyGate.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 28;
const MIN_DAYS = 14;
const MAX_DAYS = 90;
const MIN_EVENTS = 10;
const READY_COVERAGE = 0.8;
const CATCH_ALL_TEAM = /^(unassigned|general|other|unknown|default|everyone|all)$/i;
const INTERACTION_TYPES = new Set([
  'meeting',
  'message',
  'email_sent',
  'email_received',
  'task_comment_added',
]);

function id(value) {
  if (value == null) return null;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function ratio(part, total) {
  return total > 0 ? part / total : 0;
}

function percentile(values, p) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * (p / 100);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function pairKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function pairIds(a, b) {
  return a < b ? [a, b] : [b, a];
}

function isCatchAll(team) {
  return CATCH_ALL_TEAM.test(String(team?.name || '').trim());
}

function emptyNode() {
  return {
    internalUnits: 0,
    crossUnits: 0,
    crossMeetingMinutes: 0,
    crossMessages: 0,
    partners: new Set(),
    activePeople: new Set(),
  };
}

function emptyEdge(teamAId, teamBId) {
  return {
    teamAId,
    teamBId,
    meetingCount: 0,
    meetingMinutes: 0,
    messageCount: 0,
    otherInteractionCount: 0,
    afterHoursUnits: 0,
    directionAToB: 0,
    directionBToA: 0,
    contributors: new Set(),
    contributorUnitsByTeam: new Map(),
  };
}

function addContributor(edge, teamId, userId, units) {
  if (!userId) return;
  edge.contributors.add(userId);
  if (!edge.contributorUnitsByTeam.has(teamId)) {
    edge.contributorUnitsByTeam.set(teamId, new Map());
  }
  const values = edge.contributorUnitsByTeam.get(teamId);
  values.set(userId, (values.get(userId) || 0) + units);
}

function addCrossTeamInteraction(period, teamAId, teamBId, payload) {
  const [a, b] = pairIds(teamAId, teamBId);
  const key = pairKey(a, b);
  if (!period.edges.has(key)) period.edges.set(key, emptyEdge(a, b));
  const edge = period.edges.get(key);
  const units = payload.units || 1;

  if (payload.type === 'meeting') {
    edge.meetingCount += 1;
    edge.meetingMinutes += payload.minutes || 0;
  } else if (payload.type === 'message') {
    edge.messageCount += 1;
  } else {
    edge.otherInteractionCount += 1;
  }
  if (payload.afterHours) edge.afterHoursUnits += units;

  for (const participant of payload.participants || []) {
    addContributor(edge, participant.teamId, participant.userId, units);
  }

  if (payload.fromTeamId && payload.toTeamId) {
    if (payload.fromTeamId === a && payload.toTeamId === b) edge.directionAToB += 1;
    if (payload.fromTeamId === b && payload.toTeamId === a) edge.directionBToA += 1;
  }

  for (const teamId of [a, b]) {
    if (!period.nodes.has(teamId)) period.nodes.set(teamId, emptyNode());
    const node = period.nodes.get(teamId);
    node.crossUnits += units;
    node.partners.add(teamId === a ? b : a);
    if (payload.type === 'meeting' && payload.countNodeMeetingMinutes !== false) {
      node.crossMeetingMinutes += payload.minutes || 0;
    }
    if (payload.type === 'message') node.crossMessages += 1;
  }
}

function addInternalInteraction(period, teamId, units, userIds = []) {
  if (!period.nodes.has(teamId)) period.nodes.set(teamId, emptyNode());
  const node = period.nodes.get(teamId);
  node.internalUnits += units;
  for (const userId of userIds) node.activePeople.add(userId);
}

function analyzePeriod(events, userTeam) {
  const period = {
    nodes: new Map(),
    edges: new Map(),
    interactionEventCount: 0,
    mappedEventCount: 0,
    observedActors: new Set(),
    sources: new Set(),
  };
  const meetings = new Map();

  for (const event of events) {
    if (!INTERACTION_TYPES.has(event.eventType)) continue;
    period.interactionEventCount += 1;
    period.sources.add(event.source);

    const actorId = id(event.actorUserId);
    const actorTeamId = actorId ? userTeam.get(actorId) : null;
    if (actorTeamId) {
      period.mappedEventCount += 1;
      period.observedActors.add(actorId);
      if (!period.nodes.has(actorTeamId)) period.nodes.set(actorTeamId, emptyNode());
      period.nodes.get(actorTeamId).activePeople.add(actorId);
    }

    if (event.eventType === 'meeting') {
      if (
        event.metadata?.isCancelled ||
        event.metadata?.isAllHands ||
        event.metadata?.meetingType === 'all_hands' ||
        Number(event.metadata?.attendeeCount || 0) > 30
      ) {
        continue;
      }
      const meetingId =
        event.metadata?.meetingInstanceIdHash || event.metadata?.meetingIdHash || event.externalId;
      if (!meetingId || !actorId || !actorTeamId) continue;
      if (!meetings.has(meetingId)) {
        meetings.set(meetingId, {
          participants: new Map(),
          minutes: 0,
          afterHours: false,
        });
      }
      const meeting = meetings.get(meetingId);
      meeting.participants.set(actorId, actorTeamId);
      meeting.minutes = Math.max(meeting.minutes, Number(event.metadata?.durationMinutes || 0));
      meeting.afterHours ||= event.metadata?.isAfterHours === true;
      continue;
    }

    const targetId = id(event.targetUserId);
    const targetTeamId = targetId ? userTeam.get(targetId) : null;
    if (!actorId || !actorTeamId || !targetId || !targetTeamId || actorId === targetId) continue;

    const type = event.eventType === 'message' ? 'message' : 'other';
    if (actorTeamId === targetTeamId) {
      addInternalInteraction(period, actorTeamId, 1, [actorId, targetId]);
    } else {
      addCrossTeamInteraction(period, actorTeamId, targetTeamId, {
        type,
        units: 1,
        afterHours: event.metadata?.isAfterHours === true,
        fromTeamId: actorTeamId,
        toTeamId: targetTeamId,
        participants: [
          { teamId: actorTeamId, userId: actorId },
          { teamId: targetTeamId, userId: targetId },
        ],
      });
    }
  }

  for (const meeting of meetings.values()) {
    const byTeam = new Map();
    for (const [userId, teamId] of meeting.participants) {
      if (!byTeam.has(teamId)) byTeam.set(teamId, []);
      byTeam.get(teamId).push(userId);
    }
    const teamIds = [...byTeam.keys()];
    const minutes = Math.max(15, meeting.minutes || 30);
    const units = Math.max(0.5, minutes / 30);

    if (teamIds.length === 1) {
      addInternalInteraction(period, teamIds[0], units, byTeam.get(teamIds[0]));
      continue;
    }

    for (const teamId of teamIds) {
      if (!period.nodes.has(teamId)) period.nodes.set(teamId, emptyNode());
      period.nodes.get(teamId).crossMeetingMinutes += minutes;
    }

    for (let i = 0; i < teamIds.length; i += 1) {
      for (let j = i + 1; j < teamIds.length; j += 1) {
        const teamAId = teamIds[i];
        const teamBId = teamIds[j];
        addCrossTeamInteraction(period, teamAId, teamBId, {
          type: 'meeting',
          units,
          minutes,
          afterHours: meeting.afterHours,
          countNodeMeetingMinutes: false,
          participants: [
            ...byTeam.get(teamAId).map((userId) => ({ teamId: teamAId, userId })),
            ...byTeam.get(teamBId).map((userId) => ({ teamId: teamBId, userId })),
          ],
        });
      }
    }
  }

  return period;
}

function bridgeConcentration(edge) {
  let maximum = 0;
  for (const values of edge.contributorUnitsByTeam.values()) {
    const total = [...values.values()].reduce((sum, value) => sum + value, 0);
    if (!total) continue;
    maximum = Math.max(maximum, Math.max(...values.values()) / total);
  }
  return maximum;
}

function makeOfficialEdges(units, userTeam, eligibleTeams) {
  const formal = new Map();
  for (const unit of units) {
    const userId = id(unit.userId);
    const managerId = id(unit.managerUserId);
    const fromTeamId = userId ? userTeam.get(userId) : null;
    const toTeamId = managerId ? userTeam.get(managerId) : null;
    if (
      !fromTeamId ||
      !toTeamId ||
      fromTeamId === toTeamId ||
      !eligibleTeams.has(fromTeamId) ||
      !eligibleTeams.has(toTeamId)
    ) {
      continue;
    }
    const [teamAId, teamBId] = pairIds(fromTeamId, toTeamId);
    formal.set(pairKey(teamAId, teamBId), {
      id: `formal:${pairKey(teamAId, teamBId)}`,
      teamAId,
      teamBId,
      connectionType: 'reporting',
    });
  }
  return formal;
}

function actionFor(type, teamAName, teamBName = null) {
  const pair = teamBName ? `${teamAName} and ${teamBName}` : teamAName;
  const actions = {
    hidden_dependency: {
      owner: `${pair} leads`,
      action: `Name one decision owner and document the normal handoff between ${pair}.`,
      measure: 'Review whether the same coordination is completed with fewer repeat meetings.',
    },
    connector_concentration: {
      owner: `${pair} leads`,
      action: 'Add a backup interface owner and publish the decisions this interface can make.',
      measure:
        'At the next review, coordination should involve more contributors without more meeting time.',
    },
    one_way_demand: {
      owner: `${pair} leads`,
      action:
        'Review the recurring requests moving in one direction and clarify the expected service boundary.',
      measure: 'Track whether directional imbalance and response loops fall in the next period.',
    },
    interface_overload: {
      owner: `${teamAName} lead`,
      action:
        'Choose the busiest external interface and replace one recurring status loop with a written update or explicit decision rule.',
      measure:
        'Cross-team meeting hours should fall without reducing the number of active partner teams.',
    },
    unusual_isolation: {
      owner: `${teamAName} lead`,
      action:
        'Confirm whether the low external interaction is intentional; if not, define one regular interface with the most dependent team.',
      measure:
        'Verify that the required handoff appears in the next network period without adding broad meeting load.',
    },
  };
  return { ...actions[type], reviewInDays: 14 };
}

function buildInsights(edges, nodes, teamById) {
  if (!edges.length || !nodes.length) return [];
  const edgeUnits = edges.map((edge) => edge.interactionUnits);
  const strongEdge = percentile(edgeUnits, 75);
  const nodeCrossUnits = nodes.map((node) => node.crossTeamUnits);
  const highCrossLoad = percentile(nodeCrossUnits, 75);
  const outsideShares = nodes.map((node) => node.outsideTeamShare);
  const lowOutsideShare = percentile(outsideShares, 25);
  const medianOutsideShare = percentile(outsideShares, 50);
  const insights = [];

  for (const edge of edges) {
    const teamAName = teamById.get(edge.teamAId)?.name || 'Team A';
    const teamBName = teamById.get(edge.teamBId)?.name || 'Team B';
    const evidenceBase = [
      `${edge.meetingCount} shared meetings (${round(edge.meetingHours, 1)}h)`,
      `${edge.messageCount + edge.otherInteractionCount} directed interactions`,
    ];

    if (
      !edge.formalConnection &&
      edge.interactionUnits >= strongEdge &&
      edge.interactionCount >= 3
    ) {
      insights.push({
        id: `hidden_dependency:${pairKey(edge.teamAId, edge.teamBId)}`,
        type: 'hidden_dependency',
        severity: 'high',
        title: `Hidden operating dependency: ${teamAName} ↔ ${teamBName}`,
        summary:
          'This is one of the stronger observed coordination paths, but no cross-team reporting link explains it.',
        evidence: [...evidenceBase, 'No formal cross-team reporting link in the current directory'],
        teamIds: [edge.teamAId, edge.teamBId],
        primaryTeamId: edge.teamAId,
        metric: { name: 'interactionUnits', value: edge.interactionUnits },
        action: actionFor('hidden_dependency', teamAName, teamBName),
      });
    }

    if (
      edge.bridgeConcentration > CONCENTRATION_THRESHOLD &&
      edge.interactionCount >= 5 &&
      edge.contributorCount >= MIN_METRIC_CONTRIBUTORS
    ) {
      insights.push({
        id: `connector_concentration:${pairKey(edge.teamAId, edge.teamBId)}`,
        type: 'connector_concentration',
        severity: edge.bridgeConcentration >= 0.6 ? 'high' : 'medium',
        title: `Coordination depends on too few connectors: ${teamAName} ↔ ${teamBName}`,
        summary:
          'A concentrated pattern carries this interface. No person is identified, but continuity risk is elevated if that connector is unavailable.',
        evidence: [
          ...evidenceBase,
          `${Math.round(edge.bridgeConcentration * 100)}% connector concentration on the more concentrated side`,
        ],
        teamIds: [edge.teamAId, edge.teamBId],
        primaryTeamId: edge.teamAId,
        metric: { name: 'bridgeConcentration', value: round(edge.bridgeConcentration * 100) },
        action: actionFor('connector_concentration', teamAName, teamBName),
      });
    }

    if (edge.directedInteractionCount >= 5 && edge.directionBalance < 0.25) {
      insights.push({
        id: `one_way_demand:${pairKey(edge.teamAId, edge.teamBId)}`,
        type: 'one_way_demand',
        severity: 'medium',
        title: `One-way coordination demand: ${teamAName} ↔ ${teamBName}`,
        summary:
          'Observed directed interaction is heavily imbalanced. This can be a legitimate service relationship, so the first action is to confirm intent.',
        evidence: [
          ...evidenceBase,
          `${Math.round(edge.directionBalance * 100)}% directional balance`,
        ],
        teamIds: [edge.teamAId, edge.teamBId],
        primaryTeamId: edge.teamAId,
        metric: { name: 'directionBalance', value: round(edge.directionBalance * 100) },
        action: actionFor('one_way_demand', teamAName, teamBName),
      });
    }
  }

  const overloaded = nodes
    .filter(
      (node) =>
        node.partnerCount >= 3 &&
        node.crossTeamUnits >= highCrossLoad &&
        node.outsideTeamShare >= medianOutsideShare
    )
    .sort((a, b) => b.crossTeamUnits - a.crossTeamUnits)[0];
  if (overloaded) {
    insights.push({
      id: `interface_overload:${overloaded.id}`,
      type: 'interface_overload',
      severity: 'medium',
      title: `${overloaded.name} is carrying a broad coordination interface`,
      summary:
        'This team coordinates with more partner teams and carries more cross-team load than most measured teams in this organization.',
      evidence: [
        `${overloaded.partnerCount} active partner teams`,
        `${round(overloaded.crossTeamMeetingHours, 1)} cross-team meeting hours`,
        `${Math.round(overloaded.outsideTeamShare * 100)}% of measured interaction is outside the team`,
      ],
      teamIds: [overloaded.id],
      primaryTeamId: overloaded.id,
      metric: { name: 'crossTeamUnits', value: overloaded.crossTeamUnits },
      action: actionFor('interface_overload', overloaded.name),
    });
  }

  const isolated = nodes
    .filter(
      (node) =>
        node.totalInteractionUnits >= 10 &&
        node.outsideTeamShare <= lowOutsideShare &&
        node.outsideTeamShare < 0.1
    )
    .sort((a, b) => a.outsideTeamShare - b.outsideTeamShare)[0];
  if (isolated) {
    insights.push({
      id: `unusual_isolation:${isolated.id}`,
      type: 'unusual_isolation',
      severity: 'medium',
      title: `${isolated.name} has unusually little outside-team coordination`,
      summary:
        'The pattern may be intentional. It is worth checking only if this team depends on handoffs or shared decisions with other functions.',
      evidence: [
        `${Math.round(isolated.outsideTeamShare * 100)}% of measured interaction is outside the team`,
        `${isolated.partnerCount} active partner teams`,
      ],
      teamIds: [isolated.id],
      primaryTeamId: isolated.id,
      metric: { name: 'outsideTeamShare', value: round(isolated.outsideTeamShare * 100) },
      action: actionFor('unusual_isolation', isolated.name),
    });
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 6);
}

export function analyzeWorkNetwork({
  orgId,
  teams,
  users,
  units,
  currentEvents,
  previousEvents,
  currentStart,
  currentEnd,
  previousStart,
}) {
  const realTeams = teams.filter((team) => team.isActive !== false && !isCatchAll(team));
  const teamById = new Map(realTeams.map((team) => [id(team), team]));
  const unitByUser = new Map(
    units
      .filter((unit) => unit.effectiveTo == null && unit.userId)
      .map((unit) => [id(unit.userId), unit])
  );
  const userTeam = new Map();
  const memberCounts = new Map();
  let activeUserCount = 0;
  let mappedUserCount = 0;

  for (const user of users) {
    if (user.accountStatus === 'inactive') continue;
    activeUserCount += 1;
    const teamId = id(user.teamId) || id(unitByUser.get(id(user))?.teamId);
    if (!teamId || !teamById.has(teamId)) continue;
    userTeam.set(id(user), teamId);
    memberCounts.set(teamId, (memberCounts.get(teamId) || 0) + 1);
    mappedUserCount += 1;
  }

  const eligibleTeams = new Set(
    [...teamById.keys()].filter(
      (teamId) => (memberCounts.get(teamId) || 0) >= MIN_METRIC_CONTRIBUTORS
    )
  );
  const current = analyzePeriod(currentEvents, userTeam);
  const previous = analyzePeriod(previousEvents, userTeam);
  const mappingCoverage = ratio(mappedUserCount, activeUserCount);
  const eventMappingCoverage = ratio(current.mappedEventCount, current.interactionEventCount);
  const ready =
    mappingCoverage >= READY_COVERAGE &&
    eventMappingCoverage >= READY_COVERAGE &&
    eligibleTeams.size >= 2 &&
    current.interactionEventCount >= MIN_EVENTS;

  const confidenceScore = Math.round(
    40 * mappingCoverage +
      30 * eventMappingCoverage +
      20 * Math.min(1, current.interactionEventCount / 50) +
      10 * Math.min(1, current.sources.size / 2)
  );
  const confidenceLabel = confidenceScore >= 80 ? 'High' : confidenceScore >= 60 ? 'Medium' : 'Low';
  const readinessReasons = [];
  if (mappingCoverage < READY_COVERAGE)
    readinessReasons.push('Fewer than 80% of active users map to named teams.');
  if (eventMappingCoverage < READY_COVERAGE)
    readinessReasons.push('Fewer than 80% of interaction events map to internal users.');
  if (eligibleTeams.size < 2)
    readinessReasons.push('At least two privacy-eligible teams are required.');
  if (current.interactionEventCount < MIN_EVENTS)
    readinessReasons.push('At least 10 interaction events are required.');

  const officialByKey = makeOfficialEdges(units, userTeam, eligibleTeams);
  const formalEdges = [...officialByKey.values()].map((edge) => ({
    ...edge,
    teamAName: teamById.get(edge.teamAId)?.name || 'Team A',
    teamBName: teamById.get(edge.teamBId)?.name || 'Team B',
  }));

  const measuredNodes = [...eligibleTeams]
    .map((teamId) => {
      const team = teamById.get(teamId);
      const now = current.nodes.get(teamId) || emptyNode();
      const before = previous.nodes.get(teamId) || emptyNode();
      const total = now.internalUnits + now.crossUnits;
      const change = evaluateChange(before.crossUnits, now.crossUnits);
      return {
        id: teamId,
        name: team.name,
        function: team.metadata?.function || team.metadata?.sourceDepartment || null,
        memberCount: memberCounts.get(teamId) || 0,
        activeMemberCount: now.activePeople.size,
        partnerCount: now.partners.size,
        crossTeamUnits: round(now.crossUnits),
        internalUnits: round(now.internalUnits),
        totalInteractionUnits: round(total),
        outsideTeamShare: round(ratio(now.crossUnits, total), 3),
        crossTeamMeetingHours: round(now.crossMeetingMinutes / 60, 1),
        crossTeamMessages: now.crossMessages,
        trendPct: change.reportable ? change.pct : null,
        trendReason: change.reason,
      };
    })
    .sort((a, b) => b.crossTeamUnits - a.crossTeamUnits || a.name.localeCompare(b.name));

  const nodes = ready
    ? measuredNodes
    : measuredNodes.map((node) => ({
        ...node,
        activeMemberCount: null,
        partnerCount: null,
        crossTeamUnits: null,
        internalUnits: null,
        totalInteractionUnits: null,
        outsideTeamShare: null,
        crossTeamMeetingHours: null,
        crossTeamMessages: null,
        trendPct: null,
        trendReason: 'suppressed_until_ready',
      }));

  const actualEdges = ready
    ? [...current.edges.entries()]
        .filter(
          ([, edge]) =>
            eligibleTeams.has(edge.teamAId) &&
            eligibleTeams.has(edge.teamBId) &&
            edge.contributors.size >= MIN_METRIC_CONTRIBUTORS
        )
        .map(([key, edge]) => {
          const previousEdge = previous.edges.get(key);
          const interactionUnits =
            edge.messageCount + edge.otherInteractionCount + edge.meetingMinutes / 30;
          const previousUnits = previousEdge
            ? previousEdge.messageCount +
              previousEdge.otherInteractionCount +
              previousEdge.meetingMinutes / 30
            : 0;
          const change = evaluateChange(previousUnits, interactionUnits);
          const maxDirection = Math.max(edge.directionAToB, edge.directionBToA);
          const minDirection = Math.min(edge.directionAToB, edge.directionBToA);
          return {
            id: `actual:${key}`,
            teamAId: edge.teamAId,
            teamBId: edge.teamBId,
            teamAName: teamById.get(edge.teamAId)?.name || 'Team A',
            teamBName: teamById.get(edge.teamBId)?.name || 'Team B',
            formalConnection: officialByKey.has(key),
            interactionUnits: round(interactionUnits),
            interactionCount: edge.meetingCount + edge.messageCount + edge.otherInteractionCount,
            meetingCount: edge.meetingCount,
            meetingHours: round(edge.meetingMinutes / 60, 1),
            messageCount: edge.messageCount,
            otherInteractionCount: edge.otherInteractionCount,
            directedInteractionCount: edge.directionAToB + edge.directionBToA,
            directionBalance: maxDirection ? round(minDirection / maxDirection, 3) : 1,
            bridgeConcentration: round(bridgeConcentration(edge), 3),
            contributorCount: edge.contributors.size,
            afterHoursShare: round(ratio(edge.afterHoursUnits, interactionUnits), 3),
            trendPct: change.reportable ? change.pct : null,
            trendReason: change.reason,
          };
        })
        .sort((a, b) => b.interactionUnits - a.interactionUnits)
    : [];

  const insights = ready ? buildInsights(actualEdges, measuredNodes, teamById) : [];
  const hiddenDependencies = actualEdges.filter((edge) => !edge.formalConnection).length;
  const concentratedInterfaces = actualEdges.filter(
    (edge) => edge.bridgeConcentration > CONCENTRATION_THRESHOLD
  ).length;

  return {
    orgId: String(orgId),
    period: {
      days: Math.round((currentEnd - currentStart) / DAY_MS),
      currentStart: currentStart.toISOString(),
      currentEnd: currentEnd.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: currentStart.toISOString(),
    },
    readiness: {
      ready,
      mappingCoverage: round(mappingCoverage, 3),
      eventMappingCoverage: round(eventMappingCoverage, 3),
      activeUsers: activeUserCount,
      mappedUsers: mappedUserCount,
      eligibleTeams: eligibleTeams.size,
      suppressedSmallTeams: realTeams.length - eligibleTeams.size,
      interactionEvents: current.interactionEventCount,
      sources: [...current.sources].sort(),
      reasons: readinessReasons,
    },
    confidence: {
      score: confidenceScore,
      label: confidenceLabel,
      reasons: [
        `${Math.round(mappingCoverage * 100)}% user-to-team mapping`,
        `${Math.round(eventMappingCoverage * 100)}% event-to-user mapping`,
        `${current.interactionEventCount} interaction events across ${current.sources.size} source(s)`,
      ],
    },
    summary: {
      measuredTeams: nodes.length,
      formalConnections: formalEdges.length,
      observedConnections: actualEdges.length,
      hiddenDependencies,
      concentratedInterfaces,
      suppressedConnections: ready ? current.edges.size - actualEdges.length : current.edges.size,
    },
    nodes,
    formalEdges,
    actualEdges,
    insights,
    privacy: {
      identityLevel: 'team only',
      minimumContributors: MIN_METRIC_CONTRIBUTORS,
      contentUsed: false,
      note: 'No message content, names, email addresses, or individual rankings are returned.',
    },
  };
}

export function readWorkNetworkMetric(network, metricName, teamIds = []) {
  if (!network?.readiness?.ready || !metricName) return null;
  const normalizedTeamIds = teamIds.map(String).filter(Boolean);
  let value = null;

  if (normalizedTeamIds.length >= 2) {
    const expectedKey = pairKey(normalizedTeamIds[0], normalizedTeamIds[1]);
    const edge = network.actualEdges.find(
      (item) => pairKey(String(item.teamAId), String(item.teamBId)) === expectedKey
    );
    if (!edge) return null;
    const edgeMetrics = {
      interactionUnits: edge.interactionUnits,
      bridgeConcentration: edge.bridgeConcentration * 100,
      directionBalance: edge.directionBalance * 100,
    };
    value = edgeMetrics[metricName];
  } else if (normalizedTeamIds.length === 1) {
    const node = network.nodes.find((item) => String(item.id) === normalizedTeamIds[0]);
    if (!node) return null;
    const nodeMetrics = {
      crossTeamUnits: node.crossTeamUnits,
      outsideTeamShare: node.outsideTeamShare * 100,
    };
    value = nodeMetrics[metricName];
  }

  return Number.isFinite(value) ? round(value) : null;
}

export async function getWorkNetworkMap(orgId, options = {}) {
  const requestedDays = Number(options.days || DEFAULT_DAYS);
  const days = Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(requestedDays)));
  const currentEnd = options.now ? new Date(options.now) : new Date();
  const currentStart = new Date(currentEnd.getTime() - days * DAY_MS);
  const previousStart = new Date(currentStart.getTime() - days * DAY_MS);

  const [teams, users, units, events] = await Promise.all([
    Team.find({ orgId, isActive: { $ne: false } })
      .select('_id name isActive metadata analyticsEnabled')
      .lean(),
    User.find({ orgId, accountStatus: { $ne: 'inactive' } })
      .select('_id teamId accountStatus')
      .lean(),
    OrgUnit.find({ orgId, effectiveTo: null })
      .select('userId managerUserId teamId effectiveTo')
      .lean(),
    WorkEvent.find({ orgId, timestamp: { $gte: previousStart, $lt: currentEnd } })
      .select(
        'source eventType actorUserId targetUserId timestamp externalId metadata.meetingIdHash metadata.meetingInstanceIdHash metadata.durationMinutes metadata.isAfterHours metadata.isAllHands metadata.isCancelled metadata.attendeeCount metadata.meetingType'
      )
      .lean(),
  ]);
  const currentEvents = events.filter((event) => event.timestamp >= currentStart);
  const previousEvents = events.filter((event) => event.timestamp < currentStart);

  return analyzeWorkNetwork({
    orgId,
    teams,
    users,
    units,
    currentEvents,
    previousEvents,
    currentStart,
    currentEnd,
    previousStart,
  });
}

export default { analyzeWorkNetwork, getWorkNetworkMap, readWorkNetworkMetric };
