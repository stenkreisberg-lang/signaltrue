import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import WeeklyBriefDispatch from '../models/weeklyBriefDispatch.js';

export async function currentReportRecipients(orgId) {
  const org = await Organization.findById(orgId)
    .select(
      'lifecycleStatus settings.weeklyBriefRecipientsApprovedAt settings.weeklyBriefRecipients'
    )
    .lean();
  if (!org || org.lifecycleStatus === 'retired') return [];
  const configured = Boolean(org.settings?.weeklyBriefRecipientsApprovedAt);
  const approved = new Set(
    (org.settings?.weeklyBriefRecipients || []).map((email) => String(email).trim().toLowerCase())
  );
  const orgUsers = await User.find({
    orgId,
    role: { $in: configured ? ['master_admin', 'hr_admin', 'admin', 'org_admin'] : ['hr_admin'] },
    accountStatus: 'active',
    email: { $exists: true, $ne: null },
  })
    .select('email')
    .lean();
  return [
    ...new Set(
      orgUsers
        .map((u) =>
          String(u.email || '')
            .trim()
            .toLowerCase()
        )
        .filter((email) => email && (!configured || approved.has(email)))
    ),
  ];
}

export async function verifyClaimRecipients(orgId, dispatchId, recipients) {
  try {
    const authorized = new Set(await currentReportRecipients(orgId));
    if (authorized.size !== recipients.length || recipients.some((email) => !authorized.has(email)))
      throw new Error('Report recipients changed during preparation');
  } catch (error) {
    // The provider has not been called. A retry must resolve the approved list afresh.
    await WeeklyBriefDispatch.deleteOne({
      _id: dispatchId,
      orgId,
      status: 'sending',
      providerMessageId: null,
    });
    throw error;
  }
}
