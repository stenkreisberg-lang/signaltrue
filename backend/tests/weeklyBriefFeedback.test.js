import { beforeAll, afterAll, beforeEach, describe, test, expect, jest } from '@jest/globals';
import mongoose from 'mongoose';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import WeeklyBriefSnapshot from '../models/weeklyBriefSnapshot.js';
import WeeklyBriefFeedback from '../models/weeklyBriefFeedback.js';


jest.setTimeout(120000);
const SECRET = 'weekly-feedback-test-secret';
const bearer = user => ({ Authorization: 'Bearer ' + jwt.sign({
  userId: String(user._id), role: user.role, orgId: String(user.orgId),
}, SECRET, { expiresIn: '1h' }) });
let mongod, app;
beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  const { authenticateToken } = await import('../middleware/auth.js');
  const routes = (await import('../routes/weeklyBrief.js')).default;
  app = express();
  app.use(express.json());
  app.use('/api/weekly-brief', authenticateToken, routes);
});
afterAll(async () => { await mongoose.disconnect(); if (mongod) await mongod.stop(); });
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map(c => c.deleteMany({})));
});
async function setup(name) {
  const org = await Organization.create({ name });
  const team = await Team.create({ name: 'Example', orgId: org.id });
  const hr = await User.create({ name: 'HR Tester', email: name.toLowerCase() + '-hr@example.test',
    password: 'a-safe-test-password', accountStatus: 'active', role: 'hr_admin', orgId: org.id, teamId: team.id });
  const employee = await User.create({ name: 'Worker', email: name.toLowerCase() + '-worker@example.test',
    password: 'a-safe-test-password', accountStatus: 'active', role: 'team_member', orgId: org.id, teamId: team.id });
  const snap = await WeeklyBriefSnapshot.create({
    orgId: org.id, orgName: name, reportMode: 'setup',
    periodStart: new Date('2026-10-19T00:00:00Z'),
    periodEnd: new Date('2026-10-26T00:00:00Z'),
    generatedAt: new Date('2026-10-26T03:00:00Z'),
    payload: { metrics: [], status: { label: 'Insufficient data' } },
  });
  return { org, hr, employee, snap };
}
describe('HR feedback is tied to evidence and does not change metrics', () => {
  test('only an authorised HR user can save and retrieve feedback for a real snapshot', async () => {
    const { hr, employee, snap } = await setup('Alice');
    const body = { snapshotId: snap.id, useful: 'yes', novel: true, action: 'investigate',
      note: 'We will investigate recurring meetings.' };
    await request(app).post('/api/weekly-brief/feedback').set(bearer(employee))
      .send(body).expect(403);
    await request(app).post('/api/weekly-brief/feedback').set(bearer(hr))
      .send(body).expect(200);
    const saved = await WeeklyBriefFeedback.findOne({ snapshotId: snap._id }).lean();
    expect(saved.note).toBe(body.note);
    expect(saved.novel).toBe(true);
    const own = await request(app).get('/api/weekly-brief/feedback/latest')
      .set(bearer(hr)).expect(200);
    expect(own.body.feedback.useful).toBe('yes');
    const same = await WeeklyBriefSnapshot.findById(snap.id);
    expect(same.payload.status.label).toBe('Insufficient data');
  });
  test('HR cannot provide feedback on another organisation report', async () => {
    const first = await setup('First');
    const second = await setup('Second');
    await request(app).post('/api/weekly-brief/feedback')
      .set(bearer(first.hr)).send({ snapshotId: second.snap.id,
        useful: 'yes', novel: true, action: 'none' }).expect(404);
    expect(await WeeklyBriefFeedback.countDocuments()).toBe(0);
  });
  test('malformed usefulness ratings and free-text overflow are rejected', async () => {
    const { hr, snap } = await setup('Third');
    await request(app).post('/api/weekly-brief/feedback')
      .set(bearer(hr)).send({ snapshotId: snap.id, useful: 'maybe',
        novel: true, action: 'none' }).expect(400);
    await request(app).post('/api/weekly-brief/feedback')
      .set(bearer(hr)).send({ snapshotId: snap.id, useful: 'yes',
        novel: true, action: 'none', note: 'x'.repeat(501) }).expect(400);
  });
});
