import mongoose from 'mongoose';
import User from '../models/user.js';
import WorkEvent from '../models/workEvent.js';
import IntegrationConnection from '../models/integrationConnection.js';

function normalizeEmail(value) {
  return typeof value === 'string' && value.includes('@') ? value.trim().toLowerCase() : null;
}

function normalizeId(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function pushEmail(emails, value) {
  const email = normalizeEmail(value);
  if (email) emails.push(email);
}

function extractCandidateEmails(event) {
  const emails = [];
  pushEmail(emails, event._userEmail);
  pushEmail(emails, event.userEmail);
  pushEmail(emails, event.email);
  pushEmail(emails, event.organizer?.emailAddress?.address);
  pushEmail(emails, event.from?.user?.email);
  pushEmail(emails, event.from?.emailAddress?.address);
  pushEmail(emails, event.sender?.emailAddress?.address);
  pushEmail(emails, event.metadata?.userEmail);
  pushEmail(emails, event.metadata?.email);
  pushEmail(emails, event.metadata?.organizer);
  pushEmail(emails, event.metadata?.fromEmail);

  for (const attendee of event.attendees || event.metadata?.attendees || []) {
    pushEmail(emails, attendee?.emailAddress?.address || attendee?.email || attendee);
  }

  return [...new Set(emails)];
}

function extractExternalIds(event) {
  return {
    microsoftUserId:
      normalizeId(event._microsoftUserId) ||
      normalizeId(event.from?.user?.id) ||
      normalizeId(event.organizer?.emailAddress?.id) ||
      normalizeId(event.metadata?.microsoftUserId),
    googleUserId:
      normalizeId(event._googleUserId) ||
      normalizeId(event.sender?.name) ||
      normalizeId(event.metadata?.googleUserId),
    slackUserId: normalizeId(event.user) || normalizeId(event.metadata?.slackUserId),
  };
}

export async function buildUserAttributionMaps(orgId) {
  const users = await User.find({ orgId })
    .select('_id email teamId externalIds profile.department')
    .lean();

  const byEmail = new Map();
  const byMicrosoftId = new Map();
  const byGoogleId = new Map();
  const bySlackId = new Map();

  for (const user of users) {
    if (user.email) byEmail.set(user.email.toLowerCase(), user);
    if (user.externalIds?.microsoftUserId) {
      byMicrosoftId.set(String(user.externalIds.microsoftUserId), user);
    }
    if (user.externalIds?.googleUserId) byGoogleId.set(String(user.externalIds.googleUserId), user);
    if (user.externalIds?.slackUserId) bySlackId.set(String(user.externalIds.slackUserId), user);
  }

  return { users, byEmail, byMicrosoftId, byGoogleId, bySlackId };
}

export function resolveUserForEvent(event, maps) {
  if (event._internalUserId || event.actorUserId) {
    const id = String(event._internalUserId || event.actorUserId);
    return maps.users.find((user) => String(user._id) === id) || null;
  }

  const ids = extractExternalIds(event);
  if (ids.microsoftUserId && maps.byMicrosoftId.has(ids.microsoftUserId)) {
    return maps.byMicrosoftId.get(ids.microsoftUserId);
  }
  if (ids.googleUserId && maps.byGoogleId.has(ids.googleUserId)) {
    return maps.byGoogleId.get(ids.googleUserId);
  }
  if (ids.slackUserId && maps.bySlackId.has(ids.slackUserId)) {
    return maps.bySlackId.get(ids.slackUserId);
  }

  for (const email of extractCandidateEmails(event)) {
    if (maps.byEmail.has(email)) return maps.byEmail.get(email);
  }

  return null;
}

export function applyAttribution(event, user) {
  if (!user) return event;
  event.actorUserId = user._id;
  if (user.teamId) event.teamId = user.teamId;
  return event;
}

export async function enrichWorkEvents(events, orgId) {
  const maps = await buildUserAttributionMaps(orgId);
  return events.map((event) => applyAttribution(event, resolveUserForEvent(event, maps)));
}

export async function backfillWorkEventAttribution(orgId, { since = null, sources = null } = {}) {
  const query = {
    orgId: new mongoose.Types.ObjectId(orgId),
    $or: [{ actorUserId: null }, { actorUserId: { $exists: false } }, { teamId: null }],
  };
  if (since) query.timestamp = { $gte: since };
  if (sources?.length) query.source = { $in: sources };

  const maps = await buildUserAttributionMaps(orgId);
  const events = await WorkEvent.find(query).lean();

  let matched = 0;
  let updated = 0;
  const ops = [];

  for (const event of events) {
    const user = resolveUserForEvent(event, maps);
    if (!user) continue;
    matched++;

    const $set = { actorUserId: user._id };
    if (user.teamId) $set.teamId = user.teamId;

    ops.push({
      updateOne: {
        filter: { _id: event._id },
        update: { $set },
      },
    });
  }

  if (ops.length) {
    const result = await WorkEvent.bulkWrite(ops, { ordered: false });
    updated = (result.modifiedCount || 0) + (result.upsertedCount || 0);
  }

  await updateConnectionCoverageFromEvents(orgId, { since, sources });

  return { scanned: events.length, matched, updated };
}

export async function updateConnectionCoverageFromEvents(orgId, { since = null, sources = null } = {}) {
  const totalUsers = await User.countDocuments({ orgId });
  const sourceToIntegration = {
    slack: 'slack',
    'microsoft-outlook': 'microsoft-outlook',
    'microsoft-teams': 'microsoft-teams',
    'google-calendar': 'google-calendar',
    'google-chat': 'google-chat',
  };

  const sourceList = sources?.length ? sources : Object.keys(sourceToIntegration);

  for (const source of sourceList) {
    const integrationType = sourceToIntegration[source];
    if (!integrationType) continue;

    const query = { orgId: new mongoose.Types.ObjectId(orgId), source };
    if (since) query.timestamp = { $gte: since };

    const [eventCount, mappedUsers] = await Promise.all([
      WorkEvent.countDocuments(query),
      WorkEvent.distinct('actorUserId', {
        ...query,
        actorUserId: { $ne: null },
      }),
    ]);

    if (eventCount === 0) continue;

    const mappedCount = mappedUsers.length;
    const setPayload = {
      status: mappedCount > 0 ? 'connected' : 'needs_admin',
      statusMessage:
        mappedCount > 0
          ? 'Metadata is syncing and mapped to internal users'
          : 'Metadata is syncing, but events are not mapped to internal users',
      statusUpdatedAt: new Date(),
      connectedAt: new Date(),
      'sync.lastSyncAt': new Date(),
      'sync.lastSuccessfulSyncAt': mappedCount > 0 ? new Date() : undefined,
      'sync.lastSyncStatus': mappedCount > 0 ? 'success' : 'partial',
      'sync.lastSyncEventsCount': eventCount,
      'coverage.totalUsers': totalUsers,
      'coverage.mappedUsers': mappedCount,
      'coverage.lastCoverageUpdatedAt': new Date(),
      measurementScope: 'metadata only',
    };

    await IntegrationConnection.findOneAndUpdate(
      { orgId, integrationType },
      { $set: setPayload },
      { upsert: true }
    );
  }
}
