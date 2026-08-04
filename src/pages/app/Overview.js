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

const nextSteps = [
  {
    title: 'Review Work Network',
    note: 'Inspect measured cross-team meeting links and connector concentration.',
    to: '/app/work-network',
  },
  {
    title: 'Check data coverage',
    note: 'Verify which people, teams, and connectors are represented.',
    to: '/app/signal-coverage',
  },
  {
    title: 'Track an action',
    note: 'Record a reversible change and compare the same metric later.',
    to: '/app/actions',
  },
  {
    title: 'Read methodology',
    note: 'See what is observed, derived, modeled, or AI-generated.',
    to: '/app/methodology',
  },
];

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <div className="text-center text-red-700">Unable to load the overview. {error}</div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <AppShell user={user} section="Overview">
      <AntiWeaponizationNotice variant="sticky" />
      <OnboardingBanner calibrationDay={calibrationStatus?.calibrationDay} />

      <div className="app-dashboard-hero">
        <div className="app-dashboard-hero-main">
          <p className="app-dashboard-eyebrow">Leadership dashboard</p>
          <h1 className="app-dashboard-title">Measured work patterns at a glance</h1>
          <p className="app-dashboard-copy">
            Counts and durations come from connected metadata. Derived statistics and internal model
            indices help prioritize a team conversation; they do not measure employee health,
            engagement, performance, or intent.
          </p>
        </div>
        <div className="app-dashboard-hero-side">
          <p className="app-dashboard-eyebrow">How to use this</p>
          <p className="text-sm leading-6 text-slate-700">
            Check coverage, inspect the underlying metric, ask what changed, and test one reversible
            action. Do not act on a score alone.
          </p>
          <Link className="mt-4 inline-block text-sm font-bold text-teal-800" to="/app/methodology">
            Read methods and limits
          </Link>
        </div>
      </div>

      {latestBrief && (
        <section className="app-dashboard-section">
          <div className="app-panel border-indigo-200">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-3xl">
                <p className="app-dashboard-eyebrow">Latest weekly brief</p>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  {latestBrief.status?.label}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {latestBrief.status?.summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
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
              <Link
                to="/app/latest-brief"
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white no-underline hover:text-white"
              >
                Explore evidence and ask AI
              </Link>
            </div>
            {latestBrief.metrics?.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {latestBrief.metrics
                  .filter((metric) =>
                    ['meeting_hours', 'after_hours', 'focus_time', 'active_alerts'].includes(
                      metric.key
                    )
                  )
                  .map((metric) => (
                    <div
                      key={metric.key}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <p className="text-xl font-extrabold text-slate-900">
                        {!metric.available || metric.current == null
                          ? 'Not measured'
                          : `${metric.current}${metric.unit === '%' ? '%' : metric.unit === 'hours' ? 'h' : ''}`}
                      </p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                        {metric.label}
                      </p>
                    </div>
                  ))}
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

      <section className="app-dashboard-section">
        <div className="app-section-heading">
          <div>
            <h2>Turn evidence into a decision</h2>
            <p>Each next step keeps the measured data separate from interpretation.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {nextSteps.map((item) => (
            <Link key={item.to} to={item.to} className="app-dashboard-card hover:border-teal-400">
              <span className="app-dashboard-card-value text-lg">{item.title}</span>
              <span className="app-dashboard-card-note">{item.note}</span>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
