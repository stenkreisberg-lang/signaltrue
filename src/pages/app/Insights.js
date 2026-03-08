import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import TeamStateBadge from '../../components/insights/TeamStateBadge';
import RiskCard from '../../components/insights/RiskCard';
import ActionCard from '../../components/insights/ActionCard';
import ExperimentCard from '../../components/insights/ExperimentCard';
import {
  NetworkHealthWidget,
  SuccessionRiskWidget,
  EquitySignalsWidget,
  ProjectRiskWidget,
  MeetingROIWidget,
  OutlookSignalsWidget,
  AttritionRiskSummary,
} from '../../components/intelligence/IntelligenceWidgets';
import DriftFamilyCard from '../../components/drift/DriftFamilyCard';
import DriftConfidencePanel from '../../components/drift/DriftConfidencePanel';
import useDriftFamilies from '../../hooks/useDriftFamilies';
import { buildFamilyGaps, topGapSummary } from '../../utils/driftGap';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

function getHealthState(families) {
  if (!families?.length) return null;
  const maxScore = Math.max(...families.map((f) => f.score));
  if (maxScore >= 70)
    return {
      label: 'Critical drift detected',
      color: 'bg-red-500',
      textColor: 'text-red-100',
      ring: 'ring-red-500/40',
    };
  if (maxScore >= 50)
    return {
      label: 'Elevated drift',
      color: 'bg-orange-500',
      textColor: 'text-orange-100',
      ring: 'ring-orange-400/40',
    };
  if (maxScore >= 30)
    return {
      label: 'Moderate drift',
      color: 'bg-amber-400',
      textColor: 'text-amber-900',
      ring: 'ring-amber-400/40',
    };
  return {
    label: 'Low drift',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-100',
    ring: 'ring-emerald-500/40',
  };
}

const buildPrioritySummary = (families, scopeLabel, gapLine) => {
  if (!families?.length) return null;

  const sorted = [...families].sort((a, b) => b.score - a.score);
  const topFamily = sorted[0];
  const topSignalTitle = topFamily.topSignals?.[0]?.title;
  const runnerUp = sorted[1];

  return {
    familyName: topFamily.familyName,
    score: topFamily.score,
    summary: `${scopeLabel} is currently showing the most drag in ${topFamily.familyName.toLowerCase()}.`,
    detail: topSignalTitle || topFamily.description,
    recommendation: topFamily.actionPrompt,
    comparison: runnerUp
      ? `${runnerUp.familyName} is the next likely pressure point (${runnerUp.score}).`
      : null,
    gapLine: gapLine || null,
    shareText: `${scopeLabel}: ${topFamily.shareMessage || topFamily.description} Current score: ${topFamily.score}. Recommended focus: ${topFamily.actionPrompt}`,
  };
};

function Insights() {
  const { teamId: urlTeamId } = useParams();
  // Fall back to localStorage if no teamId in URL
  const teamId = urlTeamId || localStorage.getItem('teamId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState(null);
  const [intelligenceData, setIntelligenceData] = useState(null);
  const [familyScope, setFamilyScope] = useState('team');
  const [lastUpdated, setLastUpdated] = useState(null);
  const orgId = localStorage.getItem('orgId');
  const {
    families,
    coverage,
    loading: familiesLoading,
  } = useDriftFamilies(orgId, { enabled: !!orgId, teamId: familyScope === 'team' ? teamId : null });
  const { families: orgBaseline } = useDriftFamilies(orgId, {
    enabled: !!orgId && familyScope === 'team',
  });
  const familyGaps = familyScope === 'team' ? buildFamilyGaps(families, orgBaseline) : new Map();
  const gapLine = familyScope === 'team' ? topGapSummary(familyGaps) : null;
  const scopeLabel = familyScope === 'team' ? 'This team' : 'The organization';
  const prioritySummary = buildPrioritySummary(families, scopeLabel, gapLine);

  useEffect(() => {
    if (!teamId) {
      setError('No team selected. Please select a team first.');
      setLoading(false);
      return;
    }
    fetchInsights();
    fetchIntelligenceData();
  }, [teamId]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!teamId) {
        // No team - show empty state instead of error
        setInsights({ teamState: null, risks: [], action: null, experiment: null });
        setError(null);
        return;
      }

      const response = await axios.get(`${API_URL}/api/insights/team/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInsights(response.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching insights:', err);
      // On error, show empty state instead of error message for better UX
      setInsights({ teamState: null, risks: [], action: null, experiment: null });
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchIntelligenceData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Fetch all intelligence metrics for this team (parallel requests)
      const [attrition, projects, network, succession, equity, meetingROI, outlook] =
        await Promise.all([
          axios
            .get(`${API_URL}/api/intelligence/attrition/team/${teamId}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: null })),
          axios
            .get(`${API_URL}/api/intelligence/projects/${teamId}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: null })),
          axios
            .get(`${API_URL}/api/intelligence/network/${teamId}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: null })),
          axios
            .get(`${API_URL}/api/intelligence/succession/${teamId}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: null })),
          axios
            .get(`${API_URL}/api/intelligence/equity/${teamId}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: null })),
          axios
            .get(`${API_URL}/api/intelligence/meeting-roi/team/${teamId}/recent?days=7`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: null })),
          axios
            .get(`${API_URL}/api/intelligence/outlook/team/${teamId}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: null })),
        ]);

      setIntelligenceData({
        attritionRisk: attrition.data,
        projects: projects.data,
        networkHealth: network.data,
        successionRisk: succession.data,
        equitySignals: equity.data,
        meetingROI: meetingROI.data,
        outlookSignals: outlook.data,
      });
    } catch (err) {
      console.error('Error fetching intelligence data:', err);
      // Non-critical - don't show error to user
    }
  };

  const handleActivateAction = async (actionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/insights/action/${actionId}/activate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchInsights(); // Refresh data
    } catch (err) {
      console.error('Error activating action:', err);
      alert('Failed to activate action. Please try again.');
    }
  };

  const handleDismissAction = async (actionId) => {
    const reason = prompt('Why are you dismissing this suggestion? (optional)');
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/insights/action/${actionId}/dismiss`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchInsights(); // Refresh data
    } catch (err) {
      console.error('Error dismissing action:', err);
      alert('Failed to dismiss action. Please try again.');
    }
  };

  const handleCopySummary = async () => {
    if (!prioritySummary?.shareText || !navigator?.clipboard) return;

    try {
      await navigator.clipboard.writeText(prioritySummary.shareText);
    } catch (err) {
      console.error('Failed to copy insights summary:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={fetchInsights}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { teamState, risks, action, experiment } = insights || {};

  if (!teamState) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Insights Available Yet</h2>
            <p className="text-gray-600">
              Insights will be generated once we have sufficient team data and baselines. Check back
              after a few weeks of activity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Team Insights</h1>
            {(() => {
              const health = getHealthState(families);
              if (!health) return null;
              return (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ring-2 ${health.color} ${health.textColor} ${health.ring}`}
                >
                  {health.label}
                </span>
              );
            })()}
          </div>
          <p className="text-gray-600">
            Evidence-based diagnosis and recommended actions for your team
          </p>
          {lastUpdated && (
            <p className="text-[11px] text-gray-400 mt-1">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {familiesLoading && (
          <section className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((key) => (
                <div
                  key={key}
                  className="h-40 rounded-2xl border border-gray-200 bg-white animate-pulse"
                />
              ))}
            </div>
          </section>
        )}

        {teamId && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-gray-500">Compare scope:</span>
            <button
              onClick={() => setFamilyScope('team')}
              className={`px-3 py-1.5 rounded-md text-sm ${familyScope === 'team' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
            >
              This Team
            </button>
            <button
              onClick={() => setFamilyScope('org')}
              className={`px-3 py-1.5 rounded-md text-sm ${familyScope === 'org' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
            >
              Organization
            </button>
          </div>
        )}

        {families.length > 0 && (
          <section className="mb-8">
            {prioritySummary && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white mb-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-[0.2em] text-blue-100">
                      Top priority this week
                    </div>
                    <h2 className="text-2xl font-semibold">{prioritySummary.familyName}</h2>
                    <p className="text-blue-50">{prioritySummary.summary}</p>
                    <p className="text-sm text-blue-100">{prioritySummary.detail}</p>
                    <p className="text-sm font-medium text-white/95">
                      {prioritySummary.recommendation}
                    </p>
                    {prioritySummary.gapLine && (
                      <p className="text-sm font-medium text-indigo-200">
                        {prioritySummary.gapLine}
                      </p>
                    )}
                    {prioritySummary.comparison && (
                      <p className="text-xs text-blue-100/90">{prioritySummary.comparison}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopySummary}
                      className="px-3 py-2 rounded-md text-sm font-medium bg-white text-blue-700 hover:bg-blue-50"
                    >
                      Copy summary
                    </button>
                  </div>
                </div>
              </div>
            )}

            <h2 className="text-lg font-semibold text-gray-900 mb-4">Structural Drift Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {families.map((family) => (
                <DriftFamilyCard
                  key={family.familyName}
                  familyName={family.familyName}
                  score={family.score}
                  description={family.description}
                  trend={family.trend}
                  confidenceLabel={family.confidence?.label}
                  actionPrompt={family.actionPrompt}
                  topSignalTitle={family.topSignals?.[0]?.title}
                  gapLabel={familyGaps.get(family.familyName)?.label}
                />
              ))}
            </div>

            <DriftConfidencePanel
              headline={`Showing ${coverage?.visibleSignals || 0} visible signals across the organization. ${coverage?.hiddenLowConfidenceSignals || 0} low-confidence signals remain hidden.`}
              items={families.map((family) => ({
                label: family.familyName,
                value: `${family.confidence?.label || 'Medium'} confidence`,
                note:
                  family.confidence?.reasons?.[0] ||
                  'Confidence is based on visible structural drift patterns.',
              }))}
            />
          </section>
        )}

        {!familiesLoading && families.length === 0 && (
          <section className="mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Structural drift summary not ready yet
              </h2>
              <p className="text-gray-600 mb-2">
                We only show family-level drift when there is enough reliable data to make the view
                useful and safe to interpret.
              </p>
              <p className="text-sm text-gray-500">
                As more activity is captured and confidence matures, you’ll see whether current
                patterns point more toward overload, coordination drag, or weakening cohesion.
              </p>
            </div>
          </section>
        )}

        {/* Team State Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current State</h2>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <TeamStateBadge state={teamState.state} confidence={teamState.confidence} />
                <p className="mt-3 text-gray-700 leading-relaxed">{teamState.summaryText}</p>
              </div>
            </div>
            <div className="text-sm text-gray-500 mt-4">
              Week of {new Date(teamState.weekStart).toLocaleDateString()}
            </div>
          </div>
        </section>

        {/* Active Experiment Section */}
        {experiment && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Experiment</h2>
            <ExperimentCard experiment={experiment} />
          </section>
        )}

        {/* Recommended Action Section */}
        {action && !experiment && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {action.status === 'suggested' ? 'Recommended Action' : 'Active Action'}
            </h2>
            <ActionCard
              action={action}
              onActivate={handleActivateAction}
              onDismiss={handleDismissAction}
            />
          </section>
        )}

        {/* Risk Signals Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Signals</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {risks && risks.length > 0 ? (
              risks.map((risk) => <RiskCard key={risk.riskType} risk={risk} />)
            ) : (
              <div className="col-span-3 bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-600">No risk data available</p>
              </div>
            )}
          </div>
        </section>

        {/* Intelligence Signals Section */}
        {intelligenceData && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Behavioral Intelligence</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {intelligenceData.attritionRisk && (
                <AttritionRiskSummary data={intelligenceData.attritionRisk} />
              )}
              {intelligenceData.networkHealth && (
                <NetworkHealthWidget data={intelligenceData.networkHealth} />
              )}
              {intelligenceData.successionRisk && (
                <SuccessionRiskWidget data={intelligenceData.successionRisk} />
              )}
              {intelligenceData.equitySignals && (
                <EquitySignalsWidget data={intelligenceData.equitySignals} />
              )}
              {intelligenceData.projects && <ProjectRiskWidget data={intelligenceData.projects} />}
              {intelligenceData.meetingROI && (
                <MeetingROIWidget data={{ meetings: intelligenceData.meetingROI }} />
              )}
              {intelligenceData.outlookSignals && (
                <OutlookSignalsWidget data={intelligenceData.outlookSignals} />
              )}
            </div>
          </section>
        )}

        {/* Supporting Metrics Link */}
        <section>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> These insights are based on your team's metrics. View detailed
              metrics and trends on the{' '}
              <a href={`/app/team/${teamId}`} className="underline hover:text-blue-700">
                Team Dashboard
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Insights;
