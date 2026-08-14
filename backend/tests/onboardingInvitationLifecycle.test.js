import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'onboarding-role-test-secret';
delete process.env.RESEND_API_KEY;

jest.setTimeout(120000);

let mongod;
let app;
let Organization;
let Team;
let User;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  [{ default: Organization }, { default: Team }, { default: User }] = await Promise.all([
    import('../models/organizationModel.js'),
    import('../models/team.js'),
    import('../models/user.js'),
  ]);
  const { default: onboardingRoutes } = await import('../routes/onboarding.js');
  app = express();
  app.use(express.json());
  app.use('/api', onboardingRoutes);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

const bearer = (user) =>
  `Bearer ${jwt.sign(
    {
      userId: user._id,
      orgId: user.orgId,
      teamId: user.teamId,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET
  )}`;

async function seed(role = 'hr_admin') {
  const org = await Organization.create({ name: 'Role Test Ltd', domain: 'role.test' });
  const team = await Team.create({ name: 'General', orgId: org._id });
  const user = await User.create({
    email: `${role}@role.test`,
    password: 'Password123!',
    name: role,
    role,
    orgId: org._id,
    teamId: team._id,
  });
  return { org, team, user };
}

describe('HR → IT administrator onboarding', () => {
  test('HR can create, inspect, resend and revoke an IT invitation; IT cannot manage invitations', async () => {
    const { org, team, user: hr } = await seed();
    const it = await User.create({
      email: 'existing-it@role.test',
      password: 'Password123!',
      name: 'Existing IT',
      role: 'it_admin',
      orgId: org._id,
      teamId: team._id,
    });

    const created = await request(app)
      .post('/api/onboarding/invitations')
      .set('Authorization', bearer(hr))
      .send({ email: 'new-it@role.test', name: 'New IT', role: 'it_admin' })
      .expect(200);
    expect(created.body.emailSent).toBe(false);
    expect(created.body.warning).toMatch(/not configured/i);
    expect(created.body).not.toHaveProperty('token');

    const listed = await request(app)
      .get('/api/onboarding/invitations')
      .set('Authorization', bearer(hr))
      .expect(200);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].delivery.status).toBe('unconfigured');
    const invitationId = listed.body[0]._id;

    await request(app)
      .get(`/api/onboarding/invitations/${invitationId}/link`)
      .set('Authorization', bearer(it))
      .expect(403);

    const link = await request(app)
      .get(`/api/onboarding/invitations/${invitationId}/link`)
      .set('Authorization', bearer(hr))
      .expect(200);
    expect(link.body.inviteUrl).toMatch(/\/onboarding\?token=/);

    await request(app)
      .post(`/api/onboarding/invitations/${invitationId}/resend`)
      .set('Authorization', bearer(hr))
      .expect(200);
    await request(app)
      .delete(`/api/onboarding/invitations/${invitationId}`)
      .set('Authorization', bearer(hr))
      .expect(204);
    await request(app)
      .get(`/api/onboarding/invitations/${invitationId}/link`)
      .set('Authorization', bearer(hr))
      .expect(404);
  });
});
