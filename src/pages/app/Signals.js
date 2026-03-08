import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SignalCard from '../../components/SignalCard';
import { Card, Badge, Button, EmptyState, Spinner, Modal } from '../../components/UIComponents';
import DriftFamilyCard from '../../components/drift/DriftFamilyCard';
import DriftConfidencePanel from '../../components/drift/DriftConfidencePanel';
import useDriftFamilies from '../../hooks/useDriftFamilies';
import { buildFamilyGaps, topGapSummary } from '../../utils/driftGap';

function getOrgHealthState(families) {
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
  const runnerUp = sorted[1];
  const topSignalTitle = topFamily.topSignals?.[0]?.title;

  return {
    familyName: topFamily.familyName,
    score: topFamily.score,
    summary: `${scopeLabel} is showing the strongest drift in ${topFamily.familyName.toLowerCase()}.`,
    detail: topSignalTitle || topFamily.description,
    recommendation: topFamily.actionPrompt,
    comparison: runnerUp
      ? `${runnerUp.familyName} is the next area to watch (${runnerUp.score}).`
      : null,
    gapLine: gapLine || null,
    shareText: `${scopeLabel}: ${topFamily.shareMessage || topFamily.description} Current score: ${topFamily.score}. Recommended focus: ${topFamily.actionPrompt}`,
  };
};

/**
 * Signals Page - List and manage all signals
 */
const Signals = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [signals, setSignals] = useState([]);
  const [displayPolicy, setDisplayPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inCalibration, setInCalibration] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [familyScope, setFamilyScope] = useState('org');

  const orgId = localStorage.getItem('orgId');
  const teamId = localStorage.getItem('teamId');
  const severityFilter = searchParams.get('severity');
  const statusFilter = searchParams.get('status');
  const familyFilter = searchParams.get('family');
  const [lastUpdated, setLastUpdated] = useState(null);
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
  const scopeLabel = familyScope === 'team' ? 'My team' : 'Organization';
  const prioritySummary = buildPrioritySummary(families, scopeLabel, gapLine);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';

        let url = `${apiUrl}/api/signals/org/${orgId}`;
        const params = new URLSearchParams();
        if (severityFilter) params.append('severity', severityFilter);
        if (statusFilter) params.append('status', statusFilter);
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch signals');

        const data = await response.json();

        if (data.inCalibration) {
          setInCalibration(true);
        } else {
          setSignals(data.signals || []);
          setDisplayPolicy(data.displayPolicy || null);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error('Error fetching signals:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (orgId) {
      fetchSignals();
    }
  }, [orgId, severityFilter, statusFilter]);

  const handleViewDetails = async (signalId) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';

      const response = await fetch(`${apiUrl}/api/signals/${signalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch signal details');

      const data = await response.json();
      setSelectedSignal(data.signal);
      setShowDetail(true);
    } catch (err) {
      console.error('Error fetching signal details:', err);
    }
  };

  const filterCounts = {
    all: signals.length,
    critical: signals.filter((s) => s.severity === 'Critical').length,
    risk: signals.filter((s) => s.severity === 'Risk').length,
    open: signals.filter((s) => s.status === 'Open' || s.status === 'Acknowledged').length,
    ignored: signals.filter((s) => s.status === 'Ignored').length,
  };

  // Client-side family filter (from family card deep-link)
  const filteredSignals = familyFilter
    ? signals.filter((s) => s.familyLabel === familyFilter)
    : signals;

  const formatLastUpdated = () => {
    if (!lastUpdated) return null;
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return 'Updated just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Updated ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `Updated ${hours}h ago`;
  };

  const handleCopySummary = async () => {
    if (!prioritySummary?.shareText || !navigator?.clipboard) return;

    try {
      await navigator.clipboard.writeText(prioritySummary.shareText);
    } catch (err) {
      console.error('Failed to copy signals summary:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner size="large" />
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
            <Badge variant="default">Signals</Badge>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/app/overview" className="text-slate-300 hover:text-white transition-colors">
              Team Overview
            </Link>
            <Link
              to="/app/signals"
              className="text-white font-semibold border-b-2 border-blue-500 pb-1"
            >
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
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold text-slate-100">Work Signals</h1>
            {(() => {
              const health = getOrgHealthState(families);
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
          <p className="text-slate-400">
            Structural drift in how work happens — click any family card for details.
          </p>
          {formatLastUpdated() && (
            <p className="text-[11px] text-slate-500 mt-1">{formatLastUpdated()}</p>
          )}
          {familyFilter && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-900/40 border border-blue-700/50">
              <span className="text-sm text-blue-200">
                Showing signals for: <strong>{familyFilter}</strong>
              </span>
              <button
                onClick={() => setSearchParams({})}
                className="text-xs text-blue-300 hover:text-white underline"
              >
                Clear filter
              </button>
            </div>
          )}
          {displayPolicy?.hiddenLowConfidenceCount > 0 && (
            <p className="text-xs text-amber-300/80 mt-1">
              {displayPolicy.hiddenLowConfidenceCount} low-confidence signal
              {displayPolicy.hiddenLowConfidenceCount === 1 ? '' : 's'} hidden until data quality
              improves.
            </p>
          )}
        </div>

        {familiesLoading && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((key) => (
              <div
                key={key}
                className="h-44 rounded-2xl border border-slate-700 bg-slate-800/60 animate-pulse"
              />
            ))}
          </div>
        )}

        {teamId && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-slate-400">Compare scope:</span>
            <Button
              variant={familyScope === 'org' ? 'primary' : 'ghost'}
              size="small"
              onClick={() => setFamilyScope('org')}
            >
              Organization
            </Button>
            <Button
              variant={familyScope === 'team' ? 'primary' : 'ghost'}
              size="small"
              onClick={() => setFamilyScope('team')}
            >
              My Team
            </Button>
          </div>
        )}

        {families.length > 0 && (
          <div className="mb-6 space-y-6">
            {prioritySummary && (
              <Card className="border-emerald-800/60 bg-emerald-950/20">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                      Top priority this week
                    </div>
                    <div className="text-2xl font-semibold text-slate-100">
                      {prioritySummary.familyName}
                    </div>
                    <div className="text-slate-300">{prioritySummary.summary}</div>
                    <div className="text-sm text-slate-400">{prioritySummary.detail}</div>
                    <div className="text-sm text-emerald-200">{prioritySummary.recommendation}</div>
                    {prioritySummary.gapLine && (
                      <div className="text-sm font-medium text-indigo-300">
                        {prioritySummary.gapLine}
                      </div>
                    )}
                    {prioritySummary.comparison && (
                      <div className="text-xs text-slate-500">{prioritySummary.comparison}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="small" onClick={handleCopySummary}>
                      Copy summary
                    </Button>
                    <Link to="/app/executive-summary">
                      <Button variant="ghost" size="small">
                        Open executive view
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}

            <div>
              <h2 className="text-xl font-semibold text-slate-100 mb-4">
                Structural drift summary
              </h2>

              {!familiesLoading && families.length === 0 && !inCalibration && (
                <Card className="mb-6 border-slate-700 bg-slate-800/50">
                  <div className="space-y-2">
                    <div className="text-slate-100 font-semibold">
                      Structural drift summary not ready yet
                    </div>
                    <div className="text-sm text-slate-400">
                      We need enough visible, confidence-qualified signals before showing
                      family-level drift. This usually improves as baselines mature and coverage
                      increases.
                    </div>
                    <div className="text-sm text-slate-500">
                      Tip: keep integrations connected and revisit after more team activity is
                      captured.
                    </div>
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
            </div>

            <DriftConfidencePanel
              headline={`Showing ${coverage?.visibleSignals || 0} visible signals. ${coverage?.hiddenLowConfidenceSignals || 0} low-confidence signals remain hidden until coverage improves.`}
              items={families.map((family) => ({
                label: family.familyName,
                value: `${family.confidence?.label || 'Medium'} confidence`,
                note:
                  family.confidence?.reasons?.[0] ||
                  'Confidence is based on structural drift signal consistency over time.',
              }))}
            />
          </div>
        )}

        {/* Calibration Gate */}
        {inCalibration ? (
          <Card>
            <EmptyState
              icon={
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
              title="Signals Available After Calibration"
              description="Your baseline is being established. Signal Intelligence will unlock when calibration completes (30 days)."
              action={
                <Link to="/app/overview">
                  <Button variant="primary">View Calibration Progress</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <>
            {/* Filters */}
            <div className="mb-6 flex items-center gap-3">
              <Button
                variant={!severityFilter && !statusFilter ? 'primary' : 'ghost'}
                size="small"
                onClick={() => setSearchParams({})}
              >
                All ({filterCounts.all})
              </Button>
              <Button
                variant={severityFilter === 'Critical' ? 'primary' : 'ghost'}
                size="small"
                onClick={() => setSearchParams({ severity: 'Critical' })}
              >
                Critical ({filterCounts.critical})
              </Button>
              <Button
                variant={severityFilter === 'Risk' ? 'primary' : 'ghost'}
                size="small"
                onClick={() => setSearchParams({ severity: 'Risk' })}
              >
                Risk ({filterCounts.risk})
              </Button>
              <Button
                variant={
                  statusFilter === 'Open' || statusFilter === 'Acknowledged' ? 'primary' : 'ghost'
                }
                size="small"
                onClick={() => setSearchParams({ status: 'Open' })}
              >
                Open ({filterCounts.open})
              </Button>
              <Button
                variant={statusFilter === 'Ignored' ? 'primary' : 'ghost'}
                size="small"
                onClick={() => setSearchParams({ status: 'Ignored' })}
              >
                Ignored ({filterCounts.ignored})
              </Button>
            </div>

            {/* Signal List */}
            {filteredSignals.length > 0 ? (
              <div className="space-y-4">
                {filteredSignals.map((signal) => (
                  <SignalCard key={signal._id} signal={signal} onViewDetails={handleViewDetails} />
                ))}
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
                  title="No Signals Found"
                  description={
                    familyFilter
                      ? `No signals match the "${familyFilter}" family filter. Try clearing the filter.`
                      : severityFilter || statusFilter
                        ? 'No signals match your current filter. Try adjusting the filters above.'
                        : 'No actionable structural drift signals are currently above the confidence threshold.'
                  }
                  action={
                    (severityFilter || statusFilter || familyFilter) && (
                      <Button variant="secondary" onClick={() => setSearchParams({})}>
                        Clear Filters
                      </Button>
                    )
                  }
                />
              </Card>
            )}
          </>
        )}
      </main>

      {/* Signal Detail Modal */}
      {selectedSignal && (
        <Modal
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          title={selectedSignal.title}
          size="large"
        >
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex gap-2">
              <Badge variant={selectedSignal.severity?.toLowerCase()}>
                {selectedSignal.severity}
              </Badge>
              <Badge variant={selectedSignal.confidence?.toLowerCase()}>
                {selectedSignal.confidence} Confidence
              </Badge>
              <Badge variant={selectedSignal.status?.toLowerCase().replace(' ', '-')}>
                {selectedSignal.status}
              </Badge>
            </div>

            {/* Deviation Chart Placeholder */}
            <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
              <div className="text-sm text-slate-400 mb-2">Pattern shift vs baseline</div>
              <div className="text-center text-slate-500 py-12">
                Chart visualization coming soon
              </div>
            </div>

            {selectedSignal.explanation && (
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <div className="text-sm font-semibold text-slate-200 mb-2">
                  Why this signal is showing up
                </div>
                <div className="text-sm text-slate-400">{selectedSignal.explanation}</div>
              </div>
            )}

            {selectedSignal.limitationNote && (
              <div className="bg-amber-950/20 rounded-lg p-4 border border-amber-800/50">
                <div className="text-sm font-semibold text-amber-200 mb-2">Interpretation note</div>
                <div className="text-sm text-amber-100/80">{selectedSignal.limitationNote}</div>
              </div>
            )}

            {/* Drivers */}
            {selectedSignal.drivers && selectedSignal.drivers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-3">What changed</h3>
                <div className="space-y-2">
                  {selectedSignal.drivers.map((driver, idx) => (
                    <div key={idx} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-slate-200">{driver.name}</div>
                          <div className="text-sm text-slate-400">{driver.change}</div>
                        </div>
                        {driver.contribution && (
                          <div className="text-sm font-semibold text-emerald-400">
                            {driver.contribution}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Consequence */}
            {selectedSignal.consequence?.statement && (
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-3">Why it matters</h3>
                <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4">
                  <p className="text-slate-300 italic">
                    "{selectedSignal.whatItMeans || selectedSignal.consequence.statement}"
                  </p>
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            {selectedSignal.recommendedActions && selectedSignal.recommendedActions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-3">
                  Recommended next actions
                </h3>
                <div className="space-y-3">
                  {selectedSignal.recommendedActions.map((action, idx) => (
                    <div key={idx} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-slate-200">{action.action}</div>
                        {action.effort && (
                          <Badge variant="default" size="small">
                            {action.effort} Effort
                          </Badge>
                        )}
                      </div>
                      {action.expectedEffect && (
                        <div className="text-sm text-slate-400 mb-2">
                          Expected: {action.expectedEffect}
                        </div>
                      )}
                      {action.isInactionOption && action.inactionCost && (
                        <div className="text-sm text-orange-400">
                          Inaction cost: {action.inactionCost}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Signals;
