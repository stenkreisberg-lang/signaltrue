import WeeklyBriefSnapshot from '../models/weeklyBriefSnapshot.js';

function serializeSnapshot(snapshot) {
  if (!snapshot) return null;
  const plain = snapshot.toObject ? snapshot.toObject() : snapshot;
  return {
    id: String(plain._id),
    orgId: String(plain.orgId),
    orgName: plain.orgName,
    reportMode: plain.reportMode,
    sourceVersion: plain.sourceVersion,
    periodStart: plain.periodStart,
    periodEnd: plain.periodEnd,
    generatedAt: plain.generatedAt,
    ...plain.payload,
  };
}

export async function upsertWeeklyBriefSnapshot({
  orgId,
  orgName,
  periodStart,
  periodEnd,
  reportMode,
  payload,
  generatedAt = new Date(),
}) {
  const snapshot = await WeeklyBriefSnapshot.findOneAndUpdate(
    { orgId, periodStart },
    {
      $set: {
        orgName,
        periodEnd,
        reportMode,
        sourceVersion: 'weekly-brief-v3',
        generatedAt,
        payload,
      },
      $setOnInsert: { orgId, periodStart },
    },
    { new: true, upsert: true, runValidators: true }
  );

  return serializeSnapshot(snapshot);
}

export async function getLatestWeeklyBriefSnapshot(orgId) {
  const snapshot = await WeeklyBriefSnapshot.findOne({ orgId })
    .sort({ periodEnd: -1, generatedAt: -1 })
    .lean();
  return serializeSnapshot(snapshot);
}

export async function getWeeklyBriefSnapshotHistory(orgId, limit = 12) {
  const safeLimit = Math.min(26, Math.max(1, Number(limit) || 12));
  const snapshots = await WeeklyBriefSnapshot.find({ orgId })
    .sort({ periodEnd: -1, generatedAt: -1 })
    .limit(safeLimit)
    .lean();
  return snapshots.map(serializeSnapshot);
}

export default {
  upsertWeeklyBriefSnapshot,
  getLatestWeeklyBriefSnapshot,
  getWeeklyBriefSnapshotHistory,
};
