import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import ManagerAssignment from '../models/managerAssignment.js';
import { TEHNOPOL_CANONICAL_ORG_ID } from './tehnopolCanonicalRepair.js';

const HR_ROLES = ['master_admin','hr_admin','admin','org_admin'];

/**
 * Prepare PENDING scopes for HR-verified company managers only.
 * Never issue invitation emails, activate access, or turn on weekly emails.
 * An HR admin must invite each manager, who must sign in and accept.
 */
export async function prepareTehnopolManagerScopes() {
  const org = await Organization.findById(TEHNOPOL_CANONICAL_ORG_ID)
    .select('domain lifecycleStatus').lean();
  if (!org || org.lifecycleStatus !== 'active' ||
      String(org.domain || '').toLowerCase() !== 'tehnopol.ee') {
    return { status: 'not_applicable', prepared: 0 };
  }
  const teams = await Team.find({
    orgId: org._id, isActive: { $ne: false },
    'structure.source': 'hr', 'structure.verifiedAt': { $ne: null },
    'structure.managerUserId': { $ne: null },
    'structure.verifiedBy': { $ne: null },
  }).select('_id structure').lean();
  let prepared = 0, existing = 0, unresolved = 0;
  for (const team of teams) {
    const [manager, approver] = await Promise.all([
      User.findOne({ _id: team.structure.managerUserId, orgId: org._id,
        accountStatus: { $in: ['active','pending'] } })
        .select('_id email').lean(),
      User.findOne({ _id: team.structure.verifiedBy, orgId: org._id,
        role: { $in: HR_ROLES }, accountStatus: 'active' })
        .select('_id').lean(),
    ]);
    if (!manager || !approver ||
        !String(manager.email || '').toLowerCase().endsWith('@tehnopol.ee')) {
      unresolved++;
      continue;
    }
    const key = { orgId: org._id, teamId: team._id, managerUserId: manager._id };
    if (await ManagerAssignment.exists(key)) { existing++; continue; }
    try {
      await ManagerAssignment.create({
        ...key, invitedBy: approver._id,
        status: 'pending', weeklyEmailEnabled: false, exportEnabled: false,
      });
      prepared++;
    } catch (error) {
      if (error?.code === 11000) { existing++; continue; }
      throw error;
    }
  }
  return { status: 'pending_only', hrVerifiedTeamManagers: teams.length,
    prepared, existing, unresolved, activeAccessGranted: 0, invitationEmailsSent: 0 };
}
