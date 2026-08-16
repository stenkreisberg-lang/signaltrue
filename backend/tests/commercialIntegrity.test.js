import accessControlService from '../services/accessControlService.js';
import { FEATURES, PLAN_DEFINITIONS } from '../utils/subscriptionConstants.js';
import { resolveOrganizationTier } from '../middleware/checkTier.js';

describe('commercial and role integrity', () => {
  test('keeps published subscription amounts aligned with plan definitions', () => {
    expect(PLAN_DEFINITIONS.team.priceEUR).toBe(299);
    expect(PLAN_DEFINITIONS.leadership.priceEUR).toBe(499);
  });

  test('maps application roles into the feature access matrix', async () => {
    const organization = { subscriptionPlanId: 'leadership', customFeatures: {} };

    await expect(
      accessControlService.canAccessFeature(
        { role: 'hr_admin' },
        organization,
        FEATURES.WEEKLY_REPORT
      )
    ).resolves.toMatchObject({ allowed: true });

    await expect(
      accessControlService.canAccessFeature(
        { role: 'executive' },
        organization,
        FEATURES.MONTHLY_LEADERSHIP_REPORT
      )
    ).resolves.toMatchObject({ allowed: true });

    await expect(
      accessControlService.canAccessFeature(
        { role: 'manager' },
        organization,
        FEATURES.AI_STRATEGIC
      )
    ).resolves.toMatchObject({ allowed: false });
  });

  test('maps paid plans to action-enabled product tiers', () => {
    expect(resolveOrganizationTier({ subscriptionPlanId: 'team' })).toBe('detection');
    expect(resolveOrganizationTier({ subscriptionPlanId: 'leadership' })).toBe('impact_proof');
  });
});
