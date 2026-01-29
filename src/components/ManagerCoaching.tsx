import React, { useState, useEffect } from 'react';
import {
  UserCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  ChevronRight,
  Star,
  Target,
  Lightbulb,
  RefreshCw,
  Send,
  Copy,
  ThumbsUp
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

interface TeamSignal {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  metric: string;
  percentChange: number;
}

interface OneOnOneAgendaItem {
  topic: string;
  context: string;
  suggestedQuestion: string;
  priority: 'high' | 'medium' | 'low';
}

interface ManagerScorecard {
  overallScore: number;
  trend: 'improving' | 'stable' | 'declining';
  rank: string;
  metrics: {
    teamHealth: { score: number; trend: 'up' | 'down' | 'stable' };
    responseTime: { score: number; trend: 'up' | 'down' | 'stable' };
    oneOnOneConsistency: { score: number; trend: 'up' | 'down' | 'stable' };
    teamSentiment: { score: number; trend: 'up' | 'down' | 'stable' };
  };
}

interface WeeklyNudge {
  id: string;
  type: 'observation' | 'action' | 'recognition' | 'warning';
  title: string;
  message: string;
  actionUrl?: string;
  dismissed: boolean;
}

interface ManagerCoachingData {
  teamId: string;
  teamName: string;
  memberCount: number;
  weeklyNudges: WeeklyNudge[];
  scorecard: ManagerScorecard;
  teamSignals: TeamSignal[];
  oneOnOneAgenda: OneOnOneAgendaItem[];
}

interface Props {
  teamId?: string;
  managerId?: string;
}

const ManagerCoaching: React.FC<Props> = ({ teamId, managerId }) => {
  const [data, setData] = useState<ManagerCoachingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'nudges' | 'scorecard' | 'agenda'>('nudges');
  const [copiedAgenda, setCopiedAgenda] = useState(false);

  useEffect(() => {
    fetchCoachingData();
  }, [teamId, managerId]);

  const fetchCoachingData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const targetTeamId = teamId || localStorage.getItem('teamId');
      
      const response = await fetch(`${API_URL}/api/manager-coaching/${targetTeamId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        // Use mock data for demo
        setData(getMockData());
        return;
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching coaching data:', err);
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const getMockData = (): ManagerCoachingData => ({
    teamId: '1',
    teamName: 'Engineering',
    memberCount: 12,
    weeklyNudges: [
      {
        id: '1',
        type: 'warning',
        title: 'After-hours activity elevated',
        message: 'Your team has been 34% more active after 6pm compared to baseline. This sustained pattern over 3 weeks may lead to burnout. Consider discussing workload in your next team meeting.',
        dismissed: false
      },
      {
        id: '2',
        type: 'action',
        title: 'Schedule 1:1 with Alex',
        message: "It's been 3 weeks since your last 1:1 with Alex Chen. Their response time has also increased 45%. A check-in might help surface any blockers.",
        dismissed: false
      },
      {
        id: '3',
        type: 'recognition',
        title: 'Team focus time improved',
        message: 'Great progress! Your team gained an average of 2.3 hours of focus time per week after implementing "No Meeting Wednesdays." Keep it going!',
        dismissed: false
      },
      {
        id: '4',
        type: 'observation',
        title: 'Meeting patterns shifting',
        message: 'Your team spends 28% of time in meetings (up from 22%). Consider auditing recurring meetings to see which can be async.',
        dismissed: false
      }
    ],
    scorecard: {
      overallScore: 76,
      trend: 'improving',
      rank: 'Top 25%',
      metrics: {
        teamHealth: { score: 82, trend: 'up' },
        responseTime: { score: 68, trend: 'down' },
        oneOnOneConsistency: { score: 75, trend: 'stable' },
        teamSentiment: { score: 78, trend: 'up' }
      }
    },
    teamSignals: [
      { type: 'after-hours', severity: 'high', message: 'After-hours activity 34% above baseline', metric: 'afterHoursRate', percentChange: 34 },
      { type: 'meeting-load', severity: 'medium', message: 'Meeting load increased 18%', metric: 'meetingLoad', percentChange: 18 },
      { type: 'focus-time', severity: 'low', message: 'Focus time improved 12%', metric: 'focusTime', percentChange: 12 }
    ],
    oneOnOneAgenda: [
      {
        topic: 'Workload & After-Hours',
        context: 'Team after-hours activity is 34% above baseline for 3 weeks',
        suggestedQuestion: "I've noticed the team has been putting in some late hours recently. How are you feeling about your current workload? Is there anything blocking progress during core hours?",
        priority: 'high'
      },
      {
        topic: 'Meeting Effectiveness',
        context: 'Meeting time increased from 22% to 28% of work week',
        suggestedQuestion: 'We seem to have more meetings lately. Which ones feel valuable and which feel like they could be an email or async update?',
        priority: 'medium'
      },
      {
        topic: 'Recognition & Growth',
        context: 'Team sentiment improved after "No Meeting Wednesdays"',
        suggestedQuestion: "The focus time initiative seems to be working well. What's been the biggest benefit for you? Any other changes you'd like to experiment with?",
        priority: 'medium'
      },
      {
        topic: 'Collaboration Patterns',
        context: 'Cross-team collaboration reduced by 15%',
        suggestedQuestion: 'How are things going with collaborating across teams? Are there any dependencies or handoffs that have been tricky lately?',
        priority: 'low'
      }
    ]
  });

  const dismissNudge = async (nudgeId: string) => {
    if (!data) return;
    
    setData({
      ...data,
      weeklyNudges: data.weeklyNudges.map(n => 
        n.id === nudgeId ? { ...n, dismissed: true } : n
      )
    });

    // API call to dismiss
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/manager-coaching/nudge/${nudgeId}/dismiss`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Error dismissing nudge:', err);
    }
  };

  const copyAgendaToClipboard = () => {
    if (!data) return;
    
    const agendaText = data.oneOnOneAgenda.map(item => 
      `## ${item.topic}\n${item.context}\n\nSuggested question: "${item.suggestedQuestion}"\n`
    ).join('\n---\n\n');
    
    navigator.clipboard.writeText(agendaText);
    setCopiedAgenda(true);
    setTimeout(() => setCopiedAgenda(false), 2000);
  };

  const getNudgeIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'action': return Target;
      case 'recognition': return Star;
      default: return Lightbulb;
    }
  };

  const getNudgeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
      case 'action': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'recognition': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up' || trend === 'improving') return TrendingUp;
    if (trend === 'down' || trend === 'declining') return TrendingDown;
    return Minus;
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
          <span className="ml-2 text-slate-400">Loading coaching insights...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">Unable to load coaching data</p>
        </div>
      </div>
    );
  }

  const activeNudges = data.weeklyNudges.filter(n => !n.dismissed);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Manager Coaching</h2>
              <p className="text-sm text-slate-400">
                {data.teamName} • {data.memberCount} members
              </p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-slate-900/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('nudges')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'nudges' 
                  ? 'bg-slate-700 text-slate-100' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Weekly Nudges
              {activeNudges.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary rounded-full">
                  {activeNudges.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('scorecard')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'scorecard' 
                  ? 'bg-slate-700 text-slate-100' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Scorecard
            </button>
            <button
              onClick={() => setActiveTab('agenda')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'agenda' 
                  ? 'bg-slate-700 text-slate-100' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1:1 Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Weekly Nudges Tab */}
        {activeTab === 'nudges' && (
          <div className="space-y-4">
            {activeNudges.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-slate-300 font-medium">All caught up!</p>
                <p className="text-sm text-slate-400">No new coaching nudges this week</p>
              </div>
            ) : (
              activeNudges.map((nudge) => {
                const NudgeIcon = getNudgeIcon(nudge.type);
                const colorClass = getNudgeColor(nudge.type);
                
                return (
                  <div 
                    key={nudge.id}
                    className={`p-4 rounded-lg border ${colorClass}`}
                  >
                    <div className="flex items-start gap-3">
                      <NudgeIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-100 mb-1">
                          {nudge.title}
                        </h4>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          {nudge.message}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <button
                            onClick={() => dismissNudge(nudge.id)}
                            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                          >
                            <ThumbsUp className="w-3 h-3" />
                            Got it
                          </button>
                          {nudge.actionUrl && (
                            <a
                              href={nudge.actionUrl}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              Take action
                              <ChevronRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Scorecard Tab */}
        {activeTab === 'scorecard' && (
          <div>
            {/* Overall Score */}
            <div className="text-center mb-6 p-6 bg-slate-900/30 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">Your Manager Effectiveness Score</p>
              <div className="flex items-center justify-center gap-4">
                <span className={`text-5xl font-bold ${
                  data.scorecard.overallScore >= 75 ? 'text-green-400' :
                  data.scorecard.overallScore >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {data.scorecard.overallScore}
                </span>
                <div className="text-left">
                  <div className="flex items-center gap-1">
                    {React.createElement(getTrendIcon(data.scorecard.trend), {
                      className: `w-4 h-4 ${
                        data.scorecard.trend === 'improving' ? 'text-green-400' :
                        data.scorecard.trend === 'declining' ? 'text-red-400' : 'text-slate-400'
                      }`
                    })}
                    <span className="text-sm text-slate-300 capitalize">{data.scorecard.trend}</span>
                  </div>
                  <span className="text-sm text-slate-400">{data.scorecard.rank}</span>
                </div>
              </div>
            </div>

            {/* Metric Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'teamHealth', label: 'Team Health', icon: Users },
                { key: 'responseTime', label: 'Responsiveness', icon: Clock },
                { key: 'oneOnOneConsistency', label: '1:1 Consistency', icon: Calendar },
                { key: 'teamSentiment', label: 'Team Sentiment', icon: MessageSquare }
              ].map(({ key, label, icon: Icon }) => {
                const metric = data.scorecard.metrics[key as keyof typeof data.scorecard.metrics];
                const TrendIconComponent = getTrendIcon(metric.trend);
                
                return (
                  <div key={key} className="p-4 bg-slate-900/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-400">{label}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-bold ${
                        metric.score >= 75 ? 'text-green-400' :
                        metric.score >= 50 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {metric.score}
                      </span>
                      <TrendIconComponent className={`w-4 h-4 ${
                        metric.trend === 'up' ? 'text-green-400' :
                        metric.trend === 'down' ? 'text-red-400' : 'text-slate-400'
                      }`} />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-slate-500 text-center mt-4">
              Score based on team outcomes, not surveillance. Your individual messages are never read.
            </p>
          </div>
        )}

        {/* 1:1 Agenda Tab */}
        {activeTab === 'agenda' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-200">Suggested 1:1 Topics</h3>
                <p className="text-sm text-slate-400">Based on your team's current signals</p>
              </div>
              <button
                onClick={copyAgendaToClipboard}
                className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
              >
                {copiedAgenda ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy to clipboard
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              {data.oneOnOneAgenda.map((item, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border ${
                    item.priority === 'high' ? 'border-red-500/30 bg-red-500/5' :
                    item.priority === 'medium' ? 'border-amber-500/30 bg-amber-500/5' :
                    'border-slate-700 bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      item.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                      item.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {item.priority}
                    </span>
                    <h4 className="font-medium text-slate-200">{item.topic}</h4>
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-2">
                    Context: {item.context}
                  </p>
                  
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <p className="text-sm text-slate-200 italic">
                      "{item.suggestedQuestion}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerCoaching;
