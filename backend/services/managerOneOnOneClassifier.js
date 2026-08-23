import WorkEvent from '../models/workEvent.js';
import OrgUnit from '../models/orgUnit.js';

/**
 * Verify manager/direct-report 1:1s from attendee-expanded calendar metadata.
 * A generic two-person meeting is never sufficient: both internal participant
 * records and an active reporting relationship supplied by the caller must be
 * present. Content, titles and attendee identities never leave this service.
 */
export async function classifyManagerOneOnOnes({
  orgId,
  managerUserId,
  reportUserIds,
  start,
  end,
  persist = true,
}) {
  const managerId = String(managerUserId);
  const reportIds = new Set((reportUserIds || []).map(String));
  const managerMeetings = await WorkEvent.find({
    orgId,
    actorUserId: managerUserId,
    eventType: 'meeting',
    timestamp: { $gte: start, $lt: end },
  })
    .select(
      'metadata.meetingInstanceIdHash metadata.meetingIdHash metadata.attendeeCount metadata.externalAttendeeCount metadata.isCancelled metadata.isRescheduled'
    )
    .lean();

  const hashes = [
    ...new Set(
      managerMeetings
        .map((event) => event.metadata?.meetingInstanceIdHash || event.metadata?.meetingIdHash)
        .filter(Boolean)
    ),
  ];
  if (hashes.length === 0) {
    return emptyResult(managerMeetings.length);
  }

  const participantCopies = await WorkEvent.find({
    orgId,
    eventType: 'meeting',
    timestamp: { $gte: start, $lt: end },
    $or: [
      { 'metadata.meetingInstanceIdHash': { $in: hashes } },
      { 'metadata.meetingIdHash': { $in: hashes } },
    ],
  })
    .select(
      'actorUserId metadata.meetingInstanceIdHash metadata.meetingIdHash metadata.attendeeCount metadata.externalAttendeeCount metadata.isCancelled metadata.isRescheduled'
    )
    .lean();

  const meetings = new Map();
  for (const event of participantCopies) {
    const hash = event.metadata?.meetingInstanceIdHash || event.metadata?.meetingIdHash;
    if (!hash) continue;
    const entry = meetings.get(hash) || {
      actors: new Set(),
      attendeeCount: null,
      externalAttendeeCount: 0,
      cancelled: false,
      rescheduled: false,
    };
    if (event.actorUserId) entry.actors.add(String(event.actorUserId));
    if (Number.isFinite(event.metadata?.attendeeCount)) {
      entry.attendeeCount = Math.max(entry.attendeeCount || 0, event.metadata.attendeeCount);
    }
    entry.externalAttendeeCount = Math.max(
      entry.externalAttendeeCount,
      Number(event.metadata?.externalAttendeeCount) || 0
    );
    entry.cancelled ||= event.metadata?.isCancelled === true;
    entry.rescheduled ||= event.metadata?.isRescheduled === true;
    meetings.set(hash, entry);
  }

  const verifiedHashes = [];
  let attributableMeetings = 0;
  let completed = 0;
  let cancelled = 0;
  let rescheduled = 0;

  for (const [hash, meeting] of meetings.entries()) {
    const actors = [...meeting.actors];
    const isAttributable = meeting.attendeeCount === 2 && meeting.externalAttendeeCount === 0;
    if (isAttributable) attributableMeetings++;
    const other = actors.find((actor) => actor !== managerId);
    const verified =
      isAttributable &&
      actors.length === 2 &&
      actors.includes(managerId) &&
      Boolean(other && reportIds.has(other));
    if (!verified) continue;

    verifiedHashes.push(hash);
    if (meeting.cancelled) cancelled++;
    else completed++;
    if (meeting.rescheduled) rescheduled++;
  }

  if (persist) {
    if (verifiedHashes.length > 0) {
      await WorkEvent.updateMany(
        {
          orgId,
          eventType: 'meeting',
          $or: [
            { 'metadata.meetingInstanceIdHash': { $in: verifiedHashes } },
            { 'metadata.meetingIdHash': { $in: verifiedHashes } },
          ],
        },
        { $set: { 'metadata.isManagerOneOnOne': true } }
      );
    }
  }

  return {
    managerMeetingCount: managerMeetings.length,
    attributableMeetings,
    attributionCoverage:
      managerMeetings.length > 0
        ? Math.round((attributableMeetings / managerMeetings.length) * 100) / 100
        : null,
    verifiedHashes,
    completed,
    cancelled,
    rescheduled,
  };
}

export async function classifyManagerOneOnOnesForOrgDay(orgId, day) {
  const start = new Date(day);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const managers = await OrgUnit.find({ orgId, isManager: true, effectiveTo: null })
    .select('userId')
    .lean();
  let verifiedMeetings = 0;
  for (const manager of managers) {
    const reportUserIds = await OrgUnit.distinct('userId', {
      orgId,
      managerUserId: manager.userId,
      effectiveTo: null,
    });
    const result = await classifyManagerOneOnOnes({
      orgId,
      managerUserId: manager.userId,
      reportUserIds,
      start,
      end,
    });
    verifiedMeetings += result.verifiedHashes.length;
  }
  return { managers: managers.length, verifiedMeetings };
}

function emptyResult(managerMeetingCount = 0) {
  return {
    managerMeetingCount,
    attributableMeetings: 0,
    attributionCoverage: managerMeetingCount > 0 ? 0 : null,
    verifiedHashes: [],
    completed: 0,
    cancelled: 0,
    rescheduled: 0,
  };
}

export default { classifyManagerOneOnOnes, classifyManagerOneOnOnesForOrgDay };
