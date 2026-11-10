import WeeklyBriefDispatch from '../models/weeklyBriefDispatch.js';
import Notification from '../models/notification.js';
import User from '../models/user.js';

const ALERT_WINDOW_MS = 24 * 60 * 60 * 1000;
const STUCK_AFTER_MS = 15 * 60 * 1000;

export function classifyReportDispatch(dispatch, now = new Date()) {
  if (!dispatch) return null;
  if (dispatch.status === 'unknown') return 'unconfirmed_delivery';
  if (dispatch.status === 'sending' &&
      now.getTime() - new Date(dispatch.createdAt).getTime() > STUCK_AFTER_MS) {
    return 'stalled_delivery';
  }
  return null;
}

/**
 * Notify current org HR/admin accounts when delivery cannot be confirmed.
 * Never retry a possibly accepted email, and never include report contents.
 */
export async function runReportDeliveryHealthMonitor(now = new Date()) {
  const stale = new Date(now.getTime() - STUCK_AFTER_MS);
  const dispatches = await WeeklyBriefDispatch.find({
    $or: [{ status: 'unknown' }, { status: 'sending', createdAt: { $lt: stale } }],
  }).sort({ createdAt: -1 }).limit(200).lean();

  let notificationsCreated = 0;
  for (const dispatch of dispatches) {
    const reason = classifyReportDispatch(dispatch, now);
    if (!reason) continue;
    const admins = await User.find({
      orgId: dispatch.orgId,
      role: { $in: ['hr_admin', 'admin', 'org_admin'] },
      accountStatus: 'active',
    }).select('_id').lean();
    const problemKey = 'report-delivery:' + String(dispatch._id) + ':' + reason;
    for (const admin of admins) {
      const duplicate = await Notification.exists({
        userId: admin._id, orgId: dispatch.orgId, type: 'system',
        'data.metadata.problemKey': problemKey,
        createdAt: { $gte: new Date(now.getTime() - ALERT_WINDOW_MS) },
      });
      if (duplicate) continue;
      await Notification.create({
        userId: admin._id, orgId: dispatch.orgId, type: 'system',
        priority: 'high',
        title: 'Report email delivery requires verification',
        message: 'This reporting period may already have been sent. Verify the email-provider delivery state before attempting to resend it.',
        data: { actionUrl: '/app/latest-brief', actionLabel: 'Review report',
          metadata: { problemKey, dispatchId: String(dispatch._id), reason } },
      });
      notificationsCreated++;
    }
  }
  return { checked: dispatches.length, notificationsCreated };
}
