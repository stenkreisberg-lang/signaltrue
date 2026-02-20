import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

interface Goal {
  _id: string;
  title: string;
  description?: string;
  targetMetric: string;
  targetValue: number;
  currentValue: number;
  startValue: number;
  deadline: string;
  status: 'on_track' | 'at_risk' | 'completed' | 'overdue';
  progress: number;
  createdAt: string;
}

interface GoalSummary {
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  atRiskGoals: number;
  averageProgress: number;
}

interface GoalTrackerProps {
  orgId: string;
  userId: string;
  maxGoals?: number;
  onGoalClick?: (goal: Goal) => void;
}

export const GoalTracker: React.FC<GoalTrackerProps> = ({
  orgId,
  userId,
  maxGoals,
  onGoalClick,
}) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [summary, setSummary] = useState<GoalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const [goalsRes, summaryRes] = await Promise.all([
        api.get(`/goals?orgId=${orgId}`),
        api.get(`/goals/summary?orgId=${orgId}`),
      ]);
      setGoals(goalsRes.data?.goals || goalsRes.data || []);
      setSummary(summaryRes.data?.summary || summaryRes.data || null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      fetchGoals();
    }
  }, [orgId]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'on_track':
        return '#3b82f6';
      case 'at_risk':
        return '#f59e0b';
      case 'overdue':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'on_track':
        return '→';
      case 'at_risk':
        return '⚠';
      case 'overdue':
        return '!';
      default:
        return '○';
    }
  };

  const formatMetricName = (metric: string): string => {
    const names: Record<string, string> = {
      meetingLoad: 'Meeting Load',
      afterHours: 'After-Hours Work',
      responseLatency: 'Response Latency',
      sentiment: 'Sentiment',
      networkBreadth: 'Network Breadth',
      focusTime: 'Focus Time',
      recoveryIndex: 'Recovery Index',
      energyIndex: 'Energy Index',
      oarScore: 'OAR Score',
    };
    return names[metric] || metric;
  };

  const getDaysRemaining = (deadline: string): string => {
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  if (loading) {
    return (
      <div className="goal-tracker loading">
        <div className="spinner" />
        <span>Loading goals...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="goal-tracker error">
        <p>⚠️ {error}</p>
        <button onClick={fetchGoals}>Retry</button>
      </div>
    );
  }

  const displayGoals = maxGoals ? goals.slice(0, maxGoals) : goals;

  return (
    <div className="goal-tracker">
      <div className="tracker-header">
        <h3>🎯 Goal Tracking</h3>
        {summary && (
          <div className="summary-badges">
            <span className="badge completed">{summary.completedGoals} done</span>
            <span className="badge active">{summary.activeGoals} active</span>
            {summary.atRiskGoals > 0 && (
              <span className="badge at-risk">{summary.atRiskGoals} at risk</span>
            )}
          </div>
        )}
      </div>

      {summary && (
        <div className="overall-progress">
          <div className="progress-label">
            <span>Overall Progress</span>
            <span>{Math.round(summary.averageProgress)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${summary.averageProgress}%` }} />
          </div>
        </div>
      )}

      <div className="goals-list">
        {displayGoals.length === 0 ? (
          <div className="empty-state">
            <span className="icon">🎯</span>
            <p>No goals set yet</p>
            <button onClick={() => setShowCreateForm(true)}>Create Your First Goal</button>
          </div>
        ) : (
          displayGoals.map((goal) => (
            <div
              key={goal._id}
              className={`goal-card ${goal.status}`}
              onClick={() => onGoalClick?.(goal)}
            >
              <div className="goal-header">
                <span
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(goal.status) }}
                >
                  {getStatusIcon(goal.status)}
                </span>
                <div className="goal-info">
                  <h4>{goal.title}</h4>
                  <span className="metric-badge">{formatMetricName(goal.targetMetric)}</span>
                </div>
                <span className="deadline">{getDaysRemaining(goal.deadline)}</span>
              </div>

              <div className="goal-progress">
                <div className="progress-numbers">
                  <span className="current">{goal.currentValue.toFixed(1)}</span>
                  <span className="separator">→</span>
                  <span className="target">{goal.targetValue.toFixed(1)}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, goal.progress)}%`,
                      backgroundColor: getStatusColor(goal.status),
                    }}
                  />
                </div>
                <span className="progress-percent">{Math.round(goal.progress)}%</span>
              </div>
            </div>
          ))
        )}
      </div>

      {maxGoals && goals.length > maxGoals && (
        <div className="view-all">
          <button onClick={() => onGoalClick?.(goals[0])}>View All {goals.length} Goals →</button>
        </div>
      )}

      {showCreateForm && (
        <CreateGoalModal
          orgId={orgId}
          userId={userId}
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false);
            fetchGoals();
          }}
        />
      )}

      <style>{`
        .goal-tracker {
          background: var(--bg-elevated, #1e293b);
          border: 1px solid var(--border, #334155);
          border-radius: 12px;
          padding: 24px;
        }

        .goal-tracker.loading,
        .goal-tracker.error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: var(--text-muted, #94a3b8);
        }

        .tracker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .tracker-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text, #e2e8f0);
        }

        .summary-badges {
          display: flex;
          gap: 8px;
        }

        .badge {
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 500;
        }

        .badge.completed { background: #065f46; color: #6ee7b7; }
        .badge.active { background: #1e3a5f; color: #93c5fd; }
        .badge.at-risk { background: #78350f; color: #fcd34d; }

        .overall-progress {
          margin-bottom: 24px;
          padding: 16px;
          background: var(--bg, #0f172a);
          border-radius: 8px;
        }

        .progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--text-muted, #94a3b8);
          margin-bottom: 8px;
        }

        .progress-bar {
          height: 8px;
          background: var(--border, #334155);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #3b82f6;
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .goals-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: var(--text-muted, #94a3b8);
        }

        .empty-state .icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }

        .empty-state button {
          margin-top: 16px;
          background: var(--accent, #3b82f6);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
        }

        .goal-card {
          background: var(--bg, #0f172a);
          border: 1px solid var(--border, #334155);
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .goal-card:hover {
          border-color: var(--accent, #3b82f6);
        }

        .goal-card.at_risk {
          border-left: 3px solid #f59e0b;
        }

        .goal-card.overdue {
          border-left: 3px solid #ef4444;
        }

        .goal-card.completed {
          opacity: 0.7;
        }

        .goal-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
        }

        .status-indicator {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          font-weight: bold;
          flex-shrink: 0;
        }

        .goal-info {
          flex: 1;
        }

        .goal-info h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text, #e2e8f0);
        }

        .metric-badge {
          font-size: 11px;
          background: var(--bg-elevated, #1e293b);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--text-muted, #94a3b8);
        }

        .deadline {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
          white-space: nowrap;
        }

        .goal-progress {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .progress-numbers {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
          min-width: 80px;
        }

        .progress-numbers .current {
          font-weight: 600;
          color: var(--text, #e2e8f0);
        }

        .progress-numbers .separator {
          opacity: 0.5;
        }

        .goal-progress .progress-bar {
          flex: 1;
          height: 6px;
        }

        .progress-percent {
          font-size: 12px;
          font-weight: 600;
          color: var(--text, #e2e8f0);
          min-width: 36px;
          text-align: right;
        }

        .view-all {
          margin-top: 16px;
          text-align: center;
        }

        .view-all button {
          background: transparent;
          border: 1px solid var(--border, #334155);
          color: var(--text-muted, #94a3b8);
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .view-all button:hover {
          border-color: var(--accent, #3b82f6);
          color: var(--accent, #3b82f6);
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

// Create Goal Modal Component
interface CreateGoalModalProps {
  orgId: string;
  userId: string;
  onClose: () => void;
  onCreated: () => void;
}

const CreateGoalModal: React.FC<CreateGoalModalProps> = ({ orgId, userId, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetMetric: 'oarScore',
    targetValue: 80,
    deadline: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metrics = [
    { value: 'oarScore', label: 'OAR Score' },
    { value: 'meetingLoad', label: 'Meeting Load' },
    { value: 'focusTime', label: 'Focus Time' },
    { value: 'recoveryIndex', label: 'Recovery Index' },
    { value: 'energyIndex', label: 'Energy Index' },
    { value: 'sentiment', label: 'Sentiment' },
    { value: 'afterHours', label: 'After-Hours Work' },
    { value: 'responseLatency', label: 'Response Latency' },
    { value: 'networkBreadth', label: 'Network Breadth' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post('/goals', {
        ...formData,
        orgId,
        createdBy: userId,
      });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🎯 Create New Goal</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Goal Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Improve team focus time by Q2"
              required
            />
          </div>

          <div className="form-group">
            <label>Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add context about this goal..."
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Target Metric</label>
              <select
                value={formData.targetMetric}
                onChange={(e) => setFormData({ ...formData, targetMetric: e.target.value })}
              >
                {metrics.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Target Value</label>
              <input
                type="number"
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                min={0}
                max={100}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Deadline</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>

        <style>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            background: var(--bg-elevated, #1e293b);
            border: 1px solid var(--border, #334155);
            border-radius: 12px;
            width: 100%;
            max-width: 480px;
            max-height: 90vh;
            overflow-y: auto;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid var(--border, #334155);
          }

          .modal-header h3 {
            margin: 0;
            font-size: 18px;
            color: var(--text, #e2e8f0);
          }

          .close-btn {
            background: transparent;
            border: none;
            font-size: 24px;
            color: var(--text-muted, #94a3b8);
            cursor: pointer;
          }

          form {
            padding: 24px;
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-group label {
            display: block;
            font-size: 13px;
            color: var(--text-muted, #94a3b8);
            margin-bottom: 6px;
          }

          .form-group input,
          .form-group select,
          .form-group textarea {
            width: 100%;
            background: var(--bg, #0f172a);
            border: 1px solid var(--border, #334155);
            border-radius: 6px;
            padding: 10px 12px;
            color: var(--text, #e2e8f0);
            font-size: 14px;
          }

          .form-group input:focus,
          .form-group select:focus,
          .form-group textarea:focus {
            outline: none;
            border-color: var(--accent, #3b82f6);
          }

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .error-message {
            background: #7f1d1d;
            color: #fca5a5;
            padding: 10px;
            border-radius: 6px;
            font-size: 13px;
            margin-bottom: 20px;
          }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }

          .cancel-btn {
            background: transparent;
            border: 1px solid var(--border, #334155);
            color: var(--text-muted, #94a3b8);
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
          }

          .submit-btn {
            background: var(--accent, #3b82f6);
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          }

          .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
};

export default GoalTracker;
