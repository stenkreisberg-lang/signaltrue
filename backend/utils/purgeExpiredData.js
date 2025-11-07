import mongoose from 'mongoose';
import Organization from '../models/organization.js';
import MetricsDaily from '../models/metricsDaily.js';
import DriftEvent from '../models/driftEvent.js';
import EnergyConfig from '../models/energyConfig.js';

/**
 * Purge expired data for all orgs based on their data_retention_days setting.
 * Deletes metrics, drift events, and energy configs older than retention.
 */
export default async function purgeExpiredData() {
  const orgs = await Organization.find({});
  const now = new Date();
  for (const org of orgs) {
    const retention = org.data_retention_days || 90;
    const cutoff = new Date(now.getTime() - retention * 24 * 60 * 60 * 1000);
    // Purge metrics
    await MetricsDaily.deleteMany({ orgId: org._id, date: { $lt: cutoff } });
    // Purge drift events
    await DriftEvent.deleteMany({ orgId: org._id, createdAt: { $lt: cutoff } });
    // Purge energy configs (if timestamped)
    await EnergyConfig.deleteMany({ orgId: org._id, createdAt: { $lt: cutoff } });
  }
}
