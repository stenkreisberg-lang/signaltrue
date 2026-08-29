import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell, { PageHeader } from '../../../components/app/AppShell';
import controlReviewApi, {
  formatDate,
  formatPercent,
  metricLabel,
} from '../../../utils/controlReviewApi';
import { getAuthenticatedContext } from '../../../utils/authContext';

export default function ControlReviewFindings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissing, setDismissing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const context = await getAuthenticatedContext();
      setUser(context.user);
      const dashboard = await controlReviewApi.dashboard();
      setFindings(dashboard.reviewRecommendations || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the work-pattern findings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dismissFinding = async (findingId) => {
    const reason = window.prompt('Why is no review needed? This is recorded against the finding.');
    if (!reason) return;
    setDismissing(findingId);
    try {
      await controlReviewApi.dismissFinding(findingId, reason);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not dismiss the finding.');
    } finally {
      setDismissing(null);
    }
  };

  return (
    <AppShell user={user} section="Control reviews" width="wide">
      <PageHeader
        eyebrow="Health & safety"
        title="Persistent work-pattern changes"
        description="Review every qualified finding against the team’s own baseline. Opening or dismissing a review remains a human decision."
        action={
          <button
            type="button"
            className="cr-button"
            onClick={() => navigate('/app/control-reviews')}
          >
            Back to control reviews
          </button>
        }
      />

      {error && <div className="cr-alert cr-alert-error">{error}</div>}
      {loading && <div className="app-panel">Loading…</div>}

      {!loading && findings.length === 0 && (
        <section className="app-panel cr-section">
          <p className="cr-empty">No persistent work-pattern findings need review right now.</p>
        </section>
      )}

      {!loading && findings.length > 0 && (
        <section className="app-panel cr-section">
          {findings.map((finding) => (
            <article key={finding.findingId} className="cr-finding">
              <header className="cr-finding-head">
                <div>
                  <h3>{finding.team}</h3>
                  <p className="cr-meta">
                    Week of {formatDate(finding.periodStart)} · persistent across{' '}
                    {finding.persistencePeriods} weekly period
                    {finding.persistencePeriods === 1 ? '' : 's'} · data quality{' '}
                    {finding.dataQuality.toLowerCase()}
                    {finding.basis === 'SEVERE_SINGLE_SIGNAL' && ' · single-signal exception'}
                  </p>
                </div>
                <div className="cr-finding-actions">
                  <button
                    type="button"
                    className="cr-button cr-button-primary"
                    onClick={() =>
                      navigate(`/app/control-reviews/new?findingId=${finding.findingId}`)
                    }
                  >
                    Open review
                  </button>
                  <button
                    type="button"
                    className="cr-button"
                    disabled={dismissing === finding.findingId}
                    onClick={() => dismissFinding(finding.findingId)}
                  >
                    No review needed
                  </button>
                </div>
              </header>

              <ul className="cr-signal-list">
                {finding.signals.map((signal) => (
                  <li key={signal.metric}>
                    <span className="cr-signal-metric">{metricLabel(signal.metric)}</span>
                    <span
                      className={`cr-signal-change ${
                        signal.direction === 'UP' ? 'is-up' : 'is-down'
                      }`}
                    >
                      {formatPercent(signal.relativeChange)}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="cr-summary">{finding.summary}</p>
            </article>
          ))}
        </section>
      )}
    </AppShell>
  );
}
