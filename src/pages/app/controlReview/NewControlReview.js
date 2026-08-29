import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell, { PageHeader } from '../../../components/app/AppShell';
import api from '../../../utils/api';
import controlReviewApi, {
  TRIGGER_LABELS,
  formatDate,
  formatPercent,
} from '../../../utils/controlReviewApi';
import { getAuthenticatedContext } from '../../../utils/authContext';

/**
 * Start or import a review (spec §8).
 *
 * The external path is first-class: most real cases arrive from a survey, an
 * worker-representative concern or an audit, not from SignalTrue observation. A
 * customer who is
 * already further along can record a control immediately after opening.
 */

const NON_DETECTION_TRIGGERS = Object.keys(TRIGGER_LABELS).filter(
  (key) => key !== 'SIGNALTRUE_PATTERN'
);

export default function NewControlReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const findingId = searchParams.get('findingId');

  const [user, setUser] = useState(null);
  const [meta, setMeta] = useState(null);
  const [teams, setTeams] = useState([]);
  const [finding, setFinding] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    triggerType: 'PSYCHOSOCIAL_SURVEY',
    triggerReference: '',
    triggerDate: new Date().toISOString().slice(0, 10),
    teamIds: [],
    initialEvidenceSummary: '',
    monitoredMetrics: [],
    evidenceSourceName: '',
    evidenceSummary: '',
    evidenceReference: '',
  });

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    (async () => {
      try {
        const context = await getAuthenticatedContext();
        setUser(context.user);

        const [metaData, teamsResponse] = await Promise.all([
          controlReviewApi.meta(),
          api.get('/teams'),
        ]);
        setMeta(metaData);
        setTeams(teamsResponse.data?.teams || teamsResponse.data || []);

        if (findingId) {
          const { findings } = await controlReviewApi.patternFindings('REVIEW_RECOMMENDED');
          const match = findings.find((f) => f.findingId === findingId || f._id === findingId);
          if (match) {
            setFinding(match);
            setForm((prev) => ({
              ...prev,
              triggerType: 'SIGNALTRUE_PATTERN',
              title: `Persistent work-pattern change in ${match.teamName}`,
              triggerReference: match._id,
              triggerDate: new Date(match.periodStart).toISOString().slice(0, 10),
              teamIds: [String(match.teamId)],
              initialEvidenceSummary: match.summary,
              monitoredMetrics: match.signals.map((s) => s.metric),
            }));
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load the form.');
      }
    })();
  }, [findingId]);

  // Metric suggestions follow the trigger type, and stay editable (§8 step 6).
  useEffect(() => {
    if (!form.triggerType || finding) return;
    controlReviewApi
      .recommendedMetrics(form.triggerType)
      .then(({ metrics }) => {
        setRecommended(metrics);
        setForm((prev) => ({ ...prev, monitoredMetrics: metrics.map((m) => m.key) }));
      })
      .catch(() => setRecommended([]));
  }, [form.triggerType, finding]);

  const metricOptions = useMemo(() => meta?.metrics || [], [meta]);

  const toggle = (list, value) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const submit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!form.title.trim()) return setError('Give the review a title.');
    if (form.teamIds.length === 0) return setError('Select at least one affected team.');

    setSaving(true);
    try {
      const created = await controlReviewApi.openCase({
        title: form.title.trim(),
        description: form.description,
        triggerType: form.triggerType,
        triggerReference: form.triggerReference,
        triggerDate: form.triggerDate,
        patternFindingId: finding?._id || finding?.findingId || null,
        teamIds: form.teamIds,
        initialEvidenceSummary: form.initialEvidenceSummary,
        monitoredMetrics: form.monitoredMetrics,
        triggerEvidence: form.evidenceSourceName
          ? {
              sourceName: form.evidenceSourceName,
              summary: form.evidenceSummary,
              referenceUrlOrId: form.evidenceReference,
              sourceDate: form.triggerDate,
            }
          : null,
      });

      navigate(`/app/control-reviews/${created._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not open the review.');
      setSaving(false);
    }
  };

  return (
    <AppShell user={user} section="Control reviews">
      <PageHeader
        eyebrow="Health & safety"
        title="New control review"
        description="A review can start from anywhere — a survey, a worker or safety-representative concern, an audit, an incident, or a SignalTrue pattern. SignalTrue does not need to have found the issue."
      />

      {error && <div className="cr-alert cr-alert-error">{error}</div>}

      <form className="app-panel cr-form" onSubmit={submit}>
        {finding && (
          <div className="cr-prefill">
            <h3>Pre-filled from a persistent work-pattern change</h3>
            <p className="cr-meta">
              {finding.teamName} · week of {formatDate(finding.periodStart)} · persistent across{' '}
              {finding.persistencePeriods} weekly period
              {finding.persistencePeriods === 1 ? '' : 's'}
            </p>
            <ul className="cr-signal-list">
              {finding.signals.map((signal) => (
                <li key={signal.metric}>
                  <span className="cr-signal-metric">{signal.label || signal.metric}</span>
                  <span className="cr-signal-change">{formatPercent(signal.relativeChange)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <label className="cr-field">
          <span>Title</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="High job demands reported in Customer Support"
          />
        </label>

        {!finding && (
          <label className="cr-field">
            <span>What started this review?</span>
            <select
              value={form.triggerType}
              onChange={(e) => update({ triggerType: e.target.value })}
            >
              {NON_DETECTION_TRIGGERS.map((key) => (
                <option key={key} value={key}>
                  {TRIGGER_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="cr-field-row">
          <label className="cr-field">
            <span>Source reference</span>
            <input
              type="text"
              value={form.triggerReference}
              onChange={(e) => update({ triggerReference: e.target.value })}
              placeholder="People Matter Survey 2026 — Support cohort"
            />
          </label>
          <label className="cr-field">
            <span>Date of the source evidence</span>
            <input
              type="date"
              value={form.triggerDate}
              onChange={(e) => update({ triggerDate: e.target.value })}
            />
          </label>
        </div>

        <fieldset className="cr-field">
          <legend>Affected team(s)</legend>
          <div className="cr-checkbox-grid">
            {teams.map((team) => (
              <label key={team._id} className="cr-checkbox">
                <input
                  type="checkbox"
                  checked={form.teamIds.includes(String(team._id))}
                  onChange={() => update({ teamIds: toggle(form.teamIds, String(team._id)) })}
                />
                <span>{team.name}</span>
              </label>
            ))}
          </div>
          <p className="cr-hint">
            Teams below the minimum group size are suppressed everywhere, including in exports.
          </p>
        </fieldset>

        <label className="cr-field">
          <span>What is known, and why does this warrant review?</span>
          <textarea
            rows={4}
            value={form.initialEvidenceSummary}
            onChange={(e) => update({ initialEvidenceSummary: e.target.value })}
            placeholder="Survey scores for job demands moved from 3.1 to 4.2 for this cohort, with comments describing meeting volume and deadline pressure."
          />
        </label>

        <fieldset className="cr-field">
          <legend>Work patterns to monitor</legend>
          {recommended.length > 0 && !finding && (
            <p className="cr-hint">
              Recommended for a {TRIGGER_LABELS[form.triggerType]?.toLowerCase()}. Adjust freely.
            </p>
          )}
          <div className="cr-checkbox-grid">
            {metricOptions.map((metric) => (
              <label key={metric.key} className="cr-checkbox">
                <input
                  type="checkbox"
                  checked={form.monitoredMetrics.includes(metric.key)}
                  onChange={() =>
                    update({ monitoredMetrics: toggle(form.monitoredMetrics, metric.key) })
                  }
                />
                <span>
                  {metric.label}
                  <em className="cr-unit">{metric.unit}</em>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <details className="cr-details">
          <summary>Attach the source document or reference (optional)</summary>
          <div className="cr-field-row">
            <label className="cr-field">
              <span>Source name</span>
              <input
                type="text"
                value={form.evidenceSourceName}
                onChange={(e) => update({ evidenceSourceName: e.target.value })}
              />
            </label>
            <label className="cr-field">
              <span>Reference or link</span>
              <input
                type="text"
                value={form.evidenceReference}
                onChange={(e) => update({ evidenceReference: e.target.value })}
              />
            </label>
          </div>
          <label className="cr-field">
            <span>Summary</span>
            <textarea
              rows={3}
              value={form.evidenceSummary}
              onChange={(e) => update({ evidenceSummary: e.target.value })}
            />
          </label>
        </details>

        <div className="cr-form-footer">
          <button type="submit" className="cr-button cr-button-primary" disabled={saving}>
            {saving ? 'Opening…' : 'Open control review'}
          </button>
          <button
            type="button"
            className="cr-button"
            onClick={() => navigate('/app/control-reviews')}
          >
            Cancel
          </button>
        </div>

        {meta?.disclaimer && <p className="cr-disclaimer">{meta.disclaimer}</p>}
      </form>
    </AppShell>
  );
}
