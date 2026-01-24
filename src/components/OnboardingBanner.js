/**
 * OnboardingBanner - Day-based confidence messaging
 * Per SignalTrue Product Spec Section 4
 * 
 * Shows different banners based on days since org signup:
 * - Day 0-1: "Signal monitoring has started. Initial patterns will appear within 3–5 days."
 * - Day 2-3: "Early directional signals detected. These indicate trends, not conclusions."
 * - Day 4-7: "Signal confidence increasing. Patterns are stabilizing."
 * - Day 7+: "Signals are now stable enough to inform decisions."
 */

import React from 'react';

const CONFIDENCE_PHASES = {
  BASELINE_FORMING: {
    days: [0, 1],
    level: 'Baseline forming',
    banner: 'Signal monitoring has started. Initial patterns will appear within 3–5 days.',
    color: '#64748b',
    bgColor: '#f1f5f9',
    borderColor: '#cbd5e1'
  },
  LOW_CONFIDENCE: {
    days: [2, 3],
    level: 'Low confidence',
    banner: 'Early directional signals detected. These indicate trends, not conclusions.',
    color: '#0369a1',
    bgColor: '#e0f2fe',
    borderColor: '#7dd3fc'
  },
  MEDIUM_CONFIDENCE: {
    days: [4, 5, 6, 7],
    level: 'Medium confidence',
    banner: 'Signal confidence increasing. Patterns are stabilizing.',
    color: '#b45309',
    bgColor: '#fef3c7',
    borderColor: '#fcd34d'
  },
  HIGH_CONFIDENCE: {
    days: null, // 7+
    level: 'High confidence',
    banner: 'Signals are now stable enough to inform decisions.',
    color: '#15803d',
    bgColor: '#dcfce7',
    borderColor: '#86efac'
  }
};

function getConfidencePhase(daysSinceSignup) {
  if (daysSinceSignup <= 1) return CONFIDENCE_PHASES.BASELINE_FORMING;
  if (daysSinceSignup <= 3) return CONFIDENCE_PHASES.LOW_CONFIDENCE;
  if (daysSinceSignup <= 7) return CONFIDENCE_PHASES.MEDIUM_CONFIDENCE;
  return CONFIDENCE_PHASES.HIGH_CONFIDENCE;
}

export default function OnboardingBanner({ orgCreatedAt, calibrationDay }) {
  // Calculate days since signup
  let daysSinceSignup = calibrationDay;
  
  if (!daysSinceSignup && orgCreatedAt) {
    const created = new Date(orgCreatedAt);
    const now = new Date();
    daysSinceSignup = Math.floor((now - created) / (1000 * 60 * 60 * 24));
  }
  
  // Default to 0 if we can't determine
  if (daysSinceSignup === undefined || daysSinceSignup === null) {
    daysSinceSignup = 0;
  }

  const phase = getConfidencePhase(daysSinceSignup);

  return (
    <div style={{
      background: phase.bgColor,
      border: `1px solid ${phase.borderColor}`,
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: phase.color,
          animation: daysSinceSignup < 7 ? 'pulse 2s infinite' : 'none'
        }} />
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: phase.color,
          fontWeight: 500
        }}>
          {phase.banner}
        </p>
      </div>
      <span style={{
        fontSize: '12px',
        fontWeight: 600,
        color: phase.color,
        background: 'rgba(255,255,255,0.5)',
        padding: '4px 10px',
        borderRadius: '12px',
        whiteSpace: 'nowrap'
      }}>
        {phase.level}
      </span>
    </div>
  );
}

// Export the confidence levels for use in tooltips
export { CONFIDENCE_PHASES, getConfidencePhase };
