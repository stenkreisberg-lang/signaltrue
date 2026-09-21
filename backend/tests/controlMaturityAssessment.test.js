import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import assessmentRoutes from '../routes/assessment.js';
import ControlMaturityAssessment from '../models/controlMaturityAssessment.js';

let mongoServer;

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/assessment', assessmentRoutes);

const questionIds = [
  ['detection_1', 'detection'],
  ['detection_2', 'detection'],
  ['detection_3', 'detection'],
  ['investigation_1', 'investigation'],
  ['investigation_2', 'investigation'],
  ['investigation_3', 'investigation'],
  ['verification_1', 'verification'],
  ['verification_2', 'verification'],
  ['verification_3', 'verification'],
  ['governance_1', 'governance'],
  ['governance_2', 'governance'],
  ['governance_3', 'governance'],
];

function matureAnswers() {
  return questionIds.map(([questionId, dimension]) => ({
    questionId,
    dimension,
    value: 3,
    label: 'Defined and consistently applied',
  }));
}

beforeAll(async () => {
  delete process.env.RESEND_API_KEY;
  process.env.ADMIN_API_KEY = 'control-maturity-test-admin';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri('control_maturity_assessment_test'));
});

afterAll(async () => {
  delete process.env.ADMIN_API_KEY;
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('control evidence maturity assessment API', () => {
  test('calculates and persists the score server-side without contact data', async () => {
    const response = await request(app)
      .post('/api/assessment/control-maturity/complete')
      .send({
        sessionId: 'maturity-session-1',
        market: 'uk',
        sourcePath: '/control-evidence-assessment',
        score: 1,
        level: 'reactive',
        answers: matureAnswers(),
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      score: 100,
      level: 'continuous',
      weakestDimension: 'detection',
      dimensions: {
        detection: 100,
        investigation: 100,
        verification: 100,
        governance: 100,
      },
    });

    const stored = await ControlMaturityAssessment.findOne({
      sessionId: 'maturity-session-1',
    }).lean();

    expect(stored).toMatchObject({
      score: 100,
      level: 'continuous',
      market: 'uk',
    });
    expect(stored.email).toBeUndefined();
    expect(stored.organization).toBeUndefined();
  });

  test('rejects incomplete or manipulated answer sets', async () => {
    await request(app)
      .post('/api/assessment/control-maturity/complete')
      .send({
        sessionId: 'maturity-session-invalid',
        answers: matureAnswers().slice(0, 11),
      })
      .expect(400);

    expect(
      await ControlMaturityAssessment.countDocuments({
        sessionId: 'maturity-session-invalid',
      })
    ).toBe(0);
  });

  test('claims an existing result only after valid contact consent', async () => {
    await request(app)
      .post('/api/assessment/control-maturity/claim')
      .send({
        sessionId: 'maturity-session-1',
        email: 'hr@example.com',
        organization: 'Example Organisation',
        role: 'Head of People',
        consentGiven: false,
      })
      .expect(400);

    const response = await request(app)
      .post('/api/assessment/control-maturity/claim')
      .send({
        sessionId: 'maturity-session-1',
        email: 'hr@example.com',
        organization: 'Example Organisation',
        role: 'Head of People',
        consentGiven: true,
      })
      .expect(200);

    expect(response.body.success).toBe(true);

    const stored = await ControlMaturityAssessment.findOne({
      sessionId: 'maturity-session-1',
    }).lean();

    expect(stored).toMatchObject({
      email: 'hr@example.com',
      organization: 'Example Organisation',
      role: 'Head of People',
      consentGiven: true,
    });
    expect(stored.claimedAt).toBeTruthy();
  });

  test('exposes aggregate benchmark statistics only with the admin key', async () => {
    await request(app).get('/api/assessment/control-maturity/stats').expect(401);

    const response = await request(app)
      .get('/api/assessment/control-maturity/stats')
      .set('x-admin-key', 'control-maturity-test-admin')
      .expect(200);

    expect(response.body.total).toBeGreaterThanOrEqual(1);
    expect(response.body.claimed).toBeGreaterThanOrEqual(1);
    expect(response.body.averages).toMatchObject({
      score: 100,
      detection: 100,
      investigation: 100,
      verification: 100,
      governance: 100,
    });
  });
});
