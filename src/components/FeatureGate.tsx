/**
 * Feature Gate Component
 * 
 * Conditionally renders components based on subscription tier.
 * BLOCKS rendering entirely - no greyed-out content.
 * 
 * This enforces the power boundary at the UI level.
 */

import React, { ReactNode } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
}

/**
 * FeatureGate - Conditionally render based on feature access
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  feature, 
  children, 
  fallback = null,
  showUpgrade = false 
}) => {
  const { hasFeature, loading, getUpgradeSuggestion } = useSubscription();

  if (loading) {
    return null; // Don't show anything while loading
  }

  const hasAccess = hasFeature(feature);

  if (!hasAccess) {
    if (showUpgrade) {
      return (
        <div className="feature-gate-upgrade">
          <div className="upgrade-prompt">
            <h3>🔒 Feature Locked</h3>
            <p>{getUpgradeSuggestion(feature)}</p>
            <button 
              className="btn-upgrade"
              onClick={() => window.location.href = '/settings/subscription'}
            >
              View Plans
            </button>
          </div>
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

interface PlanGateProps {
  requiredPlan: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * PlanGate - Conditionally render based on plan tier
 */
export const PlanGate: React.FC<PlanGateProps> = ({ 
  requiredPlan, 
  children, 
  fallback = null 
}) => {
  const { getPlanId, loading } = useSubscription();

  if (loading) {
    return null;
  }

  const currentPlanId = getPlanId();
  const planHierarchy = ['team', 'leadership', 'custom'];
  
  const currentIndex = planHierarchy.indexOf(currentPlanId || '');
  const requiredIndex = planHierarchy.indexOf(requiredPlan);

  const hasAccess = currentIndex >= requiredIndex;

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

interface RoleGateProps {
  allowedRoles: string | string[];
  children: ReactNode;
}

/**
 * RoleGate - Conditionally render based on user role
 * Uses AuthContext if available
 */
export const RoleGate: React.FC<RoleGateProps> = ({ allowedRoles, children }) => {
  // This would need to integrate with your existing AuthContext
  // For now, placeholder implementation
  
  // TODO: Integrate with actual auth context
  // const { user } = useAuth();
  // const userRole = user?.role;
  
  // const allowed = Array.isArray(allowedRoles) 
  //   ? allowedRoles.includes(userRole)
  //   : allowedRoles === userRole;

  // return allowed ? <>{children}</> : null;
  
  return <>{children}</>;
};

interface UpgradePromptProps {
  feature: string;
  title?: string;
}

/**
 * UpgradePrompt - Standalone upgrade suggestion component
 */
export const UpgradePrompt: React.FC<UpgradePromptProps> = ({ feature, title }) => {
  const { getUpgradeSuggestion, getPlanName } = useSubscription();

  return (
    <div className="upgrade-prompt-card">
      <div className="upgrade-icon">🔒</div>
      <h3>{title || 'Upgrade Required'}</h3>
      <p className="current-plan">Current Plan: {getPlanName()}</p>
      <p className="upgrade-message">{getUpgradeSuggestion(feature)}</p>
      <div className="upgrade-actions">
        <button 
          className="btn-primary"
          onClick={() => window.location.href = '/settings/subscription'}
        >
          View Plans
        </button>
        <button 
          className="btn-secondary"
          onClick={() => window.open('mailto:sales@signaltrue.com', '_blank')}
        >
          Contact Sales
        </button>
      </div>
    </div>
  );
};

interface Feature {
  key: string;
  name: string;
}

interface FeatureListProps {
  features: Feature[];
}

/**
 * FeatureList - Show available and locked features
 */
export const FeatureList: React.FC<FeatureListProps> = ({ features }) => {
  const { hasFeature, planHasFeature } = useSubscription();

  return (
    <div className="feature-list">
      {features.map(feature => {
        const accessible = hasFeature(feature.key);
        const inPlan = planHasFeature(feature.key);

        return (
          <div 
            key={feature.key} 
            className={`feature-item ${accessible ? 'accessible' : 'locked'}`}
          >
            <span className="feature-icon">
              {accessible ? '✓' : '🔒'}
            </span>
            <span className="feature-name">{feature.name}</span>
            {inPlan && !accessible && (
              <span className="feature-note">
                (Available to other roles in your plan)
              </span>
            )}
            {!inPlan && (
              <span className="feature-upgrade">
                (Upgrade required)
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FeatureGate;
