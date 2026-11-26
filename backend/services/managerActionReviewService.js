import ManagerWorkAction from '../models/managerWorkAction.js';
import {
  assertScopedManager,
  evaluateActionOutcome,
  getScopedTeamMeasurements,
  resolveOrgMinimum,
} from './managerIntelligenceService.js';

const DAY = 86400000;

export async function recordDueManagerReviews(action, data, now = new Date()) {
  let result = null;
  for (const day of [14, 28]) {
    const field = 'outcome' + day;
    const due = action['due' + day];
    if (!due || new Date(due) > now) continue;
    if (action[field]?.measuredAt) {
      result = { day, ...action[field] };
      continue;
    }
    const evidence = evaluateActionOutcome(action, data, now, day);
    result = evidence || { day, value: null, status: 'insufficient_evidence', measuredAt: now };
    // A completed week may take up to seven days to enter the weekly series.
    if (!evidence && now < new Date(new Date(due).getTime() + 7 * DAY)) continue;
    const filter = {
      _id: action._id,
      orgId: action.orgId,
      teamId: action.teamId,
      status: 'active',
    };
    const stored =
      (await ManagerWorkAction.findOneAndUpdate(
        { ...filter, [field + '.measuredAt']: null },
        { $set: { [field]: { value: result.value, status: result.status, measuredAt: now } } },
        { new: true, projection: { [field]: 1 } }
      ).lean()) || (await ManagerWorkAction.findOne(filter).select(field).lean());
    if (stored?.[field]?.measuredAt) result = { day, ...stored[field] };
    else return null;
  }
  return result;
}

export async function runDueManagerReviews(now = new Date()) {
  const cursor = ManagerWorkAction.find({
    status: 'active',
    $or: [
      { due14: { $lte: now }, 'outcome14.measuredAt': null },
      { due28: { $lte: now }, 'outcome28.measuredAt': null },
    ],
  })
    .lean()
    .cursor();
  let failed = 0;
  for await (const action of cursor) {
    try {
      const request = { user: { userId: action.createdBy } };
      const scope = await assertScopedManager(request, action.teamId);
      if (!scope || String(scope.user.orgId) !== String(action.orgId)) continue;
      const { minimum } = await resolveOrgMinimum(action.orgId);
      const data = await getScopedTeamMeasurements({
        orgId: action.orgId,
        team: scope.team,
        minimum,
        now,
        forReview: true,
      });
      const current = await assertScopedManager(request, action.teamId);
      if (current && String(current.user.orgId) === String(action.orgId))
        await recordDueManagerReviews(action, data, now);
    } catch {
      failed++;
    }
  }
  if (failed) throw new Error('Unable to complete ' + failed + ' manager action reviews');
}
