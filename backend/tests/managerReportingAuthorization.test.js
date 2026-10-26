import { describe, expect, test } from '@jest/globals';
import { managerAdmin } from '../services/managerReportAccessService.js';
import ManagerReportAssignment from '../models/managerReportAssignment.js';

describe('Manager Intelligence fail-closed activation policy', () => {
 test('only HR and organization admins appoint managers',()=>{
   expect(managerAdmin({role:'manager'})).toBe(false);
   expect(managerAdmin({role:'team_member'})).toBe(false);
   expect(managerAdmin({role:'viewer'})).toBe(false);
   expect(managerAdmin({role:'hr_admin'})).toBe(true);
   expect(managerAdmin({role:'org_admin'})).toBe(true);
 });
 test('appointment never grants access or subscriptions until accepted',()=>{
   const doc = new ManagerReportAssignment({orgId:'507f1f77bcf86cd799439011',teamId:'507f1f77bcf86cd799439012',
     managerUserId:'507f1f77bcf86cd799439013',appointedBy:'507f1f77bcf86cd799439014'});
   expect(doc.status).toBe('pending');
   expect(doc.emailEnabled).toBe(false);
 });
 test('invite secret is not returned by default in projection',()=>{
   expect(ManagerReportAssignment.schema.path('inviteTokenHash').options.select).toBe(false);
 });
});
