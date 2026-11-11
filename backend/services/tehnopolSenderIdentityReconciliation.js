/**
 * Bounded, metadata-only Graph classification of Teams sender IDs absent
 * from the current Tehnopol directory. Never use display names to guess IDs,
 * never collect Teams content, and never infer that Graph 404 means a guest.
 */
import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import WorkEvent from '../models/workEvent.js';
import { getMicrosoftAppToken } from './tokenService.js';
import { TEHNOPOL_CANONICAL_ORG_ID } from './tehnopolCanonicalRepair.js';

const MAX_IDENTITIES = 100;
const DAY = 86400000;
const RUN_KEY = 'tehnopol-teams-sender-directory-check-20261111-v1';

export function classifyGraphSender(result) {
  if (!result || result.status === 'not_found')
    return 'not_found';
  if (result.status !== 'ok') return 'unverified';
  if (result.user?.accountEnabled === false) return 'disabled';
  if (String(result.user?.userType || '').toLowerCase() === 'guest') return 'guest';
  if (String(result.user?.userType || '').toLowerCase() === 'member')
    return 'directory_gap';
  return 'unverified';
}

async function lookupGraphUser(token, id) {
  try {
    const url = 'https://graph.microsoft.com/v1.0/users/' +
      encodeURIComponent(id) +
      '?$select=id,userType,accountEnabled,mail,userPrincipalName';
    const response = await fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 404) return { status: 'not_found' };
    if (!response.ok) return { status: 'unverified' };
    const user = await response.json();
    return user?.id && String(user.id).toLowerCase() === String(id).toLowerCase()
      ? { status: 'ok', user }
      : { status: 'unverified' };
  } catch {
    return { status: 'unverified' };
  }
}

function hasDirectoryRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return Array.isArray(payload.roles) && payload.roles.includes('User.Read.All');
  } catch {
    return false;
  }
}

export async function reconcileTehnopolTeamsSenderIdentities() {
  const org = await Organization.findById(TEHNOPOL_CANONICAL_ORG_ID)
    .select('domain lifecycleStatus integrations.microsoft.tenantId').lean();
  if (!org || org.lifecycleStatus !== 'active' ||
      String(org.domain).toLowerCase() !== 'tehnopol.ee' ||
      !org.integrations?.microsoft?.tenantId || !mongoose.connection.db) {
    return { status: 'not_applicable' };
  }
  const jobs = mongoose.connection.db.collection('signaltrue_maintenance_runs');
  await jobs.updateOne({ _id: RUN_KEY },
    { $setOnInsert: { status: 'pending', createdAt: new Date() } }, { upsert: true });
  const lease = await jobs.findOneAndUpdate({ _id: RUN_KEY,
    status: { $in: ['pending', 'failed'] } },
    { $set: { status: 'running', startedAt: new Date() }, $inc: { attempts: 1 } },
    { returnDocument: 'after' });
  if (!lease) return { status: 'already_processed_or_running' };

  try {
    const since = new Date(Date.now() - 7 * DAY);
    const missing = {
      orgId: org._id, source: 'microsoft-teams', eventType: 'message',
      timestamp: { $gte: since },
      actorUserId: null,
      'metadata.microsoftUserId': { $exists: true, $nin: [null, ''] },
    };
    const ids = await WorkEvent.distinct('metadata.microsoftUserId', missing);
    if (ids.length > MAX_IDENTITIES) throw new Error('identity_limit_exceeded');
    const token = await getMicrosoftAppToken(org.integrations.microsoft.tenantId);
    if (!token || !hasDirectoryRole(token)) throw new Error('graph_directory_permission_missing');

    const summary = {
      distinctUnmappedSenderIds: ids.length,
      guest: 0, disabled: 0, directory_gap: 0, not_found: 0,
      unverified: 0, active_member: 0, matchedInternalEvents: 0,
    };
    for (let start = 0; start < ids.length; start += 4) {
      const batch = ids.slice(start, start + 4);
      const graph = await Promise.all(batch.map(id => lookupGraphUser(token, id)));
      for (let i = 0; i < batch.length; i++) {
        const id = batch[i];
        const result = graph[i];
        let classification = classifyGraphSender(result);
        let matchedUser = null;
        if (classification === 'directory_gap' && result.user) {
          const emails = [result.user.mail, result.user.userPrincipalName]
            .filter(value => typeof value === 'string' &&
              value.toLowerCase().endsWith('@tehnopol.ee'))
            .map(value => value.toLowerCase());
          // Exact, unique company-mail match only. No display-name inference.
          const matches = await User.find({
            orgId: org._id, email: { $in: emails },
            accountStatus: { $ne: 'inactive' },
            $or: [
              { 'externalIds.microsoftUserId': id },
              { 'externalIds.microsoftUserId': { $in: [null, ''] } },
              { 'externalIds.microsoftUserId': { $exists: false } },
            ],
          }).select('_id teamId').lean();
          if (matches.length === 1) {
            matchedUser = matches[0];
            classification = 'active_member';
          }
        }
        summary[classification]++;
        const filter = { ...missing, 'metadata.microsoftUserId': id };
        if (matchedUser?.teamId) {
          // Persist the verified directory ID for future ingestion. Only an
          // existing active employee with the same exact company email and
          // no conflicting Microsoft ID may acquire this mapping.
          await User.updateOne({
            _id: matchedUser._id, orgId: org._id,
            $or: [
              { 'externalIds.microsoftUserId': { $exists: false } },
              { 'externalIds.microsoftUserId': null },
              { 'externalIds.microsoftUserId': '' },
              { 'externalIds.microsoftUserId': id },
            ],
          }, { $set: { 'externalIds.microsoftUserId': id } });
          const applied = await WorkEvent.updateMany(filter,
            { $set: { actorUserId: matchedUser._id, teamId: matchedUser.teamId,
              'metadata.senderIdentityClass': classification } });
          summary.matchedInternalEvents += applied.modifiedCount || 0;
        } else {
          await WorkEvent.updateMany(filter,
            { $set: { 'metadata.senderIdentityClass': classification } });
        }
      }
    }
    await jobs.updateOne({ _id: RUN_KEY, status: 'running' },
      { $set: { status: 'completed', completedAt: new Date(), summary } });
    console.info('[TehnopolSenderReconciliation]', JSON.stringify(summary));
    return { status: 'completed', ...summary };
  } catch (error) {
    const reason = ['identity_limit_exceeded','graph_directory_permission_missing'].includes(error.message)
      ? error.message : 'unexpected_error';
    await jobs.updateOne({ _id: RUN_KEY, status: 'running' },
      { $set: { status: 'failed', failedAt: new Date(), reason } });
    console.warn('[TehnopolSenderReconciliation] Incomplete:', reason);
    return { status: 'failed', reason };
  }
}
