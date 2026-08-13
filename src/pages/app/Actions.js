import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FlaskConical, Play, RefreshCw, Users, XCircle } from 'lucide-react';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext, normalizeId } from '../../utils/authContext';

const ORG_ROLES = new Set(['master_admin', 'admin', 'hr_admin', 'org_admin', 'executive']);
const ACTIVE_STATUSES = new Set(['planned', 'active', 'pending-recheck']);
const COMPLETE_STATUSES = new Set(['completed', 'resolved']);

function actionTitle(action) {
  return action.title || action.actionTaken || action.action || 'Work-pattern action';
}

function formatDate(value) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function normalizeRecommendation(signal, action, index) {
  return {
    ...action,
    key: `${signal._id}:${action.actionId || index}`,
    signalId: signal._id,
    teamId: normalizeId(signal.teamId),
    teamName: signal.teamId?.name,
    signalTitle: signal.title,
    signalType: signal.signalType,
    severity: signal.severity,
    title: action.title || action.action,
    description: action.description,
    expectedEffect: action.expectedEffect,
    actionType: action.actionId,
  };
}

function statusLabel(status) {
  return (
    {
      planned: 'Planned',
      active: 'In progress',
      'pending-recheck': 'Review ready',
      completed: 'Reviewed',
      abandoned: 'Stopped',
    }[status] || status
  );
}

export default function Actions() {
  const [context, setContext] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [draft, setDraft] = useState(null);
  const [ownerRole, setOwnerRole] = useState('Team lead');
  const [rationale, setRationale] = useState('');
  const [consultationStatus, setConsultationStatus] = useState('planned');
  const [reviewNotes, setReviewNotes] = useState({});
  const [busyId, setBusyId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextContext = await getAuthenticatedContext();
      setContext(nextContext);
      if (!nextContext.orgId) throw new Error('No organization context available.');

      const orgView = ORG_ROLES.has(nextContext.user?.role);
      if (!orgView && !nextContext.teamId) throw new Error('No team context available.');
      const interventionPath = orgView
        ? `/interventions/org/${nextContext.orgId}`
        : `/interventions/team/${nextContext.teamId}`;

      const [interventionRes, signalRes] = await Promise.all([
        api.get(interventionPath),
        api.get(`/signals/org/${nextContext.orgId}`),
      ]);
      const nextInterventions = interventionRes.data.interventions || [];
      setInterventions(nextInterventions);

      const activeSignalIds = new Set(
        nextInterventions
          .filter((item) => ACTIVE_STATUSES.has(item.status))
          .map((item) => normalizeId(item.signalId))
          .filter(Boolean)
      );
      const nextRecommendations = (signalRes.data.signals || [])
        .filter((signal) => ['Open', 'Acknowledged'].includes(signal.status))
        .flatMap((signal) =>
          (signal.recommendedActions || signal.actions || []).map((action, index) =>
            normalizeRecommendation(signal, action, index)
          )
        )
        .filter((action) => action.title && !activeSignalIds.has(action.signalId))
        .slice(0, 12);
      setRecommendations(nextRecommendations);
    } catch (err) {
      console.error('[Actions] Error:', err);
      setError(err.response?.data?.message || err.message || 'Actions are currently unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const active = useMemo(
    () => interventions.filter((item) => ACTIVE_STATUSES.has(item.status)),
    [interventions]
  );
  const completed = useMemo(
    () => interventions.filter((item) => COMPLETE_STATUSES.has(item.status)),
    [interventions]
  );
  const dueCount = active.filter(
    (item) => item.status === 'pending-recheck' || new Date(item.recheckDate) <= new Date()
  ).length;

  const openStartForm = (action) => {
    setDraft(action);
    setOwnerRole('Team lead');
    setRationale(`Selected in response to: ${action.signalTitle}`);
    setConsultationStatus('planned');
    setNotice(null);
  };

  const startAction = async (event) => {
    event.preventDefault();
    if (!draft) return;
    setBusyId(draft.key);
    try {
      await api.post('/interventions', {
        signalId: draft.signalId,
        teamId: draft.teamId,
        orgId: context.orgId,
        signalType: draft.signalType,
        title: draft.title,
        description: draft.description,
        actionTaken: draft.title,
        actionType: draft.actionType,
        expectedEffect: draft.expectedEffect,
        effort: normalizeEffort(draft.effort),
        timeframe: draft.timeframe || '2 weeks',
        ownerRole,
        decisionRationale: rationale,
        consultationStatus,
      });
      setDraft(null);
      setNotice('Action started. SignalTrue will compare the same metric again after 14 days.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'The action could not be started.');
    } finally {
      setBusyId(null);
    }
  };

  const measureAction = async (intervention) => {
    setBusyId(intervention._id);
    setError(null);
    try {
      await api.post(`/interventions/${intervention._id}/auto-compute`);
      setNotice('The review was measured against the same recorded metric.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'The review could not be measured yet.');
    } finally {
      setBusyId(null);
    }
  };

  const acknowledgeReview = async (intervention) => {
    setBusyId(intervention._id);
    setError(null);
    try {
      await api.put(`/interventions/${intervention._id}/outcome`, {
        userNotes: reviewNotes[intervention._id] || '',
      });
      setNotice('Review acknowledged and added to the organization evidence register.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'The review could not be acknowledged.');
    } finally {
      setBusyId(null);
    }
  };

  const stopAction = async (intervention) => {
    setBusyId(intervention._id);
    setError(null);
    try {
      await api.delete(`/interventions/${intervention._id}`);
      setNotice('Action stopped. Its history remains available for audit.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'The action could not be stopped.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !context) {
    return <div className="app-loading">Loading action reviews...</div>;
  }

  return (
    <AppShell user={context?.user} section="Actions" width="wide">
      <PageHeader
        eyebrow="Observe, act, re-measure"
        title="Action reviews"
        description="Turn a measured team pattern into an owned change, then check the same metric after 14 days. Observed changes are evidence for review, not proof of causation."
        action={
          <button type="button" className="action-icon-button" onClick={loadData} title="Refresh">
            <RefreshCw size={17} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        }
      />

      <div className="action-summary" aria-label="Action review summary">
        <SummaryMetric value={active.length} label="Active actions" icon={Play} />
        <SummaryMetric value={dueCount} label="Reviews due" icon={Clock3} />
        <SummaryMetric value={completed.length} label="Measured reviews" icon={FlaskConical} />
        <SummaryMetric value={recommendations.length} label="Ready to consider" icon={Users} />
      </div>

      {error && <div className="action-notice is-error">{error}</div>}
      {notice && <div className="action-notice is-success">{notice}</div>}

      {draft && (
        <form className="action-start-form" onSubmit={startAction}>
          <div className="action-start-heading">
            <div>
              <p className="app-eyebrow">Start a measured change</p>
              <h2>{draft.title}</h2>
              <p>{draft.expectedEffect || draft.description}</p>
            </div>
            <button
              type="button"
              className="action-close-button"
              onClick={() => setDraft(null)}
              title="Close"
            >
              <XCircle size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="action-form-grid">
            <label>
              Owner
              <select value={ownerRole} onChange={(event) => setOwnerRole(event.target.value)}>
                <option>Team lead</option>
                <option>HR</option>
                <option>Executive sponsor</option>
                <option>Operations</option>
              </select>
            </label>
            <label>
              Team consultation
              <select
                value={consultationStatus}
                onChange={(event) => setConsultationStatus(event.target.value)}
              >
                <option value="planned">Planned</option>
                <option value="completed">Completed</option>
                <option value="not_needed">Not needed</option>
              </select>
            </label>
            <label className="action-form-wide">
              Decision rationale
              <textarea
                value={rationale}
                onChange={(event) => setRationale(event.target.value)}
                rows={3}
                required
              />
            </label>
          </div>
          <div className="action-form-footer">
            <span>Reviews are scheduled for day 14 and day 28.</span>
            <button type="submit" className="action-primary-button" disabled={busyId === draft.key}>
              <Play size={16} aria-hidden="true" />
              Start review
            </button>
          </div>
        </form>
      )}

      <section className="action-section">
        <div className="app-section-heading">
          <div>
            <h2>In progress</h2>
            <p>Owned changes with a defined metric and review date.</p>
          </div>
        </div>
        {active.length === 0 ? (
          <EmptyRow text="No actions are currently being measured." />
        ) : (
          <div className="action-list">
            {active.map((item) => (
              <InterventionRow
                key={item._id}
                item={item}
                busy={busyId === item._id}
                notes={reviewNotes[item._id] || ''}
                onNotes={(value) =>
                  setReviewNotes((current) => ({ ...current, [item._id]: value }))
                }
                onMeasure={() => measureAction(item)}
                onAcknowledge={() => acknowledgeReview(item)}
                onStop={() => stopAction(item)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="action-section">
        <div className="app-section-heading">
          <div>
            <h2>Ready to consider</h2>
            <p>Recommendations tied to currently visible, privacy-gated signals.</p>
          </div>
        </div>
        {recommendations.length === 0 ? (
          <EmptyRow text="No additional evidence-backed actions are ready." />
        ) : (
          <div className="action-list">
            {recommendations.map((item) => (
              <article className="action-row" key={item.key}>
                <div className="action-row-main">
                  <div className="action-row-heading">
                    <h3>{item.title}</h3>
                    <span className="action-status">Suggested</span>
                  </div>
                  <p>{item.description || item.expectedEffect}</p>
                  <div className="action-meta">
                    <span>{item.teamName || 'Team'}</span>
                    <span>{item.signalTitle}</span>
                    {item.effort && <span>{normalizeEffort(item.effort)} effort</span>}
                  </div>
                </div>
                <button
                  type="button"
                  className="action-primary-button"
                  onClick={() => openStartForm(item)}
                >
                  <Play size={16} aria-hidden="true" />
                  Review action
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {completed.length > 0 && (
        <section className="action-section">
          <div className="app-section-heading">
            <div>
              <h2>Evidence register</h2>
              <p>Observed before-and-after changes retained for organizational learning.</p>
            </div>
          </div>
          <div className="action-list">
            {completed.slice(0, 12).map((item) => (
              <CompletedRow key={item._id} item={item} />
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function SummaryMetric({ value, label, icon: Icon }) {
  return (
    <div className="action-summary-item">
      <Icon size={18} aria-hidden="true" />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EmptyRow({ text }) {
  return (
    <div className="action-empty">
      <CheckCircle2 size={20} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

function InterventionRow({ item, busy, notes, onNotes, onMeasure, onAcknowledge, onStop }) {
  const due = new Date(item.recheckDate) <= new Date();
  const reviewReady = item.status === 'pending-recheck' && item.outcomeDelta?.metricAfter != null;
  const change = item.outcomeDelta?.percentChange;
  return (
    <article className="action-row is-active">
      <div className="action-row-main">
        <div className="action-row-heading">
          <h3>{actionTitle(item)}</h3>
          <span className={`action-status status-${item.status}`}>{statusLabel(item.status)}</span>
        </div>
        <p>{item.description || item.expectedEffect}</p>
        <div className="action-meta">
          <span>{item.teamId?.name || 'Team'}</span>
          <span>Owner: {item.decision?.ownerRole || 'Team lead'}</span>
          <span>Review: {formatDate(item.recheckDate)}</span>
          {item.targetMetricLabel && <span>Metric: {item.targetMetricLabel}</span>}
        </div>
        {item.evidenceSnapshot?.value != null && (
          <div className="action-evidence">
            <strong>Starting evidence</strong>
            <span>{item.evidenceSnapshot.value}</span>
            {item.evidenceSnapshot.baselineValue != null && (
              <span>Team baseline {item.evidenceSnapshot.baselineValue}</span>
            )}
          </div>
        )}
        {reviewReady && (
          <div className="action-review">
            <div>
              <strong>Observed at review</strong>
              <span>
                {item.outcomeDelta.metricBefore} to {item.outcomeDelta.metricAfter}
                {change != null ? ` (${change > 0 ? '+' : ''}${change}%)` : ''}
              </span>
            </div>
            <label>
              Context or confounding events
              <textarea value={notes} onChange={(event) => onNotes(event.target.value)} rows={2} />
            </label>
          </div>
        )}
      </div>
      <div className="action-row-controls">
        {reviewReady ? (
          <button
            type="button"
            className="action-primary-button"
            onClick={onAcknowledge}
            disabled={busy}
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            Acknowledge
          </button>
        ) : (
          <button
            type="button"
            className="action-primary-button"
            onClick={onMeasure}
            disabled={!due || busy}
            title={
              due ? 'Measure the same metric now' : `Available ${formatDate(item.recheckDate)}`
            }
          >
            <FlaskConical size={16} aria-hidden="true" />
            {due ? 'Measure now' : 'Await review'}
          </button>
        )}
        <button type="button" className="action-secondary-button" onClick={onStop} disabled={busy}>
          Stop
        </button>
      </div>
    </article>
  );
}

function CompletedRow({ item }) {
  const review = item.reviews?.[item.reviews.length - 1];
  const change = item.outcomeDelta?.percentChange;
  return (
    <article className="action-row is-complete">
      <div className="action-row-main">
        <div className="action-row-heading">
          <h3>{actionTitle(item)}</h3>
          <span className="action-status status-completed">Reviewed</span>
        </div>
        <p>{item.outcomeSummary || item.userNotes || 'No additional context recorded.'}</p>
        <div className="action-meta">
          <span>{item.teamId?.name || 'Team'}</span>
          {item.targetMetricLabel && <span>{item.targetMetricLabel}</span>}
          {item.outcomeDelta?.metricAfter != null && (
            <span>
              Observed change: {change != null ? `${change > 0 ? '+' : ''}${change}%` : 'recorded'}
            </span>
          )}
          {review?.interpretation && <span>{review.interpretation.replaceAll('_', ' ')}</span>}
        </div>
      </div>
    </article>
  );
}

function normalizeEffort(value) {
  const normalized = String(value || 'Medium').toLowerCase();
  if (normalized === 'low') return 'Low';
  if (normalized === 'high') return 'High';
  return 'Medium';
}
