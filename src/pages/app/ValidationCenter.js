import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Database,
  ExternalLink,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AppShell, { PageHeader } from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

const emptySummary = {
  coverage: { connectedSources: 0, sourcesWithMeasuredCoverage: 0, sources: [] },
  outcomes: {
    totalActions: 0,
    activeActions: 0,
    measuredActions: 0,
    acknowledgedMeasuredActions: 0,
    improvedActions: 0,
    notImprovedActions: 0,
    measurementRatePct: null,
  },
  evidence: { verifiedRecords: 0, organizationRecords: 0, productRecords: 0, recent: [] },
  independentOutcomes: { records: 0, families: [], sources: [] },
  studies: [],
  metrics: [],
};

const statusStyle = {
  planned: 'bg-slate-100 text-slate-700',
  protocol_ready: 'bg-teal-50 text-teal-800',
  collecting: 'bg-blue-50 text-blue-800',
  analyzing: 'bg-violet-50 text-violet-800',
  completed: 'bg-emerald-50 text-emerald-800',
  paused: 'bg-amber-50 text-amber-800',
};

const metricStyle = {
  observed: 'bg-emerald-50 text-emerald-800',
  derived: 'bg-blue-50 text-blue-800',
  internal_model: 'bg-amber-50 text-amber-900',
  ai_hypothesis: 'bg-violet-50 text-violet-800',
};

function label(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function ValidationCenter() {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const context = await getAuthenticatedContext();
        if (!active) return;
        setUser(context.user);

        if (context.orgId) {
          const response = await api.get('/validation-program/summary');
          if (active) setSummary(response.data);
        } else {
          const [studies, metrics] = await Promise.all([
            api.get('/validation-program/studies'),
            api.get('/validation-program/metrics'),
          ]);
          if (active) {
            setSummary({
              ...emptySummary,
              studies: studies.data.studies || [],
              metrics: metrics.data.metrics || [],
            });
          }
        }
      } catch (loadError) {
        console.error('[ValidationCenter] Load error:', loadError);
        if (active)
          setError('Validation evidence is currently unavailable. No status is inferred.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const phases = useMemo(() => {
    const grouped = new Map();
    for (const study of summary.studies || []) {
      const phase = study.phase || 'Validation program';
      if (!grouped.has(phase)) grouped.set(phase, []);
      grouped.get(phase).push(study);
    }
    return [...grouped.entries()];
  }, [summary.studies]);

  const completedStudies = (summary.studies || []).filter(
    (study) => study.status === 'completed'
  ).length;

  return (
    <AppShell user={user} section="Validation">
      <PageHeader
        eyebrow="Evidence program"
        title="Validation Center"
        description="See what is measured, which claims are being tested, and whether client actions have produced a measured result."
        action={
          <Link
            to="/app/methodology"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-teal-800 hover:border-teal-400"
          >
            Measurement methodology <ExternalLink size={15} />
          </Link>
        }
      />

      <section className="app-panel border-l-4 border-l-blue-500">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-blue-700" size={22} />
          <div>
            <p className="app-eyebrow">How to read this page</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Research foundations are not product validation
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              A study is marked complete only after aggregate evidence has been reviewed. Coverage
              shows how much data is represented; it is not connector accuracy. A measured
              before/after result is evidence of change, but without a suitable comparison it does
              not by itself establish causation.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error}
        </div>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="app-metric">
          <Database size={20} />
          <div>
            <strong>{loading ? '...' : summary.coverage.connectedSources}</strong>
            <span>Connected sources</span>
          </div>
        </div>
        <div className="app-metric">
          <ClipboardCheck size={20} />
          <div>
            <strong>{loading ? '...' : summary.outcomes.measuredActions}</strong>
            <span>Actions with measured outcomes</span>
          </div>
        </div>
        <div className="app-metric">
          <CheckCircle2 size={20} />
          <div>
            <strong>{loading ? '...' : summary.evidence.verifiedRecords}</strong>
            <span>Verified evidence records</span>
          </div>
        </div>
        <div className="app-metric">
          <FlaskConical size={20} />
          <div>
            <strong>
              {loading ? '...' : `${completedStudies}/${summary.studies.length || 8}`}
            </strong>
            <span>Studies completed</span>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="app-panel">
          <p className="app-eyebrow">Technical readiness</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Connector evidence</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Mapping and synchronization are available now. Source reconciliation remains visibly
            separate until it is actually run.
          </p>
          {(summary.coverage.sources || []).length === 0 ? (
            <p className="coverage-empty mt-4">No connected source coverage is available.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {summary.coverage.sources.map((source) => (
                <div key={source.type} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <strong className="text-sm text-slate-900">{label(source.type)}</strong>
                    <span
                      className={
                        source.reconciliationStatus === 'verified_for_client'
                          ? 'status-ok'
                          : 'status-muted'
                      }
                    >
                      {source.reconciliationStatus === 'verified_for_client'
                        ? 'Client reconciliation verified'
                        : source.reconciliationStatus === 'product_evidence_available'
                          ? 'Product evidence available'
                          : 'Reconciliation not run'}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
                    <span>
                      Mapping:{' '}
                      {source.mappingCoveragePct == null
                        ? 'not measured'
                        : `${source.mappedUsers}/${source.totalUsers} (${source.mappingCoveragePct}%)`}
                    </span>
                    <span>Last successful sync: {formatDate(source.lastSuccessfulSyncAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="app-panel">
          <p className="app-eyebrow">Client evidence</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Action outcome ledger</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Outcomes are counted only when the same metric has numeric before and after values and a
            recorded computation date.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[
              ['Actions logged', summary.outcomes.totalActions],
              ['Currently active', summary.outcomes.activeActions],
              ['Measured', summary.outcomes.measuredActions],
              ['Client acknowledged', summary.outcomes.acknowledgedMeasuredActions],
              ['Improved on target metric', summary.outcomes.improvedActions],
              ['Did not improve', summary.outcomes.notImprovedActions],
            ].map(([name, value]) => (
              <div key={name} className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{name}</dt>
                <dd className="mt-1 text-xl font-extrabold text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Independent operational outcome records: {summary.independentOutcomes.records}. Failed
            and neutral actions remain part of the evidence rather than being hidden.
          </p>
        </article>
      </section>

      <section className="app-panel mt-6">
        <p className="app-eyebrow">Reviewed results</p>
        <h2 className="mt-2 text-xl font-bold text-slate-900">Verified evidence</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Only reviewed aggregate evidence for this organization or the product-wide program is
          listed here.
        </p>
        {(summary.evidence.recent || []).length === 0 ? (
          <p className="coverage-empty mt-4">
            No verified study result is available yet. Planned research is not shown as evidence.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {summary.evidence.recent.map((item, index) => (
              <article
                key={`${item.studyKey}-${item.metricKey}-${index}`}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-sm text-slate-900">{label(item.metricKey)}</strong>
                  <span className="status-ok">{label(item.scope)} evidence</span>
                </div>
                {item.result?.value != null && (
                  <p className="mt-3 text-2xl font-extrabold text-slate-900">
                    {item.result.value} {item.result.unit || ''}
                  </p>
                )}
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  <strong>Supports:</strong> {item.supportsClaim}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  <strong>Does not support:</strong> {item.doesNotSupport}
                </p>
                {item.externalReference?.reportUrl && (
                  <a
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-teal-800 hover:underline"
                    href={item.externalReference.reportUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    External report: {item.externalReference.organization}{' '}
                    <ExternalLink size={13} />
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="app-section-heading">
          <div>
            <p className="app-eyebrow">Progressive validation</p>
            <h2>Eight-study program</h2>
            <p>Technical accuracy first, then meaning, actionability, and external credibility.</p>
          </div>
        </div>

        <div className="space-y-7">
          {phases.map(([phase, studies]) => (
            <div key={phase}>
              <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-slate-500">
                {phase}
              </h3>
              <div className="grid gap-4 lg:grid-cols-2">
                {studies.map((study) => (
                  <article key={study.key} className="app-panel">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-500">Study {study.order}</p>
                        <h2 className="mt-1 text-lg font-bold text-slate-900">{study.title}</h2>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusStyle[study.status] || statusStyle.planned}`}
                      >
                        {label(study.status || 'planned')}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">
                      {study.question}
                    </p>
                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Result this study must produce
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{study.output}</p>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          For the client
                        </p>
                        <p className="mt-1 text-sm leading-5 text-slate-700">{study.clientValue}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          For SignalTrue
                        </p>
                        <p className="mt-1 text-sm leading-5 text-slate-700">
                          {study.signalTrueValue}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      Verified evidence: {study.verifiedEvidenceCount || 0} total,{' '}
                      {study.organizationEvidenceCount || 0} for this organization. Protocol:{' '}
                      {study.protocolVersion || 'draft'}.
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="app-section-heading">
          <div>
            <p className="app-eyebrow">Measurement passports</p>
            <h2>What the product currently measures</h2>
            <p>Each metric states its source, denominator, validation status, and boundary.</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {(summary.metrics || []).map((metric) => (
            <article key={metric.key} className="app-panel">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-bold text-slate-900">{metric.label}</h2>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${metricStyle[metric.measurementClass] || metricStyle.derived}`}
                >
                  {label(metric.measurementClass)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">{metric.definition}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="font-bold text-slate-900">Source</dt>
                  <dd className="text-slate-600">{metric.source}</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-900">Denominator</dt>
                  <dd className="text-slate-600">{metric.denominator}</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-900">Limit</dt>
                  <dd className="text-slate-600">{metric.limitation}</dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-bold text-slate-500">
                Validation: {label(metric.validationStatus)}
              </p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
