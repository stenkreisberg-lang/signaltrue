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

  const orgId = localStorage.getItem('orgId'); // Assuming orgId is stored in localStorage
  const teamId = localStorage.getItem('teamId'); // Get first team for demo purposes

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';

        // Fetch calibration status
        const calibrationRes = await fetch(`${apiUrl}/api/calibration/status/${orgId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!calibrationRes.ok) throw new Error('Failed to fetch calibration status');
        const calibrationData = await calibrationRes.json();
        setCalibrationStatus(calibrationData);

        // If not in calibration, fetch comprehensive dashboard data
        if (!calibrationData.isInCalibration && teamId) {
          // Fetch new BDI dashboard endpoint (includes BDI, Capacity, CLI, BTI, SRI)
          const dashboardRes = await fetch(`${apiUrl}/api/dashboard/${teamId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (dashboardRes.ok) {
            const dashData = await dashboardRes.json();
            setDashboardData(dashData);
          }

          // Still fetch signal summary for legacy signals
          const summaryRes = await fetch(`${apiUrl}/api/signals/org/${orgId}/summary`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (summaryRes.ok) {
            const summaryData = await summaryRes.json();
            setSignalSummary(summaryData);
          }

          const familyRes = await fetch(`${apiUrl}/api/signals/org/${orgId}/families`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (familyRes.ok) {
            const families = await familyRes.json();
            setFamilyData(families);
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

    if (orgId) {
      fetchDashboardData();
    }
  }, [orgId, teamId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <div className="text-center text-red-400">Error loading dashboard: {error}</div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-slate-100">SignalTrue</div>
            <Badge variant="default">Overview</Badge>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              to="/app/overview"
              className="text-white font-semibold border-b-2 border-blue-500 pb-1"
            >
              Team Overview
            </Link>
            <Link to="/app/signals" className="text-slate-300 hover:text-white transition-colors">
              Signals
            </Link>
            <Link
              to="/app/active-monitoring"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Active Monitoring
            </Link>
            <Link to="/app/actions" className="text-slate-300 hover:text-white transition-colors">
              Actions
            </Link>
            <Link
              to="/app/executive-summary"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Executive Summary
            </Link>
            <Link to="/app/privacy" className="text-slate-300 hover:text-white transition-colors">
              Signal Coverage
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Anti-Weaponization Notice - Sticky at top */}
        <AntiWeaponizationNotice variant="sticky" />

        {/* Day-based Onboarding Banner */}
        <OnboardingBanner calibrationDay={calibrationStatus?.calibrationDay} />

        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-slate-100">Team Signal Overview</h1>
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
          <p className="text-slate-400">
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

        {/* NEW: Behavioral Drift Dashboard (if calibration complete) */}
        {!calibrationStatus?.isInCalibration && dashboardData && (
          <div className="space-y-8">
            {familyData?.families?.length > 0 && (
              <>
                <div>
                  <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <span>🧭</span> Structural Drift Summary
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
            <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-4 border border-blue-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-1">
                    🎯 Team Insights Available
                  </h3>
                  <p className="text-sm text-slate-300">
                    View AI-powered diagnosis, risk analysis, and recommended actions for your team
                  </p>
                </div>
                <Link
                  to={`/app/insights/${teamId}`}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
                >
                  View Insights →
                </Link>
              </div>
            </div>

            {/* 1. BEHAVIORAL DRIFT INDEX - PRIMARY METRIC */}
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>🎯</span> Behavioral Drift Index
                <Badge variant="info" size="small">
                  Primary Signal
                </Badge>
              </h2>
              <BehavioralDriftIndexCard bdi={dashboardData.bdi} />
            </div>

            {/* 2. CAPACITY STATUS + DRIVERS */}
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>⚡</span> Capacity Status
              </h2>
              <CapacityStatusCard capacity={dashboardData.capacity} />
            </div>

            {/* 3. COORDINATION LOAD INDEX */}
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>🔄</span> Coordination Load
              </h2>
              <CoordinationLoadIndexCard cli={dashboardData.cli} />
            </div>

            {/* 4. BANDWIDTH TAX INDICATOR */}
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>🧠</span> Bandwidth Tax
              </h2>
              <BandwidthTaxIndicatorCard bti={dashboardData.bti} />
            </div>

            {/* 5. SILENCE RISK INDICATOR */}
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                <span>🔇</span> Silence Risk
              </h2>
              <SilenceRiskIndicatorCard sri={dashboardData.sri} />
            </div>

            {/* 6. RAW METRICS - De-emphasized */}
            <div className="border-t border-slate-700 pt-8">
              <details className="group">
                <summary className="text-xl font-bold text-slate-400 mb-4 cursor-pointer hover:text-slate-300 transition-colors flex items-center gap-2">
                  <span className="transform transition-transform group-open:rotate-90">▶</span>
                  Raw Metrics (Advanced)
                </summary>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  <Card>
                    <div className="text-sm text-slate-400 mb-1">Avg Meeting Hours/Week</div>
                    <div className="text-3xl font-bold text-slate-100">
                      {dashboardData.rawMetrics?.avgMeetingHours?.toFixed(1) || 'N/A'}
                    </div>
                  </Card>

                  <Card>
                    <div className="text-sm text-slate-400 mb-1">Avg Response Time</div>
                    <div className="text-3xl font-bold text-slate-100">
                      {dashboardData.rawMetrics?.avgResponseHours?.toFixed(1) || 'N/A'} hrs
                    </div>
                  </Card>

                  <Card>
                    <div className="text-sm text-slate-400 mb-1">Avg Focus Time</div>
                    <div className="text-3xl font-bold text-slate-100">
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
                <div className="text-3xl font-bold text-slate-100">
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
                  <h2 className="text-2xl font-bold text-slate-100">Top Critical Signals</h2>
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
                <h2 className="text-2xl font-bold text-slate-100 mb-4">Recommended Next Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {signalSummary.recommendedActions.map((rec, idx) => (
                    <Card key={idx} padding="normal">
                      <div className="mb-2">
                        <Badge variant={rec.severity?.toLowerCase() || 'default'} size="small">
                          {rec.severity || 'Signal'}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-100 mb-2">
                        {rec.signalTitle}
                      </h3>
                      <p className="text-sm text-slate-300 mb-3">{rec.action.action}</p>
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
      </main>
    </div>
  );
};

export default Overview;
