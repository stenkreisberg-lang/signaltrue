import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CalibrationProgress from '../../components/CalibrationProgress';
import SignalCard from '../../components/SignalCard';
import { Card, Badge, Button, EmptyState, Spinner } from '../../components/UIComponents';
import BehavioralDriftIndexCard from '../../components/BehavioralDriftIndexCard';
import CapacityStatusCard from '../../components/CapacityStatusCard';
import CoordinationLoadIndexCard from '../../components/CoordinationLoadIndexCard';
import BandwidthTaxIndicatorCard from '../../components/BandwidthTaxIndicatorCard';
import SilenceRiskIndicatorCard from '../../components/SilenceRiskIndicatorCard';
import AntiWeaponizationNotice from '../../components/AntiWeaponizationNotice';
import OnboardingBanner from '../../components/OnboardingBanner';
import DriftFamilyCard from '../../components/drift/DriftFamilyCard';
import DriftConfidencePanel from '../../components/drift/DriftConfidencePanel';
import EngagementStrainDashboard from '../../components/EngagementStrainDashboard';
import AppShell from '../../components/app/AppShell';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

/**
 * Overview Dashboard - Main landing page for authenticated users
 * Shows calibration progress OR behavioral drift insights depending on org state
 */
const Overview = () => {
  const [calibrationStatus, setCalibrationStatus] = useState(null);
  const [signalSummary, setSignalSummary] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [familyData, setFamilyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [loadWarning, setLoadWarning] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const context = await getAuthenticatedContext();
        setUser(context.user);
        setOrgId(context.orgId);
        setTeamId(context.teamId);

        if (!context.orgId) throw new Error('No organization is associated with this account.');
        let calibrationData = { isInCalibration: false };
        try {
          const calibrationRes = await api.get(`/calibration/status/${context.orgId}`);
          calibrationData = calibrationRes.data;
        } catch (calibrationError) {
          setLoadWarning(
            'Calibration status is temporarily unavailable. Available signal data is shown below.'
          );
        }
        setCalibrationStatus(calibrationData);

        if (!calibrationData.isInCalibration && context.teamId) {
          const [dashboardRes, summaryRes, familyRes] = await Promise.allSettled([
            api.get(`/dashboard/${context.teamId}`),
            api.get(`/signals/org/${context.orgId}/summary`),
            api.get(`/signals/org/${context.orgId}/families`),
          ]);
          if (dashboardRes.status === 'fulfilled') setDashboardData(dashboardRes.value.data);
          if (summaryRes.status === 'fulfilled') setSignalSummary(summaryRes.value.data);
          if (familyRes.status === 'fulfilled') {
            setFamilyData(familyRes.value.data);
            setLastUpdated(new Date());
          }
        }
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
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
      <div>
        {/* Anti-Weaponization Notice - Sticky at top */}
        <AntiWeaponizationNotice variant="sticky" />
        {loadWarning && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {loadWarning}
          </div>
        )}

        {/* Day-based Onboarding Banner */}
        <OnboardingBanner calibrationDay={calibrationStatus?.calibrationDay} />

        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">Team Signal Overview</h1>
            {(() => {
              const fams = familyData?.families;
              if (!fams?.length) return null;
              const maxScore = Math.max(...fams.map((f) => f.score));
              const health =
                maxScore >= 70
                  ? {
                      label: 'Critical drift',
                      color: 'bg-red-500',
                      textColor: 'text-red-100',
                      ring: 'ring-red-500/40',
                    }
                  : maxScore >= 50
                    ? {
                        label: 'Elevated drift',
                        color: 'bg-orange-500',
                        textColor: 'text-orange-100',
                        ring: 'ring-orange-400/40',
                      }
                    : maxScore >= 30
                      ? {
                          label: 'Moderate drift',
                          color: 'bg-amber-400',
                          textColor: 'text-amber-900',
                          ring: 'ring-amber-400/40',
                        }
                      : {
                          label: 'Low drift',
                          color: 'bg-emerald-500',
                          textColor: 'text-emerald-100',
                          ring: 'ring-emerald-500/40',
                        };
              return (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ring-2 ${health.color} ${health.textColor} ${health.ring}`}
                >
                  {health.label}
                </span>
              );
            })()}
          </div>
          <p className="text-slate-600">
            {calibrationStatus?.isInCalibration
              ? 'Signal monitoring has started. Initial patterns will appear within 3–5 days.'
              : 'Signals reflect structural drift in capacity, coordination, and cohesion. Interpretation improves as baselines mature.'}
          </p>
          {lastUpdated && !calibrationStatus?.isInCalibration && (
            <p className="text-[11px] text-slate-500 mt-1">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Calibration Progress (if in calibration) */}
        {calibrationStatus?.isInCalibration && (
          <div className="mb-8">
            <CalibrationProgress orgId={orgId} />
          </div>
        )}

        {/* Engagement Strain Risk — always shown once calibration is complete */}
        {!calibrationStatus?.isInCalibration && (
          <section className="mb-8">
            <EngagementStrainDashboard orgId={orgId} initialLimit={5} />
          </section>
        )}

        {/* NEW: Behavioral Drift Dashboard (if calibration complete) */}
        {!calibrationStatus?.isInCalibration && dashboardData && (
          <div className="space-y-8">
            {familyData?.families?.length > 0 && (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    Structural Drift Summary
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {familyData.families.map((family) => (
                      <DriftFamilyCard
                        key={family.familyName}
                        familyName={family.familyName}
                        score={family.score}
                        description={family.description}
                        trend={family.trend}
                        confidenceLabel={family.confidence?.label}
                        actionPrompt={family.actionPrompt}
                        topSignalTitle={family.topSignals?.[0]?.title}
                      />
                    ))}
                  </div>
                </div>

                <DriftConfidencePanel
                  headline={`Showing ${familyData.coverage?.visibleSignals || 0} visible signals. ${familyData.coverage?.hiddenLowConfidenceSignals || 0} low-confidence signals remain hidden until coverage improves.`}
                  items={familyData.families.map((family) => ({
                    label: family.familyName,
                    value: `${family.confidence?.label || 'Medium'} confidence`,
                    note:
                      family.confidence?.reasons?.[0] ||
                      'Confidence is based on visible structural signal consistency.',
                  }))}
                />
              </>
            )}

            {/* Quick Actions Banner */}
            <div className="bg-teal-50 rounded-xl p-5 border border-teal-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    Team insights available
                  </h3>
                  <p className="text-sm text-slate-600">
                    View AI-powered diagnosis, risk analysis, and recommended actions for your team
                  </p>
                </div>
                <Link
                  to={`/app/insights/${teamId}`}
                  className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg transition-colors"
                >
                  View Insights →
                </Link>
              </div>
            </div>

            {/* 1. BEHAVIORAL DRIFT INDEX - PRIMARY METRIC */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                Behavioral Drift Index
                <Badge variant="info" size="small">
                  Primary Signal
                </Badge>
              </h2>
              <BehavioralDriftIndexCard bdi={dashboardData.bdi} />
            </div>

            {/* 2. CAPACITY STATUS + DRIVERS */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                Capacity Status
              </h2>
              <CapacityStatusCard capacity={dashboardData.capacity} />
            </div>

            {/* 3. COORDINATION LOAD INDEX */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                Coordination Load
              </h2>
              <CoordinationLoadIndexCard cli={dashboardData.cli} />
            </div>

            {/* 4. BANDWIDTH TAX INDICATOR */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                Bandwidth Tax
              </h2>
              <BandwidthTaxIndicatorCard bti={dashboardData.bti} />
            </div>

            {/* 5. SILENCE RISK INDICATOR */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                Silence Risk
              </h2>
              <SilenceRiskIndicatorCard sri={dashboardData.sri} />
            </div>

            {/* 6. RAW METRICS - De-emphasized */}
            <div className="border-t border-slate-200 pt-8">
              <details className="group">
                <summary className="text-xl font-bold text-slate-700 mb-4 cursor-pointer hover:text-slate-900 transition-colors flex items-center gap-2">
                  <span className="transform transition-transform group-open:rotate-90">▶</span>
                  Raw Metrics (Advanced)
                </summary>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  <Card>
                    <div className="text-sm text-slate-400 mb-1">Avg Meeting Hours/Week</div>
                    <div className="text-3xl font-bold text-slate-900">
                      {dashboardData.rawMetrics?.avgMeetingHours?.toFixed(1) || 'N/A'}
                    </div>
                  </Card>

                  <Card>
                    <div className="text-sm text-slate-400 mb-1">Avg Response Time</div>
                    <div className="text-3xl font-bold text-slate-900">
                      {dashboardData.rawMetrics?.avgResponseHours?.toFixed(1) || 'N/A'} hrs
                    </div>
                  </Card>

                  <Card>
                    <div className="text-sm text-slate-400 mb-1">Avg Focus Time</div>
                    <div className="text-3xl font-bold text-slate-900">
                      {dashboardData.rawMetrics?.avgFocusHours?.toFixed(1) || 'N/A'} hrs
                    </div>
                  </Card>
                </div>
              </details>
            </div>
          </div>
        )}

        {/* LEGACY: Signal Summary (kept for backward compatibility) */}
        {!calibrationStatus?.isInCalibration && signalSummary && !dashboardData && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <div className="text-sm text-slate-400 mb-1">New Signals This Week</div>
                <div className="text-3xl font-bold text-slate-900">
                  {signalSummary.newSignalsThisWeek || 0}
                </div>
              </Card>

              <Card>
                <div className="text-sm text-slate-400 mb-1">Critical Signals</div>
                <div className="text-3xl font-bold text-red-400">
                  {signalSummary.criticalSignals?.length || 0}
                </div>
              </Card>

              <Card>
                <div className="text-sm text-slate-400 mb-1">Ignored Signals</div>
                <div className="text-3xl font-bold text-slate-400">
                  {signalSummary.ignoredCount || 0}
                </div>
                {signalSummary.ignoredCount > 0 && (
                  <Link
                    to="/app/signals?status=Ignored"
                    className="text-sm text-emerald-400 hover:text-emerald-300 mt-2 inline-block"
                  >
                    View ignored →
                  </Link>
                )}
              </Card>
            </div>

            {/* Critical Signals */}
            {signalSummary.criticalSignals && signalSummary.criticalSignals.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-slate-900">Top Critical Signals</h2>
                  <Link to="/app/signals?severity=Critical">
                    <Button variant="ghost" size="small">
                      View all →
                    </Button>
                  </Link>
                </div>
                <div className="space-y-4">
                  {signalSummary.criticalSignals.map((signal) => (
                    <SignalCard
                      key={signal._id}
                      signal={signal}
                      onViewDetails={(id) => (window.location.href = `/app/signals/${id}`)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <Card>
                <EmptyState
                  icon={
                    <svg
                      className="w-16 h-16"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                  title="No Critical Signals"
                  description="All team health metrics are within normal range vs baseline."
                  action={
                    <Link to="/app/signals">
                      <Button variant="secondary">View All Signals</Button>
                    </Link>
                  }
                />
              </Card>
            )}

            {/* Recommended Actions */}
            {signalSummary.recommendedActions && signalSummary.recommendedActions.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Recommended Next Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {signalSummary.recommendedActions.map((rec, idx) => (
                    <Card key={idx} padding="normal">
                      <div className="mb-2">
                        <Badge variant={rec.severity?.toLowerCase() || 'default'} size="small">
                          {rec.severity || 'Signal'}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {rec.signalTitle}
                      </h3>
                      <p className="text-sm text-slate-600 mb-3">{rec.action.action}</p>
                      <div className="text-xs text-slate-400">
                        Expected effect: {rec.action.expectedEffect || 'See signal for details'}
                      </div>
                      <div className="mt-4">
                        <Link to={`/app/signals/${rec.signalId}`}>
                          <Button variant="secondary" size="small" className="w-full">
                            View Signal
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Overview;
