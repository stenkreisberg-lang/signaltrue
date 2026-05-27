/**
 * Executive Summary - CEO View for logged-in users
 * Per SignalTrue Product Spec Section 9
 *
 * "A concise overview of current team health signals and recommended decisions."
 */

import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import DriftFamilyCard from '../../components/drift/DriftFamilyCard';
import DriftConfidencePanel from '../../components/drift/DriftConfidencePanel';
import EngagementStrainDashboard from '../../components/EngagementStrainDashboard';
import AppShell from '../../components/app/AppShell';
import { getAuthenticatedContext } from '../../utils/authContext';

export default function ExecutiveSummary() {
  const [summary, setSummary] = useState(null);
  const [families, setFamilies] = useState([]);
  const [familyCoverage, setFamilyCoverage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const context = await getAuthenticatedContext();
      setUser(context.user);
      setOrgId(context.orgId);
      if (!context.orgId) throw new Error('No organization is associated with this account.');

      const summaryRes = await api.get(`/trial/executive-summary/${context.orgId}`);
      setSummary(summaryRes.data);

      const familyRes = await api.get(`/signals/org/${context.orgId}/families`);
      setFamilies(familyRes.data.families || []);
      setFamilyCoverage(familyRes.data.coverage || null);
    } catch (err) {
      console.error('[ExecutiveSummary] Error:', err);
      setError('Executive signal data is currently unavailable. No inferred risks are shown.');
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-700 rounded-full animate-spin" />
        <p className="mt-4 text-slate-600">Loading executive summary...</p>
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
    <AppShell user={user} section="Executive">
      <div>
        {/* Header row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Executive Signal Summary</h1>
            <p className="text-slate-600">
              A concise overview of current team health signals and recommended decisions.
            </p>
          </div>
          <button
            onClick={handleExport}
            className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            Export Summary
          </button>
        </div>

        {error && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {error}
          </div>
        )}
        {/* Status card */}
        {summary && (
          <div
            className={`rounded-xl p-6 mb-8 border bg-white ${getStatusStyle(summary?.currentStatus)
              .split(' ')
              .filter((c) => c.startsWith('border-'))
              .join(' ')}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Current Status
              </span>
              <span
                className={`px-4 py-1.5 rounded-full text-sm font-bold ${getStatusStyle(summary?.currentStatus)}`}
              >
                {summary?.currentStatus || 'Watch'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">4-Week Trend:</span>
              <span className={`text-2xl font-bold ${trend.color}`}>{trend.symbol}</span>
              <span className={`text-sm font-semibold ${trend.color}`}>{trend.label}</span>
            </div>
          </div>
        )}

        {/* Structural Drift Summary */}
        {families.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Structural drift summary</h2>
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

        {/* Engagement Strain Risk tile */}
        <section className="mb-8">
          <EngagementStrainDashboard orgId={orgId} initialLimit={6} />
        </section>

        {/* Two-column: Risks + Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Left: Risks */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Top risks</h2>
            <div className="space-y-3">
              {(summary?.topRisks || []).map((risk, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-red-500"
                >
                  <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-sm font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-0.5">{risk.title}</h3>
                    <p className="text-sm text-slate-600">{risk.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Actions */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Recommended actions</h2>
            <div className="space-y-3">
              {(summary?.recommendedActions || []).map((action, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-teal-600"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-0.5">{action.title}</h3>
                    <p className="text-sm text-slate-600">{action.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Weekly trend */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Last 4 Weeks</h2>
          <div className="grid grid-cols-4 gap-3">
            {(summary?.weeklyTrend || []).map((week, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-4 text-center border border-slate-200"
              >
                <span className="block text-xs text-slate-600 mb-2">{week.week}</span>
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
        <div className="text-center pt-6 border-t border-slate-200">
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
      </div>
    </AppShell>
  );
}
