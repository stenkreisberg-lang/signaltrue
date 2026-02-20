import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

interface OARData {
  oarScore: number;
  pillars: {
    execution: number;
    engagement: number;
    resilience: number;
    culture: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  changeFromLast: number;
  lastUpdated: string;
}

interface OARScoreWidgetProps {
  orgId: string;
  showHistory?: boolean;
  compact?: boolean;
}

export const OARScoreWidget: React.FC<OARScoreWidgetProps> = ({
  orgId,
  showHistory = false,
  compact = false,
}) => {
  const [data, setData] = useState<OARData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOARScore = async () => {
      try {
        setLoading(true);
        // Backend uses req.user.orgId from auth token, no orgId in URL
        const endpoint = showHistory ? `/oar/org/history` : `/oar/org`;
        const response = await api.get(endpoint);
        setData(response.data?.oar || response.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load OAR score');
      } finally {
        setLoading(false);
      }
    };

    if (orgId) {
      fetchOARScore();
    }
  }, [orgId, showHistory]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // amber
    if (score >= 40) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getTrendLabel = (trend: string): string => {
    switch (trend) {
      case 'improving':
        return 'Improving';
      case 'declining':
        return 'Declining';
      default:
        return 'Stable';
    }
  };

  if (loading) {
    return (
      <div className="oar-widget loading">
        <div className="spinner" />
        <p>Calculating OAR Score...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="oar-widget error">
        <p>⚠️ {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="oar-widget empty">
        <p>No OAR data available yet</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="oar-widget compact">
        <div className="score-circle" style={{ borderColor: getScoreColor(data.oarScore) }}>
          <span className="score-value">{Math.round(data.oarScore)}</span>
        </div>
        <div className="score-label">
          <span>OAR Score</span>
          <span className="trend">{getTrendIcon(data.trend)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="oar-widget">
      <div className="widget-header">
        <h3>📊 Organizational Agility Rating</h3>
        <span className={`trend-badge ${data.trend}`}>
          {getTrendIcon(data.trend)} {getTrendLabel(data.trend)}
        </span>
      </div>

      <div className="score-display">
        <div
          className="score-circle large"
          style={{
            borderColor: getScoreColor(data.oarScore),
            boxShadow: `0 0 20px ${getScoreColor(data.oarScore)}40`,
          }}
        >
          <span className="score-value">{Math.round(data.oarScore)}</span>
          <span className="score-label">/ 100</span>
        </div>
        {data.changeFromLast !== 0 && (
          <div className={`change-indicator ${data.changeFromLast > 0 ? 'positive' : 'negative'}`}>
            {data.changeFromLast > 0 ? '+' : ''}
            {data.changeFromLast.toFixed(1)} pts
          </div>
        )}
      </div>

      <div className="pillars-grid">
        <div className="pillar">
          <div className="pillar-header">
            <span className="pillar-icon">⚡</span>
            <span className="pillar-name">Execution</span>
          </div>
          <div className="pillar-bar">
            <div
              className="pillar-fill"
              style={{
                width: `${data.pillars.execution}%`,
                backgroundColor: getScoreColor(data.pillars.execution),
              }}
            />
          </div>
          <span className="pillar-value">{Math.round(data.pillars.execution)}</span>
        </div>

        <div className="pillar">
          <div className="pillar-header">
            <span className="pillar-icon">💬</span>
            <span className="pillar-name">Engagement</span>
          </div>
          <div className="pillar-bar">
            <div
              className="pillar-fill"
              style={{
                width: `${data.pillars.engagement}%`,
                backgroundColor: getScoreColor(data.pillars.engagement),
              }}
            />
          </div>
          <span className="pillar-value">{Math.round(data.pillars.engagement)}</span>
        </div>

        <div className="pillar">
          <div className="pillar-header">
            <span className="pillar-icon">🛡️</span>
            <span className="pillar-name">Resilience</span>
          </div>
          <div className="pillar-bar">
            <div
              className="pillar-fill"
              style={{
                width: `${data.pillars.resilience}%`,
                backgroundColor: getScoreColor(data.pillars.resilience),
              }}
            />
          </div>
          <span className="pillar-value">{Math.round(data.pillars.resilience)}</span>
        </div>

        <div className="pillar">
          <div className="pillar-header">
            <span className="pillar-icon">🌱</span>
            <span className="pillar-name">Culture</span>
          </div>
          <div className="pillar-bar">
            <div
              className="pillar-fill"
              style={{
                width: `${data.pillars.culture}%`,
                backgroundColor: getScoreColor(data.pillars.culture),
              }}
            />
          </div>
          <span className="pillar-value">{Math.round(data.pillars.culture)}</span>
        </div>
      </div>

      <div className="widget-footer">
        <span className="last-updated">
          Last updated: {new Date(data.lastUpdated).toLocaleDateString()}
        </span>
      </div>

      <style>{`
        .oar-widget {
          background: var(--bg-elevated, #1e293b);
          border: 1px solid var(--border, #334155);
          border-radius: 12px;
          padding: 24px;
        }

        .oar-widget.loading,
        .oar-widget.error,
        .oar-widget.empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: var(--text-muted, #94a3b8);
        }

        .oar-widget.compact {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .widget-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text, #e2e8f0);
        }

        .trend-badge {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 12px;
          background: var(--bg, #0f172a);
        }

        .trend-badge.improving { color: #10b981; }
        .trend-badge.declining { color: #ef4444; }
        .trend-badge.stable { color: #94a3b8; }

        .score-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 32px;
        }

        .score-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 4px solid;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--bg, #0f172a);
        }

        .score-circle.large {
          width: 140px;
          height: 140px;
        }

        .oar-widget.compact .score-circle {
          width: 48px;
          height: 48px;
          border-width: 3px;
        }

        .score-value {
          font-size: 36px;
          font-weight: 800;
          color: var(--text, #e2e8f0);
        }

        .oar-widget.compact .score-value {
          font-size: 16px;
        }

        .score-label {
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
        }

        .change-indicator {
          margin-top: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .change-indicator.positive { color: #10b981; }
        .change-indicator.negative { color: #ef4444; }

        .pillars-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .pillar {
          background: var(--bg, #0f172a);
          border-radius: 8px;
          padding: 12px;
        }

        .pillar-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .pillar-icon {
          font-size: 16px;
        }

        .pillar-name {
          font-size: 13px;
          color: var(--text-muted, #94a3b8);
        }

        .pillar-bar {
          height: 6px;
          background: var(--border, #334155);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 4px;
        }

        .pillar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        .pillar-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--text, #e2e8f0);
        }

        .widget-footer {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border, #334155);
          text-align: center;
        }

        .last-updated {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border, #334155);
          border-top-color: var(--accent, #3b82f6);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default OARScoreWidget;
