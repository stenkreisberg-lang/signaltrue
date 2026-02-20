import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

interface JourneyEvent {
  _id: string;
  type: 'milestone' | 'alert' | 'intervention' | 'metric_update' | 'goal_achieved';
  title: string;
  description: string;
  significance: 'minor' | 'moderate' | 'major';
  metricSnapshot?: {
    metric: string;
    valueBefore?: number;
    valueAfter: number;
  };
  relatedGoalId?: string;
  createdAt: string;
}

interface JourneySummary {
  totalEvents: number;
  milestones: number;
  alerts: number;
  interventions: number;
  goalsAchieved: number;
  overallProgress: 'early_stage' | 'building' | 'recovering' | 'thriving';
  narrativeSummary: string;
}

interface RecoveryJourneyTimelineProps {
  orgId: string;
  onEventClick?: (event: JourneyEvent) => void;
  maxEvents?: number;
  showNarrative?: boolean;
}

export const RecoveryJourneyTimeline: React.FC<RecoveryJourneyTimelineProps> = ({
  orgId,
  onEventClick,
  maxEvents = 10,
  showNarrative = true,
}) => {
  const [events, setEvents] = useState<JourneyEvent[]>([]);
  const [summary, setSummary] = useState<JourneySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchJourney = async () => {
      try {
        setLoading(true);
        const [eventsRes, summaryRes] = await Promise.all([
          api.get(`/journey/timeline?limit=${maxEvents}`),
          api.get(`/journey/summary`),
        ]);
        setEvents(eventsRes.data);
        setSummary(summaryRes.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load journey');
      } finally {
        setLoading(false);
      }
    };

    if (orgId) {
      fetchJourney();
    }
  }, [orgId, maxEvents]);

  const getEventIcon = (type: string): string => {
    switch (type) {
      case 'milestone':
        return '🏆';
      case 'alert':
        return '⚠️';
      case 'intervention':
        return '💊';
      case 'metric_update':
        return '📊';
      case 'goal_achieved':
        return '🎯';
      default:
        return '📍';
    }
  };

  const getEventColor = (type: string): string => {
    switch (type) {
      case 'milestone':
        return '#10b981';
      case 'alert':
        return '#f59e0b';
      case 'intervention':
        return '#8b5cf6';
      case 'metric_update':
        return '#3b82f6';
      case 'goal_achieved':
        return '#06b6d4';
      default:
        return '#94a3b8';
    }
  };

  const getSignificanceStyle = (significance: string) => {
    switch (significance) {
      case 'major':
        return { borderWidth: 3, scale: 1.1 };
      case 'moderate':
        return { borderWidth: 2, scale: 1 };
      default:
        return { borderWidth: 1, scale: 0.9 };
    }
  };

  const getProgressLabel = (progress: string): { label: string; emoji: string; color: string } => {
    switch (progress) {
      case 'thriving':
        return { label: 'Thriving', emoji: '🌟', color: '#10b981' };
      case 'recovering':
        return { label: 'Recovering', emoji: '📈', color: '#3b82f6' };
      case 'building':
        return { label: 'Building Foundation', emoji: '🧱', color: '#f59e0b' };
      default:
        return { label: 'Early Stage', emoji: '🌱', color: '#94a3b8' };
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const filteredEvents = filter === 'all' ? events : events.filter((e) => e.type === filter);

  if (loading) {
    return (
      <div className="journey-timeline loading">
        <div className="spinner" />
        <span>Loading journey timeline...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="journey-timeline error">
        <p>⚠️ {error}</p>
      </div>
    );
  }

  const progressInfo = summary ? getProgressLabel(summary.overallProgress) : null;

  return (
    <div className="journey-timeline">
      <div className="timeline-header">
        <h3>📈 Recovery Journey</h3>
        {progressInfo && (
          <span
            className="progress-badge"
            style={{ backgroundColor: progressInfo.color + '20', color: progressInfo.color }}
          >
            {progressInfo.emoji} {progressInfo.label}
          </span>
        )}
      </div>

      {showNarrative && summary && (
        <div className="narrative-card">
          <div className="narrative-header">
            <span className="icon">📝</span>
            <span className="label">Journey Summary</span>
          </div>
          <p className="narrative-text">{summary.narrativeSummary}</p>
          <div className="stats-row">
            <div className="stat">
              <span className="value">{summary.milestones}</span>
              <span className="label">🏆 Milestones</span>
            </div>
            <div className="stat">
              <span className="value">{summary.goalsAchieved}</span>
              <span className="label">🎯 Goals Achieved</span>
            </div>
            <div className="stat">
              <span className="value">{summary.interventions}</span>
              <span className="label">💊 Interventions</span>
            </div>
          </div>
        </div>
      )}

      <div className="filter-tabs">
        {['all', 'milestone', 'goal_achieved', 'intervention', 'alert'].map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all'
              ? 'All'
              : f === 'milestone'
                ? '🏆'
                : f === 'goal_achieved'
                  ? '🎯'
                  : f === 'intervention'
                    ? '💊'
                    : '⚠️'}
          </button>
        ))}
      </div>

      <div className="timeline">
        {filteredEvents.length === 0 ? (
          <div className="empty-state">
            <span className="icon">📈</span>
            <p>No events yet. Your journey starts when metrics are tracked!</p>
          </div>
        ) : (
          filteredEvents.map((event, index) => {
            const significance = getSignificanceStyle(event.significance);
            return (
              <div
                key={event._id}
                className={`timeline-event ${event.significance}`}
                onClick={() => onEventClick?.(event)}
              >
                <div className="event-line">
                  {index < filteredEvents.length - 1 && <div className="connector" />}
                </div>
                <div
                  className="event-marker"
                  style={{
                    borderColor: getEventColor(event.type),
                    borderWidth: significance.borderWidth,
                    transform: `scale(${significance.scale})`,
                  }}
                >
                  <span className="marker-icon">{getEventIcon(event.type)}</span>
                </div>
                <div className="event-content">
                  <div className="event-header">
                    <span className="event-date">{formatDate(event.createdAt)}</span>
                    <span className="event-type" style={{ color: getEventColor(event.type) }}>
                      {event.type.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="event-title">{event.title}</h4>
                  <p className="event-description">{event.description}</p>
                  {event.metricSnapshot && (
                    <div className="metric-change">
                      <span className="metric-name">{event.metricSnapshot.metric}</span>
                      {event.metricSnapshot.valueBefore !== undefined && (
                        <>
                          <span className="value before">
                            {event.metricSnapshot.valueBefore.toFixed(1)}
                          </span>
                          <span className="arrow">→</span>
                        </>
                      )}
                      <span className="value after">
                        {event.metricSnapshot.valueAfter.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .journey-timeline {
          background: var(--bg-elevated, #1e293b);
          border: 1px solid var(--border, #334155);
          border-radius: 12px;
          padding: 24px;
        }

        .journey-timeline.loading,
        .journey-timeline.error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: var(--text-muted, #94a3b8);
        }

        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .timeline-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text, #e2e8f0);
        }

        .progress-badge {
          font-size: 12px;
          padding: 4px 12px;
          border-radius: 12px;
          font-weight: 500;
        }

        .narrative-card {
          background: var(--bg, #0f172a);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .narrative-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .narrative-header .icon {
          font-size: 16px;
        }

        .narrative-header .label {
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .narrative-text {
          margin: 0 0 16px 0;
          font-size: 14px;
          color: var(--text, #e2e8f0);
          line-height: 1.5;
        }

        .stats-row {
          display: flex;
          gap: 24px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat .value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text, #e2e8f0);
        }

        .stat .label {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }

        .filter-tab {
          background: var(--bg, #0f172a);
          border: 1px solid var(--border, #334155);
          color: var(--text-muted, #94a3b8);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-tab:hover {
          border-color: var(--accent, #3b82f6);
        }

        .filter-tab.active {
          background: var(--accent, #3b82f6);
          border-color: var(--accent, #3b82f6);
          color: white;
        }

        .timeline {
          position: relative;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: var(--text-muted, #94a3b8);
        }

        .empty-state .icon {
          font-size: 40px;
          display: block;
          margin-bottom: 12px;
          opacity: 0.5;
        }

        .timeline-event {
          display: flex;
          gap: 16px;
          padding-bottom: 24px;
          cursor: pointer;
        }

        .timeline-event:last-child {
          padding-bottom: 0;
        }

        .event-line {
          position: relative;
          width: 40px;
          display: flex;
          justify-content: center;
        }

        .connector {
          position: absolute;
          top: 40px;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: calc(100% - 20px);
          background: var(--border, #334155);
        }

        .event-marker {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid;
          background: var(--bg, #0f172a);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }

        .marker-icon {
          font-size: 16px;
        }

        .event-content {
          flex: 1;
          min-width: 0;
          padding-top: 6px;
        }

        .event-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 4px;
        }

        .event-date {
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
        }

        .event-type {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 500;
        }

        .event-title {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text, #e2e8f0);
        }

        .event-description {
          margin: 0;
          font-size: 13px;
          color: var(--text-muted, #94a3b8);
          line-height: 1.4;
        }

        .metric-change {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          padding: 4px 10px;
          background: var(--bg, #0f172a);
          border-radius: 4px;
          font-size: 12px;
        }

        .metric-name {
          color: var(--text-muted, #94a3b8);
        }

        .metric-change .value {
          font-weight: 600;
          color: var(--text, #e2e8f0);
        }

        .metric-change .arrow {
          color: var(--text-muted, #94a3b8);
          opacity: 0.5;
        }

        .timeline-event.major {
          background: rgba(59, 130, 246, 0.05);
          margin: 0 -16px;
          padding: 16px;
          padding-left: 16px;
          border-radius: 8px;
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--border, #334155);
          border-top-color: var(--accent, #3b82f6);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RecoveryJourneyTimeline;
