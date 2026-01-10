/**
 * Access Control Service
 * 
 * Enforces STRICT role-based and subscription-based access control.
 * This is the POWER BOUNDARY for SignalTrue pricing.
 * 
 * CRITICAL: Access is blocked at API level, NOT just UI.
 */

import { ACCESS_MATRIX, FEATURES, PLAN_DEFINITIONS, ROLES } from '../utils/subscriptionConstants.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';

class AccessControlService {
  /**
   * Check if a user can access a specific feature
   * 
   * @param {Object} user - User object with role
   * @param {Object} organization - Organization object with subscriptionPlanId
   * @param {String} feature - Feature key from FEATURES constant
   * @returns {Object} { allowed: boolean, reason: string }
   */
  async canAccessFeature(user, organization, feature) {
    if (!user || !organization) {
      return { allowed: false, reason: 'Missing user or organization context' };
    }

    // 1. Check subscription plan has the feature
    const planId = organization.subscriptionPlanId;
    
    if (!planId) {
      return { allowed: false, reason: 'No active subscription plan' };
    }

    const plan = PLAN_DEFINITIONS[planId];
    
    if (!plan) {
      return { allowed: false, reason: 'Invalid subscription plan' };
    }

    const featureEnabled = plan.features[feature];
    
    if (!featureEnabled) {
      return { 
        allowed: false, 
        reason: `Feature ${feature} not available in ${plan.name} plan` 
      };
    }

    // 2. Check role-based access matrix
    const userRole = user.role;
    
    if (!userRole) {
      return { allowed: false, reason: 'User role not defined' };
    }

    const roleAccess = ACCESS_MATRIX[feature];
    
    if (!roleAccess) {
      return { allowed: false, reason: `Feature ${feature} not in access matrix` };
    }

    const roleAllowed = roleAccess[userRole];
    
    if (!roleAllowed) {
      return { 
        allowed: false, 
        reason: `Role ${userRole} cannot access ${feature}` 
      };
    }

    // 3. Check custom flags for enterprise features
    if (feature === FEATURES.CUSTOM_MODELS && planId === 'custom') {
      if (!organization.customFeatures?.enableCustomAiPrompts) {
        return { 
          allowed: false, 
          reason: 'Custom AI models not enabled for this organization' 
        };
      }
    }

    // All checks passed
    return { allowed: true, reason: 'Access granted' };
  }

  /**
   * Check if a user can access a specific report type
   * 
   * @param {Object} user - User object with role
   * @param {Object} organization - Organization object
   * @param {String} reportType - 'weekly' | 'monthly_hr' | 'monthly_leadership'
   * @returns {Object} { allowed: boolean, reason: string }
   */
  async canAccessReport(user, organization, reportType) {
    const featureMap = {
      'weekly': FEATURES.WEEKLY_REPORT,
      'monthly_hr': FEATURES.MONTHLY_HR_REPORT,
      'monthly_leadership': FEATURES.MONTHLY_LEADERSHIP_REPORT
    };

    const feature = featureMap[reportType];
    
    if (!feature) {
      return { allowed: false, reason: 'Invalid report type' };
    }

    return await this.canAccessFeature(user, organization, feature);
  }

  /**
   * Check if AI mode is allowed for user/org
   * 
   * @param {Object} user - User object
   * @param {Object} organization - Organization object
   * @param {String} aiMode - 'tactical' | 'strategic'
   * @returns {Object} { allowed: boolean, reason: string }
   */
  async canUseAiMode(user, organization, aiMode) {
    const feature = aiMode === 'tactical' 
      ? FEATURES.AI_TACTICAL 
      : FEATURES.AI_STRATEGIC;

    return await this.canAccessFeature(user, organization, feature);
  }

  /**
   * Check if user can access industry benchmarks
   * 
   * @param {Object} user - User object
   * @param {Object} organization - Organization object
   * @returns {Object} { allowed: boolean, reason: string }
   */
  async canAccessBenchmarks(user, organization) {
    return await this.canAccessFeature(user, organization, FEATURES.INDUSTRY_BENCHMARKS);
  }

  /**
   * Get all accessible features for a user in their organization
   * 
   * @param {Object} user - User object
   * @param {Object} organization - Organization object
   * @returns {Array} Array of accessible feature keys
   */
  async getAccessibleFeatures(user, organization) {
    const accessible = [];

    for (const feature of Object.values(FEATURES)) {
      const result = await this.canAccessFeature(user, organization, feature);
      if (result.allowed) {
        accessible.push(feature);
      }
    }

    return accessible;
  }

  /**
   * Validate role exists and is valid
   * 
   * @param {String} role - Role to validate
   * @returns {Boolean}
   */
  isValidRole(role) {
    return Object.values(ROLES).includes(role);
  }

  /**
   * Check if upgrade is allowed (business logic)
   * 
   * @param {String} currentPlanId - Current plan ID
   * @param {String} targetPlanId - Target plan ID
   * @returns {Object} { allowed: boolean, reason: string }
   */
  canUpgrade(currentPlanId, targetPlanId) {
    const planHierarchy = ['team', 'leadership', 'custom'];
    const currentIndex = planHierarchy.indexOf(currentPlanId);
    const targetIndex = planHierarchy.indexOf(targetPlanId);

    if (currentIndex === -1 || targetIndex === -1) {
      return { allowed: false, reason: 'Invalid plan ID' };
    }

    if (targetIndex <= currentIndex) {
      return { allowed: false, reason: 'Target plan is not an upgrade' };
    }

    return { allowed: true, reason: 'Upgrade allowed' };
  }

  /**
   * Check if downgrade is allowed
   * 
   * @param {String} currentPlanId - Current plan ID
   * @param {String} targetPlanId - Target plan ID
   * @returns {Object} { allowed: boolean, reason: string }
   */
  canDowngrade(currentPlanId, targetPlanId) {
    const planHierarchy = ['team', 'leadership', 'custom'];
    const currentIndex = planHierarchy.indexOf(currentPlanId);
    const targetIndex = planHierarchy.indexOf(targetPlanId);

    if (currentIndex === -1 || targetIndex === -1) {
      return { allowed: false, reason: 'Invalid plan ID' };
    }

    if (targetIndex >= currentIndex) {
      return { allowed: false, reason: 'Target plan is not a downgrade' };
    }

    // Check if downgrade would revoke access to critical active features
    // (This could be extended with more business logic)
    
    return { allowed: true, reason: 'Downgrade allowed' };
  }

  /**
   * Get feature comparison between two plans
   * 
   * @param {String} currentPlanId 
   * @param {String} targetPlanId 
   * @returns {Object} { gained: [], lost: [] }
   */
  getFeatureChanges(currentPlanId, targetPlanId) {
    const currentPlan = PLAN_DEFINITIONS[currentPlanId];
    const targetPlan = PLAN_DEFINITIONS[targetPlanId];

    if (!currentPlan || !targetPlan) {
      return { gained: [], lost: [] };
    }

    const gained = [];
    const lost = [];

    for (const [feature, enabled] of Object.entries(targetPlan.features)) {
      const wasEnabled = currentPlan.features[feature];
      
      if (enabled && !wasEnabled) {
        gained.push(feature);
      } else if (!enabled && wasEnabled) {
        lost.push(feature);
      }
    }

    return { gained, lost };
  }
}

// Singleton instance
const accessControlService = new AccessControlService();

export default accessControlService;
