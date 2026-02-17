/**
 * BDI Dashboard Component
 * Shows real-time Behavioral Drift Index with visualizations
 * Replaces "Collecting baseline data" with actual metrics
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

interface Signal {
  score: number;
  trend: string;
}

interface Metrics {
  messageCount: number;
  meetingHours: number;
  afterHoursActivity: number;
  responseTime: number;
}

interface TeamState {
  _id: string;
  teamId: string;
  orgId: string;
  weekEnd: string;
  bdi: number;
  zone: string;
  riskScore: number;
  signals: {
    communication: Signal;
    engagement: Signal;
    workload: Signal;
    collaboration: Signal;
  };
  metrics: Metrics;
  insights: string[];
  createdAt: string;
}

interface TeamStateHistory {
  current: TeamState | null;
  previous: TeamState | null;
  history: TeamState[];
}

interface DrillDownData {
  type: 'signal' | 'metric' | 'bdi';
  title: string;
  current: number;
  previous?: number;
  history: number[];
  labels: string[];
  insights: string[];
  recommendations: string[];
}

interface BDIDashboardProps {
  teamId: string;
  orgId?: string;
}

// Gauge Component
const BDIGauge: React.FC<{ value: number; zone: string; change?: number }> = ({
  value,
  zone,
  change,
}) => {
  const getZoneColor = (z: string) => {
    switch (z) {
      case 'Stable':
        return '#22c55e';
      case 'Watch':
        return '#f59e0b';
      case 'Alert':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const color = getZoneColor(zone);
  const rotation = Math.min(180, Math.max(0, (value / 100) * 180));

  return (
    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
      {/* SVG Gauge */}
      <div style={{ position: 'relative', width: '200px', height: '120px', margin: '0 auto' }}>
        <svg viewBox="0 0 200 120" style={{ width: '100%', height: '100%' }}>
          {/* Background arc */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Needle */}
          <g transform={`rotate(${rotation - 90}, 100, 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="35"
              stroke="#1e293b"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="8" fill="#1e293b" />
          </g>
        </svg>
        {/* Value display */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b' }}>{value}</div>
        </div>
      </div>

      <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
        Behavioral Drift Index (BDI)
      </div>

      <div
        style={{
          display: 'inline-block',
          padding: '6px 16px',
          borderRadius: '20px',
          backgroundColor: `${color}20`,
          color: color,
          fontWeight: '600',
          fontSize: '13px',
        }}
      >
        {zone === 'Stable' ? '🟢' : zone === 'Watch' ? '🟡' : '🔴'} {zone} Zone
      </div>

      {change !== undefined && change !== 0 && (
        <div
          style={{
            marginTop: '8px',
            padding: '4px 12px',
            borderRadius: '12px',
            display: 'inline-block',
            backgroundColor: change > 0 ? '#dcfce7' : '#fee2e2',
            color: change > 0 ? '#166534' : '#991b1b',
            fontSize: '12px',
            fontWeight: '500',
          }}
        >
          {change > 0 ? '↑' : '↓'} {change > 0 ? '+' : ''}
          {change} from last week
        </div>
      )}
    </div>
  );
};

// Signal Card Component
const SignalCard: React.FC<{
  label: string;
  score: number;
  trend: string;
  change: number;
  onClick: () => void;
}> = ({ label, score, trend, change, onClick }) => {
  const getColor = (s: number) => {
    if (s >= 70) return '#22c55e';
    if (s >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getTrendIcon = (t: string) => {
    if (t === 'improving') return '↑';
    if (t === 'declining') return '↓';
    return '→';
  };

  const color = getColor(score);

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'rgba(255,255,255,0.6)',
            fontWeight: '600',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: '600',
            color: change >= 0 ? '#22c55e' : '#ef4444',
          }}
        >
          {getTrendIcon(trend)} {change !== 0 ? (change > 0 ? '+' : '') + change : 'stable'}
        </span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>{score}</div>
      <div
        style={{
          height: '6px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: '3px',
          marginTop: '10px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${score}%`,
            backgroundColor: color,
            borderRadius: '3px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  label: string;
  value: number | string;
  unit: string;
  change?: number;
  isWarning?: boolean;
  isCritical?: boolean;
  onClick: () => void;
}> = ({ label, value, unit, change, isWarning, isCritical, onClick }) => {
  const color = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';

  return (
    <div
      onClick={onClick}
      style={{
        textAlign: 'center',
        cursor: 'pointer',
        padding: '12px',
        borderRadius: '8px',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div style={{ fontSize: '20px', fontWeight: '700', color }}>
        {value}
        {unit}
        {change !== undefined && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '8px',
              marginLeft: '6px',
              backgroundColor:
                change === 0
                  ? 'rgba(255,255,255,0.1)'
                  : change > 0
                    ? 'rgba(239,68,68,0.2)'
                    : 'rgba(34,197,94,0.2)',
              color: change === 0 ? 'rgba(255,255,255,0.6)' : change > 0 ? '#ef4444' : '#22c55e',
            }}
          >
            {change > 0 ? '+' : ''}
            {change}%
          </span>
        )}
      </div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
        {label}
      </div>
    </div>
  );
};

// Alert Banner Component
const AlertBanner: React.FC<{ alerts: string[] }> = ({ alerts }) => {
  if (alerts.length === 0) return null;

  return (
    <div
      style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '20px',
      }}
    >
      {alerts.map((alert, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: i < alerts.length - 1 ? '8px' : 0,
          }}
        >
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{ fontSize: '13px', color: '#fca5a5', fontWeight: '500' }}>{alert}</span>
        </div>
      ))}
    </div>
  );
};

// Drill-Down Modal Component
const DrillDownModal: React.FC<{
  data: DrillDownData | null;
  onClose: () => void;
}> = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>{data.title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '24px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Current Value */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', fontWeight: '700', color: '#fff' }}>{data.current}</div>
          {data.previous !== undefined && (
            <div
              style={{
                fontSize: '14px',
                color: data.current >= data.previous ? '#22c55e' : '#ef4444',
                marginTop: '8px',
              }}
            >
              {data.current >= data.previous ? '↑' : '↓'} {data.current - data.previous} from last
              week ({data.previous})
            </div>
          )}
        </div>

        {/* Simple Trend Chart */}
        {data.history.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
              Trend (Last {data.history.length} weeks)
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>
              {data.history.map((val, i) => {
                const max = Math.max(...data.history);
                const height = max > 0 ? (val / max) * 100 : 0;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${height}%`,
                        backgroundColor:
                          i === data.history.length - 1 ? '#3b82f6' : 'rgba(59, 130, 246, 0.4)',
                        borderRadius: '4px 4px 0 0',
                        minHeight: '4px',
                      }}
                    />
                    <div
                      style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}
                    >
                      {data.labels[i] || `W${i + 1}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Insights */}
        {data.insights.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '8px' }}
            >
              💡 Insights
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: '20px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '13px',
              }}
            >
              {data.insights.map((insight, i) => (
                <li key={i} style={{ marginBottom: '6px' }}>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <div>
            <div
              style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '8px' }}
            >
              🎯 Recommended Actions
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: '20px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '13px',
              }}
            >
              {data.recommendations.map((rec, i) => (
                <li key={i} style={{ marginBottom: '6px' }}>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// Main BDI Dashboard Component
const BDIDashboard: React.FC<BDIDashboardProps> = ({ teamId, orgId }) => {
  const [data, setData] = useState<TeamStateHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<DrillDownData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch team state data from backend
      const response = await api.get(`/team-state/team/${teamId}/history`);
      const states: TeamState[] = response.data.states || [];

      if (states.length > 0) {
        setData({
          current: states[states.length - 1],
          previous: states.length > 1 ? states[states.length - 2] : null,
          history: states,
        });
      } else {
        setData(null);
      }
      setError(null);
    } catch (err: any) {
      console.error('Error fetching team state:', err);
      // Don't show error, just show no data state
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  // Refresh all integrations and generate dashboard data
  const handleRefreshAll = useCallback(async () => {
    try {
      setRefreshing(true);
      setRefreshMessage('Syncing all integrations...');

      // Step 1: Trigger sync for all connected integrations
      try {
        const statusRes = await api.get('/integration-dashboard/status');
        const connectedIntegrations =
          statusRes.data.integrations?.filter((i: any) => i.status === 'connected') || [];

        for (const integration of connectedIntegrations) {
          setRefreshMessage(`Syncing ${integration.name}...`);
          try {
            await api.post(`/integration-dashboard/${integration.type}/sync`);
          } catch (e) {
            console.warn(`Sync failed for ${integration.name}:`, e);
          }
        }
      } catch (e) {
        console.warn('Could not fetch integration status:', e);
      }

      // Step 2: Sync Slack data if available
      setRefreshMessage('Syncing Slack data...');
      try {
        await api.post('/employee-sync/slack');
      } catch (e) {
        console.warn('Slack sync skipped:', e);
      }

      // Step 3: Generate TeamState records from all data sources
      setRefreshMessage('Generating dashboard data...');
      if (orgId) {
        await api.post(`/bdi/org/${orgId}/generate-all-states`);
      } else if (teamId) {
        await api.post(`/bdi/team/${teamId}/generate-state`);
      }

      // Step 4: Refresh the dashboard display
      setRefreshMessage('Refreshing dashboard...');
      await fetchData();

      setRefreshMessage('✓ Dashboard refreshed successfully!');
      setTimeout(() => setRefreshMessage(null), 3000);
    } catch (err: any) {
      console.error('Error refreshing dashboard:', err);
      setRefreshMessage('⚠️ Some data may not have synced. Please try again.');
      setTimeout(() => setRefreshMessage(null), 5000);
    } finally {
      setRefreshing(false);
    }
  }, [teamId, orgId, fetchData]);

  useEffect(() => {
    if (teamId) {
      fetchData();
    }
  }, [teamId, fetchData]);

  const handleDrillDown = (type: string, label: string) => {
    if (!data?.current) return;

    const history = data.history.map((s) => {
      switch (type) {
        case 'bdi':
          return s.bdi;
        case 'communication':
          return s.signals?.communication?.score || 0;
        case 'engagement':
          return s.signals?.engagement?.score || 0;
        case 'workload':
          return s.signals?.workload?.score || 0;
        case 'collaboration':
          return s.signals?.collaboration?.score || 0;
        case 'messages':
          return s.metrics?.messageCount || 0;
        case 'meetings':
          return s.metrics?.meetingHours || 0;
        case 'afterHours':
          return s.metrics?.afterHoursActivity || 0;
        case 'responseTime':
          return s.metrics?.responseTime || 0;
        default:
          return 0;
      }
    });

    const current = history[history.length - 1];
    const previous = history.length > 1 ? history[history.length - 2] : undefined;

    // Generate insights based on type
    const insights: string[] = [];
    const recommendations: string[] = [];

    if (type === 'afterHours' && current > 10) {
      insights.push('After-hours activity is significantly elevated');
      insights.push('This may indicate team overload or deadline pressure');
      recommendations.push('Review current project timelines');
      recommendations.push('Consider redistributing workload');
    }

    if (type === 'meetings' && current > 15) {
      insights.push('Meeting hours exceed healthy thresholds');
      insights.push('Team may have limited focus time');
      recommendations.push('Audit recurring meetings for consolidation');
      recommendations.push('Consider async alternatives for status updates');
    }

    if (type === 'communication' && current < 60) {
      insights.push('Communication frequency is below normal');
      recommendations.push('Schedule a team sync or all-hands');
      recommendations.push('Check in with quiet team members');
    }

    setDrillDown({
      type: type as any,
      title: label,
      current,
      previous,
      history,
      labels: data.history.map((_, i) => `W${i + 1}`),
      insights: insights.length > 0 ? insights : ['No specific concerns detected'],
      recommendations,
    });
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
          Loading team health data...
        </div>
      </div>
    );
  }

  // If no data, show a message with sample visualization
  if (!data?.current) {
    return (
      <div style={containerStyle}>
        <h3 style={titleStyle}>📊 Team Health Dashboard</h3>
        <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.6)' }}>
          <div style={{ marginBottom: '12px', fontSize: '18px' }}>📈 Collecting Data...</div>
          <div style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
            SignalTrue is analyzing your team's communication patterns.
            <br />
            Initial insights will appear as data is collected from connected integrations.
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            style={{
              padding: '12px 24px',
              backgroundColor: refreshing ? '#4b5563' : '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            {refreshing ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                {refreshMessage || 'Refreshing...'}
              </>
            ) : (
              <>🔄 Refresh All Integrations</>
            )}
          </button>

          {refreshMessage && !refreshing && (
            <div
              style={{
                marginTop: '12px',
                fontSize: '13px',
                color: refreshMessage.startsWith('✓') ? '#22c55e' : '#f59e0b',
              }}
            >
              {refreshMessage}
            </div>
          )}

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  const current = data.current;
  const previous = data.previous;
  const bdiChange = previous ? current.bdi - previous.bdi : 0;

  // Calculate changes
  const commChange = previous
    ? (current.signals?.communication?.score || 0) - (previous.signals?.communication?.score || 0)
    : 0;
  const engChange = previous
    ? (current.signals?.engagement?.score || 0) - (previous.signals?.engagement?.score || 0)
    : 0;
  const workChange = previous
    ? (current.signals?.workload?.score || 0) - (previous.signals?.workload?.score || 0)
    : 0;
  const collabChange = previous
    ? (current.signals?.collaboration?.score || 0) - (previous.signals?.collaboration?.score || 0)
    : 0;

  // Metric changes (inverted - higher is usually worse for these)
  const meetingChange = previous?.metrics?.meetingHours
    ? Math.round(
        ((current.metrics.meetingHours - previous.metrics.meetingHours) /
          previous.metrics.meetingHours) *
          100
      )
    : undefined;
  const afterHoursChange = previous?.metrics?.afterHoursActivity
    ? Math.round(
        ((current.metrics.afterHoursActivity - previous.metrics.afterHoursActivity) /
          previous.metrics.afterHoursActivity) *
          100
      )
    : undefined;
  const responseTimeChange = previous?.metrics?.responseTime
    ? Math.round(
        ((current.metrics.responseTime - previous.metrics.responseTime) /
          previous.metrics.responseTime) *
          100
      )
    : undefined;
  const messageChange = previous?.metrics?.messageCount
    ? Math.round(
        ((current.metrics.messageCount - previous.metrics.messageCount) /
          previous.metrics.messageCount) *
          100
      )
    : undefined;

  // Generate alerts
  const alerts: string[] = [];
  if (current.metrics.afterHoursActivity > 10) {
    alerts.push(
      `After-hours activity is high (${current.metrics.afterHoursActivity} events) - potential burnout risk`
    );
  }
  if (current.metrics.meetingHours > 16) {
    alerts.push(
      `Meeting load is excessive (${current.metrics.meetingHours}h) - consider consolidation`
    );
  }
  if (bdiChange < -5) {
    alerts.push(`BDI dropped ${Math.abs(bdiChange)} points this week - review team health`);
  }

  return (
    <div style={containerStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ ...titleStyle, marginBottom: 0 }}>📊 Team Health Dashboard</h3>
        <button
          onClick={handleRefreshAll}
          disabled={refreshing}
          style={{
            padding: '8px 16px',
            backgroundColor: refreshing ? '#374151' : 'rgba(99, 102, 241, 0.2)',
            color: refreshing ? '#9ca3af' : '#a5b4fc',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!refreshing) {
              e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!refreshing) {
              e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
            }
          }}
        >
          {refreshing ? (
            <>
              <span
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  border: '2px solid rgba(255,255,255,0.2)',
                  borderTopColor: '#a5b4fc',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              Syncing...
            </>
          ) : (
            <>🔄 Refresh</>
          )}
        </button>
      </div>

      {refreshMessage && (
        <div
          style={{
            marginBottom: '12px',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            backgroundColor: refreshMessage.startsWith('✓')
              ? 'rgba(34, 197, 94, 0.1)'
              : 'rgba(245, 158, 11, 0.1)',
            color: refreshMessage.startsWith('✓') ? '#22c55e' : '#f59e0b',
            border: `1px solid ${refreshMessage.startsWith('✓') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
          }}
        >
          {refreshMessage}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <AlertBanner alerts={alerts} />

      {/* BDI Gauge */}
      <div
        style={{ cursor: 'pointer' }}
        onClick={() => handleDrillDown('bdi', 'Behavioral Drift Index')}
      >
        <BDIGauge value={current.bdi} zone={current.zone} change={bdiChange} />
      </div>

      {/* Signal Cards */}
      <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '12px' }}>
        📈 Signal Breakdown
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <SignalCard
          label="Communication"
          score={current.signals?.communication?.score || 0}
          trend={current.signals?.communication?.trend || 'stable'}
          change={commChange}
          onClick={() => handleDrillDown('communication', 'Communication Score')}
        />
        <SignalCard
          label="Engagement"
          score={current.signals?.engagement?.score || 0}
          trend={current.signals?.engagement?.trend || 'stable'}
          change={engChange}
          onClick={() => handleDrillDown('engagement', 'Engagement Score')}
        />
        <SignalCard
          label="Workload"
          score={current.signals?.workload?.score || 0}
          trend={current.signals?.workload?.trend || 'stable'}
          change={workChange}
          onClick={() => handleDrillDown('workload', 'Workload Score')}
        />
        <SignalCard
          label="Collaboration"
          score={current.signals?.collaboration?.score || 0}
          trend={current.signals?.collaboration?.trend || 'stable'}
          change={collabChange}
          onClick={() => handleDrillDown('collaboration', 'Collaboration Score')}
        />
      </div>

      {/* Activity Metrics */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '16px' }}>
          📋 Activity Metrics
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
          }}
        >
          <MetricCard
            label="Messages"
            value={current.metrics.messageCount}
            unit=""
            change={messageChange}
            onClick={() => handleDrillDown('messages', 'Message Count')}
          />
          <MetricCard
            label="Meeting Hours"
            value={current.metrics.meetingHours}
            unit="h"
            change={meetingChange}
            isWarning={current.metrics.meetingHours > 12}
            isCritical={current.metrics.meetingHours > 16}
            onClick={() => handleDrillDown('meetings', 'Meeting Hours')}
          />
          <MetricCard
            label="After-Hours Events"
            value={current.metrics.afterHoursActivity}
            unit=""
            change={afterHoursChange}
            isWarning={current.metrics.afterHoursActivity > 5}
            isCritical={current.metrics.afterHoursActivity > 10}
            onClick={() => handleDrillDown('afterHours', 'After-Hours Activity')}
          />
          <MetricCard
            label="Avg Response Time"
            value={current.metrics.responseTime}
            unit="m"
            change={responseTimeChange}
            isWarning={current.metrics.responseTime > 30}
            isCritical={current.metrics.responseTime > 60}
            onClick={() => handleDrillDown('responseTime', 'Response Time')}
          />
        </div>
      </div>

      {/* Insights */}
      {current.insights && current.insights.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '0 10px 10px 0',
            padding: '14px 16px',
          }}
        >
          <div
            style={{ fontSize: '13px', fontWeight: '600', color: '#fbbf24', marginBottom: '8px' }}
          >
            💡 Key Insights
          </div>
          <ul style={{ margin: 0, paddingLeft: '18px' }}>
            {current.insights.map((insight, i) => (
              <li
                key={i}
                style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginBottom: '4px' }}
              >
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Drill-Down Modal */}
      <DrillDownModal data={drillDown} onClose={() => setDrillDown(null)} />
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  backgroundColor: '#1a1a2e',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '20px',
  border: '1px solid rgba(255,255,255,0.1)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#fff',
  margin: '0 0 20px 0',
};

export default BDIDashboard;
