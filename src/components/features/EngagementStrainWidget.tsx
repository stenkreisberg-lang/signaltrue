import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Driver {
  driver: string;
  score: number;
  changeVsBaseline?: string;
  explanation?: string;
}

interface TeamEngagementData {
  teamId: string;
  teamName: string | null;
  weekStart: string;
  engagementStrainRisk: number;
  riskState: 'healthy' | 'watch' | 'strain' | 'critical';
  trend: 'rising' | 'improving' | 'stable';
  confidenceScore: number;
  confidenceLabel: 'low' | 'moderate' | 'high' | null;
  activePeopleCount: number;
  topDrivers: Driver[];
}

interface SummaryResponse {
  orgId: string;
  teams: TeamEngagementData[];
}

interface EngagementStrainWidgetProps {
  orgId: string;
  teamId?: string; // if provided, show single-team view
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const DRIVER_LABELS: Record<string, string> = {
  recovery_debt: 'Outside-schedule activity',
  focus_erosion: 'Focus availability',
  coordination_friction: 'Coordination metadata',
  responsiveness_pressure: 'Response patterns',
  collaboration_withdrawal: 'Collaboration metadata',
  manager_support_gap: 'Recorded 1:1 time',
  workload_volatility: 'Week-to-week activity',
};

function riskColor(state: string): string {
  switch (state) {
    case 'critical':
      return '#ef4444';
    case 'strain':
      return '#f97316';
    case 'watch':
      return '#f59e0b';
    default:
      return '#10b981';
  }
}

function riskLabel(state: string): string {
  switch (state) {
    case 'critical':
      return 'Strong deviation';
    case 'strain':
      return 'Elevated deviation';
    case 'watch':
      return 'Moderate deviation';
    default:
      return 'Within baseline';
  }
}

function trendIcon(trend: string): string {
  switch (trend) {
    case 'rising':
      return '📈';
    case 'improving':
      return '📉';
    default:
      return '➡️';
  }
}

function trendLabel(trend: string): string {
  switch (trend) {
    case 'rising':
      return 'Deviation rising';
    case 'improving':
      return 'Improving';
    default:
      return 'Stable';
  }
}

function trendColor(trend: string): string {
  switch (trend) {
    case 'rising':
      return '#ef4444';
    case 'improving':
      return '#10b981';
    default:
      return '#6b7280';
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export const EngagementStrainWidget: React.FC<EngagementStrainWidgetProps> = ({
  orgId,
  teamId,
}) => {
  const [data, setData] = useState<TeamEngagementData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showExplainer, setShowExplainer] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await api.get<SummaryResponse>(`/engagement-strain/summary/${orgId}`);
        const teams = res.data?.teams ?? [];
        // If a specific team is requested, filter down
        setData(teamId ? teams.filter((t) => t.teamId === teamId) : teams);
        setError(null);
      } catch (err: unknown) {
        const apiError = err as { response?: { status?: number }; message?: string };
        setError(
          apiError.response?.status === 404
            ? null
            : apiError.message || 'Failed to load engagement data'
        );
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [orgId, teamId]);

  // ── Loading / error / empty states ──────────────────────────────────────────

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <span style={styles.headerIcon}>🧠</span>
          <h3 style={styles.headerTitle}>Work-pattern deviation</h3>
        </div>
        <p style={styles.muted}>Analysing team work-pattern changes…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <span style={styles.headerIcon}>🧠</span>
          <h3 style={styles.headerTitle}>Work-pattern deviation</h3>
        </div>
        <p style={{ color: '#ef4444', fontSize: 13 }}>⚠️ {error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <span style={styles.headerIcon}>🧠</span>
          <h3 style={styles.headerTitle}>Work-pattern deviation</h3>
          <button
            style={styles.infoBtn}
            onClick={() => setShowExplainer((v) => !v)}
            title="Why does this matter?"
          >
            ?
          </button>
        </div>
        {showExplainer && <ExplainerBox />}
        <p style={styles.muted}>
          No work-pattern model data yet for this week. Data appears after the weekly scoring job
          runs (Monday).
        </p>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  // Compute org-wide summary (worst-case state)
  const worstState = data.reduce<string>((acc, t) => {
    const order = ['healthy', 'watch', 'strain', 'critical'];
    return order.indexOf(t.riskState) > order.indexOf(acc) ? t.riskState : acc;
  }, 'healthy');
  const avgRisk = Math.round(data.reduce((s, t) => s + t.engagementStrainRisk, 0) / data.length);
  const avgReadiness = Math.round(data.reduce((s, t) => s + t.confidenceScore, 0) / data.length);

  return (
    <div style={styles.wrapper}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>🧠</span>
        <h3 style={styles.headerTitle}>Work-pattern deviation</h3>
        <span
          style={{
            ...styles.stateBadge,
            background: riskColor(worstState) + '20',
            color: riskColor(worstState),
          }}
        >
          {riskLabel(worstState)}
        </span>
        <button
          style={styles.infoBtn}
          onClick={() => setShowExplainer((v) => !v)}
          title="Why does this matter?"
        >
          ?
        </button>
      </div>

      {/* ── Explainer (toggleable) ── */}
      {showExplainer && <ExplainerBox />}

      {/* ── Org-level summary bar ── */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryItem}>
          <span style={{ ...styles.bigNum, color: riskColor(worstState) }}>{avgRisk}</span>
          <span style={styles.summaryLabel}>
            Deviation index
            <br />
            <span style={styles.muted}>(internal model, 0–100)</span>
          </span>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryItem}>
          <span style={{ ...styles.bigNum, color: '#0f766e' }}>{avgReadiness}</span>
          <span style={styles.summaryLabel}>
            Data readiness
            <br />
            <span style={styles.muted}>(coverage and stability)</span>
          </span>
        </div>
        <div style={styles.summaryDivider} />
        <div style={styles.summaryItem}>
          <span style={styles.bigNum}>{data.length}</span>
          <span style={styles.summaryLabel}>Team{data.length !== 1 ? 's' : ''} tracked</span>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={styles.barTrack}>
        <div
          style={{
            ...styles.barFill,
            width: `${avgRisk}%`,
            background: riskColor(worstState),
          }}
        />
      </div>
      <div style={styles.barLabels}>
        <span style={styles.muted}>Within baseline</span>
        <span style={styles.muted}>More deviation</span>
      </div>

      {/* ── Per-team rows ── */}
      {data.map((team) => (
        <div key={team.teamId} style={styles.teamCard}>
          <div
            style={styles.teamRow}
            onClick={() => setExpanded(expanded === team.teamId ? null : team.teamId)}
          >
            <div style={styles.teamLeft}>
              <span style={{ ...styles.stateDot, background: riskColor(team.riskState) }} />
              <strong style={{ fontSize: 14 }}>{team.teamName ?? 'Team'}</strong>
              <span
                style={{
                  ...styles.stateBadge,
                  marginLeft: 8,
                  background: riskColor(team.riskState) + '15',
                  color: riskColor(team.riskState),
                }}
              >
                {riskLabel(team.riskState)}
              </span>
            </div>
            <div style={styles.teamRight}>
              <span style={{ color: trendColor(team.trend), fontSize: 12, fontWeight: 600 }}>
                {trendIcon(team.trend)} {trendLabel(team.trend)}
              </span>
              <span
                style={{
                  ...styles.scoreChip,
                  background: riskColor(team.riskState) + '15',
                  color: riskColor(team.riskState),
                }}
              >
                {team.engagementStrainRisk}
              </span>
              <span style={{ color: '#9ca3af', fontSize: 12 }}>
                {expanded === team.teamId ? '▲' : '▼'}
              </span>
            </div>
          </div>

          {/* ── Expanded detail ── */}
          {expanded === team.teamId && (
            <div style={styles.teamDetail}>
              <p style={styles.detailMeta}>
                Week of {team.weekStart} · {team.activePeopleCount} active members · Data readiness:{' '}
                {team.confidenceScore}/100 ({team.confidenceLabel ?? '—'})
              </p>

              {team.topDrivers?.length > 0 && (
                <>
                  <p style={styles.detailHeading}>Top drivers this week:</p>
                  {team.topDrivers.map((d, i) => (
                    <div key={i} style={styles.driverRow}>
                      <div style={styles.driverLeft}>
                        <span style={styles.driverDot} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {DRIVER_LABELS[d.driver] ?? d.driver}
                        </span>
                        {d.changeVsBaseline && (
                          <span style={styles.changeChip}>{d.changeVsBaseline} vs baseline</span>
                        )}
                      </div>
                      <span
                        style={{ ...styles.scoreChip, background: '#fef2f2', color: '#ef4444' }}
                      >
                        {d.score}
                      </span>
                    </div>
                  ))}
                  {team.topDrivers[0]?.explanation && (
                    <p style={{ ...styles.muted, marginTop: 8, fontStyle: 'italic' }}>
                      {team.topDrivers[0].explanation}
                    </p>
                  )}
                </>
              )}

              <WhyItMatters riskState={team.riskState} trend={team.trend} />
            </div>
          )}
        </div>
      ))}

      <p style={{ ...styles.muted, marginTop: 12 }}>
        Internal descriptive model, updated weekly. It is not an engagement survey, probability,
        diagnosis, attrition prediction, or performance score. No individual data is exposed.
      </p>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const ExplainerBox: React.FC = () => (
  <div style={explainerStyles.box}>
    <p style={explainerStyles.title}>How to read this model</p>
    <p style={explainerStyles.body}>
      This index summarizes how team-level metadata about recovery time, focus availability,
      responsiveness, and collaboration differs from the team's available baseline.
    </p>
    <p style={explainerStyles.body}>
      It can prioritize a conversation, but it does not measure engagement, explain why a pattern
      changed, or predict an employee outcome.
    </p>
    <ul style={explainerStyles.list}>
      <li>
        <strong>Deviation index (0–100):</strong> A SignalTrue internal model. Higher values mean
        more measured indicators moved away from the team's baseline.
      </li>
      <li>
        <strong>Review bands:</strong> Internal prioritization rules, not scientific thresholds or
        probabilities.
      </li>
      <li>
        <strong>Data readiness:</strong> Whether coverage and baseline history are sufficient to
        interpret the model.
      </li>
    </ul>
    <p style={{ ...explainerStyles.body, marginBottom: 0 }}>
      No surveillance. No sentiment analysis. No individual names. Only metadata-derived team-level
      patterns.
    </p>
  </div>
);

interface WhyItMattersProps {
  riskState: string;
  trend: string;
}

const WhyItMatters: React.FC<WhyItMattersProps> = ({ riskState, trend }) => {
  let message = '';
  let color = '#6b7280';

  if (riskState === 'critical') {
    message =
      'Several modeled indicators are far from this team’s available baseline. Review the underlying counts and local context before choosing one reversible change.';
    color = '#ef4444';
  } else if (riskState === 'strain') {
    message =
      'The model found an elevated deviation in recovery, focus, responsiveness, or collaboration metadata. Confirm which direct metric changed and ask the team lead what explains it.';
    color = '#f97316';
  } else if (riskState === 'watch' && trend === 'rising') {
    message =
      'A moderate deviation increased from last week. Treat this as a review prompt and verify the measured driver and business context.';
    color = '#f59e0b';
  } else if (riskState === 'watch') {
    message =
      'A moderate deviation met an internal review band. Monitor the direct metric and avoid assigning a cause from metadata alone.';
    color = '#f59e0b';
  } else if (trend === 'improving') {
    message =
      'Measured work patterns moved closer to this team’s baseline. Check whether a recent operating change plausibly contributed.';
    color = '#10b981';
  } else {
    message =
      'The modeled indicators remain within the team’s available baseline. This does not prove employee health or engagement.';
    color = '#10b981';
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: '10px 12px',
        background: color + '10',
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
        <strong style={{ color }}>Review guidance:</strong> {message}
      </p>
    </div>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 24,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerIcon: { fontSize: 20 },
  headerTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: '#111827',
    flex: 1,
  },
  stateBadge: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 9px',
    borderRadius: 20,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  infoBtn: {
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '50%',
    width: 22,
    height: 22,
    fontSize: 12,
    fontWeight: 700,
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 14,
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    background: '#e5e7eb',
  },
  bigNum: {
    fontSize: 28,
    fontWeight: 800,
    lineHeight: 1,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center' as const,
    lineHeight: 1.4,
  },
  barTrack: {
    height: 8,
    background: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.6s ease',
  },
  barLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  muted: {
    fontSize: 12,
    color: '#9ca3af',
    margin: 0,
  },
  teamCard: {
    border: '1px solid #f3f4f6',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  teamRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    cursor: 'pointer',
    background: '#fafafa',
  },
  teamLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  teamRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  scoreChip: {
    fontSize: 13,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 6,
  },
  teamDetail: {
    padding: '12px 14px',
    borderTop: '1px solid #f3f4f6',
  },
  detailMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 10,
    marginTop: 0,
  },
  detailHeading: {
    fontSize: 12,
    fontWeight: 700,
    color: '#374151',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 6,
    marginTop: 0,
  },
  driverRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 0',
  },
  driverLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  driverDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#f97316',
    flexShrink: 0,
  },
  changeChip: {
    fontSize: 11,
    color: '#6b7280',
    background: '#f3f4f6',
    padding: '1px 6px',
    borderRadius: 4,
  },
};

const explainerStyles: Record<string, React.CSSProperties> = {
  box: {
    background: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: 8,
    padding: '14px 16px',
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0369a1',
    marginBottom: 8,
    marginTop: 0,
  },
  body: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 1.6,
    marginBottom: 8,
    marginTop: 0,
  },
  list: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 1.8,
    paddingLeft: 18,
    marginBottom: 8,
    marginTop: 0,
  },
};

export default EngagementStrainWidget;
