import {describe,test,expect} from '@jest/globals';
import {validateTeamPermission,hashSecret,secureToken,validateActionBody} from '../services/managerIntelligenceService.js';
import {isManagerDeliveryWindow,managerLocalClock,managerReportWeek,renderManagerWeeklyDigest} from '../services/managerWeeklyDeliveryService.js';
const now=new Date('2026-10-26T10:30:00Z');
const org='507f191e810c19729de86001',otherOrg='507f191e810c19729de86002';
const person='507f191e810c19729de86003',teamId='507f191e810c19729de86004';
const valid={
 user:{_id:person,orgId:org,accountStatus:'active'},
 team:{_id:teamId,orgId:org,isActive:true,analyticsEnabled:true},
 assignment:{orgId:org,managerUserId:person,teamId,status:'active',acceptedAt:new Date('2026-10-20')},
 orgId:org,teamId,now,
};
describe('manager assignment authorization invariant',()=>{
 test('allows only explicitly active verified in-tenant team permission',()=>expect(validateTeamPermission(valid)).toBe(true));
 test('denies unrelated tenant, team, and user',()=>{
  expect(validateTeamPermission({...valid,orgId:otherOrg})).toBe(false);
  expect(validateTeamPermission({...valid,teamId:'507f191e810c19729de86005'})).toBe(false);
  expect(validateTeamPermission({...valid,user:{...valid.user,_id:'507f191e810c19729de86006'}})).toBe(false);
 });
 test('denies invited, revoked, expired, inactive and non-accepted',()=>{
  expect(validateTeamPermission({...valid,assignment:{...valid.assignment,status:'invited'}})).toBe(false);
  expect(validateTeamPermission({...valid,assignment:{...valid.assignment,revokedAt:new Date()}})).toBe(false);
  expect(validateTeamPermission({...valid,assignment:{...valid.assignment,expiresAt:new Date('2026-10-25')}})).toBe(false);
  expect(validateTeamPermission({...valid,assignment:{...valid.assignment,acceptedAt:null}})).toBe(false);
  expect(validateTeamPermission({...valid,user:{...valid.user,accountStatus:'inactive'}})).toBe(false);
  expect(validateTeamPermission({...valid,team:{...valid.team,analyticsEnabled:false}})).toBe(false);
 });
 test('one-time secret is generated with enough entropy and stored as a digest',()=>{
  const a=secureToken(),b=secureToken();
  expect(a).not.toBe(b);
  expect(a.length).toBeGreaterThan(40);
  expect(hashSecret(a)).toMatch(/^[a-f0-9]{64}$/);
  expect(hashSecret(a)).not.toContain(a);
 });
 test('rejects invalid and excessively long action input',()=>{
  expect(validateActionBody({title:'Change status meeting',direction:'decrease',hypothesis:'Try asynchronous update'})).toMatchObject({metric:'meetingsPerRepresentedPerson'});
  expect(validateActionBody({title:'',direction:'decrease'})).toBeNull();
  expect(validateActionBody({title:'x',direction:'increase',hypothesis:'x'.repeat(1100)})).toBeNull();
  expect(validateActionBody({title:'x',direction:'watch'})).toBeNull();
 });
});
describe('manager digest confidentiality and scheduling',()=>{
 test('honors local Monday window including Europe/Tallinn timezone',()=>{
  expect(managerLocalClock(now,'Europe/Tallinn')).toMatchObject({weekday:'Mon',hour:12,minute:30});
  expect(isManagerDeliveryWindow(now,'UTC')).toBe(false);
  expect(isManagerDeliveryWindow(new Date('2026-10-26T06:30:00Z'),'Europe/Tallinn')).toBe(true);
  expect(managerReportWeek(now)).toBe('2026-10-19');
 });
 test('email with no eligible group sends no team name or metrics',()=>{
  const html=renderManagerWeeklyDigest({reportWeek:'2026-10-19',eligible:[],missing:1});
  expect(html).toContain('no authorized team met');
  expect(html).not.toContain('Private small team');
  expect(html).not.toContain('0%');
 });
 test('email is HTML-only aggregate and link needs authentication',()=>{
  const html=renderManagerWeeklyDigest({reportWeek:'2026-10-19',
   eligible:[{teamName:'Operations',current:1.2,baseline:1.5,changePct:-20,points:[{date:'2026-10-12',value:1.5},{date:'2026-10-19',value:1.2}]}]});
  expect(html).toContain('Operations');
  expect(html).toContain('1.2');
  expect(html).toContain('/app/manager');
  expect(html).not.toContain('mailto:');
 });
});
