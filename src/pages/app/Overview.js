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
          <p className="app-dashboard-eyebrow">Measured movement</p>
          <h2>What changed across the last six measured periods</h2>
          <p>Missing values remain gaps. They are not converted into zero activity.</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart
          title="Meeting participant-hours per person"
          description="Calendar load, compared across measured periods."
          data={data}
          dataKey="meetingHours"
          color="#2563eb"
          unit="h"
        />
        <TrendChart
          title="Meetings per person"
          description="Meeting instances, not attendee-expanded event rows."
          data={data}
          dataKey="meetings"
          color="#0f766e"
          unit=""
          type="bar"
        />
        <TrendChart
          title="Consecutive meeting blocks"
          description="Blocks with less than five minutes between sessions."
          data={data}
          dataKey="backToBack"
          color="#d97706"
          unit=""
        />
        <TrendChart
          title="Uninterrupted calendar availability"
          description="Available work time per person where calendar coverage is eligible."
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
  const meetingMetric = latestBrief?.metrics?.find((metric) => metric.key === 'meeting_hours');
  const meetingTrend = meetingMetric?.available
    ? (latestBrief?.trend || []).filter((point) => point.meetingHours != null)
    : [];
  const hasMeasuredEvidence = (latestBrief?.trend || []).some((point) =>
    ['meetingHours', 'meetings', 'backToBack', 'focusHours'].some((key) => point[key] != null)
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
                  Employee mapping:{' '}
                  {latestBrief.coverage?.mappingCoveragePct == null
                    ? 'Unknown'
                    : `${latestBrief.coverage.mappingCoveragePct}%`}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold">
                  {latestBrief.reportMode === 'full' ? 'Full report' : 'Setup report'}
                </span>
              </div>
            </div>
            {meetingTrend.length >= 2 && (
              <div className="mt-5 rounded-container border border-slate-200 bg-white p-4">
                <h3 className="font-bold text-slate-900">Meeting hours per person</h3>
                <p className="mb-3 text-caption text-slate-600">
                  Measured periods only. Missing observations are not treated as zero.
                </p>
                <div
                  className="h-60"
                  role="img"
                  aria-label="Meeting hours per person across measured reporting periods"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={meetingTrend}>
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="meetingHours"
                        name="Meeting hours/person"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
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
                            {value ?? 'Not measured'}
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

      {latestBrief && <EvidenceTrendGrid brief={latestBrief} />}
      <section className="app-dashboard-section">
        <div className="app-section-heading">
          <div>
            <h2>From observation to a documented decision</h2>
            <p>
              Three steps for HR. Only source-supported measurements should influence the decision.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="app-panel space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">1 · Verify</p>
            <h3 className="font-semibold">Check the evidence</h3>
            <p className="text-sm text-slate-600">
              Confirm the reporting period, eligible employees, and source coverage before drawing
              conclusions.
            </p>
            <Link
              className="inline-block text-sm font-semibold underline"
              to="/app/signal-coverage"
            >
              Review source coverage
            </Link>
          </div>
          <div className="app-panel space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              2 · Investigate
            </p>
            <h3 className="font-semibold">Ask what explains the change</h3>
            <p className="text-sm text-slate-600">
              Discuss context with the relevant team. Digital metadata alone does not establish
              cause, strain or wellbeing.
            </p>
            <Link className="inline-block text-sm font-semibold underline" to="/app/signals">
              See work-pattern evidence
            </Link>
          </div>
          <div className="app-panel space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">3 · Review</p>
            <h3 className="font-semibold">Record and remeasure</h3>
            <p className="text-sm text-slate-600">
              Document a management action and review comparable measurements after implementation.
            </p>
            <Link
              className="inline-block text-sm font-semibold underline"
              to="/app/control-reviews"
            >
              Open actions & reviews
            </Link>
          </div>
        </div>
      </section>

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
