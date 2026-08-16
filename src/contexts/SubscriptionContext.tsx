/**
 * Subscription Context
 *
 * Provides subscription plan and feature access throughout the React app.
 * This enforces the power boundary at the UI level.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';

interface SubscriptionPlan {
  planId: string;
  name: string;
  priceEUR: number | null;
  features: {
    [key: string]: boolean;
  };
}

interface SubscriptionData {
  planId: string;
  plan: SubscriptionPlan;
  customFeatures?: { [key: string]: boolean };
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  accessibleFeatures: string[];
  loading: boolean;
  error: string | null;
  hasFeature: (feature: string) => boolean;
  planHasFeature: (feature: string) => boolean;
  getPlanName: () => string;
  getPlanId: () => string | null;
  canUpgradeTo: (targetPlanId: string) => boolean;
  upgrade: (targetPlanId: string) => Promise<any>;
  downgrade: (targetPlanId: string) => Promise<any>;
  getUpgradeSuggestion: (feature: string) => string;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [accessibleFeatures, setAccessibleFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSubscription(null);
      setAccessibleFeatures([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/subscriptions/current');
      setSubscription(response.data?.current || null);
      setAccessibleFeatures(
        Array.isArray(response.data?.access?.features) ? response.data.access.features : []
      );
      setError(null);
    } catch (err: any) {
      if (err.response?.status !== 401) {
        console.error('Error fetching subscription:', err);
      }
      setSubscription(null);
      setAccessibleFeatures([]);
      setError(err.response?.data?.message || 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if a feature is accessible
   * @param {string} feature - Feature key (e.g., 'weeklyReports')
   * @returns {boolean}
   */
  const hasFeature = (feature: string): boolean => {
    return accessibleFeatures.includes(feature);
  };

  /**
   * Check if plan has a feature (regardless of role)
   * @param {string} feature - Feature key
   * @returns {boolean}
   */
  const planHasFeature = (feature: string): boolean => {
    if (!subscription?.plan?.features) return false;
    return subscription.plan.features[feature] === true;
  };

  /**
   * Get plan name
   * @returns {string}
   */
  const getPlanName = (): string => {
    return subscription?.plan?.name || 'Free';
  };

  /**
   * Get plan ID
   * @returns {string}
   */
  const getPlanId = (): string | null => {
    return subscription?.planId || null;
  };

  /**
   * Check if user can upgrade to a plan
   * @param {string} targetPlanId
   * @returns {boolean}
   */
  const canUpgradeTo = (targetPlanId: string): boolean => {
    const currentPlanId = getPlanId();
    const hierarchy = ['team', 'leadership', 'custom'];

    const currentIndex = hierarchy.indexOf(currentPlanId || '');
    const targetIndex = hierarchy.indexOf(targetPlanId);

    return targetIndex > currentIndex;
  };

  /**
   * Upgrade to a plan
   * @param {string} targetPlanId
   * @returns {Promise}
   */
  const upgrade = async (targetPlanId: string): Promise<any> => {
    try {
      const response = await api.put('/subscriptions/upgrade', {
        targetPlanId,
      });

      // Refresh subscription data
      await fetchSubscription();

      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Upgrade failed');
    }
  };

  /**
   * Downgrade to a plan
   * @param {string} targetPlanId
   * @returns {Promise}
   */
  const downgrade = async (targetPlanId: string): Promise<any> => {
    try {
      const response = await api.put('/subscriptions/downgrade', {
        targetPlanId,
      });

      // Refresh subscription data
      await fetchSubscription();

      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Downgrade failed');
    }
  };

  /**
   * Get upgrade suggestion for a locked feature
   * @param {string} feature
   * @returns {string}
   */
  const getUpgradeSuggestion = (feature: string): string => {
    const suggestions: { [key: string]: string } = {
      monthlyReportsLeadership:
        'Upgrade to Leadership Intelligence (€499) to access executive reports',
      aiStrategic: 'Upgrade to Leadership Intelligence (€499) for strategic AI recommendations',
      industryBenchmarks:
        'Upgrade to Leadership Intelligence (€499) to compare with industry peers',
      orgComparisons: 'Upgrade to Leadership Intelligence (€499) for organizational comparisons',
      customModels: 'Contact us for Organizational Intelligence (Custom) plan',
    };

    return suggestions[feature] || 'Upgrade your plan to access this feature';
  };

  const value = {
    subscription,
    accessibleFeatures,
    loading,
    error,
    hasFeature,
    planHasFeature,
    getPlanName,
    getPlanId,
    canUpgradeTo,
    upgrade,
    downgrade,
    getUpgradeSuggestion,
    refresh: fetchSubscription,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export default SubscriptionContext;
