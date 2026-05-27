/**
 * Engagement Strain Dashboard
 *
 * Executive org-level summary tile.
 * Displays every team's latest Engagement Strain Risk score in a scannable grid.
 *
 * Used on the Overview / Executive Summary page as an additive tile
 * alongside existing BDI, Capacity, and CLI cards.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useEngagementStrainSummary, TeamStrainSummary } from '../hooks/useEngagementStrain';

// ── Helpers ─────────────────────────────────────────────────────────────────────

const RISK_STATE_CONFIG = {
  healthy: {
    label: 'Healthy',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-400',
  },
  watch: {
    label: 'Watch',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    dot: 'bg-amber-400',
  },
  strain: {
    label: 'Strain',
    color: 'text-orange-700',
    bg: 'bg-orange-50 border-orange-200',
    dot: 'bg-orange-400',
  },
  critical: {
    label: 'Critical',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    dot: 'bg-red-400',
  },
};

const TREND_ICON = {
  rising: <TrendingUp className="w-4 h-4 text-red-400" aria-label="Rising" />,
  improving: <TrendingDown className="w-4 h-4 text-emerald-400" aria-label="Improving" />,
  stable: <Minus className="w-4 h-4 text-slate-400" aria-label="Stable" />,
};

function riskIcon(state: string) {
  if (state === 'critical') return <ShieldAlert className="w-4 h-4 text-red-400" />;
  if (state === 'strain') return <AlertCircle className="w-4 h-4 text-orange-400" />;
  if (state === 'watch') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  return <CheckCircle className="w-4 h-4 text-emerald-400" />;
}

function scoreBarColor(score: number) {
  if (score >= 70) return 'bg-red-500';
  if (score >= 50) return 'bg-orange-400';
  if (score >= 30) return 'bg-amber-400';
  return 'bg-emerald-500';
}

// ── Sub-components ──────────────────────────────────────────────────────────────

const TeamStrainRow: React.FC<{ team: TeamStrainSummary; onClick: () => void }> = ({
  team,
  onClick,
}) => {
  const cfg = RISK_STATE_CONFIG[team.riskState] ?? RISK_STATE_CONFIG.watch;
  const score = team.engagementStrainRisk ?? 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left group hover:bg-slate-50 rounded-lg p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Team name + risk state badge */}
        <div className="flex items-center gap-2 min-w-0">
          {riskIcon(team.riskState)}
          <span className="text-sm font-medium text-slate-900 truncate">
            {team.teamName ?? team.teamId}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} shrink-0`}
          >
            {cfg.label}
          </span>
        </div>

        {/* Score + trend */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <span className={`text-sm font-semibold tabular-nums ${cfg.color}`}>{score}</span>
            <span className="text-xs text-slate-500 ml-0.5">/100</span>
          </div>
          {TREND_ICON[team.trend] ?? TREND_ICON.stable}
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 transition-colors" />
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${scoreBarColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Top driver hint */}
      {team.topDrivers?.[0] && (
        <p className="mt-1.5 text-xs text-slate-500 truncate">
          Top driver: {formatDriverName(team.topDrivers[0].driver)}
          {team.topDrivers[0].score != null && ` (${team.topDrivers[0].score})`}
        </p>
      )}
    </button>
  );
};

const OrgSummaryBar: React.FC<{ teams: TeamStrainSummary[] }> = ({ teams }) => {
  if (!teams.length) return null;

  const counts = teams.reduce(
    (acc, t) => {
      acc[t.riskState] = (acc[t.riskState] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const critical = counts.critical ?? 0;
  const strain = counts.strain ?? 0;
  const watch = counts.watch ?? 0;
  const healthy = counts.healthy ?? 0;

  return (
    <div className="flex items-center gap-3 text-xs text-slate-600 mb-4">
      {critical > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          {critical} critical
        </span>
      )}
      {strain > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
          {strain} strain
        </span>
      )}
      {watch > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          {watch} watch
        </span>
      )}
      {healthy > 0 && (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          {healthy} healthy
        </span>
      )}
      <span className="ml-auto text-slate-500">{teams.length} teams total</span>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

interface EngagementStrainDashboardProps {
  /** Optional: pass orgId directly; falls back to localStorage */
  orgId?: string;
  /** Collapse to top-N teams only (show all button provided) */
  initialLimit?: number;
}

const EngagementStrainDashboard: React.FC<EngagementStrainDashboardProps> = ({
  orgId: orgIdProp,
  initialLimit = 5,
}) => {
  const orgId = orgIdProp ?? localStorage.getItem('orgId') ?? '';
  const navigate = useNavigate();
  const { teams, loading, error, refetch } = useEngagementStrainSummary(orgId);

  const [showAll, setShowAll] = useState(false);

  // Sort: critical → strain → watch → healthy, then by score desc within band
  const BAND_ORDER = { critical: 0, strain: 1, watch: 2, healthy: 3 };
  const sorted = [...teams].sort((a, b) => {
    const bandDiff = (BAND_ORDER[a.riskState] ?? 4) - (BAND_ORDER[b.riskState] ?? 4);
    if (bandDiff !== 0) return bandDiff;
    return (b.engagementStrainRisk ?? 0) - (a.engagementStrainRisk ?? 0);
  });

  const visible = showAll ? sorted : sorted.slice(0, initialLimit);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Engagement Strain Risk</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Passive work-pattern analysis, team metadata only
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="p-1.5 rounded hover:bg-slate-50 text-slate-500 hover:text-teal-700 transition-colors disabled:opacity-40"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-3">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && !teams.length && (
        <div className="mt-6 flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-slate-500" />
          <span className="ml-2 text-sm text-slate-500">Loading...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !teams.length && (
        <div className="mt-6 py-8 text-center text-sm text-slate-500">
          No engagement strain data yet.
          <br />
          <span className="text-xs">Run the weekly scoring job to generate the first report.</span>
        </div>
      )}

      {/* Team list */}
      {teams.length > 0 && (
        <>
          <div className="mt-4">
            <OrgSummaryBar teams={teams} />
          </div>
          <div className="space-y-1">
            {visible.map((team) => (
              <TeamStrainRow
                key={String(team.teamId)}
                team={team}
                onClick={() => navigate(`/app/engagement-strain/${team.teamId}`)}
              />
            ))}
          </div>

          {sorted.length > initialLimit && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 w-full text-xs text-slate-600 hover:text-teal-700 py-2 hover:bg-slate-50 rounded transition-colors"
            >
              {showAll ? 'Show fewer teams' : `Show all ${sorted.length} teams`}
            </button>
          )}

          <button
            onClick={() => navigate('/app/engagement-strain')}
            className="mt-3 w-full text-xs text-teal-700 hover:text-teal-800 py-2 border border-teal-200 hover:border-teal-300 rounded transition-colors"
          >
            View full engagement strain dashboard
          </button>
        </>
      )}
    </div>
  );
};

export default EngagementStrainDashboard;

// ── Utility ────────────────────────────────────────────────────────────────────

function formatDriverName(key: string): string {
  const labels: Record<string, string> = {
    recoveryDebt: 'Recovery Debt',
    focusErosion: 'Focus Erosion',
    coordinationFriction: 'Coordination Friction',
    responsivenessPressure: 'Responsiveness Pressure',
    collaborationWithdrawal: 'Collaboration Withdrawal',
    managerSupportGap: 'Manager Support Gap',
    workloadVolatility: 'Workload Volatility',
  };
  return labels[key] ?? key;
}
