import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import WorkEvent from '../models/workEvent.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import Intervention from '../models/intervention.js';
import { generateMonthlyReportForOrg } from '../services/monthlyReportService.js';

jest.setTimeout(120000);

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((item) => item.deleteMany({}))
  );
});

async function seedOrganization(mappedPeople) {
  const org = await Organization.create({ name: 'Monthly Test Org', industry: 'Technology' });
  const team = await Team.create({ name: 'Engineering', orgId: org._id });
  const users = await User.insertMany(
    Array.from({ length: 5 }, (_, index) => ({
      name: `Employee ${index}`,
      email: `monthly-${mappedPeople}-${index}@example.com`,
      accountStatus: 'pending',
      source: 'microsoft',
      role: 'team_member',
      orgId: org._id,
      teamId: team._id,
    }))
  );
  const now = new Date();
  await WorkEvent.insertMany(
    users.slice(0, mappedPeople).map((user, index) => ({
      orgId: org._id,
      teamId: team._id,
      actorUserId: user._id,
      source: 'microsoft-outlook',
      eventType: 'meeting',
      externalId: `monthly-meeting-${mappedPeople}-${index}`,
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    }))
  );
  await IntegrationMetricsDaily.insertMany(
    [3, 10, 17, 24].map((daysAgo, index) => ({
      orgId: org._id,
      teamId: null,
      date: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
      meetingInstanceCount7d: 20 + index,
      meetingParticipantHours7d: 50 + index * 2,
      backToBackMeetingBlocks: 4 + index,
      afterHoursMessageRatio: 0.1,
      rci: 20,
    }))
  );
  return org;
}

describe('monthly generation readiness gate', () => {
  test('creates a setup brief instead of leadership conclusions at partial coverage', async () => {
    const org = await seedOrganization(3);
    const report = await generateMonthlyReportForOrg(org._id);

    expect(report.reportMode).toBe('setup');
    expect(report.dataReadiness.userCoveragePct).toBe(60);
    expect(report.dataReadiness.weeklySnapshots).toBeGreaterThanOrEqual(3);
  });

  test('creates a decision brief only with representative users, teams, and history', async () => {
    const org = await seedOrganization(5);
    const team = await Team.findOne({ orgId: org._id });
    const createdBy = await User.findOne({ orgId: org._id });
    await Intervention.create({
      orgId: org._id,
      teamId: team._id,
      createdBy: createdBy._id,
      title: 'Meeting reset',
      status: 'completed',
      startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      outcomeDelta: {
        metricBefore: 60,
        metricAfter: 48,
        percentChange: -20,
        improved: true,
        computedAt: new Date(),
      },
    });
    const report = await generateMonthlyReportForOrg(org._id);

    expect(report.reportMode).toBe('decision');
    expect(report.dataReadiness.userCoveragePct).toBe(100);
    expect(report.dataReadiness.teamCoveragePct).toBe(100);
    expect(report.orgHealth.avgMeetingCount).toBeGreaterThan(0);
    expect(report.retentionExposure.estimatedTurnoverRisk).toBe(0);
    expect(report.actionOutcomes.measured).toBe(1);
    expect(report.actionOutcomes.items[0].title).toBe('Meeting reset');
  });
});
