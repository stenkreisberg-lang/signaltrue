import OrgUnit from '../models/orgUnit.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import WorkEvent from '../models/workEvent.js';
import crypto from 'node:crypto';
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

function hashMetadata(orgId, value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(`${orgId}:${value}`).digest('hex');
}

function normalizeResponse(value) {
  if (value == null) return null;
  const response = String(value).trim();
  if (response === 'accepted' || response === 'declined') return response;
  if (response === 'tentativelyAccepted' || response === 'tentative') return 'tentative';
  if (response === 'notResponded' || response === 'none' || response === 'needsAction') {
    return 'notResponded';
  }
  if (response === 'organizer') return 'organizer';
  return null;
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

function emptyTeamDemand() {
  return {
    sentMeetingLinks: 0,
    sentInviteCount: 0,
    sentAttendeeHours: 0,
    receivedMeetingLinks: 0,
    receivedInviteCount: 0,
    receivedAttendeeHours: 0,
    acceptedInvites: 0,
    declinedInvites: 0,
    tentativeInvites: 0,
    notRespondedInvites: 0,
    organizerPeople: new Set(),
    inviteePeople: new Set(),
    partnerTeams: new Set(),
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
    inviteCount: 0,
    inviteeHours: 0,
    acceptedInvites: 0,
    declinedInvites: 0,
    tentativeInvites: 0,
    notRespondedInvites: 0,
    contributors: new Set(),
    contributorUnitsByTeam: new Map(),
  };
}

function ensureTeamDemand(period, teamId) {
  if (!teamId) return null;
  if (!period.teamDemand.has(teamId)) period.teamDemand.set(teamId, emptyTeamDemand());
  return period.teamDemand.get(teamId);
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
  edge.inviteCount += payload.inviteCount || 0;
  edge.inviteeHours += payload.inviteeHours || 0;
  edge.acceptedInvites += payload.responses?.accepted || 0;
  edge.declinedInvites += payload.responses?.declined || 0;
  edge.tentativeInvites += payload.responses?.tentative || 0;
  edge.notRespondedInvites += payload.responses?.notResponded || 0;

  for (const participant of payload.participants || []) {
    addContributor(edge, participant.teamId, participant.userId, units);
  }

  if (payload.fromTeamId && payload.toTeamId) {
    const directionUnits = payload.directionUnits || 1;
    if (payload.fromTeamId === a && payload.toTeamId === b) edge.directionAToB += directionUnits;
    if (payload.fromTeamId === b && payload.toTeamId === a) edge.directionBToA += directionUnits;
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

function countResponses(participants = []) {
  const responses = { accepted: 0, declined: 0, tentative: 0, notResponded: 0 };
  for (const participant of participants) {
    const response = normalizeResponse(participant.response);
    if (!response || response === 'organizer') continue;
    if (response === 'accepted') responses.accepted++;
    else if (response === 'declined') responses.declined++;
    else if (response === 'tentative') responses.tentative++;
    else responses.notResponded++;
  }
  return responses;
}

function addMeetingDemand(period, organizerTeamId, targetTeamId, targetParticipants, minutes) {
  if (!organizerTeamId || !targetTeamId || organizerTeamId === targetTeamId) return null;
  const inviteCount = targetParticipants.length;
  if (!inviteCount) return null;
  const attendeeHours = (Math.max(15, minutes || 30) / 60) * inviteCount;
  const responses = countResponses(targetParticipants);
  const sender = ensureTeamDemand(period, organizerTeamId);
  const receiver = ensureTeamDemand(period, targetTeamId);
  if (!sender || !receiver) return null;

  sender.sentMeetingLinks += 1;
  sender.sentInviteCount += inviteCount;
  sender.sentAttendeeHours += attendeeHours;
  sender.partnerTeams.add(targetTeamId);

  receiver.receivedMeetingLinks += 1;
  receiver.receivedInviteCount += inviteCount;
  receiver.receivedAttendeeHours += attendeeHours;
  receiver.acceptedInvites += responses.accepted;
  receiver.declinedInvites += responses.declined;
  receiver.tentativeInvites += responses.tentative;
  receiver.notRespondedInvites += responses.notResponded;
  receiver.partnerTeams.add(organizerTeamId);
  for (const participant of targetParticipants) {
    if (participant.userId) receiver.inviteePeople.add(participant.userId);
  }

  return { inviteCount, attendeeHours, responses };
}

function analyzePeriod(events, userTeam, organizerByHash = new Map()) {
  const period = {
    nodes: new Map(),
    edges: new Map(),
    teamDemand: new Map(),
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
        const organizerFromHash = organizerByHash.get(event.metadata?.organizerHash);
        meetings.set(meetingId, {
          participants: new Map(),
          minutes: 0,
          afterHours: false,
          organizerTeamId: id(event.metadata?.organizerTeamId) || organizerFromHash?.teamId || null,
          organizerUserId: id(event.metadata?.organizerUserId) || organizerFromHash?.userId || null,
        });
      }
      const meeting = meetings.get(meetingId);
      if (!meeting.organizerTeamId) {
        const organizerFromHash = organizerByHash.get(event.metadata?.organizerHash);
        meeting.organizerTeamId =
          id(event.metadata?.organizerTeamId) || organizerFromHash?.teamId || null;
      }
      if (!meeting.organizerUserId) {
        const organizerFromHash = organizerByHash.get(event.metadata?.organizerHash);
        meeting.organizerUserId =
          id(event.metadata?.organizerUserId) || organizerFromHash?.userId || null;
      }
      meeting.participants.set(actorId, {
        userId: actorId,
        teamId: actorTeamId,
        response: event.metadata?.attendeeResponseStatus,
      });
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
    for (const participant of meeting.participants.values()) {
      const { userId, teamId } = participant;
      if (!byTeam.has(teamId)) byTeam.set(teamId, []);
      byTeam.get(teamId).push(participant);
    }
    const teamIds = [...byTeam.keys()];
    const minutes = Math.max(15, meeting.minutes || 30);
    const units = Math.max(0.5, minutes / 30);
    const organizerDemand = ensureTeamDemand(period, meeting.organizerTeamId);
    if (organizerDemand && meeting.organizerUserId) {
      organizerDemand.organizerPeople.add(meeting.organizerUserId);
    }

    if (teamIds.length === 1) {
      addInternalInteraction(
        period,
        teamIds[0],
        units,
        byTeam.get(teamIds[0]).map((participant) => participant.userId)
      );
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
        let directedPayload = {};
        if (meeting.organizerTeamId === teamAId) {
          const targetParticipants = byTeam.get(teamBId);
          const demand = addMeetingDemand(
            period,
            meeting.organizerTeamId,
            teamBId,
            targetParticipants,
            minutes
          );
          directedPayload = demand
            ? {
                fromTeamId: teamAId,
                toTeamId: teamBId,
                directionUnits: demand.inviteCount,
                inviteCount: demand.inviteCount,
                inviteeHours: demand.attendeeHours,
                responses: demand.responses,
              }
            : {};
        } else if (meeting.organizerTeamId === teamBId) {
          const targetParticipants = byTeam.get(teamAId);
          const demand = addMeetingDemand(
            period,
            meeting.organizerTeamId,
            teamAId,
            targetParticipants,
            minutes
          );
          directedPayload = demand
            ? {
                fromTeamId: teamBId,
                toTeamId: teamAId,
                directionUnits: demand.inviteCount,
                inviteCount: demand.inviteCount,
                inviteeHours: demand.attendeeHours,
                responses: demand.responses,
              }
            : {};
        }
        addCrossTeamInteraction(period, teamAId, teamBId, {
          type: 'meeting',
          units,
          minutes,
          afterHours: meeting.afterHours,
          countNodeMeetingMinutes: false,
          ...directedPayload,
          participants: [
            ...byTeam
              .get(teamAId)
              .map((participant) => ({ teamId: teamAId, userId: participant.userId })),
            ...byTeam
              .get(teamBId)
              .map((participant) => ({ teamId: teamBId, userId: participant.userId })),
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
  const edgeActivity = edges.map((edge) => edge.interactionCount);
  const strongEdge = percentile(edgeActivity, 75);
  const crossTeamMeetingHours = nodes.map((node) => node.crossTeamMeetingHours);
  const highCrossLoad = percentile(crossTeamMeetingHours, 75);
  const outsideShares = nodes.map((node) => node.outsideTeamShare);
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
      edge.interactionCount >= strongEdge &&
      edge.interactionCount >= 3
    ) {
      insights.push({
        id: `hidden_dependency:${pairKey(edge.teamAId, edge.teamBId)}`,
        type: 'hidden_dependency',
        severity: 'high',
        title: `Unmapped operating link: ${teamAName} ↔ ${teamBName}`,
        summary:
          'This is one of the stronger observed coordination paths, but no cross-team reporting link explains it.',
        evidence: [...evidenceBase, 'No formal cross-team reporting link in the current directory'],
        teamIds: [edge.teamAId, edge.teamBId],
        primaryTeamId: edge.teamAId,
        metric: {
          name: edge.meetingHours > 0 ? 'meetingHours' : 'interactionCount',
          value: edge.meetingHours > 0 ? edge.meetingHours : edge.interactionCount,
        },
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
        node.crossTeamMeetingHours >= highCrossLoad &&
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
      metric: { name: 'crossTeamMeetingHours', value: overloaded.crossTeamMeetingHours },
      action: actionFor('interface_overload', overloaded.name),
    });
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 6);
}

function responseTotal(demand) {
  return (
    (demand?.acceptedInvites || 0) +
    (demand?.declinedInvites || 0) +
    (demand?.tentativeInvites || 0) +
    (demand?.notRespondedInvites || 0)
  );
}

function buildTeamDemandRows(eligibleTeams, current, previous, teamById, memberCounts) {
  return [...eligibleTeams]
    .map((teamId) => {
      const team = teamById.get(teamId);
      const now = current.teamDemand.get(teamId) || emptyTeamDemand();
      const before = previous.teamDemand.get(teamId) || emptyTeamDemand();
      const responses = responseTotal(now);
      const inviteeContributorCount = now.inviteePeople.size;
      const responseReportable =
        responses >= MIN_METRIC_CONTRIBUTORS && inviteeContributorCount >= MIN_METRIC_CONTRIBUTORS;
      const sentChange = evaluateChange(before.sentAttendeeHours, now.sentAttendeeHours);
      const receivedChange = evaluateChange(
        before.receivedAttendeeHours,
        now.receivedAttendeeHours
      );

      return {
        id: teamId,
        name: team?.name || 'Team',
        memberCount: memberCounts.get(teamId) || 0,
        sentMeetingLinks: now.sentMeetingLinks,
        sentInviteCount: now.sentInviteCount,
        sentAttendeeHours: round(now.sentAttendeeHours, 1),
        receivedMeetingLinks: now.receivedMeetingLinks,
        receivedInviteCount: now.receivedInviteCount,
        receivedAttendeeHours: round(now.receivedAttendeeHours, 1),
        netReceivedAttendeeHours: round(now.receivedAttendeeHours - now.sentAttendeeHours, 1),
        partnerCount: now.partnerTeams.size,
        organizerContributorCount: now.organizerPeople.size,
        inviteeContributorCount,
        responseCount: responses,
        acceptedInvites: responseReportable ? now.acceptedInvites : null,
        declinedInvites: responseReportable ? now.declinedInvites : null,
        tentativeInvites: responseReportable ? now.tentativeInvites : null,
        notRespondedInvites: responseReportable ? now.notRespondedInvites : null,
        declineRate: responseReportable ? round(ratio(now.declinedInvites, responses), 3) : null,
        responseCoverage: now.receivedInviteCount
          ? round(ratio(responses, now.receivedInviteCount), 3)
          : null,
        responseSuppressed: !responseReportable,
        sentTrendPct: sentChange.reportable ? sentChange.pct : null,
        sentTrendReason: sentChange.reason,
        receivedTrendPct: receivedChange.reportable ? receivedChange.pct : null,
        receivedTrendReason: receivedChange.reason,
      };
    })
    .sort(
      (a, b) =>
        b.sentAttendeeHours +
          b.receivedAttendeeHours -
          (a.sentAttendeeHours + a.receivedAttendeeHours) || a.name.localeCompare(b.name)
    );
}

function buildLeadershipQuestions(teamDemand, edges, nodes) {
  const questions = [];
  const topSender = [...teamDemand]
    .filter((team) => team.sentAttendeeHours > 0)
    .sort((a, b) => b.sentAttendeeHours - a.sentAttendeeHours)[0];
  const topReceiver = [...teamDemand]
    .filter((team) => team.receivedAttendeeHours > 0)
    .sort((a, b) => b.receivedAttendeeHours - a.receivedAttendeeHours)[0];
  const declineFriction = [...teamDemand]
    .filter((team) => team.declineRate != null)
    .sort((a, b) => b.declineRate - a.declineRate || b.responseCount - a.responseCount)[0];
  const bridgeEdge = [...edges]
    .filter((edge) => edge.bridgeConcentration > 0)
    .sort(
      (a, b) =>
        b.bridgeConcentration * b.interactionUnits - a.bridgeConcentration * a.interactionUnits
    )[0];
  const broadestBridge = [...nodes]
    .filter((node) => node.partnerCount > 0)
    .sort(
      (a, b) =>
        b.partnerCount - a.partnerCount ||
        b.crossTeamMeetingHours - a.crossTeamMeetingHours ||
        b.outsideTeamShare - a.outsideTeamShare
    )[0];

  questions.push(
    topSender
      ? {
          id: 'meeting_initiators',
          question: 'Who creates the most cross-team meeting load?',
          answer: `${topSender.name} sends the most measurable cross-team meeting demand.`,
          evidence: [
            `${topSender.sentInviteCount} invited participant-slots`,
            `${topSender.sentAttendeeHours} attendee-hours placed on other teams`,
            `${topSender.partnerCount} partner teams reached`,
          ],
          severity: topSender.sentAttendeeHours >= 8 ? 'medium' : 'low',
          status: 'ready',
        }
      : {
          id: 'meeting_initiators',
          question: 'Who creates the most cross-team meeting load?',
          answer: 'Organizer-attributed meeting demand is not available in this period.',
          evidence: ['Calendar metadata is present, but no internal organizer team was resolved.'],
          severity: 'low',
          status: 'missing_data',
        }
  );

  questions.push(
    topReceiver
      ? {
          id: 'meeting_receivers',
          question: 'Which team absorbs the most meeting time from others?',
          answer: `${topReceiver.name} receives the most cross-team meeting load.`,
          evidence: [
            `${topReceiver.receivedInviteCount} received participant-slots`,
            `${topReceiver.receivedAttendeeHours} attendee-hours received from other teams`,
            `${topReceiver.netReceivedAttendeeHours} net received attendee-hours`,
          ],
          severity: topReceiver.receivedAttendeeHours >= 8 ? 'medium' : 'low',
          status: 'ready',
        }
      : {
          id: 'meeting_receivers',
          question: 'Which team absorbs the most meeting time from others?',
          answer: 'No privacy-eligible team received measurable cross-team meeting demand.',
          evidence: ['This can mean low cross-team load or insufficient organizer attribution.'],
          severity: 'low',
          status: 'missing_data',
        }
  );

  questions.push(
    declineFriction?.declineRate > 0
      ? {
          id: 'invite_friction',
          question: 'Where are meeting invites being declined most?',
          answer: `${declineFriction.name} has the highest measured decline rate.`,
          evidence: [
            `${Math.round(declineFriction.declineRate * 100)}% declined`,
            `${declineFriction.responseCount} privacy-eligible invite responses measured`,
            `${declineFriction.responseCoverage != null ? Math.round(declineFriction.responseCoverage * 100) : 0}% response coverage`,
          ],
          severity: declineFriction.declineRate >= 0.25 ? 'medium' : 'low',
          status: 'ready',
        }
      : {
          id: 'invite_friction',
          question: 'Where are meeting invites being declined most?',
          answer: 'Invite response data is not yet strong enough to compare teams.',
          evidence: [
            'Response-status metrics are suppressed until at least five invitees and five responses are measured.',
          ],
          severity: 'low',
          status: 'suppressed',
        }
  );

  questions.push(
    bridgeEdge
      ? {
          id: 'information_bridges',
          question: 'Where does information depend on a narrow bridge?',
          answer: `${bridgeEdge.teamAName} ↔ ${bridgeEdge.teamBName} is the most concentrated visible interface.`,
          evidence: [
            `${Math.round(bridgeEdge.bridgeConcentration * 100)}% connector concentration`,
            `${bridgeEdge.contributorCount} contributors`,
            `${bridgeEdge.interactionCount} measured interactions`,
          ],
          severity: bridgeEdge.bridgeConcentration >= CONCENTRATION_THRESHOLD ? 'medium' : 'low',
          status: 'ready',
        }
      : broadestBridge
        ? {
            id: 'information_bridges',
            question: 'Where does information cross departments most broadly?',
            answer: `${broadestBridge.name} has the broadest visible cross-team interface.`,
            evidence: [
              `${broadestBridge.partnerCount} partner teams`,
              `${round(broadestBridge.crossTeamMeetingHours, 1)} cross-team meeting hours`,
              `${Math.round(broadestBridge.outsideTeamShare * 100)}% outside-team interaction share`,
            ],
            severity: 'low',
            status: 'ready',
          }
        : {
            id: 'information_bridges',
            question: 'Where does information cross departments?',
            answer: 'No cross-team bridge met the privacy threshold in this period.',
            evidence: ['More mapped activity or larger teams are needed before comparison.'],
            severity: 'low',
            status: 'suppressed',
          }
  );

  return questions;
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

  const organizerByHash = new Map();
  for (const user of users) {
    if (user.accountStatus === 'inactive' || !user.email) continue;
    const teamId = userTeam.get(id(user));
    if (!teamId) continue;
    const hashedEmail = hashMetadata(orgId, user.email.toLowerCase());
    if (hashedEmail) organizerByHash.set(hashedEmail, { userId: id(user), teamId });
  }

  const eligibleTeams = new Set(
    [...teamById.keys()].filter(
      (teamId) => (memberCounts.get(teamId) || 0) >= MIN_METRIC_CONTRIBUTORS
    )
  );
  const current = analyzePeriod(currentEvents, userTeam, organizerByHash);
  const previous = analyzePeriod(previousEvents, userTeam, organizerByHash);
  const mappingCoverage = ratio(mappedUserCount, activeUserCount);
  const eventMappingCoverage = ratio(current.mappedEventCount, current.interactionEventCount);
  const ready =
    mappingCoverage >= READY_COVERAGE &&
    eventMappingCoverage >= READY_COVERAGE &&
    eligibleTeams.size >= 2 &&
    current.interactionEventCount >= MIN_EVENTS;

  const confidenceScore = Math.round(Math.min(mappingCoverage, eventMappingCoverage) * 100);
  const confidenceLabel = ready ? 'Ready' : confidenceScore >= 60 ? 'Partial' : 'Needs setup';
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
          const directedInteractionCount = edge.directionAToB + edge.directionBToA;
          const responseCount =
            edge.acceptedInvites +
            edge.declinedInvites +
            edge.tentativeInvites +
            edge.notRespondedInvites;
          const dominantFromTeamId =
            edge.directionAToB >= edge.directionBToA ? edge.teamAId : edge.teamBId;
          const dominantToTeamId =
            edge.directionAToB >= edge.directionBToA ? edge.teamBId : edge.teamAId;
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
            directedInteractionCount,
            directionBalance: maxDirection ? round(minDirection / maxDirection, 3) : 1,
            dominantDirection: directedInteractionCount
              ? {
                  fromTeamId: dominantFromTeamId,
                  fromTeamName: teamById.get(dominantFromTeamId)?.name || 'Team',
                  toTeamId: dominantToTeamId,
                  toTeamName: teamById.get(dominantToTeamId)?.name || 'Team',
                  share: round(ratio(maxDirection, directedInteractionCount), 3),
                }
              : null,
            inviteCount: edge.inviteCount,
            inviteeHours: round(edge.inviteeHours, 1),
            responseCount,
            declineRate:
              responseCount >= MIN_METRIC_CONTRIBUTORS
                ? round(ratio(edge.declinedInvites, responseCount), 3)
                : null,
            bridgeConcentration: round(bridgeConcentration(edge), 3),
            contributorCount: edge.contributors.size,
            afterHoursShare: round(ratio(edge.afterHoursUnits, interactionUnits), 3),
            trendPct: change.reportable ? change.pct : null,
            trendReason: change.reason,
          };
        })
        .sort((a, b) => b.interactionUnits - a.interactionUnits)
    : [];

  const teamDemand = ready
    ? buildTeamDemandRows(eligibleTeams, current, previous, teamById, memberCounts)
    : [];
  const leadershipQuestions = ready
    ? buildLeadershipQuestions(teamDemand, actualEdges, measuredNodes)
    : [];
  const insights = ready ? buildInsights(actualEdges, measuredNodes, teamById) : [];
  const hiddenDependencies = actualEdges.filter((edge) => !edge.formalConnection).length;
  const concentratedInterfaces = actualEdges.filter(
    (edge) => edge.bridgeConcentration > CONCENTRATION_THRESHOLD
  ).length;
  const measurableOrganizerLinks = teamDemand.reduce((sum, team) => sum + team.sentMeetingLinks, 0);
  const measurableInviteResponses = teamDemand.reduce((sum, team) => sum + team.responseCount, 0);

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
      score: confidenceScore,
      label: confidenceLabel,
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
    summary: {
      measuredTeams: nodes.length,
      formalConnections: formalEdges.length,
      observedConnections: actualEdges.length,
      hiddenDependencies,
      concentratedInterfaces,
      suppressedConnections: ready ? current.edges.size - actualEdges.length : current.edges.size,
      measurableOrganizerLinks,
      measurableInviteResponses,
    },
    nodes,
    formalEdges,
    actualEdges,
    teamDemand,
    leadershipQuestions,
    insights,
    methodology: {
      measurementType: 'descriptive organizational network analysis',
      validationStatus:
        'Team links and concentration use established graph concepts. SignalTrue privacy gates, combined ranking units, percentiles, and review bands are internal product rules and are not externally validated risk thresholds.',
      observedMetrics: [
        'meeting count',
        'meeting hours',
        'organizer-attributed invite load',
        'attendee response status',
        'directed interaction count',
        'active partner teams',
      ],
      internalRules: [
        'five-contributor privacy minimum',
        '80% mapping readiness',
        'within-company percentile review rules',
      ],
    },
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
      interactionCount: edge.interactionCount,
      meetingHours: edge.meetingHours,
      directedInteractionCount: edge.directedInteractionCount,
      bridgeConcentration: edge.bridgeConcentration * 100,
      directionBalance: edge.directionBalance * 100,
    };
    value = edgeMetrics[metricName];
  } else if (normalizedTeamIds.length === 1) {
    const node = network.nodes.find((item) => String(item.id) === normalizedTeamIds[0]);
    if (!node) return null;
    const nodeMetrics = {
      crossTeamUnits: node.crossTeamUnits,
      crossTeamMeetingHours: node.crossTeamMeetingHours,
      partnerCount: node.partnerCount,
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
      .select('_id email teamId accountStatus')
      .lean(),
    OrgUnit.find({ orgId, effectiveTo: null })
      .select('userId managerUserId teamId effectiveTo')
      .lean(),
    WorkEvent.find({ orgId, timestamp: { $gte: previousStart, $lt: currentEnd } })
      .select(
        'source eventType actorUserId targetUserId timestamp externalId metadata.meetingIdHash metadata.meetingInstanceIdHash metadata.durationMinutes metadata.isAfterHours metadata.isAllHands metadata.isCancelled metadata.attendeeCount metadata.meetingType metadata.organizerHash metadata.organizerUserId metadata.organizerTeamId metadata.attendeeResponseStatus'
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
