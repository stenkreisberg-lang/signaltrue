/**
 * Subscription Context
 * 
 * Provides subscription plan and feature access throughout the React app.
 * This enforces the power boundary at the UI level.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [accessibleFeatures, setAccessibleFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/subscriptions/current');
      
      setSubscription(response.data.current);
      setAccessibleFeatures(response.data.access.features);
      setError(null);
    } catch (err) {
      console.error('Error fetching subscription:', err);
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
  const hasFeature = (feature) => {
    return accessibleFeatures.includes(feature);
  };

  /**
   * Check if plan has a feature (regardless of role)
   * @param {string} feature - Feature key
   * @returns {boolean}
   */
  const planHasFeature = (feature) => {
    if (!subscription?.plan?.features) return false;
    return subscription.plan.features[feature] === true;
  };

  /**
   * Get plan name
   * @returns {string}
   */
  const getPlanName = () => {
    return subscription?.plan?.name || 'Free';
  };

  /**
   * Get plan ID
   * @returns {string}
   */
  const getPlanId = () => {
    return subscription?.planId || null;
  };

  /**
   * Check if user can upgrade to a plan
   * @param {string} targetPlanId
   * @returns {boolean}
   */
  const canUpgradeTo = (targetPlanId) => {
    const currentPlanId = getPlanId();
    const hierarchy = ['team', 'leadership', 'custom'];
    
    const currentIndex = hierarchy.indexOf(currentPlanId);
    const targetIndex = hierarchy.indexOf(targetPlanId);
    
    return targetIndex > currentIndex;
  };

  /**
   * Upgrade to a plan
   * @param {string} targetPlanId
   * @returns {Promise}
   */
  const upgrade = async (targetPlanId) => {
    try {
      const response = await axios.put('/api/subscriptions/upgrade', {
        targetPlanId
      });
      
      // Refresh subscription data
      await fetchSubscription();
      
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Upgrade failed');
    }
  };

  /**
   * Downgrade to a plan
   * @param {string} targetPlanId
   * @returns {Promise}
   */
  const downgrade = async (targetPlanId) => {
    try {
      const response = await axios.put('/api/subscriptions/downgrade', {
        targetPlanId
      });
      
      // Refresh subscription data
      await fetchSubscription();
      
      return response.data;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Downgrade failed');
    }
  };

  /**
   * Get upgrade suggestion for a locked feature
   * @param {string} feature
   * @returns {string}
   */
  const getUpgradeSuggestion = (feature) => {
    const suggestions = {
      monthlyReportsLeadership: 'Upgrade to Leadership Intelligence (€199) to access executive reports',
      aiStrategic: 'Upgrade to Leadership Intelligence (€199) for strategic AI recommendations',
      industryBenchmarks: 'Upgrade to Leadership Intelligence (€199) to compare with industry peers',
      orgComparisons: 'Upgrade to Leadership Intelligence (€199) for organizational comparisons',
      customModels: 'Contact us for Organizational Intelligence (Custom) plan'
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
    refresh: fetchSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export default SubscriptionContext;
