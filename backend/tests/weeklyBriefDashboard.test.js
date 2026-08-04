import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import weeklyBriefRoutes from '../routes/weeklyBrief.js';
import WeeklyBriefSnapshot from '../models/weeklyBriefSnapshot.js';

jest.setTimeout(120000);

let mongod;
let orgA;
let orgB;

function snapshot(orgId, orgName, status) {
  return {
    orgId,
    orgName,
    periodStart: new Date('2026-07-27T00:00:00.000Z'),
    periodEnd: new Date('2026-08-03T00:00:00.000Z'),
    reportMode: 'full',
    generatedAt: new Date('2026-08-03T01:00:00.000Z'),
    payload: {
      status: { label: status, evidenceGrade: 'Medium', summary: `${orgName} summary` },
      metrics: [
        {
          key: 'meeting_hours',
          label: 'Meeting hours',
          current: 12,
          previous: 10,
          baseline: 9,
          unit: 'hours',
          available: true,
        },
      ],
      observations: [{ text: 'Meeting hours increased.', evidenceGrade: 'Medium' }],
      risks: ['Less calendar time remains for uninterrupted work.'],
      actions: {
        primary: {
          action: 'Review recurring meetings.',
          owner: 'Team lead',
          measure: 'Meeting hours',
          reviewWindow: '14 days',
        },
      },
    },
  };
}

function appFor(user) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/weekly-brief', weeklyBriefRoutes);
  return app;
}

beforeAll(async () => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  orgA = new mongoose.Types.ObjectId();
  orgB = new mongoose.Types.ObjectId();
  await WeeklyBriefSnapshot.create([
    snapshot(orgA, 'Org A', 'Review meeting load'),
    snapshot(orgB, 'Org B', 'Stable'),
  ]);
});

describe('weekly brief dashboard API', () => {
  test('returns only the authenticated organization snapshot', async () => {
    const response = await request(
      appFor({ orgId: orgA, role: 'hr_admin', userId: new mongoose.Types.ObjectId() })
    )
      .get('/api/weekly-brief/latest')
      .expect(200);

    expect(response.body.orgId).toBe(String(orgA));
    expect(response.body.orgName).toBe('Org A');
    expect(response.body.status.label).toBe('Review meeting load');
    expect(response.body.status.summary).not.toContain('Org B');
  });

  test('rejects roles that should not receive the organization-wide brief', async () => {
    await request(appFor({ orgId: orgA, role: 'team_member' }))
      .get('/api/weekly-brief/latest')
      .expect(403);
  });

  test('answers from the saved report when an AI provider is unavailable', async () => {
    const response = await request(appFor({ orgId: orgA, role: 'executive' }))
      .post('/api/weekly-brief/ask')
      .send({ question: 'What happened to meeting hours and what should we do?' })
      .expect(200);

    expect(response.body.source).toBe('rule_based');
    expect(response.body.answer).toContain('Meeting hours increased');
    expect(response.body.evidence[0]).toEqual(
      expect.objectContaining({ label: 'Meeting hours', current: 12, baseline: 9 })
    );
    expect(response.body.suggestions[0].action).toBe('Review recurring meetings.');
  });
});
