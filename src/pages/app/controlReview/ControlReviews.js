import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell, { PageHeader } from '../../../components/app/AppShell';
import controlReviewApi, {
  CASE_STATUS_LABELS,
  TRIGGER_LABELS,
  formatDate,
} from '../../../utils/controlReviewApi';
import { getAuthenticatedContext } from '../../../utils/authContext';

/**
 * The H&S homepage (spec §7).
 *
 * It answers five operational questions and nothing else. The temptation is to
 * add charts; the product is judged on whether the five things that need acting
 * on are visible, not on how much can be rendered.
 */

const MODULE_ORDER = [
  'needsAttention',
  'controlsBeingImplemented',
  'monitoring',
  'reviewsDue',
  'exceptions',
];

const EXCEPTION_LABELS = {
  POSSIBLE_WORKLOAD_MIGRATION: 'Possible workload migration',
  IMPROVEMENT_NOT_SUSTAINED: 'Initial improvement not sustained',
  MIXED_EVIDENCE: 'Mixed evidence',
};

function EmptyNote({ children }) {
  return <p className="cr-empty">{children}</p>;
}

export default function ControlReviews() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const context = await getAuthenticatedContext();
      setUser(context.user);
      setDashboard(await controlReviewApi.dashboard());
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load the control review dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const modules = dashboard?.modules || {};
  const recommendationCount = new Set(
    dashboard?.reviewRecommendations?.map((finding) => finding.team)
  ).size;

  return (
    <AppShell user={user} section="Control reviews" width="wide">
      <PageHeader
        eyebrow="Health & safety"
        title="Control reviews"
        description="Whether an action the organisation took actually changed how work happens, whether the change lasted, and whether the demand moved somewhere else."
        action={
          <button
            type="button"
            className="cr-button cr-button-primary"
            onClick={() => navigate('/app/control-reviews/new')}
          >
            New control review
          </button>
        }
      />

      {error && <div className="cr-alert cr-alert-error">{error}</div>}
      {loading && <div className="app-panel">Loading…</div>}

      {!loading && dashboard && (
        <>
          {dashboard.reviewRecommendations?.length > 0 && (
            <Link to="/app/control-reviews/findings" className="cr-summary-row">
              <strong>
                {recommendationCount} {recommendationCount === 1 ? 'team shows' : 'teams show'} a
                persistent work-pattern change
              </strong>
              <span>Review</span>
            </Link>
          )}

          <div className="cr-modules">
            {MODULE_ORDER.map((key) => {
              const module = modules[key];
              if (!module) return null;

              return (
                <section key={key} className="app-panel cr-section">
                  <h2>{module.question}</h2>

                  {module.items.length === 0 && <EmptyNote>Nothing here right now.</EmptyNote>}

                  {key === 'needsAttention' &&
                    module.items.map((item) => (
                      <Link
                        key={item.caseId}
                        to={`/app/control-reviews/${item.caseId}`}
                        className="cr-row"
                      >
                        <div className="cr-row-main">
                          <strong>
                            {item.caseNumber} — {item.title}
                          </strong>
                          <p className="cr-meta">
                            {CASE_STATUS_LABELS[item.status] || item.status} ·{' '}
                            {TRIGGER_LABELS[item.triggerType] || item.triggerType} ·{' '}
                            {item.teams.join(', ')} · open {item.daysOpen} day
                            {item.daysOpen === 1 ? '' : 's'}
                          </p>
                          <p className="cr-next-step">{item.nextStep}</p>
                        </div>
                      </Link>
                    ))}

                  {key === 'controlsBeingImplemented' &&
                    module.items.map((item) => (
                      <Link
                        key={item.interventionId}
                        to={`/app/control-reviews/${item.caseId}`}
                        className="cr-row"
                      >
                        <div className="cr-row-main">
                          <strong>{item.name}</strong>
                          <p className="cr-meta">
                            {item.teams.join(', ')} · implementation{' '}
                            {formatDate(item.implementationDate)}
                            {item.implementationConfirmed ? ' (confirmed)' : ' (not yet confirmed)'}
                          </p>
                          <p className="cr-expected">
                            Expected: {item.expectedEffects.join(' · ') || 'not recorded'}
                          </p>
                        </div>
                      </Link>
                    ))}

                  {key === 'monitoring' &&
                    module.items.map((item) => (
                      <Link
                        key={item.interventionId}
                        to={`/app/control-reviews/${item.caseId}`}
                        className="cr-row"
                      >
                        <div className="cr-row-main">
                          <strong>{item.name}</strong>
                          <p className="cr-meta">
                            {item.teams.join(', ')} · {item.daysRemaining} day
                            {item.daysRemaining === 1 ? '' : 's'} until the post period closes
                          </p>
                          <p className="cr-expected">Watching: {item.watching.join(', ')}</p>
                        </div>
                      </Link>
                    ))}

                  {key === 'reviewsDue' &&
                    module.items.map((item) => (
                      <Link
                        key={item.interventionId}
                        to={`/app/control-reviews/${item.caseId}`}
                        className="cr-row"
                      >
                        <div className="cr-row-main">
                          <strong>{item.name}</strong>
                          <p className="cr-meta">
                            {item.teams.join(', ')} · post period closed{' '}
                            {formatDate(item.postPeriodEnded)} · waiting {item.daysWaiting} day
                            {item.daysWaiting === 1 ? '' : 's'}
                          </p>
                        </div>
                      </Link>
                    ))}

                  {key === 'exceptions' &&
                    module.items.map((item, index) => (
                      <Link
                        key={`${item.caseId}-${index}`}
                        to={`/app/control-reviews/${item.caseId}`}
                        className="cr-row cr-row-exception"
                      >
                        <div className="cr-row-main">
                          <span
                            className={`cr-tag cr-tag-${item.severity?.toLowerCase() || 'moderate'}`}
                          >
                            {EXCEPTION_LABELS[item.type] || item.type}
                          </span>
                          <p className="cr-summary">{item.summary}</p>
                          <p className="cr-meta">{item.teams.join(', ')}</p>
                        </div>
                      </Link>
                    ))}
                </section>
              );
            })}
          </div>

          <p className="cr-disclaimer">{dashboard.disclaimer}</p>
        </>
      )}
    </AppShell>
  );
}
