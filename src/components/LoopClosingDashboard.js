/**
 * Loop Closing Dashboard Components
 * Phase 1 Pilot Features:
 * - Meeting ROI Score tile
 * - Focus Recovery Forecast tile
 * - 30-Day Work Health Delta Report
 */

import React, { useState, useEffect } from 'react';
import api from '../utils/api';

// ============================================
// Shared Styles
// ============================================
const tileStyles = {
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
    marginTop: '4px',
  },
  value: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#fff',
    margin: '8px 0',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '600',
  },
  badgeGreen: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: '#22c55e',
  },
  badgeYellow: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    color: '#eab308',
  },
  badgeRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
  },
  progressBar: {
    height: '8px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '12px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  message: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.8)',
    marginTop: '12px',
    lineHeight: '1.5',
  },
  noData: {
    textAlign: 'center',
    padding: '20px',
    color: 'rgba(255,255,255,0.5)',
  },
};

// ============================================
// Meeting ROI Score Tile
// ============================================
export function MeetingROITile({ teamId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamId) return;

    async function fetchData() {
      try {
        const response = await api.get(`/loop-closing/meeting-roi/${teamId}`);
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [teamId]);

  if (loading) {
    return (
      <div style={tileStyles.container}>
        <div style={tileStyles.noData}>Loading meeting data...</div>
      </div>
    );
  }

  if (error || !data?.hasData) {
    return (
      <div style={tileStyles.container}>
        <h3 style={tileStyles.title}>Meeting ROI Score</h3>
        <div style={tileStyles.noData}>Connect calendar to see meeting efficiency analysis</div>
      </div>
    );
  }

  const roiColor = data.roiScore >= 70 ? '#22c55e' : data.roiScore >= 40 ? '#eab308' : '#ef4444';

  return (
    <div style={tileStyles.container}>
      <div style={tileStyles.header}>
        <div>
          <h3 style={tileStyles.title}>Meeting ROI Score</h3>
          <p style={tileStyles.subtitle}>Meeting efficiency without reading content</p>
        </div>
        <span
          style={{
            ...tileStyles.badge,
            ...(data.roiScore >= 70
              ? tileStyles.badgeGreen
              : data.roiScore >= 40
                ? tileStyles.badgeYellow
                : tileStyles.badgeRed),
          }}
        >
          {data.meetingCount} meetings
        </span>
      </div>

      <div style={tileStyles.value}>
        {data.roiScore}
        <span style={{ fontSize: '18px' }}>/100</span>
      </div>

      <div style={tileStyles.progressBar}>
        <div
          style={{
            ...tileStyles.progressFill,
            width: `${data.roiScore}%`,
            backgroundColor: roiColor,
          }}
        />
      </div>

      <p style={tileStyles.message}>
        <span style={{ color: roiColor, fontWeight: '600' }}>{data.lowROIPercentage}%</span> of
        meeting time last month shows low ROI
      </p>
    </div>
  );
}

// ============================================
// Focus Recovery Forecast Tile
// ============================================
export function FocusForecastTile({ teamId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamId) return;

    async function fetchData() {
      try {
        const response = await api.get(`/loop-closing/focus-forecast/${teamId}`);
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [teamId]);

  if (loading) {
    return (
      <div style={tileStyles.container}>
        <div style={tileStyles.noData}>Analyzing focus patterns...</div>
      </div>
    );
  }

  if (error || !data?.hasData) {
    return (
      <div style={tileStyles.container}>
        <h3 style={tileStyles.title}>Focus Recovery Forecast</h3>
        <div style={tileStyles.noData}>Insufficient data for focus forecast</div>
      </div>
    );
  }

  const stateStyles = {
    Stable: { color: '#22c55e', bg: tileStyles.badgeGreen },
    Degrading: { color: '#eab308', bg: tileStyles.badgeYellow },
    Critical: { color: '#ef4444', bg: tileStyles.badgeRed },
  };

  const state = stateStyles[data.warningState] || stateStyles.Stable;

  return (
    <div style={tileStyles.container}>
      <div style={tileStyles.header}>
        <div>
          <h3 style={tileStyles.title}>Focus Recovery Forecast</h3>
          <p style={tileStyles.subtitle}>14-day projection based on current trends</p>
        </div>
        <span style={{ ...tileStyles.badge, ...state.bg }}>{data.warningState}</span>
      </div>

      <div
        style={{
          ...tileStyles.value,
          color: state.color,
        }}
      >
        {data.focusCapacityChange > 0 ? '+' : ''}
        {data.focusCapacityChange}%
      </div>

      <p style={tileStyles.message}>{data.forecastMessage}</p>

      {/* Simple trend visualization */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '4px',
          marginTop: '16px',
          height: '40px',
        }}
      >
        {data.trendData?.slice(-7).map((point, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              backgroundColor: state.color,
              opacity: 0.3 + i * 0.1,
              height: `${Math.max(20, (point.focusBlocks || 0) * 20)}%`,
              borderRadius: '2px',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Work Health Delta Report Tile
// ============================================
export function WorkHealthDeltaTile({ teamId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!teamId) return;

    async function fetchData() {
      try {
        const response = await api.get(`/loop-closing/health-delta/${teamId}`);
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [teamId]);

  if (loading) {
    return (
      <div style={tileStyles.container}>
        <div style={tileStyles.noData}>Generating health report...</div>
      </div>
    );
  }

  if (error || !data?.hasData) {
    return (
      <div style={tileStyles.container}>
        <h3 style={tileStyles.title}>30-Day Work Health Report</h3>
        <div style={tileStyles.noData}>Need 30 days of data for comparison report</div>
      </div>
    );
  }

  const statusStyles = {
    improved: { color: '#22c55e', label: 'Improved' },
    stable: { color: '#eab308', label: 'Stable' },
    declined: { color: '#ef4444', label: 'Declined' },
  };

  const status = statusStyles[data.overallStatus] || statusStyles.stable;

  const deltaColors = {
    green: '#22c55e',
    yellow: '#eab308',
    red: '#ef4444',
  };

  const deltaLabels = {
    focusTime: 'Focus Time',
    meetingLoad: 'Meeting Load',
    fragmentation: 'Fragmentation',
    afterHours: 'After-Hours',
    loadBalance: 'Load Balance',
    meetingROI: 'Meeting ROI',
  };

  return (
    <div style={tileStyles.container}>
      <div style={tileStyles.header}>
        <div>
          <h3 style={tileStyles.title}>30-Day Work Health Report</h3>
          <p style={tileStyles.subtitle}>Did this help us?</p>
        </div>
        <span
          style={{
            ...tileStyles.badge,
            backgroundColor: `${status.color}20`,
            color: status.color,
          }}
        >
          {status.label}
        </span>
      </div>

      <p style={tileStyles.message}>{data.summaryMessage}</p>

      {/* Delta Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginTop: '16px',
        }}
      >
        {Object.entries(data.deltas || {}).map(([key, value]) => (
          <div
            key={key}
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '4px',
              }}
            >
              {deltaLabels[key] || key}
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: deltaColors[data.deltaStatus?.[key]] || '#fff',
              }}
            >
              {value > 0 ? '+' : ''}
              {value}%
            </div>
          </div>
        ))}
      </div>

      {/* Export Button */}
      <button
        onClick={() => window.open(`/api/loop-closing/health-delta/${teamId}/pdf`, '_blank')}
        style={{
          marginTop: '16px',
          padding: '8px 16px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: '6px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        📄 Export PDF Report
      </button>
    </div>
  );
}

// ============================================
// After-Hours Cost Calculator Tile (Phase 2)
// ============================================
export function AfterHoursCostTile({ teamId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamId) return;

    async function fetchData() {
      try {
        const response = await api.get(`/loop-closing/after-hours/${teamId}`);
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [teamId]);

  if (loading) {
    return (
      <div style={tileStyles.container}>
        <div style={tileStyles.noData}>Calculating after-hours load...</div>
      </div>
    );
  }

  if (error || !data?.hasData) {
    return (
      <div style={tileStyles.container}>
        <h3 style={tileStyles.title}>After-Hours Cost</h3>
        <div style={tileStyles.noData}>Connect Slack/Teams to analyze after-hours work</div>
      </div>
    );
  }

  const fteColor =
    data.equivalentFTE >= 1 ? '#ef4444' : data.equivalentFTE >= 0.5 ? '#eab308' : '#22c55e';

  return (
    <div style={tileStyles.container}>
      <div style={tileStyles.header}>
        <div>
          <h3 style={tileStyles.title}>After-Hours Cost</h3>
          <p style={tileStyles.subtitle}>Invisible work translated to cost</p>
        </div>
        <span
          style={{
            ...tileStyles.badge,
            ...(data.equivalentFTE >= 1
              ? tileStyles.badgeRed
              : data.equivalentFTE >= 0.5
                ? tileStyles.badgeYellow
                : tileStyles.badgeGreen),
          }}
        >
          {data.afterHoursHours}h/week
        </span>
      </div>

      <div style={{ ...tileStyles.value, color: fteColor }}>
        {data.equivalentFTE}
        <span style={{ fontSize: '18px' }}> FTE</span>
      </div>

      <p style={tileStyles.message}>
        This team generates ~<strong>{data.equivalentFTE}</strong> FTE of after-hours load weekly
      </p>

      {/* Weekly bar chart */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '4px',
          marginTop: '16px',
          height: '60px',
        }}
      >
        {(data.dailyBreakdown || []).slice(-7).map((day, i) => {
          const maxHours = 4;
          const height = Math.min(100, (day.hours / maxHours) * 100);
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
                  backgroundColor: fteColor,
                  opacity: 0.7,
                  height: `${Math.max(4, height)}%`,
                  borderRadius: '2px 2px 0 0',
                  minHeight: '4px',
                }}
              />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
              </span>
            </div>
          );
        })}
      </div>

      {data.estimatedCost > 0 && (
        <p style={{ ...tileStyles.message, fontSize: '12px', marginTop: '12px' }}>
          Monthly cost estimate: <strong>${data.monthlyAccumulated?.toLocaleString()}</strong>
        </p>
      )}
    </div>
  );
}

// ============================================
// Meeting Collision Heatmap Tile (Phase 2)
// ============================================
export function CollisionHeatmapTile({ teamId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamId) return;

    async function fetchData() {
      try {
        const response = await api.get(`/loop-closing/collision/${teamId}`);
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [teamId]);

  if (loading) {
    return (
      <div style={tileStyles.container}>
        <div style={tileStyles.noData}>Analyzing meeting patterns...</div>
      </div>
    );
  }

  if (error || !data?.hasData) {
    return (
      <div style={tileStyles.container}>
        <h3 style={tileStyles.title}>Meeting Collision Heatmap</h3>
        <div style={tileStyles.noData}>Connect calendar to see focus dead zones</div>
      </div>
    );
  }

  const { formattedHeatmap, summary, redZones, focusWindows } = data;
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const getSlotColor = (density) => {
    if (density >= 70) return '#ef4444';
    if (density >= 40) return '#eab308';
    return '#22c55e';
  };

  return (
    <div style={tileStyles.container}>
      <div style={tileStyles.header}>
        <div>
          <h3 style={tileStyles.title}>Meeting Collision Heatmap</h3>
          <p style={tileStyles.subtitle}>Structural focus dead zones</p>
        </div>
        <span
          style={{
            ...tileStyles.badge,
            backgroundColor:
              summary?.congestionRate >= 50 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
            color: summary?.congestionRate >= 50 ? '#ef4444' : '#eab308',
          }}
        >
          {summary?.congestionRate || 0}% congested
        </span>
      </div>

      {/* Heatmap Grid */}
      <div style={{ marginTop: '16px' }}>
        {/* Hour labels */}
        <div style={{ display: 'flex', paddingLeft: '40px', marginBottom: '4px' }}>
          {formattedHeatmap?.hours?.slice(0, 5).map((hour, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                fontSize: '10px',
                color: 'rgba(255,255,255,0.5)',
                textAlign: 'center',
              }}
            >
              {hour}
            </div>
          ))}
        </div>

        {/* Day rows */}
        {formattedHeatmap?.grid?.map((dayData, dayIndex) => (
          <div
            key={dayIndex}
            style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}
          >
            <div
              style={{
                width: '36px',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.7)',
                fontWeight: '500',
              }}
            >
              {dayData.day}
            </div>
            <div style={{ display: 'flex', flex: 1, gap: '2px' }}>
              {dayData.slots?.slice(0, 10).map((slot, slotIndex) => (
                <div
                  key={slotIndex}
                  style={{
                    flex: 1,
                    height: '20px',
                    backgroundColor: getSlotColor(slot.density),
                    opacity: 0.3 + (slot.density / 100) * 0.7,
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}
                  title={`${dayData.day} ${slot.hour}:00 - ${slot.density}% collision`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginTop: '16px',
          fontSize: '13px',
        }}
      >
        <div>
          <span style={{ color: '#ef4444' }}>●</span> Red zones:{' '}
          <strong>{summary?.redZoneHours || 0}h</strong>
        </div>
        <div>
          <span style={{ color: '#22c55e' }}>●</span> Focus windows:{' '}
          <strong>{summary?.focusWindowHours || 0}h</strong>
        </div>
      </div>

      {/* Worst/Best day */}
      {summary?.worstDay !== undefined && (
        <p style={{ ...tileStyles.message, fontSize: '12px', marginTop: '8px' }}>
          Worst day: <strong>{dayNames[summary.worstDay]}</strong> | Best day:{' '}
          <strong>{dayNames[summary.bestDay]}</strong>
        </p>
      )}
    </div>
  );
}

// ============================================
// Intervention Simulator Tile (Phase 3)
// ============================================
export function InterventionSimulatorTile({ teamId }) {
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [presetsLoading, setPresetsLoading] = useState(true);

  useEffect(() => {
    async function fetchPresets() {
      try {
        const response = await api.get('/loop-closing/simulator/presets');
        setPresets(response.data.presets || []);
      } catch (err) {
        console.error('Failed to load presets:', err);
      } finally {
        setPresetsLoading(false);
      }
    }
    fetchPresets();
  }, []);

  const runSimulation = async (presetId) => {
    if (!teamId) return;
    setLoading(true);
    setSelectedPreset(presetId);
    try {
      const response = await api.post(`/loop-closing/simulator/${teamId}/quick`, {
        presetId,
        meetings: [], // Use current team meetings
      });
      setResult(response.data);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (presetsLoading) {
    return (
      <div style={tileStyles.container}>
        <div style={tileStyles.noData}>Loading simulator...</div>
      </div>
    );
  }

  return (
    <div style={tileStyles.container}>
      <div style={tileStyles.header}>
        <div>
          <h3 style={tileStyles.title}>Intervention Simulator</h3>
          <p style={tileStyles.subtitle}>What-If engine for testing changes</p>
        </div>
        <span style={{ ...tileStyles.badge, ...tileStyles.badgeGreen }}>
          {presets.length} presets
        </span>
      </div>

      {/* Preset Buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginTop: '16px',
        }}
      >
        {presets.slice(0, 4).map((preset) => (
          <button
            key={preset.id}
            onClick={() => runSimulation(preset.id)}
            disabled={loading}
            style={{
              padding: '12px 16px',
              backgroundColor:
                selectedPreset === preset.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.05)',
              border:
                selectedPreset === preset.id
                  ? '1px solid #3b82f6'
                  : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              cursor: loading ? 'wait' : 'pointer',
              textAlign: 'left',
              fontSize: '13px',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontWeight: '600' }}>{preset.name}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
              {preset.description}
            </div>
          </button>
        ))}
      </div>

      {/* Simulation Results */}
      {result && (
        <div
          style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#fff' }}>
            Simulation Results {result.presetUsed && `• ${result.presetUsed}`}
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {/* Focus Time Change */}
            <div
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Focus Time</div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: result.deltas?.focusTime >= 0 ? '#22c55e' : '#ef4444',
                }}
              >
                {result.deltas?.focusTime >= 0 ? '+' : ''}
                {result.deltas?.focusTime || 0}%
              </div>
            </div>

            {/* Fragmentation Change */}
            <div
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Fragmentation</div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: result.deltas?.fragmentation <= 0 ? '#22c55e' : '#ef4444',
                }}
              >
                {result.deltas?.fragmentation >= 0 ? '+' : ''}
                {result.deltas?.fragmentation || 0}%
              </div>
            </div>

            {/* After-Hours Change */}
            <div
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>After-Hours</div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: result.deltas?.afterHours <= 0 ? '#22c55e' : '#ef4444',
                }}
              >
                {result.deltas?.afterHours >= 0 ? '+' : ''}
                {result.deltas?.afterHours || 0}%
              </div>
            </div>

            {/* Meeting Hours */}
            <div
              style={{
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                padding: '12px',
                borderRadius: '6px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>Meeting Hours</div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: result.deltas?.meetingHours <= 0 ? '#22c55e' : '#ef4444',
                }}
              >
                {result.deltas?.meetingHours >= 0 ? '+' : ''}
                {result.deltas?.meetingHours || 0}%
              </div>
            </div>
          </div>

          {result.summary && (
            <p style={{ ...tileStyles.message, marginTop: '12px', fontSize: '12px' }}>
              {result.summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Team Load Balance Index Tile (Phase 3)
// ============================================
export function LoadBalanceTile({ teamId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamId) return;

    async function fetchData() {
      try {
        const response = await api.get(`/loop-closing/load-balance/${teamId}`);
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [teamId]);

  if (loading) {
    return (
      <div style={tileStyles.container}>
        <div style={tileStyles.noData}>Analyzing load distribution...</div>
      </div>
    );
  }

  if (error || !data?.hasData) {
    return (
      <div style={tileStyles.container}>
        <h3 style={tileStyles.title}>Team Load Balance</h3>
        <div style={tileStyles.noData}>Insufficient data for load analysis</div>
      </div>
    );
  }

  const stateStyles = {
    balanced: { color: '#22c55e', bg: tileStyles.badgeGreen, icon: '✓' },
    moderately_skewed: { color: '#eab308', bg: tileStyles.badgeYellow, icon: '⚠' },
    highly_skewed: { color: '#ef4444', bg: tileStyles.badgeRed, icon: '!' },
  };

  const stateLabels = {
    balanced: 'Balanced',
    moderately_skewed: 'Moderately Skewed',
    highly_skewed: 'Highly Skewed',
  };

  const state = stateStyles[data.balanceState] || stateStyles.balanced;

  // Gauge visualization
  const gaugePercentage = Math.min(100, Math.max(0, data.loadBalanceIndex));

  return (
    <div style={tileStyles.container}>
      <div style={tileStyles.header}>
        <div>
          <h3 style={tileStyles.title}>Team Load Balance</h3>
          <p style={tileStyles.subtitle}>Hidden load concentration detection</p>
        </div>
        <span style={{ ...tileStyles.badge, ...state.bg }}>
          {stateLabels[data.balanceState] || data.balanceState}
        </span>
      </div>

      {/* Gauge Display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '20px',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '120px',
            height: '60px',
          }}
        >
          {/* Gauge Background */}
          <svg viewBox="0 0 120 60" style={{ width: '100%', height: '100%' }}>
            {/* Background arc */}
            <path
              d="M 10 55 A 50 50 0 0 1 110 55"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Value arc */}
            <path
              d="M 10 55 A 50 50 0 0 1 110 55"
              fill="none"
              stroke={state.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${gaugePercentage * 1.57} 157`}
            />
          </svg>
          {/* Center value */}
          <div
            style={{
              position: 'absolute',
              bottom: '5px',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: '700', color: state.color }}>
              {data.loadBalanceIndex}
            </div>
          </div>
        </div>
      </div>

      {/* Dimension Breakdown */}
      {data.dimensions && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginTop: '20px',
          }}
        >
          {Object.entries(data.dimensions).map(([key, dim]) => (
            <div
              key={key}
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                padding: '8px',
                borderRadius: '6px',
                textAlign: 'center',
              }}
            >
              <div
                style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}
              >
                {key.replace(/_/g, ' ').toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: dim.cv > 0.4 ? '#ef4444' : dim.cv > 0.2 ? '#eab308' : '#22c55e',
                }}
              >
                {Math.round(dim.cv * 100)}%
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={tileStyles.message}>{data.explanation}</p>

      {/* Skewed Dimensions Warning */}
      {data.skewedDimensions?.length > 0 && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#ef4444',
          }}
        >
          ⚠ High variance in: {data.skewedDimensions.join(', ')}
        </div>
      )}
    </div>
  );
}

// ============================================
// Execution Drag Indicator Tile (Phase 3)
// ============================================
export function ExecutionDragTile({ teamId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamId) return;

    async function fetchData() {
      try {
        const response = await api.get(`/loop-closing/execution-drag/${teamId}`);
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [teamId]);

  if (loading) {
    return (
      <div style={tileStyles.container}>
        <div style={tileStyles.noData}>Calculating execution drag...</div>
      </div>
    );
  }

  if (error || !data?.hasData) {
    return (
      <div style={tileStyles.container}>
        <h3 style={tileStyles.title}>Execution Drag</h3>
        <div style={tileStyles.noData}>Need multi-week data for drag analysis</div>
      </div>
    );
  }

  const stateStyles = {
    efficient: { color: '#22c55e', bg: tileStyles.badgeGreen, label: 'Efficient' },
    drag_building: { color: '#eab308', bg: tileStyles.badgeYellow, label: 'Drag Building' },
    high_drag: { color: '#ef4444', bg: tileStyles.badgeRed, label: 'High Drag' },
  };

  const state = stateStyles[data.dragState] || stateStyles.efficient;

  return (
    <div style={tileStyles.container}>
      <div style={tileStyles.header}>
        <div>
          <h3 style={tileStyles.title}>Execution Drag</h3>
          <p style={tileStyles.subtitle}>Coordination overhead eating capacity</p>
        </div>
        <span style={{ ...tileStyles.badge, ...state.bg }}>{state.label}</span>
      </div>

      {/* Drag Value Display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginTop: '16px',
        }}
      >
        <div
          style={{
            ...tileStyles.value,
            color: state.color,
            margin: 0,
          }}
        >
          {data.executionDrag > 0 ? '+' : ''}
          {data.executionDrag}%
        </div>
        <div
          style={{
            flex: 1,
            fontSize: '13px',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: '1.4',
          }}
        >
          {data.executionDrag > 0
            ? 'Coordination growing faster than throughput'
            : 'Execution capacity keeping pace with coordination'}
        </div>
      </div>

      {/* Trend Comparison Bars */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginTop: '20px',
        }}
      >
        {/* Coordination Growth */}
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            padding: '12px',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
            Coordination Growth
          </div>
          <div
            style={{
              height: '8px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.abs(data.coordinationGrowth || 0))}%`,
                backgroundColor: data.coordinationGrowth > 10 ? '#ef4444' : '#eab308',
                borderRadius: '4px',
              }}
            />
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '6px', color: '#fff' }}>
            {data.coordinationGrowth > 0 ? '+' : ''}
            {data.coordinationGrowth || 0}%
          </div>
        </div>

        {/* Response Efficiency */}
        <div
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            padding: '12px',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>
            Response Efficiency
          </div>
          <div
            style={{
              height: '8px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.abs(data.responseEfficiency || 0))}%`,
                backgroundColor: data.responseEfficiency >= 0 ? '#22c55e' : '#ef4444',
                borderRadius: '4px',
              }}
            />
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '6px', color: '#fff' }}>
            {data.responseEfficiency > 0 ? '+' : ''}
            {data.responseEfficiency || 0}%
          </div>
        </div>
      </div>

      <p style={tileStyles.message}>{data.explanation}</p>

      {/* Warning for high drag */}
      {data.dragState === 'high_drag' && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>⚠</span>
          <span>High coordination overhead - consider consolidating communication channels</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Combined Loop Closing Dashboard
// ============================================
export default function LoopClosingDashboard({
  teamId,
  orgId,
  showPhase2 = true,
  showPhase3 = true,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState(null);

  const fetchDashboard = async () => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    try {
      const endpoint = showPhase2
        ? `/loop-closing/full-dashboard/${teamId}`
        : `/loop-closing/dashboard/${teamId}`;
      const response = await api.get(endpoint);
      setData(response.data);
      setError(null);
    } catch (err) {
      // Handle common errors gracefully
      const status = err.response?.status;
      if (status === 403 || status === 404) {
        // Access denied or team not found - just show empty state
        setData(null);
        setError(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh all integrations and regenerate data
  const handleRefreshAll = async () => {
    try {
      setRefreshing(true);
      setRefreshMessage('Syncing all integrations...');

      // Step 1: Trigger sync for all connected integrations
      try {
        const statusRes = await api.get('/integration-dashboard/status');
        const connectedIntegrations =
          statusRes.data.integrations?.filter((i) => i.status === 'connected') || [];

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

      // Step 3: Generate TeamState records
      setRefreshMessage('Generating dashboard data...');
      const userOrgId = orgId || localStorage.getItem('orgId');
      if (userOrgId) {
        await api.post(`/bdi/org/${userOrgId}/generate-all-states`);
      } else if (teamId) {
        await api.post(`/bdi/team/${teamId}/generate-state`);
      }

      // Step 4: Refresh the dashboard display
      setRefreshMessage('Refreshing dashboard...');
      await fetchDashboard();

      setRefreshMessage('✓ Dashboard refreshed successfully!');
      setTimeout(() => setRefreshMessage(null), 3000);
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
      setRefreshMessage('⚠️ Some data may not have synced. Please try again.');
      setTimeout(() => setRefreshMessage(null), 5000);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [teamId, showPhase2]);

  if (!teamId) {
    return null; // Don't show anything if no team selected
  }

  if (loading) {
    return (
      <div style={tileStyles.container}>
        <div style={tileStyles.noData}>Loading pilot metrics...</div>
      </div>
    );
  }

  // If no data yet (calibration period), show a friendly message
  if (!data) {
    return (
      <div style={tileStyles.container}>
        <h3 style={tileStyles.title}>Loop-Closing Metrics</h3>
        <div style={tileStyles.noData}>
          <div style={{ marginBottom: '8px' }}>📊 Collecting baseline data...</div>
          <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '16px' }}>
            SignalTrue is analyzing your team's communication patterns. Metrics will appear within
            24-48 hours as the baseline is established.
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            style={{
              padding: '10px 20px',
              backgroundColor: refreshing ? '#4b5563' : '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
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
                    width: '14px',
                    height: '14px',
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
                fontSize: '12px',
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

  if (error) {
    return (
      <div style={tileStyles.container}>
        <h3 style={tileStyles.title}>Loop-Closing Metrics</h3>
        <div style={tileStyles.noData}>Unable to load metrics. Please try again later.</div>
      </div>
    );
  }

  return (
    <div>
      <h2
        style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#fff',
          marginBottom: '20px',
        }}
      >
        Loop-Closing Pilot Dashboard
      </h2>

      {/* Phase 1 Tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
        }}
      >
        <MeetingROITile teamId={teamId} />
        <FocusForecastTile teamId={teamId} />
      </div>

      <WorkHealthDeltaTile teamId={teamId} />

      {/* Phase 2 Tiles */}
      {showPhase2 && (
        <>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.8)',
              marginTop: '24px',
              marginBottom: '16px',
            }}
          >
            Advanced Metrics
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
            }}
          >
            <AfterHoursCostTile teamId={teamId} />
            <CollisionHeatmapTile teamId={teamId} />
          </div>
        </>
      )}

      {/* Phase 3 Tiles */}
      {showPhase3 && (
        <>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.8)',
              marginTop: '24px',
              marginBottom: '16px',
            }}
          >
            Simulation & Analysis
          </h3>

          {/* Intervention Simulator - Full Width */}
          <InterventionSimulatorTile teamId={teamId} />

          {/* Load Balance & Execution Drag - Side by Side */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginTop: '20px',
            }}
          >
            <LoadBalanceTile teamId={teamId} />
            <ExecutionDragTile teamId={teamId} />
          </div>
        </>
      )}
    </div>
  );
}
