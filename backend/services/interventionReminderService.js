import Intervention from '../models/intervention.js';
import { notifyInterventionDue } from './inAppNotificationService.js';

export async function sendDueInterventionReminders(now = new Date()) {
  const due = await Intervention.find({
    status: { $in: ['active', 'pending-recheck'] },
    recheckDate: { $lte: now },
    'reminders.reviewDueNotifiedAt': { $exists: false },
  })
    .populate('teamId', 'name')
    .select('_id orgId teamId actionType title actionTaken createdBy reminders');

  let sent = 0;
  let failed = 0;
  for (const intervention of due) {
    if (!intervention.createdBy) continue;
    try {
      await notifyInterventionDue(intervention.createdBy, intervention.orgId, {
        interventionId: intervention._id,
        teamId: intervention.teamId?._id || intervention.teamId,
        teamName: intervention.teamId?.name,
        actionType:
          intervention.title || intervention.actionTaken || intervention.actionType || 'action',
      });
      intervention.reminders = {
        ...(intervention.reminders?.toObject?.() || intervention.reminders || {}),
        reviewDueNotifiedAt: now,
      };
      await intervention.save();
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`[InterventionReminder] Failed for ${intervention._id}:`, error.message);
    }
  }

  return { checked: due.length, sent, failed };
}
