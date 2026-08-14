/**
 * OnboardingBanner - Day-based confidence messaging
 * Per SignalTrue Product Spec Section 4
 *
 * Shows setup blockers first, then baseline confidence once reporting inputs are ready.
 */

import React from 'react';
import { Link } from 'react-router-dom';

const CONFIDENCE_PHASES = {
  BASELINE_FORMING: {
    days: [0, 1],
    level: 'Baseline forming',
    banner: 'Data is flowing. A trustworthy organization baseline requires up to 30 days.',
    color: '#64748b',
    bgColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  LOW_CONFIDENCE: {
    days: [2, 3],
    level: 'Low confidence',
    banner: 'Baseline evidence is accumulating. Early values are descriptive, not conclusions.',
    color: '#0369a1',
    bgColor: '#e0f2fe',
    borderColor: '#7dd3fc',
  },
  MEDIUM_CONFIDENCE: {
    days: [4, 5, 6, 7],
    level: 'Medium confidence',
    banner: 'Baseline confidence is increasing as measured activity accumulates.',
    color: '#b45309',
    bgColor: '#fef3c7',
    borderColor: '#fcd34d',
  },
  HIGH_CONFIDENCE: {
    days: null, // 7+
    level: 'High confidence',
    banner: 'The 30-day baseline is ready for evidence-backed review.',
    color: '#15803d',
    bgColor: '#dcfce7',
    borderColor: '#86efac',
  },
};

function getConfidencePhase(daysSinceSignup) {
  if (daysSinceSignup <= 1) return CONFIDENCE_PHASES.BASELINE_FORMING;
  if (daysSinceSignup <= 3) return CONFIDENCE_PHASES.LOW_CONFIDENCE;
  if (daysSinceSignup <= 7) return CONFIDENCE_PHASES.MEDIUM_CONFIDENCE;
  return CONFIDENCE_PHASES.HIGH_CONFIDENCE;
}

const SETUP_MESSAGES = {
  connect_sources: {
    level: 'Connection required',
    banner: 'Connect a metadata source before onboarding can continue.',
    to: '/integrations',
    action: 'Connect sources',
  },
  grant_admin_access: {
    level: 'Administrator required',
    banner: 'The source is connected, but company-wide administrator consent is still required.',
    to: '/integrations',
    action: 'Review access',
  },
  sync_directory: {
    level: 'Directory required',
    banner: 'Authorization is ready. Sync the employee directory before building teams.',
    to: '/app/employees',
    action: 'Open Team Setup',
  },
  confirm_timezone: {
    level: 'Timezone required',
    banner: 'Confirm working timezone and hours so after-hours activity is classified correctly.',
    to: '/app/employees',
    action: 'Confirm assumptions',
  },
  assign_teams: {
    level: 'Team setup required',
    banner: 'Assign enough directory employees to named teams before reporting begins.',
    to: '/app/employees',
    action: 'Assign teams',
  },
  waiting_for_activity: {
    level: 'Waiting for activity',
    banner: 'Authorization and directory setup are ready. No activity events have arrived yet.',
    to: '/app/signal-coverage',
    action: 'Check coverage',
  },
  map_activity: {
    level: 'Mapping required',
    banner: 'Activity is arriving, but too little is mapped to employees and teams for reporting.',
    to: '/app/signal-coverage',
    action: 'Review mapping',
  },
  build_team_coverage: {
    level: 'Coverage forming',
    banner: 'Activity is mapped, but no privacy-eligible team has enough measured coverage yet.',
    to: '/app/signal-coverage',
    action: 'Review coverage',
  },
};

export default function OnboardingBanner({ orgCreatedAt, calibrationDay, setup }) {
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

  const setupMessage = setup?.readiness?.setupComplete
    ? null
    : SETUP_MESSAGES[setup?.readiness?.nextStep];
  const phase = setupMessage
    ? {
        ...setupMessage,
        color: '#b45309',
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
      }
    : getConfidencePhase(daysSinceSignup);

  return (
    <div
      style={{
        background: phase.bgColor,
        border: `1px solid ${phase.borderColor}`,
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: phase.color,
            animation: daysSinceSignup < 7 ? 'pulse 2s infinite' : 'none',
          }}
        />
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: phase.color,
            fontWeight: 500,
          }}
        >
          {phase.banner}
        </p>
        {phase.to && (
          <Link to={phase.to} style={{ color: phase.color, fontSize: '13px', fontWeight: 700 }}>
            {phase.action}
          </Link>
        )}
      </div>
      <span
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: phase.color,
          background: 'rgba(255,255,255,0.5)',
          padding: '4px 10px',
          borderRadius: '12px',
          whiteSpace: 'nowrap',
        }}
      >
        {phase.level}
      </span>
    </div>
  );
}

// Export the confidence levels for use in tooltips
export { CONFIDENCE_PHASES, getConfidencePhase };
