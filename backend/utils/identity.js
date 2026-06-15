/**
 * Identity pseudonymization.
 *
 * The analytics/graph/report/AI layers must never emit raw user identities.
 * Joins against WorkEvent.actorUserId happen on the raw id (server-side only);
 * anything that leaves the trust boundary (report, AI prompt, export) uses
 * personHash. See docs/PIVOT_REPORT_SPEC.md §9.
 */

import crypto from 'node:crypto';

function salt() {
  // Per-deployment salt. In production this MUST be set; we degrade to a fixed
  // dev salt only outside production so local runs work.
  const s = process.env.ORG_HASH_SALT || process.env.SECRET_KEY || '';
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ORG_HASH_SALT (or SECRET_KEY) is required in production for identity hashing');
    }
    return 'signaltrue_dev_salt';
  }
  return s;
}

/**
 * Stable pseudonymous id for a person within an org.
 * @param {string|ObjectId} orgId
 * @param {string|ObjectId} userId
 * @returns {string} hex digest (first 16 chars)
 */
export function hashPerson(orgId, userId) {
  if (!userId) return null;
  return crypto
    .createHmac('sha256', salt())
    .update(`${String(orgId)}:${String(userId)}`)
    .digest('hex')
    .slice(0, 16);
}

export default { hashPerson };
