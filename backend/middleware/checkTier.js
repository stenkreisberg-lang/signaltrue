/**
 * Pricing Tier Middleware
 * Enforces subscription tier access controls
 * Free tier: Signals visible only (no interventions, alerts, history, comparisons, export)
 * Detection tier: Interventions, alerts, 30-day history
 * Impact Proof tier: Full history (90 days), comparisons, export
 */

import Organization from '../models/organizationModel.js';

/**
 * Check if user's organization has required tier
 * @param {string} requiredTier - 'free', 'detection', or 'impact_proof'
 */
export function requireTier(requiredTier) {
  return async (req, res, next) => {
    try {
      const { orgId } = req.user;

      if (!orgId) {
        return res.status(403).json({ 
          message: 'Organization required',
          requiredTier,
          upgrade: true
        });
      }

      const org = await Organization.findById(orgId);
      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      const currentTier = org.subscription?.plan || 'free';
      
      // Tier hierarchy: impact_proof > detection > free
      const tierLevels = {
        free: 0,
        detection: 1,
        impact_proof: 2
      };

      const currentLevel = tierLevels[currentTier] || 0;
      const requiredLevel = tierLevels[requiredTier] || 0;

      if (currentLevel < requiredLevel) {
        return res.status(403).json({
          message: `This feature requires ${requiredTier.replace('_', ' ')} tier or higher`,
          currentTier,
          requiredTier,
          upgrade: true,
          upgradeUrl: '/pricing'
        });
      }

      // Attach tier info to request for downstream use
      req.tier = {
        current: currentTier,
        level: currentLevel
      };

      next();
    } catch (error) {
      console.error('[checkTier] Error:', error);
      res.status(500).json({ message: 'Failed to verify subscription tier' });
    }
  };
}

/**
 * Check if specific feature is enabled for user's tier
 */
export function checkFeatureAccess(feature) {
  return async (req, res, next) => {
    try {
      const { orgId } = req.user;
      
      const org = await Organization.findById(orgId);
      const currentTier = org?.subscription?.plan || 'free';

      // Feature access matrix
      const featureAccess = {
        signals: ['free', 'detection', 'impact_proof'],
        interventions: ['detection', 'impact_proof'],
        alerts: ['detection', 'impact_proof'],
        history_30_days: ['detection', 'impact_proof'],
        history_90_days: ['impact_proof'],
        comparisons: ['impact_proof'],
        export: ['impact_proof'],
        first_signal: ['free', 'detection', 'impact_proof'] // Always available
      };

      const allowedTiers = featureAccess[feature] || [];

      if (!allowedTiers.includes(currentTier)) {
        return res.status(403).json({
          message: `Feature '${feature}' not available on ${currentTier} tier`,
          currentTier,
          upgrade: true,
          upgradeUrl: '/pricing'
        });
      }

      next();
    } catch (error) {
      console.error('[checkFeatureAccess] Error:', error);
      res.status(500).json({ message: 'Failed to verify feature access' });
    }
  };
}

/**
 * Get tier limits for data retention
 */
export function getTierLimits(tier) {
  const limits = {
    free: {
      historyDays: 7,
      maxSignals: 5,
      interventions: false,
      alerts: false,
      comparisons: false,
      export: false
    },
    detection: {
      historyDays: 30,
      maxSignals: 10,
      interventions: true,
      alerts: true,
      comparisons: false,
      export: false
    },
    impact_proof: {
      historyDays: 90,
      maxSignals: 999,
      interventions: true,
      alerts: true,
      comparisons: true,
      export: true
    }
  };

  return limits[tier] || limits.free;
}

/**
 * Middleware to attach tier limits to request
 */
export async function attachTierLimits(req, res, next) {
  try {
    const { orgId } = req.user;
    
    const org = await Organization.findById(orgId);
    const currentTier = org?.subscription?.plan || 'free';
    
    req.tierLimits = getTierLimits(currentTier);
    req.currentTier = currentTier;
    
    next();
  } catch (error) {
    console.error('[attachTierLimits] Error:', error);
    // Don't block request, just set free tier defaults
    req.tierLimits = getTierLimits('free');
    req.currentTier = 'free';
    next();
  }
}
