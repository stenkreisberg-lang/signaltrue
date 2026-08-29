import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CircleHelp,
  Database,
  RefreshCw,
  Send,
  ShieldCheck,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

const DEFAULT_QUESTIONS = [
  'What changed most compared with our six-week baseline?',
  'What should leadership verify before acting on the top signal?',
  'What reversible action should we test for 14 days?',
  'Which metric should we monitor next week and why?',
];

const CONTEXT_OPTIONS = [
  ['launch', 'Launch or deadline'],
  ['offsite', 'Offsite or planning week'],
  ['vacation_period', 'Vacation or leave'],
  ['client_crunch', 'Client crunch'],
  ['reorganization', 'Reorganization'],
  ['data_issue', 'Known data issue'],
  ['other', 'Other'],
];

function formatDate(value) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value)
  );
}

function formatMetricValue(metric, value = metric?.current) {
  if (!metric?.available || value == null) return 'Not measured';
  const formatted = Number(value).toLocaleString(undefined, {
    maximumFractionDigits: Number.isInteger(Number(value)) ? 0 : 1,
  });
  if (metric.unit === '%') return `${formatted}%`;
  if (metric.unit === 'hours') return `${formatted}h`;
  if (metric.unit === '/100') return `${formatted}/100`;
  return formatted;
}

function Direction({ metric }) {
  if (!metric.available) {
    return <span className="text-amber-700">Data unavailable</span>;
  }
  const Icon =
    metric.changePct > 0 ? ArrowUpRight : metric.changePct < 0 ? ArrowDownRight : ArrowRight;
  const color =
    metric.direction === 'review'
      ? 'text-red-700'
      : metric.direction === 'intended'
        ? 'text-emerald-700'
        : 'text-slate-500';
  return (
    <span className={`inline-flex items-center gap-1 ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {metric.changePct == null
        ? 'No comparable prior value'
        : `${Math.abs(metric.changePct)}% vs prior week`}
    </span>
  );
}

function StatusBadge({ children, tone = 'neutral' }) {
  const tones = {
    critical: 'border-red-200 bg-red-50 text-red-800',
    review: 'border-amber-200 bg-amber-50 text-amber-800',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-caption font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function statusTone(label) {
  const value = String(label || '').toLowerCase();
  if (value.includes('critical') || value.includes('strong')) return 'critical';
  if (value.includes('review') || value.includes('attention') || value.includes('incomplete')) {
    return 'review';
  }
  if (value.includes('stable') || value.includes('ready')) return 'good';
  return 'info';
}

function MetricCard({ metric }) {
  return (
    <div className="app-dashboard-card">
      <span className="app-dashboard-card-value">{formatMetricValue(metric)}</span>
      <span className="app-dashboard-card-label">{metric.label}</span>
      <span className="app-dashboard-card-note">
        <Direction metric={metric} />
      </span>
      {metric.baseline != null && metric.available && (
        <span className="app-dashboard-card-note">
          Six-week baseline: {formatMetricValue(metric, metric.baseline)}
        </span>
      )}
    </div>
  );
}

function ActionCard({ action, fallbackTitle = 'Recommended action' }) {
  if (!action) return null;
  return (
    <div className="rounded-container border border-indigo-200 bg-indigo-50/60 p-4">
      <p className="text-caption font-extrabold uppercase tracking-wider text-indigo-700">
        {action.title || fallbackTitle}
      </p>
      <p className="mt-2 text-caption font-bold leading-6 text-slate-900">
        {action.action || action.detail}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-caption text-slate-600">
        {action.owner && <StatusBadge>{action.owner}</StatusBadge>}
        {action.effort && <StatusBadge>{action.effort} effort</StatusBadge>}
        {action.reviewWindow && (
          <StatusBadge tone="info">Review: {action.reviewWindow}</StatusBadge>
        )}
      </div>
      {action.measure && (
        <p className="mt-3 text-caption leading-5 text-slate-600">
          <strong>Measure:</strong> {action.measure}
        </p>
      )}
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="rounded-container bg-slate-50 p-5 text-caption text-slate-600">{children}</div>
  );
}

function AskBrief({ questions, onAsk, asking, answer, error }) {
  const [question, setQuestion] = useState('');
  const suggestions = questions?.length ? questions.slice(0, 4) : DEFAULT_QUESTIONS;

  const submit = (event) => {
    event?.preventDefault();
    if (question.trim().length >= 4) onAsk(question.trim());
  };

  return (
    <section className="app-panel border-indigo-200" id="ask-ai">
      <div className="flex items-start gap-3">
        <div className="rounded-container bg-indigo-100 p-2.5 text-indigo-700">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h2>Ask about this brief</h2>
          <p className="app-muted mb-0">
            The answer is restricted to this organization’s saved report, measured evidence, and
            approved week context. It cannot inspect message content or individual employees.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((item) => (
          <button
            key={item}
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-caption font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-800"
            onClick={() => setQuestion(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <form className="mt-4 flex gap-2" onSubmit={submit}>
        <label className="sr-only" htmlFor="brief-question">
          Ask a question about this weekly brief
        </label>
        <input
          id="brief-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={500}
          placeholder="For example: what should we verify before acting?"
          className="min-w-0 flex-1 rounded-control border border-slate-300 bg-white px-4 py-3 text-caption outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="submit"
          disabled={asking || question.trim().length < 4}
          className="inline-flex items-center gap-2 rounded-control bg-slate-900 px-4 py-3 text-caption font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {asking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Ask
        </button>
      </form>

      {error && <p className="mt-3 text-caption text-red-700">{error}</p>}

      {answer && (
        <div className="mt-5 rounded-container border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-body font-bold text-slate-900">Report-grounded answer</h3>
            <StatusBadge tone={answer.source === 'ai' ? 'info' : 'neutral'}>
              {answer.source === 'ai' ? 'AI interpretation' : 'Rule-based fallback'}
            </StatusBadge>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-caption leading-7 text-slate-700">
            {answer.answer}
          </p>

          {answer.evidence?.length > 0 && (
            <div className="mt-4">
              <p className="text-caption font-extrabold uppercase tracking-wider text-slate-500">
                Evidence used
              </p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {answer.evidence.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="rounded-control bg-slate-50 p-3 text-caption"
                  >
                    <strong className="text-slate-900">{item.label}</strong>
                    <p className="mt-1 text-slate-600">
                      Current: {item.current ?? 'not available'} {item.unit || ''} · Prior:{' '}
                      {item.previous ?? 'not available'} · Baseline:{' '}
                      {item.baseline ?? 'not available'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {answer.suggestions?.length > 0 && (
            <div className="mt-4 grid gap-3">
              {answer.suggestions.map((item, index) => (
                <ActionCard key={`${item.action}-${index}`} action={item} />
              ))}
            </div>
          )}

          {answer.caveats?.length > 0 && (
            <div className="mt-4 rounded-control border border-amber-200 bg-amber-50 p-3">
              {answer.caveats.map((item) => (
                <p key={item} className="text-caption leading-5 text-amber-900">
                  {item}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function LatestBrief() {
  const [user, setUser] = useState(null);
  const [brief, setBrief] = useState(null);
  const [contexts, setContexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [questionAnswer, setQuestionAnswer] = useState(null);
  const [questionError, setQuestionError] = useState(null);
  const [asking, setAsking] = useState(false);
  const [contextTag, setContextTag] = useState('launch');
  const [contextDescription, setContextDescription] = useState('');
  const [savingContext, setSavingContext] = useState(false);

  const loadBrief = useCallback(async () => {
    const context = await getAuthenticatedContext();
    setUser(context.user);
    const { data } = await api.get('/weekly-brief/latest');
    setBrief(data);
    try {
      const response = await api.get('/week-context', {
        params: { weekStart: data.periodStart },
      });
      setContexts(response.data || []);
    } catch {
      setContexts([]);
    }
    return data;
  }, []);

  useEffect(() => {
    loadBrief()
      .catch((loadError) => {
        setError(loadError.response?.data?.message || loadError.message);
      })
      .finally(() => setLoading(false));
  }, [loadBrief]);

  const headlineMetrics = useMemo(() => {
    const preferred = ['meetings', 'meeting_hours', 'after_hours', 'focus_time', 'active_alerts'];
    return preferred.map((key) => brief?.metrics?.find((item) => item.key === key)).filter(Boolean);
  }, [brief]);

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const { data } = await api.post('/weekly-brief/refresh');
      setBrief(data);
    } catch (refreshError) {
      setError(refreshError.response?.data?.message || refreshError.message);
    } finally {
      setRefreshing(false);
    }
  };

  const ask = async (question) => {
    setAsking(true);
    setQuestionError(null);
    setQuestionAnswer(null);
    try {
      const { data } = await api.post('/weekly-brief/ask', { question });
      setQuestionAnswer(data);
    } catch (askError) {
      setQuestionError(askError.response?.data?.message || askError.message);
    } finally {
      setAsking(false);
    }
  };

  const saveContext = async (event) => {
    event.preventDefault();
    setSavingContext(true);
    try {
      const { data } = await api.post('/week-context', {
        weekStart: brief.periodStart,
        weekEnd: brief.periodEnd,
        tag: contextTag,
        description: contextDescription.trim(),
        confidenceReduction: 'moderate',
      });
      setContexts((current) => [data, ...current]);
      setContextDescription('');
    } catch (contextError) {
      setError(contextError.response?.data?.message || contextError.message);
    } finally {
      setSavingContext(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <RefreshCw className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error && !brief) {
    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-3xl rounded-container border border-red-200 bg-white p-6 text-red-800">
          Unable to load the latest weekly brief. {error}
        </div>
      </div>
    );
  }

  const canRefresh = ['master_admin', 'admin', 'hr_admin'].includes(user?.role);
  const roleActions = brief.actions?.roleBased || {};
  const allRoleActions = Object.values(roleActions).flat().filter(Boolean);

  return (
    <AppShell user={user} section="Latest Brief" width="wide">
      <PageHeader
        eyebrow="Weekly intelligence"
        title="Latest brief and evidence"
        description={`The email summary and this dashboard use the same saved report generated ${formatDate(brief.generatedAt)}. The dashboard keeps the detail that would make the email too long.`}
        action={
          canRefresh ? (
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-control border border-slate-300 bg-white px-4 py-2.5 text-caption font-bold text-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh measured data
            </button>
          ) : null
        }
      />

      {error && (
        <div className="mb-4 rounded-control border border-red-200 bg-red-50 p-3 text-caption text-red-800">
          {error}
        </div>
      )}

      {brief.freshness?.userCountChanged && (
        <div className="mb-4 rounded-control border border-amber-200 bg-amber-50 p-4 text-caption text-amber-950">
          <strong>Directory changed since this brief was generated.</strong> This snapshot was based
          on {brief.freshness.snapshotTotalUsers} active users; the current directory has{' '}
          {brief.freshness.currentTotalUsers}. Refresh measured data to regenerate the brief from
          the current people and team mapping.
        </div>
      )}

      <section className="app-dashboard-hero">
        <div className="app-dashboard-hero-main">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={statusTone(brief.status?.label)}>{brief.status?.label}</StatusBadge>
            <StatusBadge>
              Evidence grade: {brief.status?.evidenceGrade || 'Not available'}
            </StatusBadge>
            <StatusBadge tone={brief.reportMode === 'full' ? 'good' : 'review'}>
              {brief.reportMode === 'full' ? 'Full report' : 'Setup report'}
            </StatusBadge>
          </div>
          <h1 className="app-dashboard-title mt-4">{brief.orgName}</h1>
          <p className="app-dashboard-copy">{brief.status?.summary}</p>
          {brief.status?.escalationAction && (
            <p className="mt-4 rounded-control border border-amber-200 bg-amber-50 p-3 text-caption text-amber-950">
              <strong>Escalation rule:</strong> {brief.status.escalationAction}
            </p>
          )}
        </div>
        <div className="app-dashboard-hero-side">
          <p className="app-dashboard-eyebrow">Report scope</p>
          <p className="text-caption font-bold text-slate-900">
            {formatDate(brief.periodStart)} to {formatDate(brief.periodEnd)}
          </p>
          <div className="mt-4 space-y-3 text-caption leading-6 text-slate-600">
            <p>
              <strong>{brief.status?.baselineWeeks || 0} weeks</strong> of organization-specific
              history available.
            </p>
            <p>
              <strong>{brief.coverage?.mappingCoveragePct || 0}%</strong> activity attribution and{' '}
              <strong>{brief.coverage?.teamCoveragePct || 0}%</strong> eligible-team readiness.
            </p>
            <p>Evidence grades are rules, not confidence intervals or outcome probabilities.</p>
          </div>
        </div>
      </section>

      {headlineMetrics.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {headlineMetrics.map((metric) => (
            <MetricCard key={metric.key} metric={metric} />
          ))}
        </div>
      )}

      {brief.reportMode === 'setup' ? (
        <section className="app-dashboard-section">
          <div className="app-section-heading">
            <div>
              <h2>Restore trustworthy reporting</h2>
              <p>Modeled conclusions stay paused while coverage is incomplete.</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {(roleActions.admin || []).map((action) => (
              <ActionCard key={action.title} action={action} />
            ))}
          </div>
        </section>
      ) : (
        <>
          {brief.trend?.length > 1 && (
            <section className="app-panel mb-6">
              <div className="app-section-heading">
                <div>
                  <h2>Six-week movement</h2>
                  <p>Direct comparisons use this organization’s own measured history.</p>
                </div>
              </div>
              <div className="h-80 w-full" aria-label="Six-week work-pattern trend chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={brief.trend}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis yAxisId="hours" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis
                      yAxisId="index"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="hours"
                      type="monotone"
                      dataKey="meetingHours"
                      name="Meeting hours/person"
                      stroke="#dc2626"
                      strokeWidth={2}
                      connectNulls
                    />
                    <Line
                      yAxisId="hours"
                      type="monotone"
                      dataKey="focusHours"
                      name="Uninterrupted hours/person"
                      stroke="#059669"
                      strokeWidth={2}
                      connectNulls
                    />
                    <Line
                      yAxisId="index"
                      type="monotone"
                      dataKey="afterHoursPct"
                      name="Out-of-hours %"
                      stroke="#d97706"
                      strokeWidth={2}
                      connectNulls
                    />
                    <Line
                      yAxisId="index"
                      type="monotone"
                      dataKey="fragmentation"
                      name="Fragmentation /100"
                      stroke="#6366f1"
                      strokeWidth={2}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <section className="app-panel">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-700" />
                <h2>What changed</h2>
              </div>
              <p className="app-muted">
                All report observations, not only the three shown in email.
              </p>
              <div className="space-y-3">
                {brief.observations?.length ? (
                  brief.observations.map((item, index) => (
                    <div
                      key={`${item.text}-${index}`}
                      className="rounded-container border border-slate-200 p-4"
                    >
                      <p className="text-caption leading-6 text-slate-700">{item.text}</p>
                      <div className="mt-2">
                        <StatusBadge tone={item.type === 'data_quality' ? 'review' : 'neutral'}>
                          Evidence grade: {item.evidenceGrade}
                        </StatusBadge>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState>No material week-over-week change was detected.</EmptyState>
                )}
              </div>
            </section>

            <section className="app-panel">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
                <h2>Why it deserves review</h2>
              </div>
              <p className="app-muted">Review implications, not causal or clinical conclusions.</p>
              <div className="space-y-3">
                {brief.risks?.length ? (
                  brief.risks.map((risk) => (
                    <div
                      key={risk}
                      className="rounded-container border border-amber-200 bg-amber-50/70 p-4 text-caption leading-6 text-amber-950"
                    >
                      {risk}
                    </div>
                  ))
                ) : (
                  <EmptyState>No elevated review implication is present in this brief.</EmptyState>
                )}
                {brief.costEstimate && (
                  <div className="rounded-container border border-slate-200 p-4">
                    <p className="font-bold text-slate-900">
                      Estimated coordination cost above baseline:{' '}
                      {brief.costEstimate.formattedWeeklyCost}
                    </p>
                    <p className="mt-2 text-caption leading-5 text-slate-600">
                      Uses the client-configured hourly cost and measured participant-hours above
                      this organization’s baseline. Directional estimate only.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="app-dashboard-section">
            <div className="app-section-heading">
              <div>
                <h2>Decisions and owners</h2>
                <p>Each action should have a named owner, measure, and review window.</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {brief.actions?.primary && (
                <ActionCard action={brief.actions.primary} fallbackTitle="Priority" />
              )}
              {allRoleActions
                .filter((item) => item.action !== brief.actions?.primary?.action)
                .slice(0, 5)
                .map((action, index) => (
                  <ActionCard key={`${action.action}-${index}`} action={action} />
                ))}
            </div>
            {!brief.actions?.primary && allRoleActions.length === 0 && (
              <EmptyState>No specific action is recommended this week.</EmptyState>
            )}
          </section>
        </>
      )}

      <AskBrief
        questions={brief.questions}
        onAsk={ask}
        asking={asking}
        answer={questionAnswer}
        error={questionError}
      />

      {brief.metrics?.length > 0 && (
        <section className="app-panel my-6 overflow-hidden">
          <div className="app-section-heading">
            <div>
              <h2>Metric evidence table</h2>
              <p>Current week, prior week, and organization-specific baseline in one view.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-caption">
              <thead>
                <tr className="border-b border-slate-200 text-caption uppercase tracking-wider text-slate-500">
                  <th className="py-3 pr-4">Metric</th>
                  <th className="px-4 py-3">Current</th>
                  <th className="px-4 py-3">Prior</th>
                  <th className="px-4 py-3">6-week baseline</th>
                  <th className="px-4 py-3">Movement</th>
                  <th className="pl-4 py-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {brief.metrics.map((metric) => (
                  <tr key={metric.key} className="border-b border-slate-100 align-top">
                    <td className="py-4 pr-4">
                      <strong className="text-slate-900">{metric.label}</strong>
                      {metric.note && (
                        <p className="mt-1 max-w-xs text-caption text-slate-500">{metric.note}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-900">
                      {formatMetricValue(metric)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {formatMetricValue(metric, metric.previous)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {metric.baseline == null
                        ? 'Not available'
                        : formatMetricValue(metric, metric.baseline)}
                    </td>
                    <td className="px-4 py-4 text-caption">
                      <Direction metric={metric} />
                    </td>
                    <td className="pl-4 py-4">
                      <StatusBadge>{String(metric.measurementType).replace(/_/g, ' ')}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(brief.workPattern?.teams?.length > 0 || brief.signals?.length > 0) && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <section className="app-panel">
            <h2>Team condition detail</h2>
            <p className="app-muted">
              Aggregated internal model results shown with data readiness.
            </p>
            <div className="space-y-3">
              {(brief.workPattern?.teams || []).map((team) => (
                <div key={team.teamId} className="rounded-container border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">{team.teamName}</p>
                      <p className="mt-1 text-caption text-slate-500">
                        {team.activePeople} active mapped people
                      </p>
                    </div>
                    <StatusBadge tone={statusTone(team.state)}>{team.state}</StatusBadge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-control bg-slate-50 p-3">
                      <p className="text-lead font-extrabold text-slate-900">
                        {team.deviationIndex}/100
                      </p>
                      <p className="text-caption text-slate-500">Deviation index</p>
                    </div>
                    <div className="rounded-control bg-slate-50 p-3">
                      <p className="text-lead font-extrabold text-slate-900">
                        {team.dataReadiness}/100
                      </p>
                      <p className="text-caption text-slate-500">Data readiness</p>
                    </div>
                  </div>
                  {team.drivers?.length > 0 && (
                    <div className="mt-3 text-caption leading-5 text-slate-600">
                      <strong>Top drivers:</strong>{' '}
                      {team.drivers
                        .map((driver) => `${driver.label} (${driver.score}/100)`)
                        .join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {brief.workPattern?.limitation && (
              <p className="mt-4 text-caption leading-5 text-slate-500">
                {brief.workPattern.limitation}
              </p>
            )}
          </section>

          <section className="app-panel">
            <h2>Active review signals</h2>
            <p className="app-muted">
              Rules that fired, their evidence, and the first suggested check.
            </p>
            <div className="space-y-3">
              {brief.signals.map((signal, index) => (
                <div
                  key={`${signal.type}-${index}`}
                  className="rounded-container border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900">{signal.title}</p>
                      <p className="mt-1 text-caption text-slate-500">
                        {signal.family} · {signal.teamName}
                      </p>
                    </div>
                    <StatusBadge tone="review">{signal.severity}</StatusBadge>
                  </div>
                  {signal.evidence && (
                    <p className="mt-3 text-caption leading-6 text-slate-600">{signal.evidence}</p>
                  )}
                  {signal.action && (
                    <p className="mt-3 text-caption leading-5 text-slate-700">
                      <strong>Suggested check:</strong> {signal.action}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {(brief.prediction || brief.actionOutcomes?.length > 0) && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <section className="app-panel">
            <h2>Forecast rule track record</h2>
            <p className="app-muted">
              A falsifiable directional rule, automatically checked next week.
            </p>
            {brief.prediction?.current && (
              <div className="rounded-container border border-blue-200 bg-blue-50 p-4 text-caption leading-6 text-blue-950">
                <strong>This week:</strong> {brief.prediction.current.statement}
              </div>
            )}
            {brief.prediction?.lastGraded && (
              <div className="mt-3 rounded-container border border-slate-200 p-4 text-caption leading-6 text-slate-700">
                <strong>Last graded:</strong> {brief.prediction.lastGraded.statement}
                <p className="mt-2">
                  Observed value: {brief.prediction.lastGraded.actualValue ?? 'not available'} ·{' '}
                  {brief.prediction.lastGraded.matched ? 'Rule matched' : 'Rule did not match'}
                </p>
              </div>
            )}
            <p className="mt-3 text-caption leading-5 text-slate-500">
              {brief.prediction?.limitation}
            </p>
          </section>

          <section className="app-panel">
            <h2>Action follow-through</h2>
            <p className="app-muted">
              What was tried and whether the same metric moved after review.
            </p>
            <div className="space-y-3">
              {brief.actionOutcomes?.length ? (
                brief.actionOutcomes.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="rounded-container border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-slate-900">{item.title}</p>
                      <StatusBadge tone={item.outcome?.improved ? 'good' : 'neutral'}>
                        {item.status}
                      </StatusBadge>
                    </div>
                    <p className="mt-2 text-caption text-slate-500">
                      Started {formatDate(item.startedAt)}
                      {item.teamName ? ` · ${item.teamName}` : ''}
                    </p>
                    {item.outcome && (
                      <p className="mt-3 text-caption text-slate-700">
                        Measured change: {item.outcome.percentChange > 0 ? '+' : ''}
                        {item.outcome.percentChange}% ·{' '}
                        {item.outcome.improved
                          ? 'Moved in intended direction'
                          : 'No improvement confirmed'}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState>
                  No action has a measured outcome yet. Log a reversible action to start the 14-day
                  before-and-after loop.
                </EmptyState>
              )}
            </div>
          </section>
        </div>
      )}

      <section className="app-panel mb-6" id="context">
        <div className="flex items-start gap-3">
          <CircleHelp className="mt-1 h-5 w-5 text-violet-700" />
          <div>
            <h2>Add context for this week</h2>
            <p className="app-muted mb-0">
              A launch, offsite, leave period, or client deadline can change how metadata should be
              interpreted. Context is shown to the report assistant and used by the next brief.
            </p>
          </div>
        </div>
        <form onSubmit={saveContext} className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <select
            value={contextTag}
            onChange={(event) => setContextTag(event.target.value)}
            className="rounded-control border border-slate-300 bg-white px-3 py-2.5 text-caption"
          >
            {CONTEXT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            value={contextDescription}
            onChange={(event) => setContextDescription(event.target.value)}
            maxLength={300}
            placeholder="Optional factual note, such as product launch on Thursday"
            className="rounded-control border border-slate-300 bg-white px-3 py-2.5 text-caption"
          />
          <button
            type="submit"
            disabled={savingContext}
            className="rounded-control bg-violet-700 px-4 py-2.5 text-caption font-bold text-white disabled:opacity-50"
          >
            {savingContext ? 'Saving...' : 'Add context'}
          </button>
        </form>
        {contexts.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {contexts.map((item) => (
              <StatusBadge key={item._id || `${item.tag}-${item.description}`} tone="info">
                {String(item.tag).replace(/_/g, ' ')}
                {item.description ? `: ${item.description}` : ''}
              </StatusBadge>
            ))}
          </div>
        )}
      </section>

      <section className="app-panel">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-emerald-700" />
          <div>
            <h2>Data readiness and limits</h2>
            <p className="app-muted">
              Coverage determines whether SignalTrue reports a model or pauses conclusions.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-container bg-slate-50 p-4">
            <p className="text-lead font-extrabold text-slate-900">
              {brief.coverage?.mappingCoveragePct}%
            </p>
            <p className="text-caption text-slate-500">Activity attributed</p>
          </div>
          <div className="rounded-container bg-slate-50 p-4">
            <p className="text-lead font-extrabold text-slate-900">
              {brief.coverage?.teamCoveragePct}%
            </p>
            <p className="text-caption text-slate-500">Eligible teams ready</p>
          </div>
          <div className="rounded-container bg-slate-50 p-4">
            <p className="text-lead font-extrabold text-slate-900">{brief.coverage?.mappedUsers}</p>
            <p className="text-caption text-slate-500">
              of {brief.coverage?.totalUsers} users represented
            </p>
          </div>
          <div className="rounded-container bg-slate-50 p-4">
            <p className="text-lead font-extrabold text-slate-900">{brief.coverage?.readyTeams}</p>
            <p className="text-caption text-slate-500">
              of {brief.coverage?.eligibleTeams} eligible teams ready
            </p>
          </div>
        </div>

        {brief.integrations?.length > 0 && (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {brief.integrations.map((integration) => (
              <div key={integration.type} className="rounded-container border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">{integration.type}</p>
                  <StatusBadge tone={integration.status === 'connected' ? 'good' : 'review'}>
                    {integration.status}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-caption text-slate-500">
                  Coverage: {integration.mappedUsers ?? 'not available'}/
                  {integration.totalUsers ?? 'not available'} · Last sync:{' '}
                  {formatDate(integration.lastSyncAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
