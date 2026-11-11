import mongoose from 'mongoose';

export const MICROSOFT_WORK_EVENT_SOURCES = ['microsoft-outlook', 'microsoft-teams'];
export const SOURCE_EVIDENCE_LOOKBACK_DAYS = 7;

/**
 * Mongoose does not cast pipeline $match values. req.user.orgId originates in
 * a JSON web token and is a string; WorkEvent.orgId is a Mongo ObjectId.
 * Always cast explicitly, and count STORED events instead of inferring data
 * arrival from only the most recent incremental sync's event counter.
 */
export function buildMicrosoftSourceEvidencePipeline(orgId, now = new Date()) {
  if (!mongoose.isValidObjectId(orgId)) throw new Error('Invalid organisation ID');
  const date = new Date(now);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid evidence lookback date');
  return [
    {
      $match: {
        orgId: new mongoose.Types.ObjectId(String(orgId)),
        source: { $in: MICROSOFT_WORK_EVENT_SOURCES },
        timestamp: {
          $gte: new Date(date.getTime() - SOURCE_EVIDENCE_LOOKBACK_DAYS * 86400000),
          $lte: date,
        },
      },
    },
    {
      $group: {
        _id: '$source',
        latestEventReceived: { $max: '$timestamp' },
        storedEvents7d: { $sum: 1 },
        attributedEvents7d: {
          $sum: { $cond: [{ $ne: ['$actorUserId', null] }, 1, 0] },
        },
      },
    },
  ];
}
