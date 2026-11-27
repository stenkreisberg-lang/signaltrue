import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import WorkEvent from '../models/workEvent.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import Intervention from '../models/intervention.js';
import ManagerWorkAction from '../models/managerWorkAction.js';
import WeeklyBriefDispatch from '../models/weeklyBriefDispatch.js';
import { claimMonthlyDispatch, generateMonthlyReportForOrg } from '../services/monthlyReportService.js';

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
    Array.from({ length: 8 }, (_, index) => ({
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
  const day = 86400000;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const lastSunday = today - (now.getUTCDay() || 7) * day;
  const anchors = [0, 1, 2, 3].map(week => new Date(lastSunday - week * 7 * day));
  await WorkEvent.insertMany(anchors.flatMap((date, week) =>
    users.slice(0, mappedPeople).map((user, index) => ({
      orgId: org._id, teamId: team._id, actorUserId: user._id, source: 'microsoft-outlook',
      eventType: 'meeting', externalId: `monthly-meeting-${week}-${index}`, timestamp: date,
    }))
  ));
  await IntegrationMetricsDaily.insertMany(anchors.map((date, index) => ({
    orgId: org._id, teamId: null, userId: null, date,
    calculationWindowVersion: 'rolling7-calendar-days-v2',
    meetingInstanceCount7d: 20 + index, meetingParticipantHours7d: 50 + index * 2,
    backToBackMeetingBlocks: 4 + index, afterHoursMessageRatio: 0.1, rci: 20,
  })));
  return org;
}

describe('monthly generation readiness gate', () => {
  test('creates a setup brief instead of leadership conclusions at partial coverage', async () => {
    const org = await seedOrganization(3);
    const report = await generateMonthlyReportForOrg(org._id);

    expect(report.reportMode).toBe('setup');
    expect(report.dataReadiness.userCoveragePct).toBe(38);
    expect(report.dataReadiness.weeklySnapshots).toBeGreaterThanOrEqual(3);
  });

  test('creates a decision brief only with representative users, teams, and history', async () => {
    const org = await seedOrganization(8);
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
    await ManagerWorkAction.create({orgId:org._id, teamId:team._id, createdBy:createdBy._id,
      title:'Change meeting schedule',metric:'meeting_hours',direction:'decrease',
      outcome14:{status:'improved',measuredAt:new Date()},outcome28:{status:'insufficient_evidence',measuredAt:new Date()}});
    const report = await generateMonthlyReportForOrg(String(org._id));

    expect(report.reportMode).toBe('decision');
    expect(report.orgHealth.avgAfterHoursPct).toBeNull();
    expect(report.orgHealth.avgBDI).toBeNull();
    expect(report.orgHealth.bdiTrend).toBe('unavailable');
    expect(report.actionOutcomes).toMatchObject({managerReviewed:1,managerImproved:0,managerInsufficient:1});
    expect(report.dataReadiness.userCoveragePct).toBe(100);
    expect(report.dataReadiness.teamCoveragePct).toBe(100);
    expect(report.orgHealth.avgMeetingCount).toBeGreaterThan(0);
    expect(report.retentionExposure.estimatedTurnoverRisk).toBe(0);
    expect(report.actionOutcomes.measured).toBe(1);
    expect(report.actionOutcomes.items[0].title).toBe('Meeting reset');
  });
});

describe('monthly delivery claims', () => {
  test('one concurrent claim for regenerated reports and legacy sends still suppress duplicates', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const dates = [new Date('2026-11-01T04:00Z'), new Date('2026-11-02T09:00Z')];
    const attempts = await Promise.allSettled(dates.map(date => claimMonthlyDispatch(orgId,date,1)));
    expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const claim = await WeeklyBriefDispatch.findOne({orgId});
    expect(claim._id).toBe('monthly:'+String(orgId)+':2026-11');
    claim.status = 'sent';
    await claim.save();
    expect((await claimMonthlyDispatch(orgId,dates[1],1)).skipped).toBe(true);
    const next = new Date('2026-12-01T04:00Z');
    await WeeklyBriefDispatch.create({_id:'monthly:'+String(orgId)+':'+next.toISOString(),orgId,
      periodStart:next,status:'sent',recipientCount:1});
    expect((await claimMonthlyDispatch(orgId,next,1)).skipped).toBe(true);
  });
});
