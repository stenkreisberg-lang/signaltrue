import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, TrendingUp, Clock, AlertTriangle, Activity, Calendar, MessageSquare } from 'lucide-react';

interface AnalyticsData {
  teamHealth: {
    energyIndex?: number;  // deprecated, kept for backwards compat
    resilienceScore?: number;  // deprecated, kept for backwards compat
    signalsDetected?: number;  // NEW: count of active signals
    driftStatus?: 'stable' | 'worsening' | 'stabilizing' | 'recovering';  // NEW: drift trend
    executionCapacity: number;
    trend: string;
  };
  communicationMetrics: {
    slackMessages: number;
    avgResponseTime: number;
    afterHoursPercentage: number;
  };
  meetingMetrics: {
    totalHours: number;
    focusHours: number;
    meetingToFocusRatio: number;
  };
  risks: {
    attritionRisk: number;
    burnoutRisk: number;
    collaborationRisk: number;
  };
}

const TeamAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${API_BASE}/api/analytics/team-summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        } else {
          // Use fallback demo data if API not available
          setAnalytics({
            teamHealth: {
              signalsDetected: 2,
              driftStatus: 'stable',
              executionCapacity: 75,
              trend: 'stable',
            },
            communicationMetrics: {
              slackMessages: 1247,
              avgResponseTime: 2.3,
              afterHoursPercentage: 12,
            },
            meetingMetrics: {
              totalHours: 18,
              focusHours: 22,
              meetingToFocusRatio: 0.82,
            },
            risks: {
              attritionRisk: 15,
              burnoutRisk: 22,
              collaborationRisk: 8,
            },
          });
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        // Set demo data on error
        setAnalytics({
          teamHealth: {
            energyIndex: 72,
            resilienceScore: 68,
            executionCapacity: 75,
            trend: 'stable',
          },
          communicationMetrics: {
            slackMessages: 1247,
            avgResponseTime: 2.3,
            afterHoursPercentage: 12,
          },
          meetingMetrics: {
            totalHours: 18,
            focusHours: 22,
            meetingToFocusRatio: 0.82,
          },
          risks: {
            attritionRisk: 15,
            burnoutRisk: 22,
            collaborationRisk: 8,
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [API_BASE, navigate]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getRiskColor = (risk: number) => {
    if (risk <= 20) return 'text-green-600';
    if (risk <= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="mt-4 text-blue-600 hover:underline">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Analytics</h1>
            <p className="text-sm text-gray-500">Comprehensive view of team performance and health</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Team Signal Status */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Team Signal Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`${getScoreBg(analytics?.teamHealth.signalsDetected !== undefined ? (analytics?.teamHealth.signalsDetected > 3 ? 40 : analytics?.teamHealth.signalsDetected > 1 ? 70 : 90) : 0)} rounded-xl p-6`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">Signals Detected</span>
                <TrendingUp className="w-5 h-5 text-gray-500" />
              </div>
              <div className={`text-4xl font-bold ${getScoreColor(analytics?.teamHealth.signalsDetected !== undefined ? (analytics?.teamHealth.signalsDetected > 3 ? 40 : analytics?.teamHealth.signalsDetected > 1 ? 70 : 90) : 0)}`}>
                {analytics?.teamHealth.signalsDetected ?? analytics?.teamHealth.energyIndex ?? 0}
              </div>
              <p className="text-sm text-gray-600 mt-1">Active drift signals requiring attention</p>
            </div>

            <div className={`${getScoreBg(analytics?.teamHealth.driftStatus === 'stable' ? 90 : analytics?.teamHealth.driftStatus === 'worsening' ? 40 : 70)} rounded-xl p-6`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">Drift Status</span>
                <Users className="w-5 h-5 text-gray-500" />
              </div>
              <div className={`text-2xl font-bold ${analytics?.teamHealth.driftStatus === 'stable' ? 'text-green-600' : analytics?.teamHealth.driftStatus === 'worsening' ? 'text-red-600' : 'text-yellow-600'}`}>
                {analytics?.teamHealth.driftStatus === 'stable' ? 'Stable' : 
                 analytics?.teamHealth.driftStatus === 'worsening' ? 'Worsening' : 
                 analytics?.teamHealth.driftStatus === 'recovering' ? 'Recovering' : 'Stabilizing'}
              </div>
              <p className="text-sm text-gray-600 mt-1">Overall organizational drift trend</p>
            </div>

            <div className={`${getScoreBg(analytics?.teamHealth.executionCapacity || 0)} rounded-xl p-6`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">Execution Capacity</span>
                <Clock className="w-5 h-5 text-gray-500" />
              </div>
              <div className={`text-4xl font-bold ${getScoreColor(analytics?.teamHealth.executionCapacity || 0)}`}>
                {analytics?.teamHealth.executionCapacity}%
              </div>
              <p className="text-sm text-gray-600 mt-1">Capacity to deliver on goals</p>
            </div>
          </div>
        </section>

        {/* Communication & Meeting Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Communication Metrics */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              Communication Metrics
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Slack Messages (This Week)</span>
                  <span className="font-semibold text-gray-900">{analytics?.communicationMetrics.slackMessages.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Avg Response Time</span>
                  <span className="font-semibold text-gray-900">{analytics?.communicationMetrics.avgResponseTime} hours</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600">After-Hours Messages</span>
                  <span className={`font-semibold ${(analytics?.communicationMetrics.afterHoursPercentage || 0) > 20 ? 'text-red-600' : 'text-green-600'}`}>
                    {analytics?.communicationMetrics.afterHoursPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Meeting Metrics */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Meeting Metrics
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Meeting Hours (Weekly)</span>
                  <span className="font-semibold text-gray-900">{analytics?.meetingMetrics.totalHours}h</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Focus Hours (Weekly)</span>
                  <span className="font-semibold text-gray-900">{analytics?.meetingMetrics.focusHours}h</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600">Meeting-to-Focus Ratio</span>
                  <span className={`font-semibold ${(analytics?.meetingMetrics.meetingToFocusRatio || 0) > 1 ? 'text-red-600' : 'text-green-600'}`}>
                    {analytics?.meetingMetrics.meetingToFocusRatio.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Risk Indicators */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Risk Indicators
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-700 font-medium">Attrition Risk</span>
              </div>
              <div className={`text-3xl font-bold ${getRiskColor(analytics?.risks.attritionRisk || 0)}`}>
                {analytics?.risks.attritionRisk}%
              </div>
              <div className="mt-3 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${(analytics?.risks.attritionRisk || 0) <= 20 ? 'bg-green-500' : (analytics?.risks.attritionRisk || 0) <= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${analytics?.risks.attritionRisk}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-700 font-medium">Burnout Risk</span>
              </div>
              <div className={`text-3xl font-bold ${getRiskColor(analytics?.risks.burnoutRisk || 0)}`}>
                {analytics?.risks.burnoutRisk}%
              </div>
              <div className="mt-3 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${(analytics?.risks.burnoutRisk || 0) <= 20 ? 'bg-green-500' : (analytics?.risks.burnoutRisk || 0) <= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${analytics?.risks.burnoutRisk}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-700 font-medium">Collaboration Risk</span>
              </div>
              <div className={`text-3xl font-bold ${getRiskColor(analytics?.risks.collaborationRisk || 0)}`}>
                {analytics?.risks.collaborationRisk}%
              </div>
              <div className="mt-3 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${(analytics?.risks.collaborationRisk || 0) <= 20 ? 'bg-green-500' : (analytics?.risks.collaborationRisk || 0) <= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${analytics?.risks.collaborationRisk}%` }}
                ></div>
              </div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate('/app/insights')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Detailed Insights
          </button>
          <button
            onClick={() => navigate('/app/risk-feed')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Risk Feed
          </button>
        </div>
      </main>
    </div>
  );
};

export default TeamAnalytics;
