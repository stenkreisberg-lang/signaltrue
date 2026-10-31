import { beforeAll, afterAll, beforeEach, describe, test, expect, jest } from '@jest/globals';
import mongoose from 'mongoose';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import OrgUnit from '../models/orgUnit.js';

jest.setTimeout(120000);
const SECRET = 'hr-structure-test-secret';
const bearer = user => ({ Authorization: 'Bearer ' + jwt.sign({
  userId: String(user._id), role: user.role, orgId: String(user.orgId),
}, SECRET, { expiresIn: '1h' }) });
let mongo, app;
beforeAll(async () => {
  process.env.JWT_SECRET = SECRET;
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const router = (await import('../routes/organisationStructure.js')).default;
  app = express(); app.use(express.json()); app.use('/api/organisation-structure', router);
});
afterAll(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });
beforeEach(async () => { await Promise.all(Object.values(mongoose.connection.collections).map(c => c.deleteMany({}))); });

async function user(org, team, name, role = 'team_member') {
  return User.create({ name, email: name.toLowerCase().replaceAll(' ', '-') + '@example.test',
    password: 'test-password-1234', accountStatus: 'active', role, orgId: org.id, teamId: team.id });
}

describe('verified organisation structure and analytics separation', () => {
 test('only HR can see workforce roster; formal managers do not gain manager analytics', async () => {
  const org = await Organization.create({ name: 'Tenant A' });
  const team = await Team.create({ name: 'Operations', orgId: org.id });
  const hr = await user(org, team, 'Hr User', 'hr_admin');
  const manager = await user(org, team, 'Team Manager');
  await request(app).get('/api/organisation-structure').set(bearer(manager)).expect(403);
  const roster = await request(app).get('/api/organisation-structure').set(bearer(hr)).expect(200);
  expect(roster.body.summary.employees).toBe(2);
  const saved = await request(app).patch('/api/organisation-structure/teams/' + team.id)
    .set(bearer(hr)).send({ formalManagerUserId: manager.id }).expect(200);
  expect(saved.body.status).toBe('verified');
  const verified = await request(app).get('/api/organisation-structure').set(bearer(hr)).expect(200);
  expect(verified.body.teams[0].formalManagerUserId).toBe(manager.id);
  expect(verified.body.teams[0].reportingEligibleBySize).toBe(false);
 });
 test('rejects cross-tenant relationships and circular parent assignment', async () => {
  const org = await Organization.create({ name: 'Tenant A' });
  const other = await Organization.create({ name: 'Tenant B' });
  const a = await Team.create({ name: 'A', orgId: org.id });
  const b = await Team.create({ name: 'B', orgId: org.id });
  const outsider = await Team.create({ name: 'Outsider', orgId: other.id });
  const hr = await user(org, a, 'Hr User', 'hr_admin');
  await request(app).patch('/api/organisation-structure/teams/' + a.id)
    .set(bearer(hr)).send({ parentTeamId: outsider.id }).expect(400);
  await request(app).patch('/api/organisation-structure/teams/' + a.id)
    .set(bearer(hr)).send({ parentTeamId: b.id }).expect(200);
  await request(app).patch('/api/organisation-structure/teams/' + b.id)
    .set(bearer(hr)).send({ parentTeamId: a.id }).expect(400);
 });
 test('manual employee corrections are historically dated and remain HR verified', async () => {
  const org = await Organization.create({ name: 'Tenant A' });
  const old = await Team.create({ name: 'Old', orgId: org.id });
  const next = await Team.create({ name: 'Next', orgId: org.id });
  const hr = await user(org, old, 'Hr User', 'hr_admin');
  const worker = await user(org, old, 'Test Employee');
  const changed = await request(app).patch('/api/organisation-structure/people/' + worker.id)
    .set(bearer(hr)).send({ teamId: next.id, managerUserId: hr.id }).expect(200);
  expect(changed.body.status).toBe('verified');
  const fresh = await User.findById(worker.id);
  expect(String(fresh.teamId)).toBe(next.id);
  expect(fresh.hrStructure.teamVerifiedAt).toBeTruthy();
  const unit = await OrgUnit.findOne({ userId: worker.id, effectiveTo: null });
  expect(String(unit.managerUserId)).toBe(hr.id);
  const again = await request(app).patch('/api/organisation-structure/people/' + worker.id)
    .set(bearer(hr)).send({ managerUserId: null }).expect(200);
  expect(again.body.status).toBe('verified');
  const historical = await OrgUnit.find({ userId: worker.id }).sort({ effectiveFrom: 1 });
  expect(historical).toHaveLength(2);
  expect(historical[0].effectiveTo).toBeTruthy();
  expect(historical[1].managerUserId).toBeNull();
 });
});
