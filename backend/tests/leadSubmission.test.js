import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import leadsRoutes from '../routes/leads.js';
import Lead from '../models/lead.js';

let mongoServer;
const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use('/api/leads', leadsRoutes);

beforeAll(async () => {
  delete process.env.RESEND_API_KEY;
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri('lead_submission_test'));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const validLead = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  organization: 'Example Ltd',
  title: 'WHS Manager',
  challenge: 'Optional context',
  source: 'Website demo request',
  tag: 'psychosocial-risk-visibility-review',
  submissionId: 'submission-test-1',
  attribution: {
    landingPage: '/?utm_source=partner',
    utmSource: 'partner',
    utmMedium: 'email',
    utmCampaign: 'review',
    anonymousSessionId: 'session-test-1',
  },
};

describe('lead submission API', () => {
  test('stores and confirms a valid lead with attribution', async () => {
    const response = await request(app).post('/api/leads').send(validLead).expect(201);
    expect(response.body).toMatchObject({ success: true, internalNotificationSent: false });
    const stored = await Lead.findById(response.body.leadId).lean();
    expect(stored).toMatchObject({
      name: 'Jane Smith',
      organization: 'Example Ltd',
      submissionId: 'submission-test-1',
    });
    expect(stored.attribution).toMatchObject({
      utmSource: 'partner',
      anonymousSessionId: 'session-test-1',
    });
  });

  test('returns field-specific errors and stores nothing for invalid input', async () => {
    const before = await Lead.countDocuments();
    const response = await request(app)
      .post('/api/leads')
      .send({ name: '', email: 'invalid', source: 'Website demo request' })
      .expect(400);
    expect(response.body.fieldErrors).toMatchObject({
      fullName: expect.any(String),
      workEmail: expect.any(String),
      organization: expect.any(String),
    });
    expect(await Lead.countDocuments()).toBe(before);
  });

  test('prevents duplicate persistence for the same submission id', async () => {
    const response = await request(app).post('/api/leads').send(validLead).expect(200);
    expect(response.body).toMatchObject({ success: true, duplicate: true });
    expect(await Lead.countDocuments({ submissionId: 'submission-test-1' })).toBe(1);
  });

  test('rejects the honeypot spam field', async () => {
    await request(app)
      .post('/api/leads')
      .send({ ...validLead, submissionId: 'spam-test', website: 'https://spam.example' })
      .expect(400);
    expect(await Lead.countDocuments({ submissionId: 'spam-test' })).toBe(0);
  });
});
