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
import WeeklyBriefSnapshot from '../models/weeklyBriefSnapshot.js';
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
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function seedOrg() {
  const org = await Organization.create({
    name: 'TestOrg',
    industry: 'Technology',
    settings: { loadedHourlyCost: 75, currency: 'EUR' },
  });
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
        role: 'team_member',
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
        externalId: `test-outlook-${org._id}-${i}-${day}`,
      });
    }
  }
  await WorkEvent.insertMany(docs);
}

async function seedUnmappedEvents(org, count) {
  const docs = [];
  for (let i = 0; i < count; i++) {
    docs.push({
      orgId: org._id,
      source: 'microsoft-outlook',
      eventType: 'meeting',
      actorUserId: null,
      teamId: null,
      timestamp: daysAgo(1),
      externalId: `test-unmapped-${org._id}-${i}`,
    });
  }
  await WorkEvent.insertMany(docs);
}

describe('hard readiness gate (setup mode)', () => {
  test('low event attribution produces a setup-only brief with no health scores', async () => {
    const { org, teamA, users } = await seedOrg();
    // Most events lack actor/team attribution, so the report must stay setup-only.
    await seedMeetingEvents(org, teamA, users, 2);
    await seedUnmappedEvents(org, 12);
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

    const snapshot = await WeeklyBriefSnapshot.findOne({ orgId: org._id }).lean();
    expect(snapshot.reportMode).toBe('setup');
    expect(snapshot.payload.metrics).toHaveLength(0);
    expect(snapshot.payload.coverage.mappingCoveragePct).toBeLessThan(40);
  });

  test('partial represented users can still produce a full report when events are attributed', async () => {
    const { org, teamA, users } = await seedOrg();
    await seedMeetingEvents(org, teamA, users, 5);

    const html = await generateWeeklyBrief(org._id);

    expect(html).toContain('Weekly Intelligence Brief');
    expect(html).toContain('Week-over-week comparison');

    const snapshot = await WeeklyBriefSnapshot.findOne({ orgId: org._id }).lean();
    expect(snapshot.reportMode).toBe('full');
    expect(snapshot.payload.coverage.mappingCoveragePct).toBe(100);
    expect(snapshot.payload.coverage.userActivityCoveragePct).toBe(50);
  });
});

describe('full report mode', () => {
  async function seedFullOrg() {
    const seeded = await seedOrg();
    const { org, teamA, catchAll } = seeded;
    // 8/10 users mapped and the only eligible named team is ready → full report
    await seedMeetingEvents(org, teamA, seeded.users, 8);
    await WorkEvent.insertMany(
      seeded.users.slice(0, 8).flatMap((user, userIndex) => [
        {
          orgId: org._id,
          source: 'microsoft-outlook',
          eventType: 'meeting',
          actorUserId: user._id,
          teamId: teamA._id,
          timestamp: daysAgo(2),
          externalId: `test-outlook-extra-${org._id}-${userIndex}`,
        },
        ...[1, 2, 3, 4].map((day) => ({
          orgId: org._id,
          source: 'microsoft-teams',
          eventType: 'message',
          actorUserId: user._id,
          teamId: teamA._id,
          timestamp: daysAgo(day),
          externalId: `test-teams-${org._id}-${userIndex}-${day}`,
        })),
      ])
    );

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
      { ...mkMetric(daysAgo(2), 0), meetingDurationTotalHours7d: 260 },
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
      scoringVersion: '2.1.0',
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

  test('renders insight-first structure while hiding an ungraded forecast', async () => {
    const { org } = await seedFullOrg();
    const html = await generateWeeklyBrief(org._id);

    expect(html).toContain('Weekly Intelligence Brief');
    expect(html).toContain('Week-over-week comparison');
    expect(html).toContain('Appendix — Data readiness'); // admin detail demoted
    expect(html).toContain('Baselines built on'); // tenure line
    expect(html).not.toContain('Forecast rule check');
    expect(html).not.toContain("This week's call");
    expect(html).toContain('Estimated coordination cost above your baseline');
    expect(html).toContain('Was this week unusual?'); // annotation loop

    const snapshot = await WeeklyBriefSnapshot.findOne({ orgId: org._id }).lean();
    expect(snapshot.reportMode).toBe('full');
    expect(snapshot.payload.metrics.length).toBeGreaterThan(5);
    expect(snapshot.payload.trend.length).toBeGreaterThan(1);
    expect(snapshot.payload.status.summary).toBeTruthy();
    expect(snapshot.payload.prediction.displayTier).toBe('hidden');

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
    // …and the snapshot tile shows insufficient data, not a healthy 0%
    expect(html).toContain('Insufficient data');
  });

  test('never scores catch-all buckets like "Unassigned"', async () => {
    const { org } = await seedFullOrg();
    const html = await generateWeeklyBrief(org._id);

    expect(html).toContain('Excluded (catch-all)');
    // Engagement section shows the real team but not the catch-all bucket
    const engagementSection = html.slice(
      html.indexOf('Team condition detail'),
      html.indexOf('Appendix — Data readiness')
    );
    expect(engagementSection).toContain('Engineering');
    expect(engagementSection).not.toContain('Unassigned');
  });

  test('grades last week’s prediction but hides a track record below six grades', async () => {
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

    expect(html).not.toContain("Last week's rule said");
    expect(html).not.toContain('Rule track record');
    const graded = await BriefPrediction.findOne({ orgId: org._id, 'outcome.evaluated': true });
    expect(graded).not.toBeNull();
    expect(graded.outcome.held).toBe(true); // 24 meetings ≤ 500
  });
});

describe('metric-level regression fixtures', () => {
  async function seedLargeOrg() {
    const org = await Organization.create({ name: 'Anonymized Fixture', industry: 'Other' });
    const team = await Team.create({ name: 'Operations', orgId: org._id });
    const users = await User.insertMany(
      Array.from({ length: 59 }, (_, index) => ({
        email: `fixture-${index}@test.invalid`,
        name: `Fixture User ${index}`,
        orgId: org._id,
        teamId: team._id,
        role: 'team_member',
        accountStatus: 'pending',
      }))
    );
    return { org, team, users };
  }

  async function seedLargeCoverageEvents(org, team, users, messagingUsers = 3) {
    const calendarEvents = users.slice(0, 47).map((user, index) => ({
      orgId: org._id,
      source: 'microsoft-outlook',
      eventType: 'meeting',
      actorUserId: user._id,
      teamId: team._id,
      timestamp: daysAgo(2),
      externalId: `fixture-calendar-${org._id}-${index}`,
    }));
    const messageEvents = users.slice(0, messagingUsers).map((user, index) => ({
      orgId: org._id,
      source: 'microsoft-teams',
      eventType: 'message',
      actorUserId: user._id,
      teamId: team._id,
      timestamp: daysAgo(1),
      externalId: `fixture-message-${org._id}-${index}`,
    }));
    await WorkEvent.insertMany([...calendarEvents, ...messageEvents]);
  }

  test('3/59 messaging coverage shows counts but cannot change organization status', async () => {
    const { org, team, users } = await seedLargeOrg();
    await seedLargeCoverageEvents(org, team, users, 3);
    await IntegrationMetricsDaily.create({
      orgId: org._id,
      date: daysAgo(2),
      meetingInstanceCount7d: 47,
      meetingDurationTotalHours7d: 94,
      messageCount7d: 3,
      afterHoursMessageCount: 2,
      afterHoursMessageRatio: 2 / 3,
      focusTimeAvailabilityHours: 470,
    });

    const html = await generateWeeklyBrief(org._id);
    const snapshot = await WeeklyBriefSnapshot.findOne({ orgId: org._id }).lean();
    const afterHours = snapshot.payload.metrics.find((metric) => metric.key === 'after_hours');

    expect(afterHours.readiness).toMatchObject({
      mappedUsers: 3,
      totalUsers: 59,
      readiness: 'blocked',
      eligibleForStatus: false,
    });
    expect(afterHours.display).toContain('2 of 3 observed messages');
    expect(afterHours.current).toBeNull();
    expect(snapshot.payload.status.deterioratingMetrics).not.toContain('afterHoursRatio');
    expect(snapshot.payload.actions.primary?.actionability).not.toBe('intervention');
    expect(html).toContain('2 of 3');
    expect(html).toContain('3/59 people');
    expect(html).toContain('Insufficient data');
    expect(html).not.toContain('67% Out-of-Hours Work');
  });

  test('a one-week 190% meeting-hours rise produces a diagnostic question only', async () => {
    const { org, team, users } = await seedLargeOrg();
    await seedLargeCoverageEvents(org, team, users, 0);
    await IntegrationMetricsDaily.insertMany([
      {
        orgId: org._id,
        date: daysAgo(2),
        meetingInstanceCount7d: 47,
        meetingDurationTotalHours7d: 290,
        focusTimeAvailabilityHours: 470,
      },
      {
        orgId: org._id,
        date: daysAgo(9),
        meetingInstanceCount7d: 47,
        meetingDurationTotalHours7d: 100,
        focusTimeAvailabilityHours: 470,
      },
    ]);

    const html = await generateWeeklyBrief(org._id);
    const snapshot = await WeeklyBriefSnapshot.findOne({ orgId: org._id }).lean();

    expect(snapshot.payload.actions.primary).toMatchObject({
      actionability: 'diagnostic_question',
      evidenceGrade: 'Low',
      effort: 'Low',
      affectedMetric: 'Meeting participant-hours per person',
    });
    expect(snapshot.payload.actions.primary.action).toMatch(/Was this caused|moved this week/i);
    expect(html).not.toContain('High effort');
    expect(html).toContain('<strong>Observation:</strong>');
    expect(html).toContain('<strong>Interpretation:</strong>');
    expect(html).toContain('<strong>Alternative explanation:</strong>');
    expect(html).toContain('<strong>Diagnostic question:</strong>');
  });

  test('a stable Low-evidence week explicitly recommends no action', async () => {
    const { org, team, users } = await seedLargeOrg();
    await seedLargeCoverageEvents(org, team, users, 0);
    await IntegrationMetricsDaily.insertMany([
      {
        orgId: org._id,
        date: daysAgo(2),
        meetingInstanceCount7d: 47,
        meetingDurationTotalHours7d: 100,
        focusTimeAvailabilityHours: 470,
      },
      {
        orgId: org._id,
        date: daysAgo(9),
        meetingInstanceCount7d: 47,
        meetingDurationTotalHours7d: 100,
        focusTimeAvailabilityHours: 470,
      },
    ]);

    const html = await generateWeeklyBrief(org._id);
    const snapshot = await WeeklyBriefSnapshot.findOne({ orgId: org._id }).lean();

    expect(snapshot.payload.status).toMatchObject({ label: 'Stable', evidenceGrade: 'Low' });
    expect(snapshot.payload.actions.primary).toBeNull();
    expect(html).toContain('No action recommended this week.');
    expect(html).toContain('No measured pattern currently justifies intervention.');
  });
});
