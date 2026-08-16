import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

function formatDate(value) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  );
}

function Metric({ value, label, note }) {
  return (
    <div className="app-dashboard-card">
      <span className="app-dashboard-card-value">{value ?? 0}</span>
      <span className="app-dashboard-card-label">{label}</span>
      <span className="app-dashboard-card-note">{note}</span>
    </div>
  );
}

export default function ExecutiveSummary() {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const context = await getAuthenticatedContext();
      setUser(context.user);
      if (!context.orgId) throw new Error('No organization is associated with this account.');
      const { data } = await api.get(`/trial/executive-summary/${context.orgId}`);
      setSummary(data);
    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
          loadError.response?.data?.error ||
          loadError.message ||
          'The executive brief is unavailable.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createShareLink = async () => {
    setNotice(null);
    try {
      const { data } = await api.post('/trial/generate-ceo-summary');
      const shareUrl = `${window.location.origin}/ceo-summary/${data.shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      setNotice('A privacy-safe executive link was copied. Review it before sharing.');
    } catch (shareError) {
      setError(shareError.response?.data?.message || 'The share link could not be created.');
    }
  };

  if (loading) {
    return (
      <AppShell user={user} section="Executive brief">
        <div className="app-panel flex min-h-64 items-center justify-center gap-3 text-sm text-slate-600">
          <RefreshCw className="h-5 w-5 animate-spin" /> Preparing the executive decision brief…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user} section="Executive brief" width="wide">
      <PageHeader
        eyebrow="Leadership decision support"
        title="Executive decision brief"
        description="A concise view of changing exposure, evidence confidence, control ownership and effectiveness. It is not a workforce health score."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} className="action-secondary-button">
              <RefreshCw size={16} aria-hidden="true" /> Refresh
            </button>
            <button type="button" onClick={createShareLink} className="action-primary-button">
              Create reviewed share link
            </button>
          </div>
        }
      />

      {error && <div className="action-notice is-error">{error}</div>}
      {notice && <div className="action-notice is-success">{notice}</div>}

      {summary && (
        <>
          <section className="app-dashboard-hero">
            <div className="app-dashboard-hero-main">
              <p className="app-dashboard-eyebrow">Current decision status</p>
              <h2 className="app-dashboard-title">{summary.currentStatus}</h2>
              <p className="app-dashboard-copy">
                Direction: {summary.trendDirection}. Generated {formatDate(summary.generatedAt)}.
                Leadership should remove barriers, confirm ownership and ask whether controls were
                reviewed—not infer individual wellbeing from this brief.
              </p>
            </div>
            <div className="app-dashboard-hero-side">
              <p className="app-dashboard-eyebrow">Executive use</p>
              <p className="text-sm leading-6 text-slate-700">
                1. Confirm the highest-priority team review. 2. Remove resource or decision
                barriers. 3. Check overdue controls. 4. Review effectiveness and worker feedback.
              </p>
            </div>
          </section>

          <section className="app-dashboard-section">
            <div className="app-section-heading">
              <div>
                <h2>Evidence and control position</h2>
                <p>Counts are team-level and privacy-gated.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                value={summary.evidenceSummary?.teamsRequiringReview}
                label="Teams requiring review"
                note={`${summary.evidenceSummary?.criticalSignals || 0} critical patterns`}
              />
              <Metric
                value={summary.evidenceSummary?.highConfidenceSignals}
                label="High-confidence signals"
                note={`${summary.evidenceSummary?.openQualifiedSignals || 0} qualified signals open`}
              />
              <Metric
                value={summary.controlSummary?.active}
                label="Active controls"
                note={`${summary.controlSummary?.due || 0} reviews due`}
              />
              <Metric
                value={summary.controlSummary?.improved}
                label="Controls showing improvement"
                note={`${summary.controlSummary?.completed || 0} completed reviews`}
              />
            </div>
          </section>

          <section className="app-dashboard-section grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="app-panel">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden="true" />
                <div>
                  <h2>Priority evidence</h2>
                  <p className="app-muted mb-0">
                    Verify cause and context with workers before acting.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {summary.topRisks?.length ? (
                  summary.topRisks.map((risk) => (
                    <article
                      key={risk.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900">{risk.title}</h3>
                          <p className="mt-1 text-sm text-slate-600">{risk.teamName}</p>
                        </div>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                          {risk.severity} · {risk.confidence} confidence
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">
                        {risk.evidenceStatement}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Current {risk.currentValue ?? 'not available'} · Baseline{' '}
                        {risk.baselineValue ?? 'not available'} · Change{' '}
                        {risk.deltaPercent == null ? 'not available' : `${risk.deltaPercent}%`}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
                    No qualified priority evidence is currently visible. This does not establish
                    that psychosocial risk is absent; continue normal consultation and review.
                  </div>
                )}
              </div>
            </div>

            <div className="app-panel border-indigo-200">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-indigo-700" aria-hidden="true" />
                <div>
                  <h2>Decisions requiring leadership</h2>
                  <p className="app-muted mb-0">
                    Only decisions that need ownership or barrier removal.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {summary.decisionPrompts?.length ? (
                  summary.decisionPrompts.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"
                    >
                      <h3 className="font-bold text-slate-900">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{item.decision}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                    No additional executive decision is recorded. Continue reviewing active
                    controls.
                  </div>
                )}
              </div>
              <Link
                to="/app/actions"
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-700"
              >
                Open the control register <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section className="app-dashboard-section">
            <div className="app-panel border-emerald-200 bg-emerald-50/40">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" aria-hidden="true" />
                <div>
                  <h2>Interpretation limits</h2>
                  <div className="mt-3 grid gap-2">
                    {(summary.limitations || []).map((item) => (
                      <p key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                        <CheckCircle2
                          className="mt-1 h-4 w-4 shrink-0 text-emerald-700"
                          aria-hidden="true"
                        />
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
