import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell, { PageHeader } from '../../../components/app/AppShell';
import controlReviewApi, {
  CASE_STATUS_LABELS,
  TRIGGER_LABELS,
  INTERVENTION_TYPE_LABELS,
  CONSULTATION_METHOD_LABELS,
  COMPLETENESS_STATUS_LABELS,
  CLOSURE_OPTIONS,
  metricLabel,
  isClosed,
  formatDate,
  formatPercent,
  formatNumber,
} from '../../../utils/controlReviewApi';
import { getAuthenticatedContext } from '../../../utils/authContext';

/**
 * One control review, end to end (spec §13–§20).
 *
 * The tabs follow the actual sequence — investigate, consult, control, verify,
 * decide, evidence — rather than grouping by data type, because that sequence
 * is the product.
 */

const TABS = [
  { key: 'investigation', label: 'Investigation' },
  { key: 'consultation', label: 'Consultation' },
  { key: 'control', label: 'Control' },
  { key: 'verification', label: 'Verification' },
  { key: 'decision', label: 'Decision' },
  { key: 'evidence', label: 'Evidence pack' },
];

const STATUS_CLASS = {
  COMPLETE: 'is-complete',
  PARTIAL: 'is-partial',
  PENDING: 'is-pending',
  UNAVAILABLE: 'is-unavailable',
  NOT_APPLICABLE: 'is-na',
};

export default function ControlReviewDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [tab, setTab] = useState('investigation');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const context = await getAuthenticatedContext();
      setUser(context.user);
      const [detail, metaData] = await Promise.all([
        controlReviewApi.getCase(caseId),
        controlReviewApi.meta(),
      ]);
      setData(detail);
      setMeta(metaData);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this review.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, successMessage) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      await load();
      if (successMessage) setNotice(successMessage);
    } catch (err) {
      setError(err.response?.data?.message || 'That did not work.');
    } finally {
      setBusy(false);
    }
  };

  const caseDoc = data?.case;
  const closed = caseDoc ? isClosed(caseDoc.status) : false;

  if (loading) {
    return (
      <AppShell user={user} section="Control reviews">
        <div className="app-panel">Loading…</div>
      </AppShell>
    );
  }

  if (!caseDoc) {
    return (
      <AppShell user={user} section="Control reviews">
        <div className="cr-alert cr-alert-error">{error || 'Review not found.'}</div>
      </AppShell>
    );
  }

  return (
    <AppShell user={user} section="Control reviews" width="wide">
      <PageHeader
        eyebrow={`${caseDoc.caseNumber} · ${TRIGGER_LABELS[caseDoc.trigger.type] || caseDoc.trigger.type}`}
        title={caseDoc.title}
        description={caseDoc.description}
        action={
          <button
            type="button"
            className="cr-button"
            onClick={() => navigate('/app/control-reviews')}
          >
            Back to reviews
          </button>
        }
      />

      {error && <div className="cr-alert cr-alert-error">{error}</div>}
      {notice && <div className="cr-alert cr-alert-ok">{notice}</div>}

      <div className="cr-detail-layout">
        <div className="cr-detail-main">
          <nav className="cr-tabs">
            {TABS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={`cr-tab ${tab === entry.key ? 'is-active' : ''}`}
                onClick={() => setTab(entry.key)}
              >
                {entry.label}
              </button>
            ))}
          </nav>

          {tab === 'investigation' && (
            <InvestigationTab data={data} meta={meta} closed={closed} busy={busy} run={run} />
          )}
          {tab === 'consultation' && (
            <ConsultationTab data={data} closed={closed} busy={busy} run={run} />
          )}
          {tab === 'control' && <ControlTab data={data} closed={closed} busy={busy} run={run} />}
          {tab === 'verification' && <VerificationTab data={data} busy={busy} run={run} />}
          {tab === 'decision' && <DecisionTab data={data} closed={closed} busy={busy} run={run} />}
          {tab === 'evidence' && <EvidenceTab data={data} busy={busy} run={run} />}
        </div>

        <aside className="cr-detail-side">
          <section className="app-panel">
            <h2>Review completeness</h2>
            <p className="app-muted">
              What is recorded and what is outstanding. Your organisation decides whether the
              evidence supports a decision.
            </p>
            <ul className="cr-completeness">
              {data.completeness.components.map((component) => (
                <li key={component.key} className={STATUS_CLASS[component.status]}>
                  <div className="cr-completeness-head">
                    <span>{component.label}</span>
                    <em>{COMPLETENESS_STATUS_LABELS[component.status] || component.status}</em>
                  </div>
                  {component.detail && <p className="cr-meta">{component.detail}</p>}
                </li>
              ))}
            </ul>
          </section>

          {data.completeness.mixedEvidence?.present && (
            <section className="app-panel cr-mixed">
              <h2>Mixed evidence</h2>
              <p>{data.completeness.mixedEvidence.statement}</p>
            </section>
          )}

          <section className="app-panel">
            <h2>Status</h2>
            <p className="cr-status-value">
              {CASE_STATUS_LABELS[caseDoc.status] || caseDoc.status}
            </p>
            <p className="cr-meta">Opened {formatDate(caseDoc.openedAt)}</p>
            {caseDoc.closedAt && <p className="cr-meta">Closed {formatDate(caseDoc.closedAt)}</p>}
            <p className="cr-meta">Teams: {data.teams.map((t) => t.name).join(', ')}</p>
          </section>

          {data.contextEvents.length > 0 && (
            <section className="app-panel">
              <h2>Organisational context</h2>
              <p className="app-muted">
                Shown beside the evidence. Context is never applied automatically.
              </p>
              {data.contextEvents.map((event) => (
                <div key={event._id} className="cr-context">
                  <strong>{event.name}</strong>
                  <p className="cr-meta">
                    {formatDate(event.startDate)} – {formatDate(event.endDate)}
                  </p>
                  {event.notes && <p className="cr-meta">{event.notes}</p>}
                </div>
              ))}
            </section>
          )}
        </aside>
      </div>

      <p className="cr-disclaimer">{data.disclaimer}</p>
    </AppShell>
  );
}

// ── Investigation (§13) ──────────────────────────────────────────────────────

function InvestigationTab({ data, meta, closed, busy, run }) {
  const investigation = data.case.investigation || {};
  const [form, setForm] = useState({
    whatIsKnown: investigation.whatIsKnown || '',
    whatIsUncertain: investigation.whatIsUncertain || '',
    whyReviewIsNeeded: investigation.whyReviewIsNeeded || '',
    contextConsidered: investigation.contextConsidered || '',
    consultationNeeded: investigation.consultationNeeded || '',
    openQuestions: (investigation.openQuestions || []).join('\n'),
  });

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const save = () =>
    run(
      () =>
        controlReviewApi.saveInvestigation(data.case._id, {
          ...form,
          openQuestions: form.openQuestions
            .split('\n')
            .map((q) => q.trim())
            .filter(Boolean),
        }),
      'Investigation saved.'
    );

  return (
    <>
      <section className="app-panel">
        <h2>What triggered this review?</h2>
        <p>{data.case.initialEvidenceSummary || 'No summary recorded.'}</p>

        {data.triggerEvidence.length > 0 && (
          <ul className="cr-evidence-list">
            {data.triggerEvidence.map((item) => (
              <li key={item._id}>
                <strong>{item.sourceName}</strong>
                {item.sourceDate && (
                  <span className="cr-meta"> · {formatDate(item.sourceDate)}</span>
                )}
                {item.summary && <p className="cr-meta">{item.summary}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="app-panel">
        <h2>What changed in the work-pattern data?</h2>
        {data.observations.some((o) => o.status === 'AGGREGATED') && (
          <div className="cr-alert cr-alert-info">
            This team is smaller than the reporting minimum, so its figures describe the wider group
            it sits in. They are shown for context and do not raise a review of this team.
          </div>
        )}
        {data.observations.filter((o) => o.status === 'DEVIATION_OBSERVED').length === 0 ? (
          <p className="cr-empty">
            No persistent deviation from this team’s own baseline was recorded. A case can still
            proceed — SignalTrue observation is one input, not a precondition.
          </p>
        ) : (
          <table className="cr-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Week</th>
                <th>Value</th>
                <th>Baseline</th>
                <th>Change</th>
                <th>Persistence</th>
                <th>Data quality</th>
              </tr>
            </thead>
            <tbody>
              {data.observations
                .filter((o) => o.status === 'DEVIATION_OBSERVED')
                .slice(0, 12)
                .map((o) => (
                  <tr key={`${o.metric}-${o.periodStart}`}>
                    <td>{metricLabel(o.metric)}</td>
                    <td>{formatDate(o.periodStart)}</td>
                    <td>{formatNumber(o.currentValue)}</td>
                    <td>{formatNumber(o.baselineValue)}</td>
                    <td className={o.direction === 'UP' ? 'is-up' : 'is-down'}>
                      {formatPercent(o.relativeChange)}
                    </td>
                    <td>{o.persistencePeriods}w</td>
                    <td>{o.dataQuality.toLowerCase()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="app-panel">
        <h2>Investigation record</h2>
        <label className="cr-field">
          <span>What do we know?</span>
          <textarea
            rows={3}
            value={form.whatIsKnown}
            onChange={(e) => update({ whatIsKnown: e.target.value })}
            disabled={closed}
          />
        </label>
        <label className="cr-field">
          <span>What is uncertain?</span>
          <textarea
            rows={3}
            value={form.whatIsUncertain}
            onChange={(e) => update({ whatIsUncertain: e.target.value })}
            disabled={closed}
          />
        </label>
        <label className="cr-field">
          <span>Why is review needed?</span>
          <textarea
            rows={2}
            value={form.whyReviewIsNeeded}
            onChange={(e) => update({ whyReviewIsNeeded: e.target.value })}
            disabled={closed}
          />
        </label>
        <label className="cr-field">
          <span>What known organisational context overlaps?</span>
          <textarea
            rows={2}
            value={form.contextConsidered}
            onChange={(e) => update({ contextConsidered: e.target.value })}
            disabled={closed}
          />
        </label>
        <label className="cr-field">
          <span>What questions remain unanswered? (one per line)</span>
          <textarea
            rows={4}
            value={form.openQuestions}
            onChange={(e) => update({ openQuestions: e.target.value })}
            disabled={closed}
          />
        </label>
        <label className="cr-field">
          <span>What consultation is needed?</span>
          <textarea
            rows={2}
            value={form.consultationNeeded}
            onChange={(e) => update({ consultationNeeded: e.target.value })}
            disabled={closed}
          />
        </label>

        {meta?.suggestedInvestigationQuestions && (
          <details className="cr-details">
            <summary>Suggested questions</summary>
            <ul className="cr-question-list">
              {meta.suggestedInvestigationQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </details>
        )}

        {!closed && (
          <button
            type="button"
            className="cr-button cr-button-primary"
            onClick={save}
            disabled={busy}
          >
            Save investigation
          </button>
        )}
      </section>
    </>
  );
}

// ── Consultation (§14) ───────────────────────────────────────────────────────

function ConsultationTab({ data, closed, busy, run }) {
  const [form, setForm] = useState({
    method: 'MEETING',
    date: new Date().toISOString().slice(0, 10),
    groupDescription: '',
    hsrInvolved: false,
    workerViews: '',
    managementResponse: '',
    decisionImpact: '',
    summary: '',
    workerReportedDirection: 'NOT_ASSESSED',
    isPostInterventionFollowUp: false,
  });

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const lines = (value) =>
    value
      .split('\n')
      .map((v) => v.trim())
      .filter(Boolean);

  const save = () =>
    run(
      () =>
        controlReviewApi.recordConsultation(data.case._id, {
          ...form,
          workerViews: lines(form.workerViews),
          managementResponse: lines(form.managementResponse),
          decisionImpact: lines(form.decisionImpact),
        }),
      'Consultation recorded.'
    );

  const markNotApplicable = () => {
    const reason = window.prompt('Why is worker consultation not applicable for this review?');
    if (!reason) return;
    run(() => controlReviewApi.consultationNotApplicable(data.case._id, reason), 'Recorded.');
  };

  return (
    <>
      <section className="app-panel">
        <h2>Consultation records</h2>
        <p className="app-muted">
          A record should show not only that workers were asked, but what they said, how management
          responded, whether their views affected the decision, and what went back to them.
        </p>

        {data.consultations.length === 0 && (
          <p className="cr-empty">No consultation recorded yet.</p>
        )}

        {data.consultations.map((record) => (
          <article key={record._id} className="cr-consultation">
            <header>
              <strong>{CONSULTATION_METHOD_LABELS[record.method] || record.method}</strong>
              <span className="cr-meta">
                {formatDate(record.date)}
                {record.hsrInvolved && ' · worker representative involved'}
                {record.isPostInterventionFollowUp && ' · post-implementation follow-up'}
              </span>
            </header>

            {record.restricted ? (
              <p className="cr-empty">{record.summary}</p>
            ) : (
              <>
                {record.groupDescription && <p className="cr-meta">{record.groupDescription}</p>}
                <LabelledList label="Worker views" items={record.workerViews} />
                <LabelledList label="Management response" items={record.managementResponse} />
                <LabelledList label="Impact on the decision" items={record.decisionImpact} />
                <p className="cr-meta">
                  Feedback back to workers:{' '}
                  {record.feedbackBackToWorkers?.provided
                    ? `${formatDate(record.feedbackBackToWorkers.date)} — ${record.feedbackBackToWorkers.description}`
                    : 'not recorded'}
                </p>
                {!record.feedbackBackToWorkers?.provided && !closed && (
                  <button
                    type="button"
                    className="cr-button"
                    disabled={busy}
                    onClick={() => {
                      const description = window.prompt('What went back to the workers consulted?');
                      if (!description) return;
                      run(
                        () => controlReviewApi.recordFeedback(record._id, { description }),
                        'Feedback recorded.'
                      );
                    }}
                  >
                    Record feedback to workers
                  </button>
                )}
              </>
            )}
          </article>
        ))}
      </section>

      {!closed && (
        <section className="app-panel">
          <h2>Record a consultation</h2>

          <div className="cr-field-row">
            <label className="cr-field">
              <span>Method</span>
              <select value={form.method} onChange={(e) => update({ method: e.target.value })}>
                {Object.entries(CONSULTATION_METHOD_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="cr-field">
              <span>Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => update({ date: e.target.value })}
              />
            </label>
          </div>

          <label className="cr-field">
            <span>Group consulted</span>
            <input
              type="text"
              value={form.groupDescription}
              onChange={(e) => update({ groupDescription: e.target.value })}
              placeholder="Customer Support team meeting, 11 attendees"
            />
            <em className="cr-hint">Describe the group, not the individuals.</em>
          </label>

          <label className="cr-checkbox">
            <input
              type="checkbox"
              checked={form.hsrInvolved}
              onChange={(e) => update({ hsrInvolved: e.target.checked })}
            />
            <span>
              Worker health and safety representative involved (HSR, works council or equivalent)
            </span>
          </label>

          <label className="cr-field">
            <span>What did workers say? (one per line)</span>
            <textarea
              rows={3}
              value={form.workerViews}
              onChange={(e) => update({ workerViews: e.target.value })}
            />
          </label>
          <label className="cr-field">
            <span>How did management respond? (one per line)</span>
            <textarea
              rows={3}
              value={form.managementResponse}
              onChange={(e) => update({ managementResponse: e.target.value })}
            />
          </label>
          <label className="cr-field">
            <span>Did their views affect the decision? (one per line)</span>
            <textarea
              rows={2}
              value={form.decisionImpact}
              onChange={(e) => update({ decisionImpact: e.target.value })}
            />
          </label>
          <label className="cr-field">
            <span>Summary</span>
            <textarea
              rows={2}
              value={form.summary}
              onChange={(e) => update({ summary: e.target.value })}
            />
          </label>

          <div className="cr-field-row">
            <label className="cr-field">
              <span>What do workers report about the work itself?</span>
              <select
                value={form.workerReportedDirection}
                onChange={(e) => update({ workerReportedDirection: e.target.value })}
              >
                <option value="NOT_ASSESSED">Not assessed</option>
                <option value="IMPROVED">Improved</option>
                <option value="UNCHANGED">Unchanged</option>
                <option value="WORSENED">Worsened</option>
              </select>
              <em className="cr-hint">
                Kept beside the work-pattern evidence, never merged into it.
              </em>
            </label>
            <label className="cr-checkbox cr-checkbox-standalone">
              <input
                type="checkbox"
                checked={form.isPostInterventionFollowUp}
                onChange={(e) => update({ isPostInterventionFollowUp: e.target.checked })}
              />
              <span>This is a follow-up after the control was implemented</span>
            </label>
          </div>

          <div className="cr-form-footer">
            <button
              type="button"
              className="cr-button cr-button-primary"
              onClick={save}
              disabled={busy}
            >
              Record consultation
            </button>
            {!data.case.consultationNotApplicable?.isNotApplicable && (
              <button
                type="button"
                className="cr-button"
                onClick={markNotApplicable}
                disabled={busy}
              >
                Consultation is not applicable
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}

function LabelledList({ label, items = [] }) {
  if (!items.length) return null;
  return (
    <div className="cr-labelled-list">
      <span className="cr-meta">{label}</span>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// ── Control (§15) ────────────────────────────────────────────────────────────

function ControlTab({ data, closed, busy, run }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    interventionType: 'MEETING_PRACTICE',
    implementationDate: new Date().toISOString().slice(0, 10),
    expectedEffects: [],
  });
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    controlReviewApi
      .suggestedEffects(form.interventionType)
      .then(({ suggestions: list }) => {
        setSuggestions(list);
        setForm((prev) => ({
          ...prev,
          expectedEffects: list.map((s) => ({ metric: s.metric, direction: s.direction })),
        }));
      })
      .catch(() => setSuggestions([]));
  }, [form.interventionType]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const toggleEffect = (metric, direction) => {
    setForm((prev) => {
      const exists = prev.expectedEffects.find((e) => e.metric === metric);
      if (exists && exists.direction === direction) {
        return {
          ...prev,
          expectedEffects: prev.expectedEffects.filter((e) => e.metric !== metric),
        };
      }
      return {
        ...prev,
        expectedEffects: [
          ...prev.expectedEffects.filter((e) => e.metric !== metric),
          { metric, direction },
        ],
      };
    });
  };

  const save = () =>
    run(() => controlReviewApi.planIntervention(data.case._id, form), 'Control recorded.');

  return (
    <>
      <section className="app-panel">
        <h2>Controls recorded</h2>
        {data.interventions.length === 0 && <p className="cr-empty">No control recorded yet.</p>}

        {data.interventions.map((intervention) => (
          <article key={intervention._id} className="cr-intervention">
            <header>
              <strong>{intervention.name}</strong>
              <span className="cr-meta">
                {INTERVENTION_TYPE_LABELS[intervention.interventionType]} · implementation{' '}
                {formatDate(intervention.implementationDate)} · {intervention.status.toLowerCase()}
              </span>
            </header>
            {intervention.description && <p>{intervention.description}</p>}

            <div className="cr-expected-block">
              <span className="cr-meta">
                Expected effects, recorded {formatDate(intervention.expectedEffectsRecordedAt)} —
                before the post-period comparison
              </span>
              <ul>
                {(intervention.expectedEffects || []).map((effect) => (
                  <li key={effect.metric}>
                    {metricLabel(effect.metric)}{' '}
                    {effect.direction === 'INCREASE'
                      ? '↑'
                      : effect.direction === 'DECREASE'
                        ? '↓'
                        : '→'}
                    {effect.rationale && <em> — {effect.rationale}</em>}
                  </li>
                ))}
              </ul>
            </div>

            {!intervention.implementationConfirmed && !closed && (
              <button
                type="button"
                className="cr-button cr-button-primary"
                disabled={busy}
                onClick={() =>
                  run(
                    () => controlReviewApi.confirmImplementation(intervention._id, {}),
                    'Implementation confirmed. Expected effects are now frozen.'
                  )
                }
              >
                Confirm implementation
              </button>
            )}
          </article>
        ))}
      </section>

      {!closed && (
        <section className="app-panel">
          <h2>Record a control</h2>
          <label className="cr-field">
            <span>What is being changed?</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </label>
          <label className="cr-field">
            <span>Description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
            />
          </label>
          <div className="cr-field-row">
            <label className="cr-field">
              <span>Type of control</span>
              <select
                value={form.interventionType}
                onChange={(e) => update({ interventionType: e.target.value })}
              >
                {Object.entries(INTERVENTION_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="cr-field">
              <span>Implementation date</span>
              <input
                type="date"
                value={form.implementationDate}
                onChange={(e) => update({ implementationDate: e.target.value })}
              />
            </label>
          </div>

          <fieldset className="cr-field cr-expected-fieldset">
            <legend>What do you expect to change if this action works?</legend>
            <p className="cr-hint">
              Required before review. Recording expectations up front is what makes the later
              comparison a test rather than a story told afterwards.
            </p>
            {suggestions.map((suggestion) => {
              const current = form.expectedEffects.find((e) => e.metric === suggestion.metric);
              return (
                <div key={suggestion.metric} className="cr-effect-row">
                  <span>{suggestion.metricLabel || suggestion.metric}</span>
                  <div className="cr-effect-buttons">
                    {['DECREASE', 'NO_CHANGE', 'INCREASE'].map((direction) => (
                      <button
                        key={direction}
                        type="button"
                        className={`cr-chip ${current?.direction === direction ? 'is-active' : ''}`}
                        onClick={() => toggleEffect(suggestion.metric, direction)}
                      >
                        {direction === 'DECREASE'
                          ? '↓ lower'
                          : direction === 'INCREASE'
                            ? '↑ higher'
                            : '→ no change'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {suggestions.length === 0 && (
              <p className="cr-hint">
                No suggested effects for this control type. Record them against the metrics this
                case is monitoring.
              </p>
            )}
          </fieldset>

          <button
            type="button"
            className="cr-button cr-button-primary"
            onClick={save}
            disabled={busy}
          >
            Record control
          </button>
        </section>
      )}
    </>
  );
}

// ── Verification (§16–§18) ───────────────────────────────────────────────────

function VerificationTab({ data, busy, run }) {
  const expected = data.evaluations.filter((e) => e.isExpectedEffect);
  const others = data.evaluations.filter((e) => !e.isExpectedEffect);

  const readyToEvaluate = data.interventions.filter((i) => i.implementationConfirmed);

  return (
    <>
      {readyToEvaluate.length > 0 && (
        <section className="app-panel">
          <h2>Run the comparison</h2>
          <p className="app-muted">
            Compares the post-implementation period with the period before it, checks whether the
            change held, and checks whether demand appears elsewhere.
          </p>
          {readyToEvaluate.map((intervention) => (
            <div key={intervention._id} className="cr-row-inline">
              <span>{intervention.name}</span>
              <button
                type="button"
                className="cr-button cr-button-primary"
                disabled={busy}
                onClick={() =>
                  run(() => controlReviewApi.evaluate(intervention._id), 'Comparison complete.')
                }
              >
                Run before/after comparison
              </button>
            </div>
          ))}
        </section>
      )}

      {data.evaluations.length > 0 && (
        <section className="app-panel">
          <h2>Before and after</h2>
          <table className="cr-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Before</th>
                <th>After</th>
                <th>Change</th>
                <th>Expected</th>
                <th>Matched</th>
                <th>Held</th>
              </tr>
            </thead>
            <tbody>
              {[...expected, ...others].map((evaluation) => (
                <tr
                  key={`${evaluation.metric}-${evaluation.teamId}`}
                  className={evaluation.isExpectedEffect ? 'is-expected' : ''}
                >
                  <td>
                    {metricLabel(evaluation.metric)}
                    {evaluation.isExpectedEffect && <span className="cr-star"> *</span>}
                  </td>
                  <td>{formatNumber(evaluation.prePeriodValue)}</td>
                  <td>{formatNumber(evaluation.postPeriodValue)}</td>
                  <td>{formatPercent(evaluation.relativeChange)}</td>
                  <td>
                    {evaluation.expectedDirection === 'NOT_SPECIFIED'
                      ? '—'
                      : evaluation.expectedDirection.toLowerCase()}
                  </td>
                  <td>
                    {evaluation.directionMatched === null
                      ? '—'
                      : evaluation.directionMatched
                        ? 'yes'
                        : 'no'}
                  </td>
                  <td>
                    {evaluation.reboundDetected
                      ? 'not sustained'
                      : evaluation.sustained === null
                        ? '—'
                        : 'held'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cr-hint">* metric the organisation expected this control to change</p>

          {data.evaluations.some((e) => !e.evaluationPossible) && (
            <div className="cr-gap">
              <strong>Data gaps</strong>
              <ul>
                {[
                  ...new Set(
                    data.evaluations
                      .filter((e) => !e.evaluationPossible)
                      .map((e) => e.unavailableReason)
                  ),
                ].map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {data.migrations.length > 0 && (
        <section className="app-panel cr-migration-panel">
          <h2>Possible workload migration</h2>
          <p className="app-muted">
            One metric improved while another moved the other way over the same period. This is a
            question to investigate, not a conclusion.
          </p>
          {data.migrations.map((finding) => (
            <article key={finding._id} className="cr-migration">
              <span className={`cr-tag cr-tag-${finding.severity.toLowerCase()}`}>
                {finding.migrationType === 'TEAM'
                  ? 'Team to team'
                  : finding.migrationType === 'TIME'
                    ? 'Into other hours'
                    : 'Into another channel'}
              </span>
              <p>{finding.summary}</p>
              <details className="cr-details">
                <summary>Questions to investigate</summary>
                <ul className="cr-question-list">
                  {(finding.investigationQuestions || []).map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </details>
              <div className="cr-field-row">
                <button
                  type="button"
                  className="cr-button"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () =>
                        controlReviewApi.updateMigration(finding._id, {
                          status: 'UNDER_INVESTIGATION',
                        }),
                      'Marked as under investigation.'
                    )
                  }
                >
                  Investigating
                </button>
                <button
                  type="button"
                  className="cr-button"
                  disabled={busy}
                  onClick={() => {
                    const investigationNotes = window.prompt(
                      'What context explains this? This is recorded against the finding.'
                    );
                    if (!investigationNotes) return;
                    run(
                      () =>
                        controlReviewApi.updateMigration(finding._id, {
                          status: 'EXPLAINED_BY_CONTEXT',
                          investigationNotes,
                        }),
                      'Recorded.'
                    );
                  }}
                >
                  Explained by context
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {data.interpretation && (
        <section className="app-panel">
          <h2>Interpretation</h2>
          {Object.entries(data.interpretation.blocks).map(([block, lines]) =>
            lines.length === 0 ? null : (
              <div key={block} className="cr-interpretation-block">
                <h3>{block.replace(/_/g, ' ').toLowerCase()}</h3>
                <ul>
                  {lines.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              </div>
            )
          )}
        </section>
      )}
    </>
  );
}

// ── Decision (§6) ────────────────────────────────────────────────────────────

function DecisionTab({ data, closed, busy, run }) {
  const [form, setForm] = useState({
    status: 'CLOSED_IMPROVEMENT_OBSERVED',
    organisationDecision: '',
    decisionNotes: '',
    nextReviewDate: '',
  });

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  if (closed) {
    return (
      <section className="app-panel">
        <h2>Organisation decision</h2>
        <p className="cr-status-value">{CASE_STATUS_LABELS[data.case.status]}</p>
        <p>{data.case.organisationDecision}</p>
        {data.case.decisionNotes && <p className="cr-meta">{data.case.decisionNotes}</p>}
        <p className="cr-meta">Recorded {formatDate(data.case.decisionRecordedAt)}</p>
        {data.case.nextReviewDate && (
          <p className="cr-meta">Next review {formatDate(data.case.nextReviewDate)}</p>
        )}
      </section>
    );
  }

  return (
    <section className="app-panel">
      <h2>Record the organisation decision</h2>
      <p className="app-muted">
        SignalTrue never closes a case. The decision, and the reason for it, are yours.
      </p>

      {data.completeness.outstanding.length > 0 && (
        <div className="cr-alert cr-alert-info">
          Outstanding review components: {data.completeness.outstanding.join(', ')}. You may still
          record a decision — completeness is information, not a gate.
        </div>
      )}

      <label className="cr-field">
        <span>Decision</span>
        <select value={form.status} onChange={(e) => update({ status: e.target.value })}>
          <option value="DECISION_REQUIRED">Keep open — decision still required</option>
          <option value="MONITORING">Keep open — continue monitoring</option>
          {CLOSURE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="cr-field">
        <span>What has the organisation decided?</span>
        <textarea
          rows={3}
          value={form.organisationDecision}
          onChange={(e) => update({ organisationDecision: e.target.value })}
          placeholder="Continue the control; review again in 8 weeks."
        />
      </label>

      <label className="cr-field">
        <span>Notes</span>
        <textarea
          rows={3}
          value={form.decisionNotes}
          onChange={(e) => update({ decisionNotes: e.target.value })}
        />
      </label>

      <label className="cr-field">
        <span>Next review date</span>
        <input
          type="date"
          value={form.nextReviewDate}
          onChange={(e) => update({ nextReviewDate: e.target.value })}
        />
      </label>

      <button
        type="button"
        className="cr-button cr-button-primary"
        disabled={busy || !form.organisationDecision.trim()}
        onClick={() =>
          run(
            () =>
              controlReviewApi.recordDecision(data.case._id, {
                ...form,
                nextReviewDate: form.nextReviewDate || null,
              }),
            'Decision recorded.'
          )
        }
      >
        Record decision
      </button>
    </section>
  );
}

// ── Evidence pack (§20) ──────────────────────────────────────────────────────

function EvidenceTab({ data, busy, run }) {
  const [downloading, setDownloading] = useState(null);

  const download = async (pack) => {
    setDownloading(pack._id);
    try {
      const blob = await controlReviewApi.downloadEvidencePack(pack._id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pack.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section className="app-panel">
      <h2>Review Evidence Pack</h2>
      <p className="app-muted">
        The full review record: trigger, investigation, consultation, control, verification,
        migration check, decision and audit timeline — with its methodology and limitations. Every
        export is logged.
      </p>

      <button
        type="button"
        className="cr-button cr-button-primary"
        disabled={busy}
        onClick={() =>
          run(
            () => controlReviewApi.generateEvidencePack(data.case._id),
            'Evidence pack generated.'
          )
        }
      >
        Generate evidence pack
      </button>

      {data.evidencePacks.length > 0 && (
        <ul className="cr-pack-list">
          {data.evidencePacks.map((pack) => (
            <li key={pack._id}>
              <div>
                <strong>{pack.fileName}</strong>
                <p className="cr-meta">
                  Version {pack.version} · generated {formatDate(pack.generatedAt)} ·{' '}
                  {Math.round(pack.byteLength / 1024)} KB
                </p>
              </div>
              <button
                type="button"
                className="cr-button"
                disabled={downloading === pack._id}
                onClick={() => download(pack)}
              >
                {downloading === pack._id ? 'Preparing…' : 'Download'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
