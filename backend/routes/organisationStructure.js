import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/user.js';
import Team from '../models/team.js';
import OrgUnit from '../models/orgUnit.js';
import Organization from '../models/organizationModel.js';
import { refreshTeamSizes } from '../services/employeeSyncService.js';

const router = express.Router();
const ADMIN_ROLES = new Set(['master_admin', 'admin', 'hr_admin']);
const ident = value => String(value?._id || value || '');
const isId = value => mongoose.isValidObjectId(value);
const privacy = res => res.set('Cache-Control', 'no-store, private');
const asText = value => String(value || '').trim();

router.use(authenticateToken);
router.use(async (req, res, next) => {
  try {
    const user = isId(req.user?.userId)
      ? await User.findById(req.user.userId).select('_id orgId role accountStatus').lean()
      : null;
    if (!user || user.accountStatus !== 'active' || !user.orgId || !ADMIN_ROLES.has(user.role)) {
      return privacy(res).status(403).json({ message: 'HR administration access required' });
    }
    req.structureAdmin = user;
    next();
  } catch (error) { next(error); }
});

// HR may see the workforce roster even when a small team's analytics must be suppressed.
router.get('/', async (req, res, next) => {
  try {
    const orgId = req.structureAdmin.orgId;
    const [org, teams, people, units] = await Promise.all([
      Organization.findById(orgId).select('name settings.minTeamSize settings.timezone settings.weeklyBriefRecipients settings.weeklyBriefRecipientsApprovedAt').lean(),
      Team.find({ orgId, isActive: { $ne: false } })
        .select('_id name isActive analyticsEnabled structure metadata.sourceDepartment')
        .sort({ name: 1 }).lean(),
      User.find({ orgId, accountStatus: { $ne: 'inactive' } })
        .select('_id name email teamId accountStatus profile.department hrStructure.teamVerifiedAt').sort({ name: 1 }).limit(1000).lean(),
      OrgUnit.find({ orgId, effectiveTo: null, source: { $in: ['hris','directory','manual'] } })
        .select('userId managerUserId teamId source effectiveFrom').sort({ effectiveFrom: -1 }).lean(),
    ]);
    const recentByUser = new Map();
    for (const unit of units) if (unit.userId && !recentByUser.has(ident(unit.userId))) {
      recentByUser.set(ident(unit.userId), unit);
    }
    const memberCounts = new Map();
    for (const person of people) memberCounts.set(ident(person.teamId), (memberCounts.get(ident(person.teamId)) || 0) + 1);
    const minimum = Math.max(8, Number(org?.settings?.minTeamSize) || 8);
    return privacy(res).json({
      organisation: { name: org?.name || '', timezone: org?.settings?.timezone || 'UTC', minimum,
        approvedReportRecipients: org?.settings?.weeklyBriefRecipients || [],
        recipientsReviewedAt: org?.settings?.weeklyBriefRecipientsApprovedAt || null },
      teams: teams.map(t => ({
        id: ident(t._id), name: t.name, parentTeamId: t.structure?.parentTeamId ? ident(t.structure.parentTeamId) : null,
        formalManagerUserId: t.structure?.managerUserId ? ident(t.structure.managerUserId) : null,
        verifiedAt: t.structure?.verifiedAt || null, source: t.structure?.source || 'unverified',
        memberCount: memberCounts.get(ident(t._id)) || 0,
        reportingEligibleBySize: (memberCounts.get(ident(t._id)) || 0) >= minimum && t.analyticsEnabled !== false,
        // Eligibility by size alone does NOT prove event-source coverage.
        measurementStatus: 'Verify source coverage in Data coverage',
      })),
      people: people.map(p => ({
        id: ident(p._id), name: p.name, email: p.email, teamId: ident(p.teamId),
        accountStatus: p.accountStatus, directoryDepartment: p.profile?.department || '',
        verifiedTeam: Boolean(p.hrStructure?.teamVerifiedAt),
        managerUserId: recentByUser.get(ident(p._id))?.managerUserId
          ? ident(recentByUser.get(ident(p._id)).managerUserId) : null,
      })),
      summary: {
        employees: people.length, teams: teams.length,
        unassigned: people.filter(p => !p.teamId || !teams.some(t => ident(t._id) === ident(p.teamId))).length,
        pendingAccounts: people.filter(p => p.accountStatus === 'pending').length,
        unverifiedTeams: teams.filter(t => !t.structure?.verifiedAt).length,
      },
    });
  } catch (error) { next(error); }
});

const withinTenant = async (orgId, personId) => {
  if (!isId(personId)) return null;
  return User.findOne({ _id: personId, orgId, accountStatus: { $ne: 'inactive' } })
    .select('_id').lean();
};

// HR edits formal structure only. Formal manager assignment never grants reporting permission.
router.patch('/teams/:teamId', async (req, res, next) => {
  try {
    const orgId = req.structureAdmin.orgId;
    const team = isId(req.params.teamId)
      ? await Team.findOne({ _id: req.params.teamId, orgId, isActive: { $ne: false } })
      : null;
    if (!team) return privacy(res).status(404).json({ message: 'Team not found in this organisation' });
    const requested = req.body || {};
    const patch = {};
    if (Object.prototype.hasOwnProperty.call(requested, 'parentTeamId')) {
      const parentId = requested.parentTeamId ? asText(requested.parentTeamId) : null;
      if (parentId && (!isId(parentId) || parentId === ident(team._id))) {
        return privacy(res).status(400).json({ message: 'Invalid parent department' });
      }
      if (parentId) {
        const parent = await Team.findOne({ _id: parentId, orgId, isActive: { $ne: false } }).lean();
        if (!parent) return privacy(res).status(400).json({ message: 'Parent must belong to this organisation' });
        // Walk ancestors. Reject cycles and broken cross-tenant ancestry.
        const visited = new Set([ident(team._id)]);
        let pointer = parent;
        while (pointer) {
          const key = ident(pointer._id);
          if (visited.has(key)) return privacy(res).status(400).json({ message: 'Circular organisation structure is not allowed' });
          visited.add(key);
          if (!pointer.structure?.parentTeamId) break;
          pointer = await Team.findOne({ _id: pointer.structure.parentTeamId, orgId }).lean();
          if (!pointer) return privacy(res).status(400).json({ message: 'Parent hierarchy is incomplete' });
        }
      }
      patch['structure.parentTeamId'] = parentId;
    }
    if (Object.prototype.hasOwnProperty.call(requested, 'formalManagerUserId')) {
      const managerId = requested.formalManagerUserId ? asText(requested.formalManagerUserId) : null;
      if (managerId && !(await withinTenant(orgId, managerId))) {
        return privacy(res).status(400).json({ message: 'Formal manager must be a verified organisation employee' });
      }
      patch['structure.managerUserId'] = managerId;
    }
    if (!Object.keys(patch).length) return privacy(res).status(400).json({ message: 'No structure changes provided' });
    Object.assign(patch, {
      'structure.source': 'hr',
      'structure.verifiedAt': new Date(),
      'structure.verifiedBy': req.structureAdmin._id,
    });
    const result = await Team.findOneAndUpdate({ _id: team._id, orgId }, { $set: patch }, { new: true });
    return privacy(res).json({ status: 'verified', teamId: ident(result._id) });
  } catch (error) { next(error); }
});

router.patch('/people/:userId', async (req, res, next) => {
  try {
    const orgId = req.structureAdmin.orgId;
    const person = isId(req.params.userId)
      ? await User.findOne({ _id: req.params.userId, orgId, accountStatus: { $ne: 'inactive' } })
      : null;
    if (!person) return privacy(res).status(404).json({ message: 'Employee not found in organisation' });
    const request = req.body || {};
    const hasTeam = Object.prototype.hasOwnProperty.call(request, 'teamId');
    const hasManager = Object.prototype.hasOwnProperty.call(request, 'managerUserId');
    if (!hasTeam && !hasManager) return privacy(res).status(400).json({ message: 'Choose a team or reporting-line change' });
    let teamId = person.teamId;
    if (hasTeam) {
      if (!isId(request.teamId)) return privacy(res).status(400).json({ message: 'Choose an approved team' });
      const team = await Team.findOne({ _id: request.teamId, orgId, isActive: { $ne: false } }).select('_id').lean();
      if (!team) return privacy(res).status(400).json({ message: 'Team belongs to another organisation' });
      teamId = team._id;
    }
    const current = await OrgUnit.findOne({ orgId, userId: person._id, effectiveTo: null,
      source: { $in: ['hris', 'directory', 'manual'] } }).sort({ effectiveFrom: -1 }).lean();
    const managerId = hasManager ? (request.managerUserId || null) : (current?.managerUserId || null);
    if (managerId && (ident(managerId) === ident(person._id) || !(await withinTenant(orgId, managerId)))) {
      return privacy(res).status(400).json({ message: 'Reporting manager must be another employee in the same organisation' });
    }
    const effective = new Date();
    await OrgUnit.updateMany({ orgId, userId: person._id, effectiveTo: null },
      { $set: { effectiveTo: effective } });
    await OrgUnit.create({ orgId, userId: person._id, teamId, managerUserId: managerId,
      source: 'manual', effectiveFrom: effective, effectiveTo: null,
      isManager: false });
    if (hasTeam) {
      person.teamId = teamId;
      person.hrStructure = { teamVerifiedAt: effective, verifiedBy: req.structureAdmin._id };
      await person.save();
      await refreshTeamSizes(orgId, Math.max(8, Number((await Organization.findById(orgId).select('settings.minTeamSize').lean())?.settings?.minTeamSize) || 8));
    }
    // Historical WorkEvent team attribution remains unchanged. This preserves
    // the period in which the underlying work actually happened.
    return privacy(res).json({ status: 'verified', employeeId: ident(person._id), effectiveAt: effective });
  } catch (error) { next(error); }
});


// Only named, active, organisation-authorised administrators may receive a
// full weekly HR report. This is a separate permission from manager team access.
router.put('/report-recipients', async (req, res, next) => {
  try {
    const orgId = req.structureAdmin.orgId;
    const emails = req.body?.emails;
    if (!Array.isArray(emails) || emails.length > 30 ||
      emails.some(email => typeof email !== 'string' || email.length > 254)) {
      return privacy(res).status(400).json({ message: 'Provide a list of approved work email addresses' });
    }
    const unique = [...new Set(emails.map(email => email.trim().toLowerCase()))];
    const eligible = await User.find({
      orgId, accountStatus: 'active',
      role: { $in: ['hr_admin', 'admin', 'org_admin', 'master_admin'] },
      email: { $in: unique },
    }).select('email').lean();
    if (eligible.length !== unique.length) {
      return privacy(res).status(400).json({ message: 'Every recipient must be an active approved organisation administrator' });
    }
    await Organization.updateOne({ _id: orgId }, { $set: {
      'settings.weeklyBriefRecipients': unique,
      'settings.weeklyBriefRecipientsApprovedAt': new Date(),
      'settings.weeklyBriefRecipientsApprovedBy': req.structureAdmin._id,
    } });
    return privacy(res).json({ status: 'approved', recipients: unique, paused: unique.length === 0 });
  } catch (error) { next(error); }
});

export default router;
