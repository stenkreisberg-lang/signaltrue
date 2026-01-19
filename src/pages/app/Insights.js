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
  AttritionRiskSummary
} from '../../components/intelligence/IntelligenceWidgets';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

function Insights() {
  const { teamId: urlTeamId } = useParams();
  // Fall back to localStorage if no teamId in URL
  const teamId = urlTeamId || localStorage.getItem('teamId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState(null);
  const [intelligenceData, setIntelligenceData] = useState(null);

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
      
      const response = await axios.get(
        `${API_URL}/api/insights/team/${teamId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInsights(response.data);
      setError(null);
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
      const [attrition, projects, network, succession, equity, meetingROI, outlook] = await Promise.all([
        axios.get(`${API_URL}/api/intelligence/attrition/team/${teamId}`, { headers: { Authorization: `Bearer ${token}` } })
          .catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/intelligence/projects/${teamId}`, { headers: { Authorization: `Bearer ${token}` } })
          .catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/intelligence/network/${teamId}`, { headers: { Authorization: `Bearer ${token}` } })
          .catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/intelligence/succession/${teamId}`, { headers: { Authorization: `Bearer ${token}` } })
          .catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/intelligence/equity/${teamId}`, { headers: { Authorization: `Bearer ${token}` } })
          .catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/intelligence/meeting-roi/team/${teamId}/recent?days=7`, { headers: { Authorization: `Bearer ${token}` } })
          .catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/intelligence/outlook/team/${teamId}`, { headers: { Authorization: `Bearer ${token}` } })
          .catch(() => ({ data: null }))
      ]);
      
      setIntelligenceData({
        attritionRisk: attrition.data,
        projects: projects.data,
        networkHealth: network.data,
        successionRisk: succession.data,
        equitySignals: equity.data,
        meetingROI: meetingROI.data,
        outlookSignals: outlook.data
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Insights Available Yet
            </h2>
            <p className="text-gray-600">
              Insights will be generated once we have sufficient team data and baselines.
              Check back after a few weeks of activity.
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Insights</h1>
          <p className="text-gray-600">
            Evidence-based diagnosis and recommended actions for your team
          </p>
        </div>

        {/* Team State Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Current State</h2>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <TeamStateBadge 
                  state={teamState.state} 
                  confidence={teamState.confidence} 
                />
                <p className="mt-3 text-gray-700 leading-relaxed">
                  {teamState.summaryText}
                </p>
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
              risks.map((risk) => (
                <RiskCard key={risk.riskType} risk={risk} />
              ))
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
              {intelligenceData.projects && (
                <ProjectRiskWidget data={intelligenceData.projects} />
              )}
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
              <strong>Note:</strong> These insights are based on your team's metrics. 
              View detailed metrics and trends on the{' '}
              <a href={`/app/team/${teamId}`} className="underline hover:text-blue-700">
                Team Dashboard
              </a>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Insights;
