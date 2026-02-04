import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface MetricExplanation {
  name: string;
  description: string;
  formula?: string;
  components?: Array<{
    name: string;
    weight?: string;
    description: string;
  }>;
  interpretation?: {
    low: string;
    medium: string;
    high: string;
  };
  dataSource?: string;
}

// Metric explanations database
export const METRIC_EXPLANATIONS: Record<string, MetricExplanation> = {
  bdi: {
    name: 'Behavioral Drift Index (BDI)',
    description:
      'A composite score measuring how much team work patterns have drifted from established baselines.',
    formula: 'BDI = √((Overload² + Execution² + Retention²) / 3)',
    components: [
      {
        name: 'Overload Risk',
        weight: '33%',
        description: 'Meeting load, after-hours activity, focus time erosion',
      },
      {
        name: 'Execution Drag',
        weight: '33%',
        description: 'Response time slowdown, meeting fragmentation, participation drift',
      },
      {
        name: 'Retention Strain',
        weight: '33%',
        description: 'Attrition risk indicators, network shrinkage, sentiment changes',
      },
    ],
    interpretation: {
      low: '0-35: Stable — Team is operating within normal patterns',
      medium: '36-65: Watch — Some drift detected, worth monitoring',
      high: '66-100: Critical — Significant drift, action recommended',
    },
    dataSource: 'Slack + Calendar metadata (no message content)',
  },

  meetingLoad: {
    name: 'Meeting Load Index',
    description: 'Average hours per person per week spent in meetings.',
    formula: 'Meeting Load = Total meeting hours / Team size',
    interpretation: {
      low: '<15 hours: Healthy meeting culture',
      medium: '15-25 hours: Moderate load',
      high: '>25 hours: High meeting burden',
    },
    dataSource: 'Google Calendar / Outlook',
  },

  afterHoursRate: {
    name: 'After-Hours Activity Rate',
    description:
      'Percentage of work activity occurring outside core business hours (9am-6pm local time).',
    formula: 'After-Hours Rate = (Messages/Events after 6pm or before 9am) / Total activity × 100',
    interpretation: {
      low: '<10%: Healthy boundaries',
      medium: '10-20%: Moderate after-hours activity',
      high: '>20%: Potential burnout risk',
    },
    dataSource: 'Slack message timestamps, Calendar events',
  },

  focusTime: {
    name: 'Focus Time Ratio',
    description: 'Hours of uninterrupted work time (2+ hour blocks without meetings) per day.',
    formula: 'Focus Time = Time blocks ≥2 hours without meetings / Work day hours',
    interpretation: {
      low: '<2 hours/day: Fragmented schedule',
      medium: '2-4 hours/day: Moderate focus time',
      high: '>4 hours/day: Healthy deep work time',
    },
    dataSource: 'Calendar analysis',
  },

  responseLatency: {
    name: 'Response Latency',
    description: 'Median time to first response on Slack messages during work hours.',
    formula: 'Response Latency = Median(Response Time) for messages during 9am-6pm',
    interpretation: {
      low: '<30 min: Very responsive',
      medium: '30-60 min: Normal response time',
      high: '>60 min: Slow response, potential overload',
    },
    dataSource: 'Slack message metadata',
  },

  collaborationBreadth: {
    name: 'Collaboration Breadth',
    description: 'Number of unique people a team member interacts with per week.',
    formula: 'Collaboration Breadth = Unique contacts (DMs + Mentions + Meeting attendees)',
    interpretation: {
      low: '<5: Limited network, potential isolation',
      medium: '5-15: Healthy collaboration range',
      high: '>15: High coordination load',
    },
    dataSource: 'Slack + Calendar',
  },

  overloadRisk: {
    name: 'Overload Risk',
    description: 'Composite measure of workload pressure on the team.',
    formula:
      'Overload = 0.40×MeetingDeviation + 0.35×AfterHoursDeviation + 0.25×FocusTimeDeviation',
    components: [
      { name: 'Meeting Deviation', weight: '40%', description: 'Current meeting load vs baseline' },
      {
        name: 'After-Hours Deviation',
        weight: '35%',
        description: 'Off-hours activity vs baseline',
      },
      {
        name: 'Focus Time Deviation',
        weight: '25%',
        description: 'Focus time reduction from baseline',
      },
    ],
    interpretation: {
      low: '<35: Low overload risk',
      medium: '35-65: Moderate pressure',
      high: '>65: High overload, burnout risk',
    },
    dataSource: 'Aggregated from Slack + Calendar',
  },

  executionDrag: {
    name: 'Execution Drag',
    description: 'Measures slowdown in decision-making and team output.',
    formula:
      'Execution Drag = 0.40×ResponseTimeDeviation + 0.30×MeetingFragmentation + 0.30×ParticipationDrift',
    components: [
      { name: 'Response Time', weight: '40%', description: 'Slowdown in response latency' },
      { name: 'Meeting Fragmentation', weight: '30%', description: 'Short, unproductive meetings' },
      { name: 'Participation Drift', weight: '30%', description: 'Key people disengaging' },
    ],
    interpretation: {
      low: '<35: Fast execution',
      medium: '35-65: Slowing down',
      high: '>65: Gridlock, decisions delayed',
    },
    dataSource: 'Slack response times, Calendar patterns',
  },

  retentionStrain: {
    name: 'Retention Strain',
    description: 'Flight risk indicators across the team.',
    formula:
      'Retention Strain = 0.40×AvgAttritionRisk + 0.30×NetworkShrinkage + 0.30×SentimentDrop',
    components: [
      { name: 'Attrition Risk', weight: '40%', description: 'Individual flight risk scores' },
      { name: 'Network Shrinkage', weight: '30%', description: 'Collaboration network reduction' },
      { name: 'Sentiment Drop', weight: '30%', description: 'Communication tone changes' },
    ],
    interpretation: {
      low: '<35: Low flight risk',
      medium: '35-65: Some retention concerns',
      high: '>65: High attrition risk',
    },
    dataSource: 'Behavioral patterns, no content analysis',
  },

  costOfDrift: {
    name: 'Cost of Drift',
    description: 'Estimated weekly financial impact of organizational drift.',
    formula: 'Cost = (Meeting Hours Lost + Execution Delay + Rework Hours) × Avg Hourly Cost',
    components: [
      { name: 'Meeting Hours Lost', description: 'Time spent in meetings above baseline' },
      { name: 'Execution Delay', description: 'Productivity loss from focus time erosion' },
      { name: 'Rework Hours', description: 'Estimated from after-hours catch-up activity' },
    ],
    interpretation: {
      low: 'Minimal drift impact',
      medium: 'Moderate productivity loss',
      high: 'Significant cost, action needed',
    },
    dataSource: 'Derived from behavioral metrics + org cost settings',
  },

  managerEffectiveness: {
    name: 'Manager Effectiveness Score',
    description: 'Composite score measuring manager impact on team health (not surveillance).',
    formula:
      'Score = 0.30×TeamHealth + 0.25×Responsiveness + 0.25×1:1Consistency + 0.20×TeamSentiment',
    components: [
      { name: 'Team Health', weight: '30%', description: 'Overall team BDI and trends' },
      { name: 'Responsiveness', weight: '25%', description: 'Manager response patterns' },
      { name: '1:1 Consistency', weight: '25%', description: 'Regular 1:1 meeting frequency' },
      { name: 'Team Sentiment', weight: '20%', description: 'Team communication tone trends' },
    ],
    interpretation: {
      low: '<50: Development needed',
      medium: '50-75: Effective manager',
      high: '>75: High-performing leader',
    },
    dataSource: 'Team-level patterns only',
  },
};

interface Props {
  metricKey: string;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const MetricExplainer: React.FC<Props> = ({
  metricKey,
  className = '',
  position = 'top',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const explanation = METRIC_EXPLANATIONS[metricKey];

  useEffect(() => {
    if (!explanation) return;
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const tooltipWidth = 320;
      const tooltipHeight = 400;

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = rect.top - tooltipHeight - 8;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + 8;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - 8;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + 8;
          break;
      }

      // Keep within viewport
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
      top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

      setTooltipPosition({ top, left });
    }
  }, [isOpen, position, explanation]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (!explanation) {
    return null;
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`text-slate-500 hover:text-slate-300 transition-colors ${className}`}
        title={`Learn how ${explanation.name} is calculated`}
        aria-label={`Explain ${explanation.name}`}
      >
        <HelpCircle className={sizeClasses[size]} />
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          className="fixed z-50 w-80 max-h-96 overflow-y-auto bg-slate-800 border border-slate-600 rounded-xl shadow-2xl"
          style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
        >
          {/* Header */}
          <div className="sticky top-0 bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-100 text-sm">{explanation.name}</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Description */}
            <p className="text-sm text-slate-300 leading-relaxed">{explanation.description}</p>

            {/* Formula */}
            {explanation.formula && (
              <div className="p-3 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Formula</p>
                <code className="text-xs text-green-400 font-mono">{explanation.formula}</code>
              </div>
            )}

            {/* Components */}
            {explanation.components && explanation.components.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Components</p>
                <div className="space-y-2">
                  {explanation.components.map((comp, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      {comp.weight && (
                        <span className="px-1.5 py-0.5 bg-primary/20 text-primary rounded">
                          {comp.weight}
                        </span>
                      )}
                      <div>
                        <span className="text-slate-200 font-medium">{comp.name}</span>
                        <span className="text-slate-400"> — {comp.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interpretation */}
            {explanation.interpretation && (
              <div>
                <p className="text-xs text-slate-400 mb-2">Interpretation</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-slate-300">{explanation.interpretation.low}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-slate-300">{explanation.interpretation.medium}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-slate-300">{explanation.interpretation.high}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Data Source */}
            {explanation.dataSource && (
              <div className="pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-500">📊 Data source: {explanation.dataSource}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MetricExplainer;
