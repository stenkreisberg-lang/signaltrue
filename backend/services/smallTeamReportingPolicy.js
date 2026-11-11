/**
 * Restricted small-group reporting is intentionally NOT anonymous reporting.
 * The customer controller must document lawful basis, staff notice and a risk
 * review. Without all of these, the existing eight-contributor rule applies.
 * Even when enabled, no emails/exports/peer-team or public comparisons.
 */
export const DEFAULT_SENSITIVE_REPORTING_MINIMUM = 8;
export const RESTRICTED_REPORTING_MINIMUM = 2;

export function isApprovedSmallTeamPolicy(policy, now = new Date()) {
  if (!policy || policy.enabled !== true || policy.minimumContributors !== 2 ||
    policy.accessMode !== 'restricted' || !policy.approvedBy ||
    !policy.approvedAt || !policy.employeeNoticeConfirmedAt ||
    !policy.riskAssessmentApprovedAt || !policy.legalBasis ||
    !policy.policyVersion || !policy.expiresAt) return false;
  const dates = [
    policy.approvedAt, policy.employeeNoticeConfirmedAt,
    policy.riskAssessmentApprovedAt, policy.expiresAt,
  ].map(v => new Date(v).getTime());
  return dates.every(Number.isFinite) && dates[3] > now.getTime();
}

export function resolveRestrictedTeamMinimum({ policy, team, audience, scopeApproved, now = new Date() }) {
  const fullMemberCount = Number(team?.metadata?.actualSize || 0);
  const canView = ['hr_admin', 'assigned_manager'].includes(audience) && scopeApproved === true;
  const hrVerified = team?.structure?.source === 'hr' &&
    Boolean(team.structure?.verifiedAt && team.structure?.verifiedBy);
  const smallGroup = canView && hrVerified && team.isActive !== false &&
    isApprovedSmallTeamPolicy(policy, now) && fullMemberCount >= 2;
  return {
    minimum: smallGroup ? RESTRICTED_REPORTING_MINIMUM : DEFAULT_SENSITIVE_REPORTING_MINIMUM,
    restrictedIdentifiable: smallGroup,
    allowEmail: !smallGroup,
    allowExport: !smallGroup,
    note: smallGroup
      ? 'Restricted, potentially identifiable two-person work-pattern data. Do not use for employee scoring, individual monitoring or disciplinary decisions.'
      : 'Only anonymised-enough group reporting is available until the customer authorises a restricted small-team policy.',
  };
}
