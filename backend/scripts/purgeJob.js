import cron from 'node-cron';
import purgeExpiredData from '../utils/purgeExpiredData.js';

// Run every day at 2:00 AM UTC
cron.schedule('0 2 * * *', async () => {
  try {
    await purgeExpiredData();
    console.log('[PurgeJob] Expired data purged successfully.');
  } catch (err) {
    console.error('[PurgeJob] Error purging expired data:', err);
  }
});
