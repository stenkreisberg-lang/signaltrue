import Intervention from '../models/intervention.js';
import Notification from '../models/notification.js';
import OrgUnit from '../models/orgUnit.js';
import User from '../models/user.js';
import { generateManagerCoaching } from './managerCoachingInsightService.js';

/**
 * Create privacy-safe in-app reminders. Notification copy never contains the
 * measured signal or metric; the manager must open their authenticated private
 * workspace to see evidence.
 */
export async function createManagerCoachingNotificationsForOrg(orgId) {
  const managerUnits = await OrgUnit.find({ orgId, isManager: true, effectiveTo: null })
    .select('userId')
    .lean();
  const userIds = managerUnits.map((unit) => unit.userId).filter(Boolean);
  const activeUsers = await User.find({
    _id: { $in: userIds },
    orgId,
    role: 'manager',
    accountStatus: 'active',
  })
    .select('_id')
    .lean();
  let insightsCreated = 0;
  let reviewsCreated = 0;

  for (const user of activeUsers) {
    const coaching = await generateManagerCoaching({ orgId, userId: user._id });
    const insight = coaching.data?.primaryInsight;
    if (insight) {
      const existing = await Notification.exists({
        userId: user._id,
        orgId,
        type: 'manager-coaching',
        'data.metadata.insightId': insight.insightId,
      });
      if (!existing) {
        await Notification.createNotification({
          userId: user._id,
          orgId,
          type: 'manager-coaching',
          priority: 'normal',
          title: 'Your weekly manager coaching insight is ready',
          message: 'Open your private workspace to review one measured work-pattern change.',
          data: {
            actionUrl: '/app/manager-coaching',
            actionLabel: 'Open Manager Coach',
            metadata: { insightId: insight.insightId },
          },
        });
        insightsCreated++;
      }
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const progressExperiments = await Intervention.find({
      orgId,
      source: 'manager_coaching',
      createdBy: user._id,
      status: { $in: ['active', 'pending-recheck'] },
      startDate: { $lte: sevenDaysAgo, $gt: fourteenDaysAgo },
    })
      .select('_id')
      .lean();
    for (const experiment of progressExperiments) {
      const existing = await Notification.exists({
        userId: user._id,
        orgId,
        type: 'manager-coaching-review',
        'data.interventionId': experiment._id,
        'data.metadata.checkpoint': 'day_7',
      });
      if (existing) continue;
      await Notification.createNotification({
        userId: user._id,
        orgId,
        type: 'manager-coaching-review',
        priority: 'low',
        title: 'Your coaching experiment is halfway through',
        message:
          'No action is required. Your frozen baseline is safe and the 14-day review is approaching.',
        data: {
          actionUrl: '/app/manager-coaching',
          actionLabel: 'View experiment',
          interventionId: experiment._id,
          metadata: { checkpoint: 'day_7' },
        },
      });
      reviewsCreated++;
    }

    const dueExperiments = await Intervention.find({
      orgId,
      source: 'manager_coaching',
      createdBy: user._id,
      status: { $in: ['active', 'pending-recheck'] },
      reviews: {
        $elemMatch: { dueDate: { $lte: new Date() }, measuredAt: { $exists: false } },
      },
    })
      .select('_id reviews')
      .lean();
    for (const experiment of dueExperiments) {
      const dueReview = experiment.reviews.find(
        (review) => !review.measuredAt && new Date(review.dueDate) <= new Date()
      );
      if (!dueReview) continue;
      const existing = await Notification.exists({
        userId: user._id,
        orgId,
        type: 'manager-coaching-review',
        'data.interventionId': experiment._id,
        'data.metadata.reviewDay': dueReview.day,
      });
      if (existing) continue;
      await Notification.createNotification({
        userId: user._id,
        orgId,
        type: 'manager-coaching-review',
        priority: 'normal',
        title: `Your ${dueReview.day}-day coaching review is ready`,
        message:
          'SignalTrue can now compare the same target metrics with the frozen starting point.',
        data: {
          actionUrl: '/app/manager-coaching',
          actionLabel: 'Review experiment',
          interventionId: experiment._id,
          metadata: { reviewDay: dueReview.day },
        },
      });
      reviewsCreated++;
    }
  }
  return { managers: activeUsers.length, insightsCreated, reviewsCreated };
}

export default { createManagerCoachingNotificationsForOrg };
