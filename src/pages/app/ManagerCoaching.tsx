import { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

type Metric = {
  key: string;
  label: string;
  unit: string;
  value: number | null;
  baseline: number | null;
  deltaPercent: number | null;
  status: 'available' | 'unavailable';
  reason: string | null;
  coverage: number | null;
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
};

type Insight = {
  insightId: string;
  signal: string;
  title: string;
  statement: string;
  confidence: string;
  persistenceWeeks: number;
  trigger: Metric;
  question: string;
  experiment: {
    title: string;
    durationDays: number;
    targetMetrics: Array<{ metric: string; direction: string; unit: string }>;
  };
};

type CoachingResponse = {
  status: string;
  reason?: string;
  requirements?: Record<string, unknown>;
  data: null | {
    period: { weekStart: string; weekEnd: string };
    readiness: {
      confidence: string;
      coverage: number | null;
      requirements: ReadinessRequirements;
    };
    primaryInsight: Insight | null;
    supportingObservations: Array<{
      signal: string;
      statement: string;
      confidence: string;
    }>;
    managerConditions: Metric[];
    managerTeamInteraction: Metric[];
    teamContext: Metric[];
    limitation: string;
  };
};

type ReadinessRequirements = {
  reportingStructure?: { available: boolean; source: string; directReports: number };
  calendar?: { available: boolean; coverage: number; coveredDays: number };
  collaboration?: { available: boolean; coverage: number; coveredDays: number };
  baseline?: { available: boolean; weeks: number; preferredWeeks: number };
  privacy?: { passed: boolean; activeReports: number; minimumRequired: number };
};

type Experiment = {
  _id: string;
  title: string;
  description?: string;
  status: string;
  startDate: string;
  reviewDate?: string;
  followUpReviewDate?: string;
  targetMetrics: Array<{ metric: string; label?: string; direction: string; unit?: string }>;
  evidenceSnapshots: Array<{ metric: string; value: number; unit?: string }>;
  reviews: Array<{
    day: 14 | 28;
    dueDate: string;
    measuredAt?: string;
    result?: string;
    metricSnapshots?: Array<{
      metric: string;
      baselineValue: number;
      value: number;
      interpretation: string;
    }>;
  }>;
};

export default function ManagerCoaching() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [coaching, setCoaching] = useState<CoachingResponse | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const context = await getAuthenticatedContext();
      setUser(context.user);
      setOrgId(context.orgId);
      if (!context.orgId) throw new Error('No organization is associated with this account.');
      const [coachingResponse, historyResponse] = await Promise.all([
        api.get<CoachingResponse>('/manager-coaching/v2/me', {
          params: { orgId: context.orgId },
        }),
        api.get<{ experiments: Experiment[] }>('/manager-coaching/v2/me/experiments', {
          params: { orgId: context.orgId },
        }),
      ]);
      setCoaching(coachingResponse.data);
      setExperiments(historyResponse.data.experiments || []);
      const insight = coachingResponse.data.data?.primaryInsight;
      if (insight) {
        api
          .post('/manager-coaching/v2/events', {
            orgId: context.orgId,
            insightId: insight.insightId,
            eventType: 'opened',
          })
          .catch(() => undefined);
      }
    } catch (loadError: unknown) {
      const errorObject = loadError as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        errorObject.response?.data?.message ||
          errorObject.message ||
          "We couldn't load Manager Coaching."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const insight = coaching?.data?.primaryInsight;
  const activeExperiment = useMemo(
    () =>
      experiments.find((experiment) => ['active', 'pending-recheck'].includes(experiment.status)),
    [experiments]
  );

  const record = async (eventType: string) => {
    if (!orgId || !insight) return;
    setBusy(eventType);
    try {
      await api.post('/manager-coaching/v2/events', {
        orgId,
        insightId: insight.insightId,
        eventType,
      });
      if (eventType === 'dismissed') await load();
    } catch (recordError: unknown) {
      const responseError = recordError as { response?: { data?: { message?: string } } };
      setError(responseError.response?.data?.message || 'The coaching action could not be saved.');
    } finally {
      setBusy(null);
    }
  };

  const startExperiment = async () => {
    if (!orgId || !insight) return;
    setBusy('start');
    try {
      await api.post('/manager-coaching/v2/experiments', {
        orgId,
        insightId: insight.insightId,
      });
      await load();
    } catch (startError: unknown) {
      const responseError = startError as { response?: { data?: { message?: string } } };
      setError(responseError.response?.data?.message || 'The experiment could not be started.');
    } finally {
      setBusy(null);
    }
  };

  const runReview = async (experimentId: string, day: 14 | 28) => {
    if (!orgId) return;
    setBusy(`${experimentId}-${day}`);
    try {
      await api.post(`/manager-coaching/v2/experiments/${experimentId}/review`, { orgId, day });
      await load();
    } catch (reviewError: unknown) {
      const responseError = reviewError as { response?: { data?: { message?: string } } };
      setError(responseError.response?.data?.message || 'The review could not be completed.');
    } finally {
      setBusy(null);
    }
  };

  const sendFeedback = async (experimentId: string, useful: boolean) => {
    if (!orgId) return;
    setBusy(`${experimentId}-feedback`);
    try {
      await api.post(`/manager-coaching/v2/experiments/${experimentId}/feedback`, {
        orgId,
        useful,
      });
    } catch (feedbackError: unknown) {
      const responseError = feedbackError as { response?: { data?: { message?: string } } };
      setError(responseError.response?.data?.message || 'Feedback could not be saved.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <AppShell user={user} section="Manager Coach">
        <div className="app-panel flex min-h-64 items-center justify-center" role="status">
          <span className="text-sm font-semibold text-slate-600">
            Preparing your private weekly coaching…
          </span>
        </div>
      </AppShell>
    );
  }

  if (error && !coaching) {
    return (
      <AppShell user={user} section="Manager Coach">
        <StatePanel
          title="We couldn't load Manager Coaching"
          description={error}
          action={
            <button className="mc-primary" onClick={load}>
              Try again
            </button>
          }
        />
      </AppShell>
    );
  }

  const requirements =
    coaching?.data?.readiness.requirements ||
    (coaching?.requirements as ReadinessRequirements) ||
    {};

  if (coaching?.status === 'suppressed' || coaching?.status === 'insufficient_data') {
    return (
      <AppShell user={user} section="Manager Coach">
        <PageHeader
          eyebrow="Private manager workspace"
          title="Manager Coaching"
          description="Coaching appears only when SignalTrue has enough real, privacy-safe evidence."
        />
        <StatePanel
          title={
            coaching.status === 'suppressed'
              ? 'Privacy threshold not met'
              : 'Building your evidence baseline'
          }
          description="SignalTrue does not have enough validated telemetry to generate manager-specific coaching yet. No score or sample data will be shown."
        >
          <ReadinessChecklist requirements={requirements} />
        </StatePanel>
        <ExperimentHistory
          experiments={experiments}
          onReview={runReview}
          onFeedback={sendFeedback}
          busy={busy}
        />
      </AppShell>
    );
  }

  return (
    <AppShell user={user} section="Manager Coach">
      <PageHeader
        eyebrow="Private manager workspace"
        title="Your weekly operating coach"
        description="One observable work-pattern change, one useful question and one reversible experiment."
      />

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {activeExperiment && (
        <ActiveExperiment experiment={activeExperiment} onReview={runReview} busy={busy} />
      )}

      {!insight ? (
        <StatePanel
          title="No new coaching signal this week"
          description={
            coaching?.reason === 'insight_dismissed_for_period'
              ? 'You dismissed this week’s observation. It will not return unchanged during the same period.'
              : 'No measured pattern crossed the persistence, confidence and actionability thresholds.'
          }
        />
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-950 to-slate-900 p-6 text-white shadow-sm md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">
                One thing worth looking at
              </p>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold capitalize">
                {insight.confidence} confidence
              </span>
            </div>
            <h2 className="mt-5 max-w-3xl text-2xl font-bold leading-tight md:text-3xl">
              {insight.title}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-indigo-100">
              {insight.statement}
            </p>
            <p className="mt-4 text-sm text-indigo-200">
              Observed for {insight.persistenceWeeks} week
              {insight.persistenceWeeks === 1 ? '' : 's'}.
            </p>
          </section>

          <MetricSection
            title="What changed"
            metrics={[
              ...(coaching?.data?.managerConditions || []),
              ...(coaching?.data?.managerTeamInteraction || []),
              ...(coaching?.data?.teamContext || []),
            ]}
          />

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="app-panel">
              <p className="app-eyebrow">What the data can and cannot say</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">{coaching?.data?.limitation}</p>
              <EvidenceDetails metric={insight.trigger} />
            </div>
            <div className="app-panel border-amber-200 bg-amber-50/40">
              <p className="app-eyebrow">A useful question</p>
              <p className="mt-3 text-lg font-semibold leading-7 text-slate-900">
                {insight.question}
              </p>
            </div>
          </section>

          <section className="app-panel border-emerald-200">
            <p className="app-eyebrow">Try this for two weeks</p>
            <h3 className="mt-3 text-xl font-bold text-slate-950">{insight.experiment.title}</h3>
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                We will measure
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {insight.experiment.targetMetrics.map((target) => (
                  <span
                    key={target.metric}
                    className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800"
                  >
                    {humanize(target.metric)} · {target.direction}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="mc-primary"
                disabled={Boolean(busy) || Boolean(activeExperiment)}
                onClick={startExperiment}
              >
                {busy === 'start'
                  ? 'Starting…'
                  : activeExperiment
                    ? 'Finish your active experiment first'
                    : 'Start experiment'}
              </button>
              <button
                className="mc-secondary"
                disabled={Boolean(busy)}
                onClick={() => record('remind_later')}
              >
                Remind me next week
              </button>
              <button
                className="mc-link"
                disabled={Boolean(busy)}
                onClick={() => record('dismissed')}
              >
                Not relevant
              </button>
            </div>
          </section>
        </div>
      )}

      <ExperimentHistory
        experiments={experiments}
        onReview={runReview}
        onFeedback={sendFeedback}
        busy={busy}
      />
      <p className="mt-6 text-xs leading-5 text-slate-500">
        Your coaching questions, dismissals and experiments are private to your manager workspace.
        SignalTrue does not use them to rank performance.
      </p>
    </AppShell>
  );
}

function ReadinessChecklist({ requirements }: { requirements: ReadinessRequirements }) {
  const items = [
    [
      'Reporting structure',
      requirements.reportingStructure?.available,
      requirements.reportingStructure?.source,
    ],
    [
      'Privacy threshold',
      requirements.privacy?.passed,
      `${requirements.privacy?.activeReports || 0} of ${requirements.privacy?.minimumRequired || 8} required active reports`,
    ],
    [
      'Calendar coverage',
      requirements.calendar?.available,
      `${Math.round((requirements.calendar?.coverage || 0) * 100)}% coverage`,
    ],
    [
      'Historical baseline',
      requirements.baseline?.available,
      `${requirements.baseline?.weeks || 0} of ${requirements.baseline?.preferredWeeks || 6} preferred weeks`,
    ],
    ['Collaboration context', requirements.collaboration?.available, 'Optional'],
  ] as const;
  return (
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      {items.map(([label, complete, detail]) => (
        <div
          key={label}
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"
        >
          <span className={`mt-0.5 font-bold ${complete ? 'text-emerald-600' : 'text-slate-400'}`}>
            {complete ? '✓' : '○'}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{label}</p>
            <p className="text-xs text-slate-500">{detail || 'Not available'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricSection({ title, metrics }: { title: string; metrics: Metric[] }) {
  const available = metrics.filter((metric) => metric.status === 'available');
  if (!available.length) return null;
  return (
    <section className="app-panel">
      <p className="app-eyebrow">{title}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {available.map((metric) => (
          <div key={metric.key} className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500">{metric.label}</p>
            <p className="mt-2 text-lg font-bold text-slate-950">
              {formatMetric(metric.value, metric.unit)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {metric.baseline == null
                ? 'Baseline building'
                : `${formatDelta(metric.deltaPercent)} from your baseline`}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function EvidenceDetails({ metric }: { metric: Metric }) {
  return (
    <details className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-bold text-slate-900">
        Why am I seeing this?
      </summary>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <Evidence label="Current" value={formatMetric(metric.value, metric.unit)} />
        <Evidence label="Personal baseline" value={formatMetric(metric.baseline, metric.unit)} />
        <Evidence
          label="Coverage"
          value={metric.coverage == null ? 'Unavailable' : `${Math.round(metric.coverage * 100)}%`}
        />
        <Evidence label="Confidence" value={metric.confidence} />
        <Evidence label="Sources" value={metric.sources?.join(', ') || 'Unavailable'} />
      </dl>
    </details>
  );
}

function Evidence({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 font-bold capitalize text-slate-900">{value}</dd>
    </div>
  );
}

function ActiveExperiment({
  experiment,
  onReview,
  busy,
}: {
  experiment: Experiment;
  onReview: (id: string, day: 14 | 28) => void;
  busy: string | null;
}) {
  const elapsed = Math.max(
    0,
    Math.floor((Date.now() - new Date(experiment.startDate).getTime()) / 86400000)
  );
  return (
    <section className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
        Active experiment · day {elapsed}
      </p>
      <h2 className="mt-2 text-lg font-bold text-slate-950">{experiment.title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {experiment.targetMetrics.map((target) => (
          <span
            key={target.metric}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700"
          >
            {target.label || humanize(target.metric)}
          </span>
        ))}
      </div>
      <ReviewButtons experiment={experiment} onReview={onReview} busy={busy} />
    </section>
  );
}

function ExperimentHistory({
  experiments,
  onReview,
  onFeedback,
  busy,
}: {
  experiments: Experiment[];
  onReview: (id: string, day: 14 | 28) => void;
  onFeedback: (id: string, useful: boolean) => void;
  busy: string | null;
}) {
  if (!experiments.length) return null;
  return (
    <section className="app-panel mt-6">
      <p className="app-eyebrow">Your coaching history</p>
      <div className="mt-4 divide-y divide-slate-200">
        {experiments.map((experiment) => (
          <article key={experiment._id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-950">{experiment.title}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Started {new Date(experiment.startDate).toLocaleDateString()} ·{' '}
                  {experiment.status}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                {latestResult(experiment)}
              </span>
            </div>
            <ReviewButtons experiment={experiment} onReview={onReview} busy={busy} />
            {experiment.reviews?.some((review) => review.measuredAt) && (
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                <span>Was this useful?</span>
                <button
                  className="font-bold text-emerald-700"
                  disabled={Boolean(busy)}
                  onClick={() => onFeedback(experiment._id, true)}
                >
                  Yes
                </button>
                <button
                  className="font-bold text-slate-600"
                  disabled={Boolean(busy)}
                  onClick={() => onFeedback(experiment._id, false)}
                >
                  No
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function ReviewButtons({
  experiment,
  onReview,
  busy,
}: {
  experiment: Experiment;
  onReview: (id: string, day: 14 | 28) => void;
  busy: string | null;
}) {
  const due =
    experiment.reviews?.filter(
      (review) => !review.measuredAt && new Date(review.dueDate) <= new Date()
    ) || [];
  if (!due.length) return null;
  return (
    <div className="mt-4 flex gap-2">
      {due.map((review) => (
        <button
          key={review.day}
          className="mc-secondary"
          disabled={Boolean(busy)}
          onClick={() => onReview(experiment._id, review.day)}
        >
          {busy === `${experiment._id}-${review.day}`
            ? 'Measuring…'
            : `Run ${review.day}-day review`}
        </button>
      ))}
    </div>
  );
}

function StatePanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="app-panel">
      <h1 className="text-xl font-bold text-slate-950">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      {children}
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}

function formatMetric(value: number | null, unit: string) {
  if (value == null) return 'Unavailable';
  if (unit === 'ratio') return `${Math.round(value * 100)}%`;
  return `${Math.round(value * 10) / 10} ${unit}`;
}

function formatDelta(value: number | null) {
  if (value == null) return 'No comparison';
  return `${value > 0 ? '+' : ''}${value}%`;
}

function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase();
}

function latestResult(experiment: Experiment) {
  const measured = experiment.reviews?.filter((review) => review.measuredAt).at(-1);
  return measured?.result?.replace(/_/g, ' ') || 'measurement pending';
}
