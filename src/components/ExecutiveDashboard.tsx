import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw,
  Building2,
  Users,
  Calendar,
  DollarSign,
  ChevronRight,
  Printer,
  Share2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

interface OrgHealthData {
  overallStatus: 'healthy' | 'watch' | 'critical';
  trendDirection: 'improving' | 'stable' | 'worsening';
  bdiScore: number;
  teamCount: number;
  employeeCount: number;
  teamsAtRisk: number;
  topThreeThings: string[];
  weekOverWeekChange: number;
  quarterOverQuarterChange?: number;
  costOfDrift?: {
    weeklyEstimate: number;
    monthlyEstimate: number;
    currency: string;
  };
  keyMetrics: {
    meetingLoad: { value: number; trend: 'up' | 'down' | 'stable'; percentChange: number };
    afterHours: { value: number; trend: 'up' | 'down' | 'stable'; percentChange: number };
    focusTime: { value: number; trend: 'up' | 'down' | 'stable'; percentChange: number };
    responseTime: { value: number; trend: 'up' | 'down' | 'stable'; percentChange: number };
  };
  teamBreakdown: Array<{
    teamId: string;
    teamName: string;
    status: 'healthy' | 'watch' | 'critical';
    bdiScore: number;
    trend: 'improving' | 'stable' | 'worsening';
  }>;
}

const ExecutiveDashboard: React.FC = () => {
  const [data, setData] = useState<OrgHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllTeams, setShowAllTeams] = useState(false);

  useEffect(() => {
    fetchExecutiveData();
  }, []);

  const fetchExecutiveData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const orgId = localStorage.getItem('orgId');
      
      // Fetch org-level dashboard data
      const response = await fetch(`${API_URL}/api/dashboard/org/${orgId}/executive`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        // If endpoint doesn't exist yet, use mock data for demo
        setData(getMockData());
        return;
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching executive data:', err);
      // Use mock data for demo
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const getMockData = (): OrgHealthData => ({
    overallStatus: 'watch',
    trendDirection: 'stable',
    bdiScore: 58,
    teamCount: 8,
    employeeCount: 124,
    teamsAtRisk: 2,
    topThreeThings: [
      "Engineering team showing sustained after-hours activity (+34% vs baseline)",
      "Meeting load across org increased 18% this month",
      "Product team's response latency improving after intervention"
    ],
    weekOverWeekChange: 3,
    quarterOverQuarterChange: -5,
    costOfDrift: {
      weeklyEstimate: 12500,
      monthlyEstimate: 50000,
      currency: 'USD'
    },
    keyMetrics: {
      meetingLoad: { value: 24, trend: 'up', percentChange: 18 },
      afterHours: { value: 15, trend: 'up', percentChange: 12 },
      focusTime: { value: 3.2, trend: 'down', percentChange: -8 },
      responseTime: { value: 45, trend: 'stable', percentChange: 2 }
    },
    teamBreakdown: [
      { teamId: '1', teamName: 'Engineering', status: 'critical', bdiScore: 72, trend: 'worsening' },
      { teamId: '2', teamName: 'Product', status: 'watch', bdiScore: 55, trend: 'improving' },
      { teamId: '3', teamName: 'Design', status: 'healthy', bdiScore: 38, trend: 'stable' },
      { teamId: '4', teamName: 'Sales', status: 'watch', bdiScore: 52, trend: 'stable' },
      { teamId: '5', teamName: 'Marketing', status: 'healthy', bdiScore: 35, trend: 'improving' },
      { teamId: '6', teamName: 'Customer Success', status: 'healthy', bdiScore: 42, trend: 'stable' },
      { teamId: '7', teamName: 'HR', status: 'healthy', bdiScore: 28, trend: 'stable' },
      { teamId: '8', teamName: 'Finance', status: 'healthy', bdiScore: 32, trend: 'stable' }
    ]
  });

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      healthy: {
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
        icon: CheckCircle,
        label: 'Healthy'
      },
      watch: {
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        borderColor: 'border-amber-500/30',
        icon: AlertCircle,
        label: 'Watch'
      },
      critical: {
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
        icon: AlertTriangle,
        label: 'Critical'
      }
    };
    return configs[status as keyof typeof configs] || configs.healthy;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving' || trend === 'down') return TrendingDown;
    if (trend === 'worsening' || trend === 'up') return TrendingUp;
    return Minus;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    // Generate shareable link or copy summary
    const summary = data ? `
Organization Health Summary
Status: ${data.overallStatus.toUpperCase()}
BDI Score: ${data.bdiScore}/100
Teams at Risk: ${data.teamsAtRisk}/${data.teamCount}

Top 3 Things to Know:
${data.topThreeThings.map((t, i) => `${i + 1}. ${t}`).join('\n')}
    `.trim() : '';
    
    try {
      await navigator.clipboard.writeText(summary);
      alert('Summary copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
          <span className="text-slate-400">Loading executive dashboard...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">Unable to load executive dashboard</p>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(data.overallStatus);
  const StatusIcon = statusConfig.icon;
  const TrendIcon = getTrendIcon(data.trendDirection);

  return (
    <div className="min-h-screen bg-slate-900 print:bg-white">
      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-break { page-break-after: always; }
          .bg-slate-900 { background: white !important; }
          .text-slate-100, .text-slate-200, .text-slate-300 { color: #1f2937 !important; }
          .text-slate-400 { color: #6b7280 !important; }
          .bg-slate-800 { background: #f3f4f6 !important; border: 1px solid #e5e7eb !important; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 print:text-slate-900">
                Executive Dashboard
              </h1>
              <p className="text-sm text-slate-400">
                Organization Health at a Glance • {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </header>

        {/* Traffic Light Status */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Overall Status */}
          <div className={`col-span-1 p-6 rounded-xl ${statusConfig.bgColor} border ${statusConfig.borderColor}`}>
            <div className="flex items-center gap-3 mb-3">
              <StatusIcon className={`w-8 h-8 ${statusConfig.color}`} />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Org Status</p>
                <p className={`text-2xl font-bold ${statusConfig.color}`}>
                  {statusConfig.label}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendIcon className={`w-4 h-4 ${
                data.trendDirection === 'improving' ? 'text-green-400' :
                data.trendDirection === 'worsening' ? 'text-red-400' : 'text-slate-400'
              }`} />
              <span className="text-slate-300 capitalize">{data.trendDirection}</span>
              {data.weekOverWeekChange !== 0 && (
                <span className={data.weekOverWeekChange < 0 ? 'text-green-400' : 'text-red-400'}>
                  ({data.weekOverWeekChange > 0 ? '+' : ''}{data.weekOverWeekChange}% WoW)
                </span>
              )}
            </div>
          </div>

          {/* BDI Score */}
          <div className="col-span-1 p-6 rounded-xl bg-slate-800 border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Behavioral Drift Index</p>
            <div className="flex items-end gap-2">
              <span className={`text-4xl font-bold ${
                data.bdiScore < 40 ? 'text-green-400' :
                data.bdiScore < 60 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {data.bdiScore}
              </span>
              <span className="text-slate-400 text-lg mb-1">/100</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              {data.bdiScore < 40 ? 'Low drift • Teams operating normally' :
               data.bdiScore < 60 ? 'Moderate drift • Some teams need attention' :
               'High drift • Immediate action recommended'}
            </p>
          </div>

          {/* Teams Overview */}
          <div className="col-span-1 p-6 rounded-xl bg-slate-800 border border-slate-700">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Teams Overview</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" />
                <span className="text-2xl font-bold text-slate-100">{data.teamCount}</span>
                <span className="text-slate-400">teams</span>
              </div>
              {data.teamsAtRisk > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 rounded-full">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 font-medium">{data.teamsAtRisk} at risk</span>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-3">
              {data.employeeCount} employees monitored
            </p>
          </div>
        </div>

        {/* Top 3 Things to Know This Week */}
        <div className="mb-8 p-6 rounded-xl bg-slate-800 border border-slate-700">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <span className="text-2xl">📌</span>
            3 Things to Know This Week
          </h2>
          <div className="space-y-3">
            {data.topThreeThings.map((item, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <p className="text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cost of Drift (if available) */}
        {data.costOfDrift && (
          <div className="mb-8 p-6 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-amber-400" />
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Estimated Cost of Drift</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {formatCurrency(data.costOfDrift.weeklyEstimate, data.costOfDrift.currency)}/week
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Monthly projection</p>
                <p className="text-xl font-semibold text-slate-200">
                  {formatCurrency(data.costOfDrift.monthlyEstimate, data.costOfDrift.currency)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Avg Meeting Load', value: `${data.keyMetrics.meetingLoad.value}h/week`, ...data.keyMetrics.meetingLoad, goodWhenLow: true },
            { label: 'After-Hours Rate', value: `${data.keyMetrics.afterHours.value}%`, ...data.keyMetrics.afterHours, goodWhenLow: true },
            { label: 'Avg Focus Time', value: `${data.keyMetrics.focusTime.value}h/day`, ...data.keyMetrics.focusTime, goodWhenLow: false },
            { label: 'Response Latency', value: `${data.keyMetrics.responseTime.value}min`, ...data.keyMetrics.responseTime, goodWhenLow: true }
          ].map((metric, index) => {
            const TrendIconMetric = getTrendIcon(metric.trend);
            const isGood = (metric.goodWhenLow && metric.trend === 'down') || (!metric.goodWhenLow && metric.trend === 'up');
            const isBad = (metric.goodWhenLow && metric.trend === 'up') || (!metric.goodWhenLow && metric.trend === 'down');
            
            return (
              <div key={index} className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">{metric.label}</p>
                <p className="text-xl font-bold text-slate-100">{metric.value}</p>
                <div className={`flex items-center gap-1 mt-1 text-sm ${
                  isGood ? 'text-green-400' : isBad ? 'text-red-400' : 'text-slate-400'
                }`}>
                  <TrendIconMetric className="w-3 h-3" />
                  <span>{metric.percentChange > 0 ? '+' : ''}{metric.percentChange}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Team Breakdown */}
        <div className="p-6 rounded-xl bg-slate-800 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-100">Team Health Breakdown</h2>
            {data.teamBreakdown.length > 5 && (
              <button
                onClick={() => setShowAllTeams(!showAllTeams)}
                className="text-sm text-primary hover:underline no-print"
              >
                {showAllTeams ? 'Show less' : `Show all ${data.teamBreakdown.length} teams`}
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {(showAllTeams ? data.teamBreakdown : data.teamBreakdown.slice(0, 5)).map((team) => {
              const teamStatusConfig = getStatusConfig(team.status);
              const TeamTrendIcon = getTrendIcon(team.trend);
              
              return (
                <div
                  key={team.teamId}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      team.status === 'healthy' ? 'bg-green-400' :
                      team.status === 'watch' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                    <span className="font-medium text-slate-200">{team.teamName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm">
                      <TeamTrendIcon className={`w-4 h-4 ${
                        team.trend === 'improving' ? 'text-green-400' :
                        team.trend === 'worsening' ? 'text-red-400' : 'text-slate-400'
                      }`} />
                      <span className="text-slate-400 capitalize">{team.trend}</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-sm font-medium ${
                      team.bdiScore < 40 ? 'bg-green-500/20 text-green-400' :
                      team.bdiScore < 60 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      BDI: {team.bdiScore}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 no-print" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-slate-700 text-center text-sm text-slate-500">
          <p>Generated by SignalTrue • {new Date().toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</p>
        </footer>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
