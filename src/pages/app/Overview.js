import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CalibrationProgress from '../../components/CalibrationProgress';
import { Card, Spinner } from '../../components/UIComponents';
import AntiWeaponizationNotice from '../../components/AntiWeaponizationNotice';
import OnboardingBanner from '../../components/OnboardingBanner';
import EngagementStrainDashboard from '../../components/EngagementStrainDashboard';
import AppShell from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

export default function Overview() {
  const [calibrationStatus, setCalibrationStatus] = useState(null);
  const [latestBrief, setLatestBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const context = await getAuthenticatedContext();
        setUser(context.user);
        setOrgId(context.orgId);
        if (!context.orgId) throw new Error('No organization is associated with this account.');

        if (['master_admin', 'admin', 'hr_admin', 'executive'].includes(context.user?.role)) {
          api
            .get('/weekly-brief/latest')
            .then((response) => setLatestBrief(response.data))
            .catch(() => setLatestBrief(null));
        }

        try {
          const response = await api.get(`/calibration/status/${context.orgId}`);
          setCalibrationStatus(response.data);
        } catch {
          setCalibrationStatus({ isInCalibration: false });
        }
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const primaryAction = latestBrief?.actions?.primary?.action ? latestBrief.actions.primary : null;

  if (loading) {
    return (
      <AppShell user={user} section="Overview">
        <div className="app-panel flex min-h-64 items-center justify-center">
          <Spinner size="large" />
          <span className="ml-3 text-caption text-slate-600">
            Preparing the workplace risk overview…
          </span>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell user={user} section="Overview">
        <Card>
          <div className="text-center">
            <h1 className="text-lead font-bold text-slate-900">
              The overview is temporarily unavailable
            </h1>
            <p className="mt-2 text-caption text-slate-600">
              Your saved evidence has not been changed. Check Data Sources and Coverage, or try
              again shortly.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-control bg-slate-900 px-4 py-2 text-caption font-bold text-white"
            >
              Try again
            </button>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell user={user} section="Overview">
      <AntiWeaponizationNotice variant="sticky" />
      <OnboardingBanner
        calibrationDay={calibrationStatus?.calibrationDay}
        setup={calibrationStatus?.setup}
      />

      {/* Lead with this week's finding and the single decision it calls for.
          A standing description of the method cannot tell anyone what to do
          today, and it reads the same whether nothing has changed or a team is
          in trouble. */}
      <div className="app-dashboard-hero">
        <div className="app-dashboard-hero-main">
          <p className="app-dashboard-eyebrow">This week</p>
          <h1 className="app-dashboard-title">
            {latestBrief?.status?.label || 'Nothing needs your attention yet'}
          </h1>
          <p className="app-dashboard-copy">
            {latestBrief?.status?.summary ||
              'Once a full week of activity has been measured, the pattern that most needs review appears here.'}
          </p>
          {latestBrief && (
            <Link
              to="/app/latest-brief"
              className="mt-4 inline-block rounded-control bg-slate-900 px-4 py-2.5 text-caption font-bold text-white no-underline hover:text-white"
            >
              See the evidence
            </Link>
          )}
        </div>

        {primaryAction ? (
          <div className="app-dashboard-hero-side">
            <p className="app-dashboard-eyebrow">Recommended next step</p>
            <p className="text-caption font-semibold leading-6 text-slate-900">
              {primaryAction.action}
            </p>
            <p className="mt-2 text-caption leading-5 text-slate-600">
              {[
                primaryAction.owner && `Owner: ${primaryAction.owner}`,
                primaryAction.effort && `${primaryAction.effort} effort`,
                primaryAction.reviewWindow && `Review in ${primaryAction.reviewWindow}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <Link
              to="/app/signals?status=Open"
              className="mt-3 inline-block rounded-control border border-slate-900 px-4 py-2 text-caption font-bold text-slate-900 no-underline"
            >
              Log this action
            </Link>
          </div>
        ) : (
          <div className="app-dashboard-hero-side">
            <p className="app-dashboard-eyebrow">How this works</p>
            <p className="text-caption leading-6 text-slate-700">
              Check what is measured, consult the team about the pattern, record one reversible
              change, then compare the same indicator after 14 days.
            </p>
          </div>
        )}
      </div>

      {latestBrief && (
        <section className="app-dashboard-section">
          <div className="app-panel border-indigo-200">
            {/* The finding itself is in the hero; this panel carries the
                numbers behind it and how far they can be trusted. */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="app-dashboard-eyebrow">What moved</p>
              <div className="flex flex-wrap gap-2 text-caption text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                  Evidence grade: {latestBrief.status?.evidenceGrade || 'not available'}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                  User mapping: {latestBrief.coverage?.mappingCoveragePct || 0}%
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                  {latestBrief.reportMode === 'full' ? 'Full report' : 'Setup report'}
                </span>
              </div>
            </div>
            {latestBrief.metrics?.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {latestBrief.metrics
                  .filter((metric) =>
                    ['meeting_hours', 'after_hours', 'focus_time', 'active_alerts'].includes(
                      metric.key
                    )
                  )
                  .map((metric) => {
                    const measured = metric.available && metric.current != null;
                    const suffix = metric.unit === '%' ? '%' : metric.unit === 'hours' ? 'h' : '';
                    const value = measured ? `${metric.current}${suffix}` : null;
                    // A drift product is about movement, so the change against
                    // baseline is the headline and the level is the detail.
                    const hasChange = measured && typeof metric.changePct === 'number';
                    const changeTone =
                      metric.direction === 'intended'
                        ? 'text-emerald-700'
                        : metric.direction === 'adverse'
                          ? 'text-rose-700'
                          : 'text-slate-900';

                    return (
                      <div
                        key={metric.key}
                        className="rounded-container border border-slate-200 bg-slate-50 p-4"
                      >
                        {hasChange ? (
                          <p className={`text-lead font-extrabold ${changeTone}`}>
                            {metric.changePct > 0 ? '+' : ''}
                            {metric.changePct}%
                          </p>
                        ) : (
                          <p className="text-lead font-extrabold text-slate-900">
                            {value || 'Not measured'}
                          </p>
                        )}
                        <p className="mt-1 text-caption font-bold uppercase tracking-wide text-slate-500">
                          {metric.label}
                        </p>
                        {hasChange && (
                          <p className="mt-1 text-caption text-slate-600">
                            {value} now · baseline{' '}
                            {metric.baseline != null ? `${metric.baseline}${suffix}` : 'not set'}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </section>
      )}

      {calibrationStatus?.isInCalibration ? (
        <CalibrationProgress orgId={orgId} />
      ) : (
        <section className="app-dashboard-section">
          <div className="app-section-heading">
            <div>
              <h2>Work-pattern deviation</h2>
              <p>An internal descriptive index shown with data readiness and team-level drivers.</p>
            </div>
          </div>
          <EngagementStrainDashboard orgId={orgId} initialLimit={5} />
        </section>
      )}
    </AppShell>
  );
}
