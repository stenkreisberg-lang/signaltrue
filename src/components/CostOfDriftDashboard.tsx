import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Clock,
  Users,
  Calendar,
  Download,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

interface CostBreakdown {
  meetingHoursLost: number;
  executionDelayHours: number;
  reworkHours: number;
}

interface CostOfDriftData {
  hasData: boolean;
  message?: string;
  teamId?: string;
  teamName?: string;
  period: {
    days: number;
    start: string;
    end: string;
  };
  costEstimate: {
    lowEstimate: number;
    highEstimate: number;
    midpoint: number;
    currency: string;
  };
  breakdown: CostBreakdown;
  projections: {
    weeklyLow: number;
    weeklyHigh: number;
    monthlyLow: number;
    monthlyHigh: number;
    quarterlyLow: number;
    quarterlyHigh: number;
  };
  assumptions: {
    avgHourlyCost: number;
    teamSize: number;
    rangeMargin: string;
  };
  trend?: {
    direction: 'improving' | 'stable' | 'worsening';
    percentChange: number;
  };
  interventionSavings?: {
    potentialWeeklySavings: number;
    implementedSavings: number;
  };
}

interface Props {
  teamId?: string;
  orgId?: string;
  showOrgLevel?: boolean;
}

const CostOfDriftDashboard: React.FC<Props> = ({ teamId, orgId, showOrgLevel = false }) => {
  const [data, setData] = useState<CostOfDriftData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    fetchCostOfDrift();
  }, [teamId, orgId, showOrgLevel]);

  const fetchCostOfDrift = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url: string;
      if (showOrgLevel && orgId) {
        url = `${API_URL}/api/cost-of-drift/org/${orgId}`;
      } else if (teamId) {
        url = `${API_URL}/api/cost-of-drift/team/${teamId}`;
      } else {
        url = `${API_URL}/api/cost-of-drift/summary`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch cost of drift');
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching cost of drift:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatRange = (low: number, high: number, currency: string = 'USD') => {
    return `${formatCurrency(low, currency)} – ${formatCurrency(high, currency)}`;
  };

  const exportToPDF = () => {
    // Trigger print dialog for PDF export
    window.print();
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
          <span className="ml-2 text-slate-400">Calculating cost of drift...</span>
        </div>
      </div>
    );
  }

  if (error || !data?.hasData) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="w-6 h-6 text-slate-400" />
          <h2 className="text-xl font-bold text-slate-100">Cost of Drift</h2>
        </div>
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">
            {data?.message || error || 'Insufficient data to calculate cost of drift'}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Cost estimates require at least 7 days of baseline data.
          </p>
        </div>
      </div>
    );
  }

  const { costEstimate, breakdown, projections, assumptions, trend, interventionSavings } = data;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden print:border-0">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Cost of Drift</h2>
            <p className="text-sm text-slate-400">
              {data.teamName ? `${data.teamName} • ` : ''}
              Weekly impact estimate
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
            title="How this is calculated"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <button
            onClick={exportToPDF}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
            title="Export as PDF"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={fetchCostOfDrift}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Methodology Explainer (collapsible) */}
      {showMethodology && (
        <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-700">
          <h3 className="font-semibold text-slate-200 mb-2">How we calculate this</h3>
          <div className="text-sm text-slate-400 space-y-2">
            <p>
              <strong className="text-slate-300">Formula:</strong> Cost = (Meeting Hours Lost + Execution Delay + Rework Hours) × Avg Hourly Cost
            </p>
            <p>
              <strong className="text-slate-300">Meeting Hours Lost:</strong> Hours spent in meetings above your baseline
            </p>
            <p>
              <strong className="text-slate-300">Execution Delay:</strong> Focus time erosion + response time slowdown
            </p>
            <p>
              <strong className="text-slate-300">Rework Hours:</strong> Estimated from after-hours catch-up activity
            </p>
            <p className="text-xs text-slate-500 mt-3">
              * Shown as a range (±20%) to reflect estimate uncertainty. Actual costs may vary.
            </p>
          </div>
        </div>
      )}

      {/* Main Cost Display */}
      <div className="p-6">
        {/* Weekly Cost Range - Primary */}
        <div className="text-center mb-6">
          <p className="text-sm text-slate-400 mb-1">Estimated Weekly Cost</p>
          <div className="text-4xl font-bold text-amber-400">
            {formatRange(costEstimate.lowEstimate, costEstimate.highEstimate, costEstimate.currency)}
          </div>
          {trend && (
            <div className={`inline-flex items-center gap-1 mt-2 text-sm ${
              trend.direction === 'improving' ? 'text-green-400' :
              trend.direction === 'worsening' ? 'text-red-400' : 'text-slate-400'
            }`}>
              {trend.direction === 'improving' ? (
                <TrendingDown className="w-4 h-4" />
              ) : trend.direction === 'worsening' ? (
                <TrendingUp className="w-4 h-4" />
              ) : null}
              <span>
                {trend.direction === 'improving' ? 'Down' : trend.direction === 'worsening' ? 'Up' : 'Stable'} 
                {trend.percentChange > 0 ? ` ${trend.percentChange}%` : ''} vs last week
              </span>
            </div>
          )}
        </div>

        {/* Projections Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/50 rounded-lg p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Monthly Impact</p>
            <p className="text-lg font-semibold text-slate-100">
              {formatRange(projections.monthlyLow, projections.monthlyHigh, costEstimate.currency)}
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">Quarterly Impact</p>
            <p className="text-lg font-semibold text-slate-100">
              {formatRange(projections.quarterlyLow, projections.quarterlyHigh, costEstimate.currency)}
            </p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 text-center">
            <p className="text-xs text-slate-400 mb-1">If Unaddressed (6mo)</p>
            <p className="text-lg font-semibold text-red-400">
              {formatCurrency(projections.monthlyLow * 6, costEstimate.currency)}+
            </p>
          </div>
        </div>

        {/* Breakdown Toggle */}
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/30 rounded-lg hover:bg-slate-900/50 transition-colors"
        >
          <span className="text-sm font-medium text-slate-300">View Cost Breakdown</span>
          {showBreakdown ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {/* Breakdown Details */}
        {showBreakdown && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Meeting Overload</p>
                  <p className="text-xs text-slate-400">{breakdown.meetingHoursLost.toFixed(1)} excess hours/week</p>
                </div>
              </div>
              <span className="text-slate-300">
                {formatCurrency(breakdown.meetingHoursLost * assumptions.avgHourlyCost, costEstimate.currency)}
              </span>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Execution Delay</p>
                  <p className="text-xs text-slate-400">{breakdown.executionDelayHours.toFixed(1)} hours lost/week</p>
                </div>
              </div>
              <span className="text-slate-300">
                {formatCurrency(breakdown.executionDelayHours * assumptions.avgHourlyCost, costEstimate.currency)}
              </span>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/30 rounded-lg">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Rework & Catch-up</p>
                  <p className="text-xs text-slate-400">{breakdown.reworkHours.toFixed(1)} hours/week</p>
                </div>
              </div>
              <span className="text-slate-300">
                {formatCurrency(breakdown.reworkHours * assumptions.avgHourlyCost, costEstimate.currency)}
              </span>
            </div>
          </div>
        )}

        {/* Intervention Savings (if available) */}
        {interventionSavings && interventionSavings.potentialWeeklySavings > 0 && (
          <div className="mt-6 p-4 bg-green-900/20 border border-green-700/30 rounded-lg">
            <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Potential Savings
            </h4>
            <p className="text-sm text-slate-300">
              By addressing these drift patterns, you could save up to{' '}
              <strong className="text-green-400">
                {formatCurrency(interventionSavings.potentialWeeklySavings, costEstimate.currency)}/week
              </strong>
            </p>
            {interventionSavings.implementedSavings > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                Active interventions have already saved{' '}
                <strong className="text-green-400">
                  {formatCurrency(interventionSavings.implementedSavings, costEstimate.currency)}
                </strong>
              </p>
            )}
          </div>
        )}

        {/* Assumptions Footer */}
        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <Users className="w-3 h-3" />
            Based on {assumptions.teamSize} team members × ${assumptions.avgHourlyCost}/hr avg cost
          </p>
        </div>
      </div>
    </div>
  );
};

export default CostOfDriftDashboard;
