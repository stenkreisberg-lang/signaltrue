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
