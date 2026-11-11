import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import CalibrationProgress from '../../components/CalibrationProgress';
import { Card, Spinner } from '../../components/UIComponents';
import AntiWeaponizationNotice from '../../components/AntiWeaponizationNotice';
import OnboardingBanner from '../../components/OnboardingBanner';
import EngagementStrainDashboard from '../../components/EngagementStrainDashboard';
import HRDecisionSnapshot from '../../components/app/HRDecisionSnapshot';
import AppShell from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

function TrendChart({ title, description, data, dataKey, color, unit, type = 'line' }) {
  const measured = data.filter((point) => point[dataKey] != null);
  if (measured.length < 2) {
    return (
      <div className="rounded-container border border-slate-200 bg-white p-4">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-caption leading-5 text-slate-600">{description}</p>
        <p className="mt-5 rounded-control bg-slate-50 p-3 text-caption text-slate-500">
          Not enough measured periods to show a trend.
        </p>
      </div>
    );
  }
  const Chart = type === 'bar' ? BarChart : LineChart;
  return (
    <div className="rounded-container border border-slate-200 bg-white p-4">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-caption leading-5 text-slate-600">{description}</p>
      <div className="mt-3 h-48" role="img" aria-label={`${title}, measured periods only`}>
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => [`${value}${unit}`, title]} />
            {type === 'bar' ? (
              <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
            ) : (
              <Line
                type="monotone"
                dataKey={dataKey}
                name={title}
                stroke={color}
                strokeWidth={2.5}
                connectNulls={false}
                dot
              />
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EvidenceTrendGrid({ brief }) {
  const data = brief?.trend || [];
  if (!data.length) return null;
  return (
    <section className="app-dashboard-section">
      <div className="app-section-heading">
        <div>
          <p className="app-dashboard-eyebrow">Measured history</p>
          <h2>How the work pattern is moving</h2>
          <p>Four separate dimensions. A gap means data was unavailable, not zero activity.</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart
          title="Meeting load"
          description="Participant-hours per represented person, not meeting instances."
          data={data}
          dataKey="meetingHours"
          color="#2563eb"
          unit="h"
        />
        <TrendChart
          title="Messaging intensity"
          description="Messages per represented person. Volume alone is not a performance measure."
          data={data}
          dataKey="messagesPerPerson"
          color="#0f766e"
          unit=""
          type="bar"
        />
        <TrendChart
          title="After-hours messaging"
          description="Share of observed messages sent outside the configured work schedule."
          data={data}
          dataKey="afterHoursPct"
          color="#b45309"
          unit="%"
        />
        <TrendChart
          title="Uninterrupted calendar availability"
          description="Available time per person, not verified focus or delivered output."
          data={data}
          dataKey="focusHours"
          color="#7c3aed"
          unit="h"
        />
      </div>
    </section>
  );
}

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
          try {
            const response = await api.get('/weekly-brief/latest');
            setLatestBrief(response.data);
          } catch {
            setLatestBrief(null);
          }
        }

        try {
          const response = await api.get(`/calibration/status/${context.orgId}`);
          setCalibrationStatus(response.data);
        } catch {
          setCalibrationStatus(null);
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
  const reportingReady =
    calibrationStatus?.readinessStatus === 'ready' && latestBrief?.reportMode === 'full';
  const hasMeasuredEvidence = (latestBrief?.trend || []).some((point) =>
    ['meetingHours', 'messagesPerPerson', 'afterHoursPct', 'focusHours'].some((key) => point[key] != null)
  );

  if (loading) {
    return (
      <AppShell user={user} section="Overview">
        <div className="app-panel flex min-h-64 items-center justify-center">
          <Spinner size="large" />
          <span className="ml-3 text-caption text-slate-600">
            Preparing the verified work-pattern overview…
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
          <p className="app-dashboard-eyebrow">Latest completed reporting period</p>
          <h1 className="app-dashboard-title">
            {latestBrief?.freshness?.refreshFailed
              ? 'Saved report only · refresh unavailable'
              : latestBrief?.status?.evidenceGrade === 'Low'
                ? 'Limited evidence this week'
                : reportingReady || hasMeasuredEvidence
                  ? latestBrief?.status?.label || 'Measured overview'
                  : 'Measurement setup needs attention'}
          </h1>
          <p className="app-dashboard-copy">
            {latestBrief?.freshness?.refreshFailed
              ? 'This is an older saved period. Current data could not be recalculated, so no new conclusion should be drawn from it.'
              : latestBrief?.status?.evidenceGrade === 'Low'
                ? 'Available data does not support an organisation-wide conclusion. Check coverage and eligible observations below.'
                : reportingReady || hasMeasuredEvidence
                  ? latestBrief?.status?.summary || 'Review the available measurements below.'
                  : 'Reliable descriptive measurements will appear here as connected sources begin supplying usable events.'}
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

        {reportingReady && primaryAction ? (
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
              to="/app/control-reviews"
              className="mt-3 inline-block rounded-control border border-slate-900 px-4 py-2 text-caption font-bold text-slate-900 no-underline"
            >
              Review and document
            </Link>
          </div>
        ) : (
          <div className="app-dashboard-hero-side">
            <p className="app-dashboard-eyebrow">Evidence still needs verification</p>
            <p className="text-caption leading-6 text-slate-700">
              Confirm the source records, employee mapping and reporting period before interpreting
              changes in team workload.
            </p>
            <Link to="/app/signal-coverage" className="mt-3 inline-block text-sm font-semibold underline">
              Check source verification
            </Link>
          </div>
        )}
      </div>

      {latestBrief && <HRDecisionSnapshot brief={latestBrief} />}
      {latestBrief && <EvidenceTrendGrid brief={latestBrief} />}
      {calibrationStatus === null && (
        <div className="app-panel mb-4 text-caption text-amber-800">
          Calibration status unavailable. Data readiness cannot be confirmed right now.
        </div>
      )}
      {calibrationStatus?.readinessStatus === 'setup_incomplete' && (
        <section className="app-panel mb-4 border-amber-200 bg-amber-50 text-amber-950">
          <h2 className="font-bold">Measurement setup needs attention</h2>
          <p className="mt-1 text-caption">
            A connected account does not guarantee usable reporting. Check source permissions,
            employee mapping and incoming events before interpreting organizational trends.
          </p>
          <Link to="/app/signal-coverage" className="mt-2 inline-block font-semibold underline">
            Review data coverage
          </Link>
        </section>
      )}
      {calibrationStatus?.isInCalibration &&
      calibrationStatus?.readinessStatus !== 'setup_incomplete' ? (
        <CalibrationProgress orgId={orgId} />
      ) : calibrationStatus?.readinessStatus === 'ready' ? (
        <section className="app-dashboard-section">
          <details className="app-panel">
            <summary className="cursor-pointer font-semibold text-slate-900">
              Advanced descriptive indices · experimental
            </summary>
            <p className="mt-3 text-sm text-slate-600">
              These models are supplementary exploratory measures. They do not diagnose mental
              health, establish psychosocial risk, or replace source-level evidence and worker
              consultation.
            </p>
            <div className="mt-4">
              <EngagementStrainDashboard orgId={orgId} initialLimit={5} />
            </div>
          </details>
        </section>
      ) : null}
    </AppShell>
  );
}
