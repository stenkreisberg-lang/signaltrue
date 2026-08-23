import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import EngagementTeamDaily from '../models/engagementTeamDaily.js';
import Intervention from '../models/intervention.js';
import ManagerCoachingEvent from '../models/managerCoachingEvent.js';
import ManagerWeekly from '../models/managerWeekly.js';
import OrgUnit from '../models/orgUnit.js';
import WorkEvent from '../models/workEvent.js';
import managerCoachingRoutes, { __pure as routePure } from '../routes/managerCoaching.js';
import { classifyManagerOneOnOnes } from '../services/managerOneOnOneClassifier.js';
import { generateManagerCoaching } from '../services/managerCoachingInsightService.js';
import { getManagerCoachingReadiness } from '../services/managerCoachingReadinessService.js';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('verified manager 1:1 classification', () => {
  test('accepts a direct-report meeting and rejects a peer meeting', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const managerId = new mongoose.Types.ObjectId();
    const reportId = new mongoose.Types.ObjectId();
    const peerId = new mongoose.Types.ObjectId();
    const start = new Date('2026-08-17T00:00:00.000Z');
    const end = new Date('2026-08-24T00:00:00.000Z');
    await WorkEvent.insertMany([
      meeting(orgId, managerId, 'direct', start),
      meeting(orgId, reportId, 'direct', start),
      meeting(orgId, managerId, 'peer', start),
      meeting(orgId, peerId, 'peer', start),
    ]);

    const result = await classifyManagerOneOnOnes({
      orgId,
      managerUserId: managerId,
      reportUserIds: [reportId],
      start,
      end,
    });

    expect(result.verifiedHashes).toEqual(['direct']);
    expect(result.completed).toBe(1);
    expect(
      await WorkEvent.countDocuments({
        'metadata.meetingInstanceIdHash': 'direct',
        'metadata.isManagerOneOnOne': true,
      })
    ).toBe(2);
    expect(
      await WorkEvent.countDocuments({
        'metadata.meetingInstanceIdHash': 'peer',
        'metadata.isManagerOneOnOne': true,
      })
    ).toBe(0);
  });
});

describe('manager coaching readiness and insight integrity', () => {
  test('suppresses the entire response below the eight-person privacy floor', async () => {
    const fixture = await seedManager({ activeReports: 4, suppressed: true, historyWeeks: 3 });
    const readiness = await getManagerCoachingReadiness(fixture);
    expect(readiness).toMatchObject({
      ready: false,
      status: 'suppressed',
      reason: 'manager_span_below_privacy_minimum',
    });
    const response = await generateManagerCoaching(fixture);
    expect(response.data).toBeNull();
  });

  test('selects one deterministic insight from real historical telemetry', async () => {
    const fixture = await seedManager({ activeReports: 8, suppressed: false, historyWeeks: 4 });
    const first = await generateManagerCoaching(fixture);
    const second = await generateManagerCoaching(fixture);
    expect(first.status).toBe('ready');
    expect(first.data.primaryInsight).toMatchObject({
      signal: 'coordination_load',
      title: 'Your coordination load is unusually high',
    });
    expect(first.data.primaryInsight.insightId).toBe(second.data.primaryInsight.insightId);
    expect(first.data.primaryInsight.trigger.sources).toEqual([]);
    expect(first.data.limitation).toMatch(/cannot determine why/i);
  });

  test('never represents a missing manager metric as zero', async () => {
    const fixture = await seedManager({ activeReports: 8, suppressed: false, historyWeeks: 4 });
    await ManagerWeekly.updateOne(
      { orgId: fixture.orgId, managerHash: 'manager-hash', weekStart: '2026-08-17' },
      { $unset: { afterHoursActivityRatio: 1 } }
    );
    const response = await generateManagerCoaching(fixture);
    expect(response.data.metricSnapshot.afterHoursActivityRatio).toMatchObject({
      value: null,
      status: 'unavailable',
    });
  });
});

describe('private API and experiment loop', () => {
  test('rejects cross-tenant requests before any coaching data is read', async () => {
    const orgA = new mongoose.Types.ObjectId();
    const orgB = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const app = coachingApp();
    const token = sign({ userId, orgId: orgA, role: 'manager' });
    await request(app)
      .get(`/api/manager-coaching/v2/me?orgId=${orgB}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  test('rejects malformed organization IDs without a database cast error', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const app = coachingApp();
    const token = sign({ userId, orgId, role: 'manager' });
    await request(app)
      .get('/api/manager-coaching/v2/me?orgId=not-an-object-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(400, { message: 'Organization ID is invalid.' });
  });

  test('rejects a same-organization non-manager before coaching data is read', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const app = coachingApp();
    const token = sign({ userId, orgId, role: 'viewer' });
    await request(app)
      .get(`/api/manager-coaching/v2/me?orgId=${orgId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  test('freezes server-derived target metrics when an experiment starts', async () => {
    const fixture = await seedManager({ activeReports: 8, suppressed: false, historyWeeks: 4 });
    const coaching = await generateManagerCoaching(fixture);
    const app = coachingApp();
    const token = sign({ ...fixture, role: 'manager' });
    const response = await request(app)
      .post('/api/manager-coaching/v2/experiments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orgId: String(fixture.orgId), insightId: coaching.data.primaryInsight.insightId })
      .expect(201);

    expect(response.body.experiment).toMatchObject({
      source: 'manager_coaching',
      privateToManager: true,
      insightId: coaching.data.primaryInsight.insightId,
      status: 'active',
    });
    expect(response.body.experiment.evidenceSnapshots.length).toBeGreaterThan(0);
    expect(response.body.experiment.reviews.map((review) => review.day)).toEqual([14, 28]);
    expect(await Intervention.countDocuments({ source: 'manager_coaching' })).toBe(1);
    expect(await Intervention.find({ orgId: fixture.orgId }).lean()).toEqual([]);
    expect(
      await Intervention.find({ orgId: fixture.orgId, source: 'manager_coaching' }).lean()
    ).toHaveLength(1);
  });

  test('stores only the manager’s latest usefulness choice', async () => {
    const fixture = await seedManager({ activeReports: 8, suppressed: false, historyWeeks: 4 });
    const coaching = await generateManagerCoaching(fixture);
    const app = coachingApp();
    const token = sign({ ...fixture, role: 'manager' });
    const started = await request(app)
      .post('/api/manager-coaching/v2/experiments')
      .set('Authorization', `Bearer ${token}`)
      .send({ orgId: String(fixture.orgId), insightId: coaching.data.primaryInsight.insightId })
      .expect(201);
    const feedbackPath = `/api/manager-coaching/v2/experiments/${started.body.experiment._id}/feedback`;

    await request(app)
      .post(feedbackPath)
      .set('Authorization', `Bearer ${token}`)
      .send({ orgId: String(fixture.orgId), useful: true })
      .expect(201);
    await request(app)
      .post(feedbackPath)
      .set('Authorization', `Bearer ${token}`)
      .send({ orgId: String(fixture.orgId), useful: false })
      .expect(201);

    expect(
      await ManagerCoachingEvent.countDocuments({
        insightId: coaching.data.primaryInsight.insightId,
        eventType: 'feedback_useful',
      })
    ).toBe(0);
    expect(
      await ManagerCoachingEvent.countDocuments({
        insightId: coaching.data.primaryInsight.insightId,
        eventType: 'feedback_not_useful',
      })
    ).toBe(1);
  });

  test('classifies measured review movement without claiming causality', () => {
    const improved = routePure.compareMetric(
      { metric: 'coordinationLoadHours', value: 20 },
      { value: 15, coverage: 0.9, confidence: 'high' },
      [{ metric: 'coordinationLoadHours', direction: 'down' }]
    );
    const worsened = routePure.compareMetric(
      { metric: 'oneOnOneMinutesPerReport', value: 30 },
      { value: 20, coverage: 0.9, confidence: 'high' },
      [{ metric: 'oneOnOneMinutesPerReport', direction: 'up' }]
    );
    expect(improved.interpretation).toBe('improved');
    expect(worsened.interpretation).toBe('worsened');
    expect(routePure.summarizeResult([improved, worsened])).toBe('mixed');
  });
});

async function seedManager({ activeReports, suppressed, historyWeeks }) {
  const orgId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const teamId = new mongoose.Types.ObjectId();
  await OrgUnit.create({
    orgId,
    userId,
    personHash: 'manager-hash',
    managerHash: null,
    teamId,
    role: 'EM',
    isManager: true,
    source: 'directory',
  });
  await OrgUnit.insertMany(
    Array.from({ length: Math.max(activeReports, 1) }, () => ({
      orgId,
      userId: new mongoose.Types.ObjectId(),
      managerUserId: userId,
      managerHash: 'manager-hash',
      teamId,
      role: 'IC',
      isManager: false,
      source: 'directory',
    }))
  );
  const historical = Array.from({ length: historyWeeks }, (_, index) => {
    const week = new Date('2026-08-17T00:00:00.000Z');
    week.setUTCDate(week.getUTCDate() - (index + 1) * 7);
    return {
      orgId,
      teamId,
      managerHash: 'manager-hash',
      role: 'EM',
      weekStart: week.toISOString().slice(0, 10),
      suppressed: false,
      span: activeReports,
      coordinationLoadHours: 10 + index,
      oneOnOneMinutesPerReport: 35,
      afterHoursActivityRatio: 0.1,
      decisionConcentration: 0.3,
      brokerageScore: 0.2,
      dataCoverageRatio: 0.9,
      metricCoverage: {
        calendar: 0.9,
        oneOnOneAttribution: 0.9,
        afterHoursClassification: 0.9,
        graph: 1,
      },
      confidence: 'high',
    };
  });
  await ManagerWeekly.insertMany([
    ...historical,
    {
      orgId,
      teamId,
      managerHash: 'manager-hash',
      role: 'EM',
      weekStart: '2026-08-17',
      suppressed,
      suppressedReason: suppressed ? 'span_below_minimum' : null,
      span: activeReports,
      coordinationLoadHours: 20,
      oneOnOneMinutesPerReport: 30,
      oneOnOneCancelledCount: 1,
      oneOnOneRescheduledCount: 1,
      responseLatencyP50Min: 30,
      responseLatencyP90Min: 120,
      afterHoursActivityRatio: 0.2,
      decisionConcentration: 0.4,
      brokerageScore: 0.3,
      dataCoverageRatio: 0.9,
      metricCoverage: {
        calendar: 0.9,
        oneOnOneAttribution: 0.9,
        afterHoursClassification: 0.9,
        responseLatency: 0.7,
        graph: 1,
      },
      confidence: 'high',
    },
  ]);
  await EngagementTeamDaily.insertMany(
    Array.from({ length: 28 }, (_, index) => {
      const date = new Date('2026-07-20T00:00:00.000Z');
      date.setUTCDate(date.getUTCDate() + index);
      return {
        orgId,
        teamId,
        date: date.toISOString().slice(0, 10),
        activePeopleCount: activeReports,
        calendar: {
          meetingHoursPerPerson: index >= 21 ? 4 : 3,
          focusHoursAvailablePerPerson: index >= 21 ? 2 : 3,
          fragmentedDayRatio: 0.3,
        },
        messaging: { afterHoursMessageRatio: 0.1 },
        integrationCoverage: {
          hasCalendar: true,
          hasMessaging: true,
          hasOrgStructure: true,
        },
      };
    })
  );
  return { orgId, userId };
}

function meeting(orgId, actorUserId, hash, timestamp) {
  return {
    orgId,
    source: 'microsoft-outlook',
    eventType: 'meeting',
    actorUserId,
    timestamp,
    externalId: `${hash}-${actorUserId}`,
    metadata: {
      meetingIdHash: hash,
      meetingInstanceIdHash: hash,
      attendeeCount: 2,
      internalAttendeeCount: 1,
      externalAttendeeCount: 0,
      durationMinutes: 30,
      isCancelled: false,
    },
  };
}

function coachingApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/manager-coaching', managerCoachingRoutes);
  return app;
}

function sign(payload) {
  return jwt.sign(
    {
      userId: String(payload.userId),
      orgId: String(payload.orgId),
      role: payload.role,
    },
    process.env.JWT_SECRET
  );
}
