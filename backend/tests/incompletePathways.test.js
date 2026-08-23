import { afterEach, describe, expect, test } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import dcrRoutes from '../routes/dcr.js';
import managerCoachingRoutes from '../routes/managerCoaching.js';
import {
  generateMonthlyNarrative,
  generateWeeklyRecommendations,
} from '../services/aiRecommendationContext.js';
import {
  INTELLIGENCE_NOTIFICATIONS_UNAVAILABLE,
  notifyAttritionRisk,
} from '../services/intelligenceNotificationService.js';

const originalOpenAIKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAIKey;
});

describe('incomplete pathways fail closed', () => {
  test('DCR remains authenticated and returns an explicit unavailable response', async () => {
    const app = express();
    app.use('/api/dcr', dcrRoutes);
    const token = jwt.sign(
      { userId: 'user-id', orgId: 'org-id', role: 'admin' },
      process.env.JWT_SECRET
    );

    await request(app).get('/api/dcr/latest').expect(401);
    const response = await request(app)
      .get('/api/dcr/latest')
      .set('Authorization', `Bearer ${token}`)
      .expect(410);
    expect(response.body).toMatchObject({
      error: 'DECISION_CLOSURE_RATE_UNAVAILABLE',
      available: false,
    });
  });

  test('manager coaching does not return demo scorecards', async () => {
    const app = express();
    app.use('/api/manager-coaching', managerCoachingRoutes);
    const token = jwt.sign(
      { userId: 'user-id', orgId: 'org-id', role: 'admin' },
      process.env.JWT_SECRET
    );

    await request(app).get('/api/manager-coaching/team-id').expect(401);
    const response = await request(app)
      .get('/api/manager-coaching/team-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(410);
    expect(response.body).toMatchObject({
      code: 'MANAGER_COACHING_V1_RETIRED',
      available: false,
    });
  });

  test('AI features do not fabricate analysis without a configured provider', async () => {
    delete process.env.OPENAI_API_KEY;

    const recommendations = await generateWeeklyRecommendations(
      { zone: 'stretched', bdi: 64 },
      { bdi: 55 },
      [{ type: 'overload', score: 70, isNewSignal: true, delta: 15 }],
      [],
      []
    );
    expect(recommendations).toEqual([]);

    const narrative = await generateMonthlyNarrative({
      orgHealth: {
        avgBDI: 55,
        bdiTrend: 'stable',
        teamsAtRisk: 1,
        zoneDistribution: { stable: 2, stretched: 1, critical: 0, recovery: 0 },
      },
      persistentRisks: [],
      leadershipSignals: {
        managerEffectiveness: {
          avgScore: null,
          managersNeedCoachingCount: 0,
          managersCriticalCount: 0,
        },
        equityScoreAvg: 0,
        equityIssuesCount: 0,
        successionCriticalCount: 0,
        avgBusFactor: 0,
      },
      executionSignals: {
        executionDragAvg: 0,
        decisionVelocity: 'unavailable',
        highRiskProjectsCount: 0,
        meetingROILowPercent: 0,
        networkSiloScore: 0,
      },
      topStructuralDrivers: [],
      crisisPatterns: { totalCrises: 0, teamsWithRecurringCrises: 0, crisisByType: [] },
    });
    expect(narrative).toMatchObject({
      analysisAvailable: false,
      organizationalTrajectory: null,
      keyRisks: [],
    });
  });

  test('legacy intelligence notification calls never claim delivery', async () => {
    await expect(notifyAttritionRisk()).resolves.toEqual(INTELLIGENCE_NOTIFICATIONS_UNAVAILABLE);
    expect(INTELLIGENCE_NOTIFICATIONS_UNAVAILABLE).toMatchObject({
      available: false,
      delivered: false,
    });
  });
});
