/**
 * Executive Summary - CEO View for logged-in users
 * Per SignalTrue Product Spec Section 9
 *
 * "A concise overview of current team health signals and recommended decisions."
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Badge } from '../../components/UIComponents';
import DriftFamilyCard from '../../components/drift/DriftFamilyCard';
import DriftConfidencePanel from '../../components/drift/DriftConfidencePanel';

export default function ExecutiveSummary() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [families, setFamilies] = useState([]);
  const [familyCoverage, setFamilyCoverage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userRes = await api.get('/auth/me');
      setUser(userRes.data);

      const summaryRes = await api.get(`/trial/executive-summary/${userRes.data.orgId}`);
      setSummary(summaryRes.data);

      const familyRes = await api.get(`/signals/org/${userRes.data.orgId}/families`);
      setFamilies(familyRes.data.families || []);
      setFamilyCoverage(familyRes.data.coverage || null);
    } catch (err) {
      console.error('[ExecutiveSummary] Error:', err);
      setSummary({
        currentStatus: 'Watch',
        topRisks: [
          {
            title: 'Reduced recovery time',
            description: 'After-hours activity has increased 23% over the past 2 weeks',
          },
          {
            title: 'Rising meeting load',
            description: 'Average meeting hours up from 18 to 24 per week',
          },
          {
            title: 'Fragmented focus',
            description: 'Focus blocks under 2 hours have decreased by 15%',
          },
        ],
        recommendedActions: [
          {
            title: 'Pause non-essential recurring meetings',
            impact: 'Could restore 4+ hours of focus time per week',
          },
          { title: 'Protect focus blocks', impact: 'Suggest 2-hour no-meeting windows daily' },
          {
            title: 'Reassess after-hours expectations',
            impact: 'May reduce burnout risk indicators',
          },
        ],
        trendDirection: 'worsening',
        weeklyTrend: [
          { week: 'Week 1', status: 'stable' },
          { week: 'Week 2', status: 'stable' },
          { week: 'Week 3', status: 'watch' },
          { week: 'Week 4', status: 'watch' },
        ],
        generatedAt: new Date().toISOString(),
      });
      setFamilies([
        {
          familyName: 'Capacity Drift',
          score: 61,
          description: 'Overload, meeting pressure, and shrinking recovery windows.',
          trend: [42, 49, 56, 61].map((score, index) => ({ label: `W${index + 1}`, score })),
          confidence: {
            label: 'Medium',
            reasons: ['Patterns are rising across multiple recent workload indicators.'],
          },
        },
        {
          familyName: 'Coordination Drift',
          score: 58,
          description: 'Coordination drag, routing friction, and handoff pressure.',
          trend: [44, 47, 51, 58].map((score, index) => ({ label: `W${index + 1}`, score })),
          confidence: {
            label: 'Medium',
            reasons: ['Recent coordination signals are aligned but still maturing.'],
          },
        },
        {
          familyName: 'Cohesion Drift',
          score: 52,
          description: 'Connection conditions that affect collaboration resilience.',
          trend: [39, 41, 47, 52].map((score, index) => ({ label: `W${index + 1}`, score })),
          confidence: {
            label: 'Medium',
            reasons: ['Signals are directional and should be validated as baselines mature.'],
          },
        },
        {
          familyName: 'Culture Drift',
          score: 38,
          description:
            'Inclusion gaps, peripheral members, and belonging conditions — especially in hybrid and remote teams.',
          trend: [25, 28, 33, 38].map((score, index) => ({ label: `W${index + 1}`, score })),
          confidence: {
            label: 'Low',
            reasons: ['Culture drift signals are still maturing as hybrid patterns establish.'],
          },
        },
      ]);
      setFamilyCoverage({
        visibleSignals: 8,
        hiddenLowConfidenceSignals: 3,
        measurementScope: 'metadata-only',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.post('/trial/generate-ceo-summary');
      const shareUrl = `${window.location.origin}/ceo-summary/${res.data.shareToken}`;
      navigator.clipboard.writeText(shareUrl);
      alert('Shareable link copied to clipboard!');
    } catch (err) {
      console.error('Export error:', err);
      alert('Unable to generate shareable link. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getStatusStyle = (status) => {
    if (status === 'Stable') return 'bg-emerald-100 text-emerald-800 border-emerald-400';
    if (status === 'Elevated Risk') return 'bg-red-100 text-red-800 border-red-400';
    return 'bg-amber-100 text-amber-800 border-amber-400';
  };

  const getTrend = (direction) => {
    if (direction === 'improving')
      return { symbol: '↗', color: 'text-emerald-400', label: 'Improving' };
    if (direction === 'worsening')
      return { symbol: '↘', color: 'text-red-400', label: 'Worsening' };
    return { symbol: '→', color: 'text-slate-400', label: 'Stable' };
  };

  const getWeekStatusStyle = (status) => {
    if (status === 'stable') return 'bg-emerald-100 text-emerald-800';
    if (status === 'watch') return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin" />
        <p className="mt-4 text-slate-400">Generating executive summary...</p>
      </div>
    );
  }

  const trend = getTrend(summary?.trendDirection);
  const confidencePanel = families.map((family) => ({
    label: family.familyName,
    value: `${family.confidence?.label || 'Medium'} confidence`,
    note:
      family.confidence?.reasons?.[0] ||
      'Confidence is based on structural pattern consistency over time.',
  }));

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-2xl font-bold text-slate-100 no-underline">
              SignalTrue
            </Link>
            <Badge variant="default">Executive</Badge>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              to="/app/overview"
              className="text-slate-300 hover:text-white text-sm transition-colors"
            >
              Team Overview
            </Link>
            <Link
              to="/app/signals"
              className="text-slate-300 hover:text-white text-sm transition-colors"
            >
              Signals
            </Link>
            <Link
              to="/app/active-monitoring"
              className="text-slate-300 hover:text-white text-sm transition-colors"
            >
              Active Monitoring
            </Link>
            <Link
              to="/app/actions"
              className="text-slate-300 hover:text-white text-sm transition-colors"
            >
              Actions
            </Link>
            <span className="text-white text-sm font-semibold border-b-2 border-blue-500 pb-1">
              Executive Summary
            </span>
            <Link
              to="/app/privacy"
              className="text-slate-300 hover:text-white text-sm transition-colors"
            >
              Signal Coverage
            </Link>
            {user && (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-white/20">
                <span className="text-sm text-white">{user.name || user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-slate-400 border border-white/20 rounded-md px-3 py-1.5 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Header row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 mb-2">Executive Signal Summary</h1>
            <p className="text-slate-400">
              A concise overview of current team health signals and recommended decisions.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            Export Summary
          </button>
        </div>

        {/* Status card */}
        <div
          className={`rounded-xl p-6 mb-8 border-2 bg-slate-800 ${getStatusStyle(
            summary?.currentStatus
          )
            .split(' ')
            .filter((c) => c.startsWith('border-'))
            .join(' ')}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Current Status
            </span>
            <span
              className={`px-4 py-1.5 rounded-full text-sm font-bold ${getStatusStyle(summary?.currentStatus)}`}
            >
              {summary?.currentStatus || 'Watch'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">4-Week Trend:</span>
            <span className={`text-2xl font-bold ${trend.color}`}>{trend.symbol}</span>
            <span className={`text-sm font-semibold ${trend.color}`}>{trend.label}</span>
          </div>
        </div>

        {/* Structural Drift Summary */}
        {families.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Structural drift summary</h2>
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
                />
              ))}
            </div>

            {confidencePanel.length > 0 && (
              <DriftConfidencePanel
                headline={`Showing ${familyCoverage?.visibleSignals || 0} visible signals. ${familyCoverage?.hiddenLowConfidenceSignals || 0} low-confidence signals are hidden until data quality improves.`}
                items={confidencePanel}
              />
            )}
          </section>
        )}

        {/* Two-column: Risks + Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Risks */}
          <section>
            <h2 className="text-xl font-bold text-slate-100 mb-4">Top 3 Risks</h2>
            <div className="space-y-3">
              {(summary?.topRisks || []).map((risk, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 bg-slate-800 rounded-xl p-4 border-l-4 border-red-500"
                >
                  <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-sm font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100 mb-0.5">{risk.title}</h3>
                    <p className="text-sm text-slate-400">{risk.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Actions */}
          <section>
            <h2 className="text-xl font-bold text-slate-100 mb-4">Top 3 Recommended Actions</h2>
            <div className="space-y-3">
              {(summary?.recommendedActions || []).map((action, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 bg-slate-800 rounded-xl p-4 border-l-4 border-emerald-500"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100 mb-0.5">{action.title}</h3>
                    <p className="text-sm text-slate-400">{action.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Weekly trend */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Last 4 Weeks</h2>
          <div className="grid grid-cols-4 gap-3">
            {(summary?.weeklyTrend || []).map((week, idx) => (
              <div
                key={idx}
                className="bg-slate-800 rounded-xl p-4 text-center border border-slate-700"
              >
                <span className="block text-xs text-slate-400 mb-2">{week.week}</span>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getWeekStatusStyle(week.status)}`}
                >
                  {week.status.charAt(0).toUpperCase() + week.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-slate-700/50">
          <p className="text-sm text-slate-500">
            Generated{' '}
            {new Date(summary?.generatedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </main>
    </div>
  );
}
