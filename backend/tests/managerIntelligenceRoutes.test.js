import {beforeAll,afterAll,beforeEach,describe,test,expect,jest} from '@jest/globals';
import mongoose from 'mongoose';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import {MongoMemoryServer} from 'mongodb-memory-server';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import ManagerAssignment from '../models/managerAssignment.js';
import ManagerInvitation from '../models/managerInvitation.js';
import {hashSecret,hashInvitedEmail} from '../services/managerIntelligenceService.js';

jest.setTimeout(120000);
let mongod,router,app;
const SECRET='test-manager-invitation-security-secret';
const oid=()=>new mongoose.Types.ObjectId();
const bearer=user=>({Authorization:'Bearer '+jwt.sign({userId:String(user._id),role:user.role,
 orgId:String(user.orgId)},SECRET,{expiresIn:'1h'})});
async function employee(orgId,teamId,email,role='viewer'){
 return User.create({orgId,teamId,email,name:email.split('@')[0],password:'test-pass-1234',role,accountStatus:'active'});
}
beforeAll(async()=>{
 process.env.JWT_SECRET=SECRET;
 mongod=await MongoMemoryServer.create();
 await mongoose.connect(mongod.getUri());
 router=(await import('../routes/managerIntelligence.js')).default;
 app=express();app.use(express.json());app.use('/api/manager-intelligence',router);
});
afterAll(async()=>{await mongoose.disconnect();if(mongod)await mongod.stop()});
beforeEach(async()=>{
 await Promise.all(Object.values(mongoose.connection.collections).map(c=>c.deleteMany({})));
});
describe('manager invitation and exact team scope',()=>{
 test('a forwarded token cannot activate for another employee, and revoked role immediately loses access',async()=>{
  const org=await Organization.create({name:'Acme'});
  const team=await Team.create({name:'Operations',orgId:org._id});
  const other=await Team.create({name:'Design',orgId:org._id});
  const admin=await employee(org._id,team._id,'admin-acme@example.com','hr_admin');
  const invited=await employee(org._id,team._id,'manager-acme@example.com');
  const forwarded=await employee(org._id,team._id,'forwarded-acme@example.com');
  const assignment=await ManagerAssignment.create({orgId:org._id,managerUserId:invited._id,teamId:team._id,
   status:'invited',invitedBy:admin._id,expiresAt:new Date(Date.now()+86400000)});
  const token='a'.repeat(50);
  await ManagerInvitation.create({orgId:org._id,assignmentId:assignment._id,recipientUserId:invited._id,
    recipientEmailHash:hashInvitedEmail(invited.email),tokenHash:hashSecret(token),expiresAt:new Date(Date.now()+86400000)});
  await request(app).post('/api/manager-intelligence/invitations/inspect').set(bearer(forwarded)).send({token}).expect(403);
  await request(app).post('/api/manager-intelligence/invitations/respond').set(bearer(forwarded)).send({token,accept:true}).expect(403);
  await request(app).get('/api/manager-intelligence/teams/'+team.id+'/trends').set(bearer(invited)).expect(403);
  await request(app).post('/api/manager-intelligence/invitations/inspect').set(bearer(invited)).send({token}).expect(200);
  await request(app).post('/api/manager-intelligence/invitations/respond').set(bearer(invited)).send({token,accept:true}).expect(200);
  await request(app).post('/api/manager-intelligence/invitations/respond').set(bearer(invited)).send({token,accept:true}).expect(403);
  const activated=await ManagerAssignment.findById(assignment._id).lean();
  expect(activated.status).toBe('active');
  expect(activated.expiresAt).toBeNull();
  // Seven days applies to *unaccepted invitations*, not an ongoing HR approval.
  // Eight days after acceptance, a role still requires explicit revocation.
  const {validateTeamPermission}=await import('../services/managerIntelligenceService.js');
  expect(validateTeamPermission({user:invited,assignment:activated,team,
    orgId:org._id,teamId:team._id,now:new Date(Date.now()+8*86400000)})).toBe(true);
  const list=await request(app).get('/api/manager-intelligence/me/teams').set(bearer(invited)).expect(200);
  expect(list.body.teams.map(x=>x.teamId)).toEqual([team.id]);
  await request(app).get('/api/manager-intelligence/teams/'+other.id+'/trends').set(bearer(invited)).expect(403);
  const data=await request(app).get('/api/manager-intelligence/teams/'+team.id+'/trends').set(bearer(invited)).expect(200);
  expect(data.body.eligible).toBe(false);
  expect(JSON.stringify(data.body)).not.toContain('Design');
  await request(app).get('/api/manager-intelligence/teams/'+team.id+'/report.pdf').set(bearer(invited)).expect(403);
  await request(app).post('/api/manager-intelligence/admin/assignments/'+assignment.id+'/revoke').set(bearer(admin)).expect(200);
  await request(app).get('/api/manager-intelligence/teams/'+team.id+'/trends').set(bearer(invited)).expect(403);
 });
 test('HR cannot grant a manager access across organizations, inactive manager is blocked',async()=>{
  const orgA=await Organization.create({name:'Ten A'}),orgB=await Organization.create({name:'Ten B'});
  const teamA=await Team.create({name:'A',orgId:orgA.id}),teamB=await Team.create({name:'B',orgId:orgB.id});
  const adminA=await employee(orgA.id,teamA.id,'admin-a@example.com','hr_admin');
  const mgrA=await employee(orgA.id,teamA.id,'m-a@example.com');
  await request(app).post('/api/manager-intelligence/admin/assignments').set(bearer(adminA))
    .send({managerUserId:mgrA.id,teamId:teamB.id}).expect(400);
  const created=await request(app).post('/api/manager-intelligence/admin/assignments').set(bearer(adminA))
    .send({managerUserId:mgrA.id,teamId:teamA.id}).expect(201);
  expect(created.body.status).toBe('pending');
  await User.updateOne({_id:adminA._id},{$set:{role:'viewer'}});
  await request(app).get('/api/manager-intelligence/admin/directory').set(bearer(adminA)).expect(403);
  await User.updateOne({_id:mgrA._id},{$set:{accountStatus:'inactive'}});
  const scope=await request(app).get('/api/manager-intelligence/me/teams').set(bearer(mgrA)).expect(200);
  expect(scope.body.teams).toEqual([]);
 });
});


describe('directory-synced manager onboarding', () => {
 test('HR can appoint a pending directory account, which must claim and accept before access', async () => {
  const org = await Organization.create({ name: 'Example HR' });
  const team = await Team.create({ name: 'Delivery', orgId: org._id });
  const hr = await employee(org.id,team.id,'hr-claim@example.com','hr_admin');
  const pending = await User.create({
    name: 'Invited Manager', email: 'pending-manager@example.com', orgId: org._id,
    teamId: team._id, role: 'team_member', accountStatus: 'pending', source: 'microsoft',
  });
  const listing = await request(app).get('/api/manager-intelligence/admin/directory')
    .set(bearer(hr)).expect(200);
  expect(listing.body.users.find(u => u.id === pending.id)?.accountStatus).toBe('pending');
  const approved = await request(app).post('/api/manager-intelligence/admin/assignments')
    .set(bearer(hr)).send({ managerUserId: pending.id, teamId: team.id, weeklyEmailEnabled: false }).expect(201);
  const token = 'secure-manager-claim-token-'.repeat(3);
  const expires = new Date(Date.now() + 86400000);
  await ManagerAssignment.updateOne({ _id: approved.body.id }, { $set: { status: 'invited', expiresAt: expires } });
  await ManagerInvitation.create({
    orgId: org.id, assignmentId: approved.body.id, recipientUserId: pending.id,
    recipientEmailHash: hashInvitedEmail(pending.email), tokenHash: hashSecret(token), expiresAt: expires,
  });
  await request(app).get('/api/manager-intelligence/me/teams').set(bearer(pending)).expect(200)
    .then(r => expect(r.body.teams).toEqual([]));
  await request(app).post('/api/manager-intelligence/invitations/claim')
    .send({ token, password: 'short' }).expect(400);
  await request(app).post('/api/manager-intelligence/invitations/claim')
    .send({ token, password: 'long-safe-invitation-password-2026' }).expect(200);
  const claimed = await User.findById(pending._id).select('+password');
  expect(claimed.accountStatus).toBe('active');
  expect(await claimed.comparePassword('long-safe-invitation-password-2026')).toBe(true);
  await request(app).post('/api/manager-intelligence/invitations/claim')
    .send({ token, password: 'another-long-password-2026' }).expect(409);
  await request(app).get('/api/manager-intelligence/teams/' + team.id + '/trends')
    .set(bearer(claimed)).expect(403);
  await request(app).post('/api/manager-intelligence/invitations/respond')
    .set(bearer(claimed)).send({ token, accept: true }).expect(200);
  const teams = await request(app).get('/api/manager-intelligence/me/teams').set(bearer(claimed)).expect(200);
  expect(teams.body.teams.map(t => t.teamId)).toEqual([team.id]);
  const assignment = await ManagerAssignment.findById(approved.body.id);
  expect(assignment.weeklyEmailEnabled).toBe(false);
 });
 test('revoked invitation cannot activate a pending user', async () => {
  const org = await Organization.create({ name: 'Revoked' });
  const team = await Team.create({ name: 'People', orgId: org._id });
  const hr = await employee(org.id,team.id,'hr-revoked@example.com','hr_admin');
  const pending = await User.create({ name: 'Pending', email: 'pending-revoked@example.com', orgId: org.id,
    teamId: team.id, accountStatus: 'pending', source: 'microsoft' });
  const assignment = await ManagerAssignment.create({ orgId: org.id, managerUserId: pending.id,
    teamId: team.id, invitedBy: hr.id, status: 'revoked', revokedAt: new Date(),
    expiresAt: new Date(Date.now() + 86400000) });
  const token = 'revoked-claim-token-'.repeat(4);
  await ManagerInvitation.create({ orgId: org.id, assignmentId: assignment.id, recipientUserId: pending.id,
    recipientEmailHash: hashInvitedEmail(pending.email), tokenHash: hashSecret(token),
    expiresAt: new Date(Date.now() + 86400000) });
  await request(app).post('/api/manager-intelligence/invitations/claim')
    .send({ token, password: 'long-safe-invitation-password-2026' }).expect(403);
  expect((await User.findById(pending.id)).accountStatus).toBe('pending');
 });
});


 test('manager email preferences affect only the explicitly authorised team', async () => {
  const org = await Organization.create({ name: 'Two Teams' });
  const first = await Team.create({ name: 'First', orgId: org.id });
  const second = await Team.create({ name: 'Second', orgId: org.id });
  const manager = await employee(org.id,first.id,'two-team-manager@example.com');
  const admin = await employee(org.id,first.id,'two-team-hr@example.com','hr_admin');
  const valid = { orgId: org.id, managerUserId: manager.id, invitedBy: admin.id,
    status: 'active', acceptedAt: new Date(), activatedAt: new Date(),
    weeklyEmailEnabled: true };
  await ManagerAssignment.create([{ ...valid, teamId: first.id },{ ...valid, teamId: second.id }]);
  await request(app).patch('/api/manager-intelligence/me/preferences')
    .set(bearer(manager)).send({ weeklyEmailEnabled: false }).expect(400);
  await request(app).patch('/api/manager-intelligence/me/preferences')
    .set(bearer(manager)).send({ teamId: first.id, weeklyEmailEnabled: false }).expect(200);
  const appointments = await ManagerAssignment.find({ orgId: org.id }).sort({ teamId: 1 }).lean();
  expect(appointments.find(a => String(a.teamId) === first.id).weeklyEmailEnabled).toBe(false);
  expect(appointments.find(a => String(a.teamId) === second.id).weeklyEmailEnabled).toBe(true);
 });
