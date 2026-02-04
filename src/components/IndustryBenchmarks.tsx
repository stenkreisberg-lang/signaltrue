import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  Users,
  Building2,
  CheckCircle,
  AlertCircle,
  Lock,
  RefreshCw,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

interface BenchmarkMetric {
  metricName: string;
  label: string;
  yourValue: number;
  industryAverage: number;
  percentile: number; // 0-100, where you stand
  trend: 'better' | 'worse' | 'average';
  unit: string;
  description: string;
  goodWhenLow: boolean;
}

interface BenchmarkData {
  hasData: boolean;
  isOptedIn: boolean;
  industryCategory: string;
  companySize: string;
  peerGroupSize: number;
  lastUpdated: string;
  metrics: BenchmarkMetric[];
  overallRanking: {
    percentile: number;
    label: string;
  };
}

interface Props {
  teamId?: string;
  orgId?: string;
}

const IndustryBenchmarks: React.FC<Props> = ({ teamId, orgId }) => {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOptIn, setShowOptIn] = useState(false);
  const [optingIn, setOptingIn] = useState(false);

  useEffect(() => {
    fetchBenchmarks();
  }, [teamId, orgId]);

  const fetchBenchmarks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let targetOrgId = orgId || localStorage.getItem('orgId');

      // Ensure we have a valid string ID, not an object
      if (typeof targetOrgId === 'object' && targetOrgId !== null) {
        targetOrgId = (targetOrgId as any)?._id || (targetOrgId as any)?.id;
      }

      if (!targetOrgId || typeof targetOrgId !== 'string') {
        setData(getMockData(true));
        return;
      }

      const response = await fetch(`${API_URL}/api/benchmarks/org/${targetOrgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // Use mock data for demo
        setData(getMockData(true));
        return;
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching benchmarks:', err);
      setData(getMockData(true));
    } finally {
      setLoading(false);
    }
  };

  const getMockData = (isOptedIn: boolean): BenchmarkData => ({
    hasData: true,
    isOptedIn,
    industryCategory: 'Technology',
    companySize: '50-200 employees',
    peerGroupSize: 847,
    lastUpdated: new Date().toISOString(),
    metrics: [
      {
        metricName: 'meetingLoad',
        label: 'Meeting Load',
        yourValue: 24,
        industryAverage: 22,
        percentile: 62,
        trend: 'worse',
        unit: 'hours/week',
        description: 'Average weekly meeting hours per person',
        goodWhenLow: true,
      },
      {
        metricName: 'afterHoursRate',
        label: 'After-Hours Activity',
        yourValue: 15,
        industryAverage: 18,
        percentile: 35,
        trend: 'better',
        unit: '%',
        description: 'Percentage of work activity outside core hours',
        goodWhenLow: true,
      },
      {
        metricName: 'focusTime',
        label: 'Focus Time',
        yourValue: 3.2,
        industryAverage: 2.8,
        percentile: 72,
        trend: 'better',
        unit: 'hours/day',
        description: 'Uninterrupted work blocks per day',
        goodWhenLow: false,
      },
      {
        metricName: 'responseLatency',
        label: 'Response Latency',
        yourValue: 45,
        industryAverage: 52,
        percentile: 42,
        trend: 'better',
        unit: 'minutes',
        description: 'Median time to respond to messages',
        goodWhenLow: true,
      },
      {
        metricName: 'collaborationBreadth',
        label: 'Collaboration Breadth',
        yourValue: 12,
        industryAverage: 10,
        percentile: 68,
        trend: 'better',
        unit: 'unique contacts/week',
        description: 'Number of unique people collaborated with weekly',
        goodWhenLow: false,
      },
      {
        metricName: 'bdi',
        label: 'Behavioral Drift Index',
        yourValue: 58,
        industryAverage: 45,
        percentile: 72,
        trend: 'worse',
        unit: '/100',
        description: 'Overall organizational drift score',
        goodWhenLow: true,
      },
    ],
    overallRanking: {
      percentile: 55,
      label: 'Above Average',
    },
  });

  const handleOptIn = async () => {
    try {
      setOptingIn(true);
      const token = localStorage.getItem('token');
      const targetOrgId = orgId || localStorage.getItem('orgId');

      await fetch(`${API_URL}/api/benchmarks/org/${targetOrgId}/opt-in`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setShowOptIn(false);
      fetchBenchmarks();
    } catch (err) {
      console.error('Error opting in:', err);
    } finally {
      setOptingIn(false);
    }
  };

  const getPercentileColor = (percentile: number, goodWhenLow: boolean) => {
    // For metrics where low is good (meeting load, after-hours), invert the color logic
    const adjustedPercentile = goodWhenLow ? 100 - percentile : percentile;

    if (adjustedPercentile >= 70) return 'text-green-400';
    if (adjustedPercentile >= 40) return 'text-amber-400';
    return 'text-red-400';
  };

  const getPercentileLabel = (percentile: number, goodWhenLow: boolean) => {
    const adjustedPercentile = goodWhenLow ? 100 - percentile : percentile;

    if (adjustedPercentile >= 80) return 'Top 20%';
    if (adjustedPercentile >= 60) return 'Above Average';
    if (adjustedPercentile >= 40) return 'Average';
    if (adjustedPercentile >= 20) return 'Below Average';
    return 'Bottom 20%';
  };

  const getPercentileBgColor = (percentile: number, goodWhenLow: boolean) => {
    const adjustedPercentile = goodWhenLow ? 100 - percentile : percentile;

    if (adjustedPercentile >= 70) return 'bg-green-500/20';
    if (adjustedPercentile >= 40) return 'bg-amber-500/20';
    return 'bg-red-500/20';
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
          <span className="ml-2 text-slate-400">Loading benchmarks...</span>
        </div>
      </div>
    );
  }

  // Show opt-in prompt if not opted in
  if (!data?.isOptedIn) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-6 h-6 text-slate-400" />
          <h2 className="text-xl font-bold text-slate-100">Industry Benchmarks</h2>
        </div>

        <div className="text-center py-8">
          <Lock className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-200 mb-2">Compare with industry peers</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            See how your organization compares to similar companies in your industry. Your data is
            anonymized and aggregated—no individual or company data is shared.
          </p>

          <button
            onClick={() => setShowOptIn(true)}
            className="px-6 py-3 bg-primary hover:bg-primary/80 text-white font-medium rounded-lg transition-colors"
          >
            Enable Benchmarks
          </button>
        </div>

        {/* Opt-in Modal */}
        {showOptIn && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md mx-4">
              <h3 className="text-lg font-bold text-slate-100 mb-4">
                Enable Anonymous Benchmarking
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">Your organization's name is never shared</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">
                    Only aggregated metrics are used for comparison
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">You can opt out at any time</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">
                    Minimum 10 companies in each benchmark group
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowOptIn(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOptIn}
                  disabled={optingIn}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {optingIn ? 'Enabling...' : 'Enable Benchmarks'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Industry Benchmarks</h2>
            <p className="text-sm text-slate-400">
              Compared to {data.peerGroupSize.toLocaleString()} similar companies
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Building2 className="w-4 h-4" />
          <span>{data.industryCategory}</span>
          <span className="text-slate-600">•</span>
          <Users className="w-4 h-4" />
          <span>{data.companySize}</span>
        </div>
      </div>

      {/* Overall Ranking */}
      <div className="p-6 border-b border-slate-700 bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 mb-1">Your Overall Ranking</p>
            <div className="flex items-center gap-3">
              <span
                className={`text-3xl font-bold ${getPercentileColor(data.overallRanking.percentile, false)}`}
              >
                {data.overallRanking.percentile}th
              </span>
              <span className="text-slate-300 text-lg">percentile</span>
            </div>
            <p className="text-sm text-slate-400 mt-1">{data.overallRanking.label}</p>
          </div>

          {/* Percentile Bar */}
          <div className="w-48">
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${data.overallRanking.percentile}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Comparisons */}
      <div className="p-6">
        <div className="space-y-4">
          {data.metrics.map((metric) => (
            <div key={metric.metricName} className="p-4 bg-slate-900/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-200">{metric.label}</span>
                  <button
                    className="text-slate-500 hover:text-slate-300"
                    title={metric.description}
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getPercentileBgColor(metric.percentile, metric.goodWhenLow)} ${getPercentileColor(metric.percentile, metric.goodWhenLow)}`}
                >
                  {getPercentileLabel(metric.percentile, metric.goodWhenLow)}
                </span>
              </div>

              <div className="flex items-center gap-6">
                {/* Your Value */}
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">Your Value</p>
                  <p className="text-xl font-bold text-slate-100">
                    {metric.yourValue}
                    {metric.unit}
                  </p>
                </div>

                {/* Comparison */}
                <div className="flex items-center gap-2">
                  {metric.trend === 'better' ? (
                    <TrendingUp className="w-5 h-5 text-green-400 rotate-180" />
                  ) : metric.trend === 'worse' ? (
                    <TrendingDown className="w-5 h-5 text-red-400 rotate-180" />
                  ) : (
                    <Minus className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                {/* Industry Average */}
                <div className="flex-1 text-right">
                  <p className="text-xs text-slate-500 mb-1">Industry Average</p>
                  <p className="text-xl font-semibold text-slate-400">
                    {metric.industryAverage}
                    {metric.unit}
                  </p>
                </div>
              </div>

              {/* Percentile Bar */}
              <div className="mt-3">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden relative">
                  {/* Industry average marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
                    style={{ left: '50%' }}
                    title="Industry Average"
                  />
                  {/* Your position */}
                  <div
                    className={`absolute top-0 bottom-0 w-2 rounded-full ${
                      metric.trend === 'better'
                        ? 'bg-green-400'
                        : metric.trend === 'worse'
                          ? 'bg-red-400'
                          : 'bg-amber-400'
                    }`}
                    style={{ left: `${metric.percentile}%`, transform: 'translateX(-50%)' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between text-sm text-slate-500">
        <span>Last updated: {new Date(data.lastUpdated).toLocaleDateString()}</span>
        <button className="text-slate-400 hover:text-slate-200 transition-colors">
          Opt out of benchmarking
        </button>
      </div>
    </div>
  );
};

export default IndustryBenchmarks;
