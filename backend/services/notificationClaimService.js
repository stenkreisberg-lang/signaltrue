import Organization from '../models/organizationModel.js';

function claimKey(eventType, idempotencyKey) {
  return `${eventType}:${idempotencyKey}`.slice(0, 300);
}

/**
 * Atomically claim an externally visible notification before it is sent.
 * MongoDB serializes the conditional document update, so only one concurrent
 * callback can receive `claimed: true` for the same event key.
 */
export async function claimNotification(orgId, eventType, idempotencyKey) {
  const key = claimKey(eventType, idempotencyKey);
  const organization = await Organization.findOneAndUpdate(
    { _id: orgId, 'notificationClaims.key': { $ne: key } },
    {
      $push: {
        notificationClaims: {
          key,
          eventType,
          status: 'sending',
          claimedAt: new Date(),
        },
      },
    },
    { returnDocument: 'after' }
  );
  return { claimed: Boolean(organization), key };
}

export async function completeNotificationClaim(orgId, key, status, error = null) {
  await Organization.updateOne(
    { _id: orgId, 'notificationClaims.key': key },
    {
      $set: {
        'notificationClaims.$.status': status,
        'notificationClaims.$.completedAt': new Date(),
        'notificationClaims.$.error': error ? String(error).slice(0, 300) : null,
      },
    }
  );
}
