/**
 * Feature Access Middleware
 * 
 * Blocks API requests based on subscription tier and user role.
 * This middleware runs BEFORE controllers to enforce the power boundary.
 */

import accessControlService from '../services/accessControlService.js';

/**
 * Middleware factory to check feature access
 * 
 * @param {String} feature - Feature key from FEATURES constant
 * @returns {Function} Express middleware
 */
export const checkFeatureAccess = (feature) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const organization = req.organization;

      if (!user) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User authentication required' 
        });
      }

      if (!organization) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'Organization context required' 
        });
      }

      // Check access
      const accessCheck = await accessControlService.canAccessFeature(
        user, 
        organization, 
        feature
      );

      if (!accessCheck.allowed) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: accessCheck.reason,
          feature,
          upgrade: getUpgradeSuggestion(organization.subscriptionPlanId, feature)
        });
      }

      // Access granted, continue
      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to verify feature access' 
      });
    }
  };
};

/**
 * Middleware to check report access
 * 
 * @param {String} reportType - 'weekly' | 'monthly_hr' | 'monthly_leadership'
 * @returns {Function} Express middleware
 */
export const checkReportAccess = (reportType) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const organization = req.organization;

      if (!user || !organization) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Authentication required' 
        });
      }

      const accessCheck = await accessControlService.canAccessReport(
        user, 
        organization, 
        reportType
      );

      if (!accessCheck.allowed) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: accessCheck.reason,
          reportType
        });
      }

      next();
    } catch (error) {
      console.error('Report access check error:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to verify report access' 
      });
    }
  };
};

/**
 * Middleware to check AI mode access
 * 
 * @param {String} aiMode - 'tactical' | 'strategic'
 * @returns {Function} Express middleware
 */
export const checkAiAccess = (aiMode) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const organization = req.organization;

      if (!user || !organization) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Authentication required' 
        });
      }

      const accessCheck = await accessControlService.canUseAiMode(
        user, 
        organization, 
        aiMode
      );

      if (!accessCheck.allowed) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: accessCheck.reason,
          aiMode,
          upgrade: 'Upgrade to Leadership Intelligence plan for strategic AI recommendations'
        });
      }

      // Attach AI mode to request for downstream use
      req.aiMode = aiMode;
      next();
    } catch (error) {
      console.error('AI access check error:', error);
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to verify AI access' 
      });
    }
  };
};

/**
 * Middleware to check benchmark access
 */
export const checkBenchmarkAccess = async (req, res, next) => {
  try {
    const user = req.user;
    const organization = req.organization;

    if (!user || !organization) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      });
    }

    const accessCheck = await accessControlService.canAccessBenchmarks(
      user, 
      organization
    );

    if (!accessCheck.allowed) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Industry benchmarks require Leadership Intelligence plan or higher',
        currentPlan: organization.subscriptionPlanId
      });
    }

    next();
  } catch (error) {
    console.error('Benchmark access check error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Failed to verify benchmark access' 
    });
  }
};

/**
 * Middleware to attach accessible features to request
 * Useful for endpoints that need to filter results based on access
 */
export const attachAccessibleFeatures = async (req, res, next) => {
  try {
    const user = req.user;
    const organization = req.organization;

    if (user && organization) {
      const accessibleFeatures = await accessControlService.getAccessibleFeatures(
        user, 
        organization
      );
      req.accessibleFeatures = accessibleFeatures;
    } else {
      req.accessibleFeatures = [];
    }

    next();
  } catch (error) {
    console.error('Error attaching accessible features:', error);
    req.accessibleFeatures = [];
    next();
  }
};

/**
 * Helper to suggest upgrade path
 */
function getUpgradeSuggestion(currentPlanId, feature) {
  const suggestions = {
    'monthlyReportsLeadership': 'Upgrade to Leadership Intelligence (€199) to access executive reports',
    'aiStrategic': 'Upgrade to Leadership Intelligence (€199) for strategic AI recommendations',
    'industryBenchmarks': 'Upgrade to Leadership Intelligence (€199) to compare with industry peers',
    'orgComparisons': 'Upgrade to Leadership Intelligence (€199) for organizational comparisons',
    'customModels': 'Contact us for Organizational Intelligence (Custom) plan'
  };

  return suggestions[feature] || 'Upgrade your plan to access this feature';
}

export default {
  checkFeatureAccess,
  checkReportAccess,
  checkAiAccess,
  checkBenchmarkAccess,
  attachAccessibleFeatures
};
