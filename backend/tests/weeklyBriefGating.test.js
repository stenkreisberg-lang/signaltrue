/**
 * Integration tests for the weekly brief trust fixes:
 *  - Hard readiness gate: low mapping coverage → setup-only brief (no scores/AI/benchmarks)
 *  - Full mode: prediction check, appendix, catch-all team exclusion,
 *    data-anomaly declaration, cost estimate, baseline tenure
 */
import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import Team from '../models/team.js';
import WorkEvent from '../models/workEvent.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import IntegrationConnection from '../models/integrationConnection.js';
import EngagementStrainWeekly from '../models/engagementStrainWeekly.js';
import BriefPrediction from '../models/briefPrediction.js';
import { generateWeeklyBrief } from '../services/weeklyBriefService.js';

jest.setTimeout(120000);

let mongod;

beforeAll(async () => {
  delete process.env.OPENAI_API_KEY; // force deterministic rule-based path
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((c) => c.deleteMany({}))
  );
});

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function seedOrg() {
  const org = await Organization.create({ name: 'TestOrg', industry: 'Technology' });
  const teamA = await Team.create({ name: 'Engineering', orgId: org._id });
  const catchAll = await Team.create({ name: 'Unassigned', orgId: org._id });
  const users = [];
  for (let i = 0; i < 10; i++) {
    users.push(
      await User.create({
        email: `u${i}@test.io`,
        name: `User ${i}`,
        orgId: org._id,
        teamId: i < 8 ? teamA._id : catchAll._id,
        role: 'employee',
        accountStatus: 'pending',
      })
    );
  }
  return { org, teamA, catchAll, users };
}

async function seedMeetingEvents(org, teamA, users, count) {
  const docs = [];
  for (let i = 0; i < count; i++) {
    for (const day of [1, 3, 5]) {
      docs.push({
        orgId: org._id,
        source: 'microsoft-outlook',
        eventType: 'meeting',
        actorUserId: users[i]._id,
        teamId: teamA._id,
        timestamp: daysAgo(day),
      });
    }
  }
  await WorkEvent.insertMany(docs);
}

describe('hard readiness gate (setup mode)', () => {
  test('low mapping coverage produces a setup-only brief with no health scores', async () => {
    const { org, teamA, users } = await seedOrg();
    // Only 2/10 users mapped → ~20% coverage → "Needs mapping"
    await seedMeetingEvents(org, teamA, users, 2);
    await IntegrationConnection.create({
      orgId: org._id,
      integrationType: 'microsoft-teams',
      status: 'connected',
      sync: { lastSyncAt: daysAgo(20) }, // stale
    });

    const html = await generateWeeklyBrief(org._id);

    // Setup content present
    expect(html).toContain('Setup Required');
    expect(html).toContain('Data setup is incomplete');
    expect(html).toContain('How to fix it');
    expect(html).toContain('stale'); // stale connector surfaced honestly

    // Health/score content suppressed — the report SHRINKS
    expect(html).not.toContain('Week-over-week comparison');
    expect(html).not.toContain('Engagement level');
    expect(html).not.toContain('AI Interpretation');
    expect(html).not.toContain('Industry context');
    expect(html).not.toContain('Strain risk');
    expect(html).not.toContain("This week's call"); // no predictions on broken data
  });
});

describe('full report mode', () => {
  async function seedFullOrg() {
    const seeded = await seedOrg();
    const { org, teamA, catchAll } = seeded;
    // 8/10 users mapped → 80% coverage → Partial/full report
    await seedMeetingEvents(org, teamA, seeded.users, 8);

    // Org-level metrics: heavy meeting load (200h org total / 8 people = 25h/person),
    // after-hours collapsed to 0 vs a 20% historical average
    const mkMetric = (date, afterHours) => ({
      orgId: org._id,
      date,
      meetingCount7d: 100,
      meetingDurationTotalHours7d: 200,
      messageCount7d: 40,
      afterHoursMessageRatio: afterHours,
      focusTimeAvailabilityHours: 0,
    });
    await IntegrationMetricsDaily.insertMany([
      mkMetric(daysAgo(2), 0),
      mkMetric(daysAgo(9), 0.2),
      mkMetric(daysAgo(16), 0.2),
      mkMetric(daysAgo(23), 0.22),
    ]);

    // Engagement docs for a real team AND the catch-all bucket
    const mkStrain = (teamId) => ({
      orgId: org._id,
      teamId,
      weekStart: new Date(daysAgo(6)).toISOString().slice(0, 10),
      activePeopleCount: 8,
      engagementStrainRisk: 60,
      engagementConditionsScore: 40,
      riskState: 'strain',
      trend: 'stable',
      confidenceScore: 70,
    });
    await EngagementStrainWeekly.insertMany([mkStrain(teamA._id), mkStrain(catchAll._id)]);

    await IntegrationConnection.create({
      orgId: org._id,
      integrationType: 'microsoft-outlook',
      status: 'connected',
      sync: { lastSyncAt: daysAgo(1) },
    });
    return seeded;
  }

  test('renders insight-first structure with prediction, appendix, tenure and cost', async () => {
    const { org } = await seedFullOrg();
    const html = await generateWeeklyBrief(org._id);

    expect(html).toContain('Weekly Intelligence Brief');
    expect(html).toContain('Week-over-week comparison');
    expect(html).toContain('Appendix — Data readiness'); // admin detail demoted
    expect(html).toContain('Baselines built on'); // tenure line
    expect(html).toContain('Prediction check');
    expect(html).toContain("This week's call");
    expect(html).toContain('Estimated cost of excess coordination'); // € impact
    expect(html).toContain('Was this week unusual?'); // annotation loop

    // A prediction was persisted for grading next week
    const predictions = await BriefPrediction.find({ orgId: org._id });
    expect(predictions.length).toBe(1);
    expect(predictions[0].outcome.evaluated).toBe(false);
  });

  test('declares ingestion anomalies instead of celebrating them', async () => {
    const { org } = await seedFullOrg();
    const html = await generateWeeklyBrief(org._id);

    // After-hours collapsed 20% → 0%: must be flagged as a data problem…
    expect(html).toContain('Data quality');
    expect(html).toContain('data capture issue');
    // …and the snapshot tile shows a gap, not a healthy 0%
    expect(html).toContain('data gap');
  });

  test('never scores catch-all buckets like "Unassigned"', async () => {
    const { org } = await seedFullOrg();
    const html = await generateWeeklyBrief(org._id);

    expect(html).toContain('Excluded (catch-all)');
    // Engagement section shows the real team but not the catch-all bucket
    const engagementSection = html.slice(html.indexOf('Engagement level'));
    expect(engagementSection).toContain('Engineering');
    expect(engagementSection).not.toContain('Unassigned');
  });

  test('grades last week’s prediction and reports the track record', async () => {
    const { org } = await seedFullOrg();
    await BriefPrediction.create({
      orgId: org._id,
      weekStart: daysAgo(8),
      metric: 'meetings',
      comparator: 'lte',
      threshold: 500,
      baselineValue: 100,
      statement: 'Meeting count stays below 500.',
    });

    const html = await generateWeeklyBrief(org._id);

    expect(html).toContain('Last week we predicted');
    expect(html).toContain('Track record');
    const graded = await BriefPrediction.findOne({ orgId: org._id, 'outcome.evaluated': true });
    expect(graded).not.toBeNull();
    expect(graded.outcome.held).toBe(true); // 24 meetings ≤ 500
  });
});
