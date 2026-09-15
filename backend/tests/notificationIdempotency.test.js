import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import Organization from '../models/organizationModel.js';
import {
  claimNotification,
  completeNotificationClaim,
} from '../services/notificationClaimService.js';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('integration email idempotency', () => {
  test('only one concurrent callback can claim the same connection notification', async () => {
    const organization = await Organization.create({ name: 'Tehnopol test' });
    const attempts = await Promise.all(
      Array.from({ length: 12 }, () =>
        claimNotification(organization._id, 'integration_connected', 'company-wide:tenant-1')
      )
    );

    expect(attempts.filter((attempt) => attempt.claimed)).toHaveLength(1);
    const key = attempts[0].key;
    await completeNotificationClaim(organization._id, key, 'sent');

    const repeated = await claimNotification(
      organization._id,
      'integration_connected',
      'company-wide:tenant-1'
    );
    expect(repeated.claimed).toBe(false);

    const stored = await Organization.findById(organization._id).lean();
    expect(stored.notificationClaims).toEqual([
      expect.objectContaining({ key, status: 'sent', completedAt: expect.any(Date) }),
    ]);
  });

  test('separate genuine integration transitions use separate stable keys', async () => {
    const organization = await Organization.create({ name: 'Existing tenant test' });

    const outlook = await claimNotification(
      organization._id,
      'integration_connected',
      'microsoft-outlook:tenant-1'
    );
    const teams = await claimNotification(
      organization._id,
      'integration_connected',
      'microsoft-teams:tenant-1'
    );

    expect(outlook.claimed).toBe(true);
    expect(teams.claimed).toBe(true);
  });

  test('the legacy completion marker is persisted by the strict schema', async () => {
    const organization = await Organization.create({ name: 'Schema test' });
    await Organization.findByIdAndUpdate(organization._id, {
      $set: { 'settings.integrationsNotificationSent': true },
    });

    const stored = await Organization.findById(organization._id).lean();
    expect(stored.settings.integrationsNotificationSent).toBe(true);
  });
});
