/**
 * Engagement Strain Team Detail Page
 *
 * Full team-level view of the Engagement Strain Risk system.
 * Displays:
 *   - Overall score gauge with risk state + trend
 *   - 7 subscore breakdown bars
 *   - Top drivers list
 *   - Detected patterns (with evidence)
 *   - Recommended actions (sorted by priority)
 *   - 12-week trend sparkline
 *   - Active alerts panel
 *   - Confidence indicator
 *
 * Route: /app/engagement-strain/:teamId
 * Also renders without a teamId as the org-level listing (/app/engagement-strain).
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  ChevronLeft,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Eye,
  BookOpen,
} from 'lucide-react';
import {
  useEngagementStrainSummary,
  useEngagementStrainTeamDetail,
  useEngagementStrainHistory,
  Subscores,
  TeamStrainSummary,
  Pattern,
  RecommendedAction,
  Alert,
} from '../../hooks/useEngagementStrain';

// ── Constants ──────────────────────────────────────────────────────────────────

const RISK_STATE = {
  healthy: {
    label: 'Healthy',
    color: 'text-emerald-400',
    border: 'border-emerald-700',
    bg: 'bg-emerald-900/30',
  },
  watch: {
    label: 'Watch',
    color: 'text-amber-400',
    border: 'border-amber-700',
    bg: 'bg-amber-900/30',
  },
  strain: {
    label: 'Strain',
    color: 'text-orange-400',
    border: 'border-orange-700',
    bg: 'bg-orange-900/30',
  },
  critical: {
    label: 'Critical',
    color: 'text-red-400',
    border: 'border-red-700',
    bg: 'bg-red-900/30',
  },
};

const SUBSCORE_META: { key: keyof Subscores; label: string; description: string }[] = [
  {
    key: 'recoveryDebt',
    label: 'Recovery Debt',
    description: 'After-hours & weekend activity, recovery gap violations',
  },
  {
    key: 'focusErosion',
    label: 'Focus Erosion',
    description: 'Focus hours available, fragmented days, back-to-back meetings',
  },
  {
    key: 'coordinationFriction',
    label: 'Coordination Friction',
    description: 'Attendee-hours, recurring meeting load, meeting size',
  },
  {
    key: 'responsivenessPressure',
    label: 'Responsiveness Pressure',
    description: 'Response latency, after-hours messaging, message volume',
  },
  {
    key: 'collaborationWithdrawal',
    label: 'Collaboration Withdrawal',
    description: 'Unique collaborators, reciprocity ratio, public channel activity',
  },
  {
    key: 'managerSupportGap',
    label: 'Manager Support Gap',
    description: 'Manager 1:1 time, 1:1 cancellations, manager response latency',
  },
  {
    key: 'workloadVolatility',
    label: 'Workload Volatility',
    description: 'Week-over-week load changes, activity spikes, new recurring meetings',
  },
];

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'text-red-400', bg: 'bg-red-900/30 border-red-700' },
  high: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-900/30 border-orange-700' },
  medium: { label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-900/30 border-amber-700' },
};

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-900/30 border-red-700' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-900/30 border-amber-700' },
  info: { color: 'text-blue-400', bg: 'bg-blue-900/30 border-blue-700' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreBarColor(score: number) {
  if (score >= 70) return 'bg-red-500';
  if (score >= 50) return 'bg-orange-400';
  if (score >= 30) return 'bg-amber-400';
  return 'bg-emerald-500';
}

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Sub-components ──────────────────────────────────────────────────────────────

const ScoreGauge: React.FC<{
  score: number;
  riskState: string;
  trend: string;
  confidenceLabel: string;
  confidenceScore: number;
}> = ({ score, riskState, trend, confidenceLabel, confidenceScore }) => {
  const cfg = RISK_STATE[riskState as keyof typeof RISK_STATE] ?? RISK_STATE.watch;

  const TrendIcon = trend === 'rising' ? TrendingUp : trend === 'improving' ? TrendingDown : Minus;
  const trendColor =
    trend === 'rising'
      ? 'text-red-400'
      : trend === 'improving'
        ? 'text-emerald-400'
        : 'text-slate-400';

  return (
    <div className={`rounded-lg border p-6 ${cfg.border} ${cfg.bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
            Engagement Strain Risk
          </p>
          <div className="flex items-end gap-3">
            <span className={`text-5xl font-bold tabular-nums ${cfg.color}`}>{score}</span>
            <span className="text-slate-500 text-lg mb-1">/100</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`text-sm font-medium px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}
            >
              {cfg.label}
            </span>
            <span className={`flex items-center gap-1 text-sm ${trendColor}`}>
              <TrendIcon className="w-4 h-4" />
              {trend}
            </span>
          </div>
        </div>

        {/* Score ring visual */}
        <div className="relative w-20 h-20">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <path
              className="stroke-slate-700"
              fill="none"
              strokeWidth="3"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={
                score >= 70
                  ? 'stroke-red-500'
                  : score >= 50
                    ? 'stroke-orange-400'
                    : score >= 30
                      ? 'stroke-amber-400'
                      : 'stroke-emerald-500'
              }
              fill="none"
              strokeWidth="3"
              strokeDasharray={`${score}, 100`}
              strokeLinecap="round"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
        </div>
      </div>

      {/* Conditions score (inverse) */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Engagement Conditions Score</span>
          <span className="text-emerald-400 font-medium">{100 - score}/100</span>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Confidence: {confidenceLabel}</span>
          <span>{confidenceScore}/100</span>
        </div>
      </div>
    </div>
  );
};

const SubscoreBar: React.FC<{ label: string; score: number; description: string }> = ({
  label,
  score,
  description,
}) => (
  <div className="group">
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm text-slate-300">{label}</span>
      <span
        className={`text-sm font-semibold tabular-nums ${score >= 70 ? 'text-red-400' : score >= 50 ? 'text-orange-400' : score >= 30 ? 'text-amber-400' : 'text-emerald-400'}`}
      >
        {score}
      </span>
    </div>
    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${scoreBarColor(score)}`}
        style={{ width: `${score}%` }}
      />
    </div>
    <p className="text-xs text-slate-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {description}
    </p>
  </div>
);

const PatternCard: React.FC<{ pattern: Pattern }> = ({ pattern }) => {
  const [expanded, setExpanded] = useState(false);
  const severityColor =
    pattern.severity === 'high'
      ? 'text-red-400 border-red-700 bg-red-900/20'
      : pattern.severity === 'medium'
        ? 'text-orange-400 border-orange-700 bg-orange-900/20'
        : 'text-amber-400 border-amber-700 bg-amber-900/20';

  return (
    <div className={`rounded-lg border p-4 ${severityColor}`}>
      <button
        className="w-full text-left flex items-start justify-between gap-2"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">{pattern.title}</p>
            <p className="text-xs opacity-70 mt-0.5">{pattern.severity} severity</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 shrink-0 mt-0.5 opacity-60" />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0 mt-0.5 opacity-60" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          <p className="text-xs opacity-80">{pattern.interpretation}</p>
          {pattern.evidence.length > 0 && (
            <ul className="space-y-1">
              {pattern.evidence.map((ev, i) => (
                <li key={i} className="text-xs opacity-70 flex gap-2">
                  <span className="shrink-0">·</span>
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const ActionCard: React.FC<{ action: RecommendedAction }> = ({ action }) => {
  const cfg = PRIORITY_CONFIG[action.priority] ?? PRIORITY_CONFIG.medium;
  return (
    <div className={`rounded-lg border p-4 ${cfg.bg}`}>
      <div className="flex items-start gap-3">
        <Zap className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-100">{action.title}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{action.description}</p>
          <p className="text-xs text-slate-600 mt-1 italic">{action.trigger}</p>
        </div>
      </div>
    </div>
  );
};

const AlertBanner: React.FC<{ alert: Alert }> = ({ alert }) => {
  const cfg =
    SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.info;
  return (
    <div className={`rounded-lg border p-3 ${cfg.bg}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.color}`} />
        <div>
          <p className={`text-sm font-medium ${cfg.color}`}>{alert.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{alert.message}</p>
        </div>
      </div>
    </div>
  );
};

const TrendSparkline: React.FC<{
  history: { weekStart: string; engagementStrainRisk: number; riskState: string }[];
}> = ({ history }) => {
  if (history.length < 2) return null;

  const max = 100;
  const width = 300;
  const height = 60;
  const pad = 4;

  const points = history.map((w, i) => {
    const x = pad + (i / (history.length - 1)) * (width - pad * 2);
    const y = pad + ((max - w.engagementStrainRisk) / max) * (height - pad * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">12-week trend</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        {/* Risk bands */}
        <rect
          x="0"
          y={pad}
          width={width}
          height={(30 / max) * (height - pad * 2)}
          fill="rgba(34,197,94,0.05)"
        />
        <rect
          x="0"
          y={pad + (30 / max) * (height - pad * 2)}
          width={width}
          height={(20 / max) * (height - pad * 2)}
          fill="rgba(245,158,11,0.05)"
        />
        <rect
          x="0"
          y={pad + (50 / max) * (height - pad * 2)}
          width={width}
          height={(20 / max) * (height - pad * 2)}
          fill="rgba(249,115,22,0.05)"
        />
        <rect
          x="0"
          y={pad + (70 / max) * (height - pad * 2)}
          width={width}
          height={(30 / max) * (height - pad * 2)}
          fill="rgba(239,68,68,0.05)"
        />
        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#6366f1"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Dots */}
        {history.map((w, i) => {
          const [x, y] = points[i].split(',').map(Number);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2.5"
              fill={
                w.engagementStrainRisk >= 70
                  ? '#ef4444'
                  : w.engagementStrainRisk >= 50
                    ? '#f97316'
                    : w.engagementStrainRisk >= 30
                      ? '#f59e0b'
                      : '#22c55e'
              }
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-slate-600 mt-1">
        <span>{formatDate(history[0].weekStart)}</span>
        <span>{formatDate(history[history.length - 1].weekStart)}</span>
      </div>
    </div>
  );
};

// ── Org-level listing (no teamId) ──────────────────────────────────────────────

const OrgStrainListing: React.FC = () => {
  const orgId = localStorage.getItem('orgId') ?? '';
  const navigate = useNavigate();
  const { teams, loading, error, refetch } = useEngagementStrainSummary(orgId);

  const BAND_ORDER = { critical: 0, strain: 1, watch: 2, healthy: 3 };
  const sorted = [...teams].sort((a, b) => {
    const d =
      (BAND_ORDER[a.riskState as keyof typeof BAND_ORDER] ?? 4) -
      (BAND_ORDER[b.riskState as keyof typeof BAND_ORDER] ?? 4);
    return d !== 0 ? d : (b.engagementStrainRisk ?? 0) - (a.engagementStrainRisk ?? 0);
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Engagement Strain Risk</h1>
            <p className="text-sm text-slate-400 mt-1">All teams · passive work-pattern analysis</p>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded p-3 mb-4">
            {error}
          </div>
        )}

        {loading && !teams.length && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-500" />
            <span className="ml-2 text-sm text-slate-500">Loading...</span>
          </div>
        )}

        {!loading && !error && !teams.length && (
          <div className="py-16 text-center text-sm text-slate-500">
            No engagement strain data yet. Run the weekly scoring job to generate reports.
          </div>
        )}

        <div className="space-y-3">
          {sorted.map((team: TeamStrainSummary) => {
            const cfg = RISK_STATE[team.riskState as keyof typeof RISK_STATE] ?? RISK_STATE.watch;
            return (
              <button
                key={String(team.teamId)}
                onClick={() => navigate(`/app/engagement-strain/${team.teamId}`)}
                className="w-full text-left bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg p-4 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${team.riskState === 'critical' ? 'bg-red-500' : team.riskState === 'strain' ? 'bg-orange-400' : team.riskState === 'watch' ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    />
                    <span className="font-medium text-slate-100 truncate">
                      {team.teamName ?? team.teamId}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color} shrink-0`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-lg font-bold tabular-nums ${cfg.color}`}>
                      {team.engagementStrainRisk}
                    </span>
                    <ChevronLeft className="w-4 h-4 text-slate-600 group-hover:text-slate-400 rotate-180 transition-colors" />
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${scoreBarColor(team.engagementStrainRisk)}`}
                    style={{ width: `${team.engagementStrainRisk}%` }}
                  />
                </div>
                {team.topDrivers?.[0] && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Top driver: {formatDriverName(team.topDrivers[0].driver)}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Main: Team Detail ──────────────────────────────────────────────────────────

const EngagementStrainTeamDetail: React.FC = () => {
  const { teamId } = useParams<{ teamId?: string }>();
  const navigate = useNavigate();

  const { detail, loading, error, refetch } = useEngagementStrainTeamDetail(teamId ?? '');
  const { history } = useEngagementStrainHistory(teamId ?? '', 12);

  if (!teamId) return <OrgStrainListing />;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
        <span className="ml-3 text-slate-400">Loading engagement strain data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded p-4">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-2xl mx-auto text-center text-slate-500 py-16">
          No data available for this team.
        </div>
      </div>
    );
  }

  const urgentActions = detail.recommendedActions.filter((a) => a.priority === 'urgent');
  const regularActions = detail.recommendedActions.filter((a) => a.priority !== 'urgent');
  const criticalAlerts = detail.alerts.filter((a) => a.severity === 'critical');
  const otherAlerts = detail.alerts.filter((a) => a.severity !== 'critical');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back nav */}
        <button
          onClick={() => navigate('/app/engagement-strain')}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          All teams
        </button>

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">{detail.teamName ?? teamId}</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Week of {formatDate(detail.weekStart)} · {detail.activePeopleCount} active people
            </p>
          </div>
          <button
            onClick={refetch}
            className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Critical alerts at top */}
        {criticalAlerts.length > 0 && (
          <div className="space-y-2">
            {criticalAlerts.map((a, i) => (
              <AlertBanner key={i} alert={a} />
            ))}
          </div>
        )}

        {/* Urgent actions */}
        {urgentActions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Urgent Actions Required
            </p>
            {urgentActions.map((a) => (
              <ActionCard key={a.actionId} action={a} />
            ))}
          </div>
        )}

        {/* Score gauge + sparkline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScoreGauge
            score={detail.engagementStrainRisk}
            riskState={detail.riskState}
            trend={detail.trend}
            confidenceLabel={detail.confidenceLabel}
            confidenceScore={detail.confidenceScore}
          />
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 flex flex-col justify-center">
            <TrendSparkline history={history} />
          </div>
        </div>

        {/* Subscores */}
        {detail.subscores && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Subscore Breakdown
            </h2>
            <div className="space-y-4">
              {SUBSCORE_META.map(({ key, label, description }) => (
                <SubscoreBar
                  key={key}
                  label={label}
                  score={detail.subscores[key] ?? 0}
                  description={description}
                />
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-4">
              Hover a bar to see what metrics contribute to each dimension.
            </p>
          </div>
        )}

        {/* Top drivers */}
        {detail.topDrivers?.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-5">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Top Risk Drivers
            </h2>
            <div className="space-y-3">
              {detail.topDrivers.map((d, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-xs text-slate-600 font-mono tabular-nums pt-0.5 w-4 shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-200">{formatDriverName(d.driver)}</span>
                      <span
                        className={`text-xs font-semibold tabular-nums ${d.score >= 70 ? 'text-red-400' : d.score >= 50 ? 'text-orange-400' : 'text-amber-400'}`}
                      >
                        {d.score}
                      </span>
                      {d.changeVsBaseline != null && (
                        <span
                          className={`text-xs ${d.changeVsBaseline > 0 ? 'text-red-400' : 'text-emerald-400'}`}
                        >
                          {d.changeVsBaseline > 0 ? '+' : ''}
                          {d.changeVsBaseline.toFixed(1)} vs baseline
                        </span>
                      )}
                    </div>
                    {d.explanation && (
                      <p className="text-xs text-slate-500 mt-0.5">{d.explanation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detected patterns */}
        {detail.patterns?.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Detected Patterns
            </h2>
            {detail.patterns.map((p, i) => (
              <PatternCard key={i} pattern={p} />
            ))}
          </div>
        )}

        {/* Recommended actions */}
        {regularActions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Recommended Actions
            </h2>
            {regularActions.map((a) => (
              <ActionCard key={a.actionId} action={a} />
            ))}
          </div>
        )}

        {/* Other alerts */}
        {otherAlerts.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Active Alerts
            </h2>
            {otherAlerts.map((a, i) => (
              <AlertBanner key={i} alert={a} />
            ))}
          </div>
        )}

        {/* Privacy footer */}
        <div className="border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-600 text-center">
            All insights are derived from team-aggregate metadata only. No individual is identified,
            scored, or monitored. Minimum team size: 8. Per-metric minimum contributors: 5.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EngagementStrainTeamDetail;
