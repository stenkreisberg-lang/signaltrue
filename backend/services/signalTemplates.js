/**
 * Signal Templates
 * Defines consequence statements and recommended actions for each signal type
 * NEW NAMING: Risk-based terminology (Coordination Risk, Boundary Erosion, etc.)
 * 
 * CATEGORY KING SPEC: Signal categories
 * - coordination: Meeting load, coordination overhead, context switching
 * - execution: Task delays, rework, cycle time
 * - recovery: After-hours, recovery gaps, boundary erosion
 * - network: Collaboration patterns, bottlenecks, communication flow
 */

// Signal category mappings (per Category King spec)
export const signalCategoryMap = {
  'coordination-risk': 'coordination',
  'meeting-load-spike': 'coordination',
  'meeting_load_drift': 'coordination',
  'context-switching': 'coordination',
  'context_switching': 'coordination',
  
  'execution-drag': 'execution',
  'focus-erosion': 'execution',
  'focus_fragmentation': 'execution',
  'rework-churn': 'execution',
  'rework_churn': 'execution',
  'responsiveness_pressure': 'execution',
  'response-delay-increase': 'execution',
  
  'boundary-erosion': 'recovery',
  'after-hours-creep': 'recovery',
  'recovery-deficit': 'recovery',
  'recovery_gap_index': 'recovery',
  
  'network-bottleneck': 'network',
  'network_bottleneck': 'network',
  'handoff-bottleneck': 'network',
  'dependency-spread': 'network',
  'engagement_asymmetry': 'network',
  
  // Composite signals
  'signal_convergence': 'coordination',
  'morale-volatility': 'recovery',
  'sentiment-decline': 'recovery'
};

export const signalTemplates = {
  // NEW: Coordination Risk (was: meeting-load-spike)
  'coordination-risk': {
    whatIsChanging: 'Meeting load is increasing beyond team baseline',
    whyItMatters: 'Excessive coordination reduces focus time and slows decision-making',
    whatBreaksIfIgnored: 'Focus loss, delivery delays, team burnout within 4-6 weeks',
    consequence: 'This pattern tends to precede focus erosion and decision delays.',
    actions: [
      {
        action: 'Remove 1-2 recurring meetings that have low engagement or unclear outcomes',
        expectedEffect: 'Reduce meeting load by 15-25%, increase focus time',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Convert 30% of meetings to async updates (Slack, email, docs)',
        expectedEffect: 'Reduce synchronous time by 20%, improve documentation',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false
      },
      {
        action: 'Add no-meeting focus blocks (2 days per week, 2-hour blocks)',
        expectedEffect: 'Increase deep work time by 25-30%',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Continued meeting overload likely to increase stress and reduce output quality',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'Risk of team burnout increases by ~15% per week meeting load remains elevated'
      }
    ]
  },
  
  // NEW: Boundary Erosion (was: after-hours-creep)
  'boundary-erosion': {
    whatIsChanging: 'After-hours work is trending upward beyond normal baseline',
    whyItMatters: 'Shrinking recovery time increases burnout risk and disengagement',
    whatBreaksIfIgnored: 'Chronic burnout, attrition risk doubles within 4-6 weeks',
    consequence: 'This pattern tends to precede burnout risk and disengagement.',
    actions: [
      {
        action: 'Set and enforce quiet hours policy (no messages/meetings after 6pm)',
        expectedEffect: 'Reduce after-hours activity by 60-80%, improve recovery',
        effort: 'Medium',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Fix escalation rules (clarify on-call rotation, decision authority)',
        expectedEffect: 'Reduce unnecessary after-hours interruptions by 40-50%',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false
      },
      {
        action: 'Rotate on-call or decision owner to distribute after-hours load',
        expectedEffect: 'Reduce individual after-hours burden by 50-70%',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'After-hours creep likely to normalize, making it harder to reverse',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'Burnout risk doubles within 4-6 weeks if after-hours work becomes the norm'
      }
    ]
  },
  
  // KEEP: Focus Erosion (unchanged per spec)
  'focus-erosion': {
    whatIsChanging: 'Uninterrupted focus time is declining below baseline',
    whyItMatters: 'Fragmented attention reduces deep work quality and delivery speed',
    whatBreaksIfIgnored: 'Delivery delays, quality issues, 15-20% reduction in output within 1 month',
    consequence: 'This pattern tends to precede delivery delays and quality issues.',
    actions: [
      {
        action: 'Block 4-hour focus windows daily (no meetings, Slack notifications off)',
        expectedEffect: 'Increase uninterrupted work time by 30-40%',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Reduce meeting frequency by 25% (shift to bi-weekly or async)',
        expectedEffect: 'Reclaim 5-7 hours per week for focused work',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false
      },
      {
        action: 'Set Slack status to "Focus Mode" during deep work periods',
        expectedEffect: 'Reduce interruptions by 50%, improve concentration',
        effort: 'Low',
        timeframe: 'Immediate',
        isInactionOption: false
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Focus time continues to decline, delivery timelines slip',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'Estimated 15-20% reduction in delivery speed and quality within 1 month'
      }
    ]
  },
  
  // NEW: Execution Drag (was: response-delay-increase)
  'execution-drag': {
    whatIsChanging: 'Response times are lengthening beyond team baseline',
    whyItMatters: 'Slower decisions create bottlenecks and frustrate team execution',
    whatBreaksIfIgnored: 'Decision-making speed drops 20% per week, velocity plummets',
    consequence: 'This pattern tends to precede decision bottlenecks and team frustration.',
    actions: [
      {
        action: 'Set explicit SLAs for response time (e.g., 24h for non-urgent, 4h for urgent)',
        expectedEffect: 'Reduce ambiguity, improve response predictability by 40%',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Delegate decision authority to reduce bottlenecks',
        expectedEffect: 'Reduce response delays by 30-50%, empower team members',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false
      },
      {
        action: 'Use async tools (docs, tickets) instead of waiting for Slack replies',
        expectedEffect: 'Reduce dependency on real-time responses, increase autonomy',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Response delays continue to grow, team velocity drops',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'Decision-making speed decreases by ~20% per week as delays compound'
      }
    ]
  },
  
  // NEW: Dependency Spread (was: message-volume-drop - reinterpreted)
  'dependency-spread': {
    whatIsChanging: 'Cross-team dependencies are increasing beyond baseline',
    whyItMatters: 'More handoffs slow delivery and increase coordination overhead',
    whatBreaksIfIgnored: 'Delivery cycle time increases 15% per month, bottlenecks compound',
    consequence: 'This pattern tends to precede communication breakdown and team fragmentation.',
    actions: [
      {
        action: 'Schedule team check-in or retrospective to surface blockers',
        expectedEffect: 'Re-establish communication norms, identify hidden issues',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Introduce daily standups or async status updates',
        expectedEffect: 'Increase visibility and communication by 30-40%',
        effort: 'Medium',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Audit team composition (departures, leaves, reassignments)',
        expectedEffect: 'Identify if drop is due to team changes vs. disengagement',
        effort: 'Low',
        timeframe: '3 days',
        isInactionOption: false
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Communication gap widens, team cohesion deteriorates',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'Team fragmentation risk increases; collaboration quality drops by ~25%'
      }
    ]
  },
  
  // NEW: Morale Volatility (was: sentiment-decline)
  'morale-volatility': {
    whatIsChanging: 'Team sentiment is showing unusual fluctuations or sustained decline',
    whyItMatters: 'Unstable morale predicts decreased engagement and attrition',
    whatBreaksIfIgnored: 'Attrition risk increases 10% per month, recruiting costs spike',
    consequence: 'This pattern tends to precede decreased morale and increased attrition risk.',
    actions: [
      {
        action: 'Run anonymous team pulse survey to identify specific pain points',
        expectedEffect: 'Surface issues causing sentiment decline, guide targeted interventions',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Increase recognition and appreciation (public shoutouts, wins sharing)',
        expectedEffect: 'Boost morale by 15-25%, improve team positivity',
        effort: 'Low',
        timeframe: 'Immediate',
        isInactionOption: false
      },
      {
        action: 'Address known stressors (overwork, unclear goals, conflict)',
        expectedEffect: 'Reduce stress factors, improve sentiment by 20-30%',
        effort: 'High',
        timeframe: '3 weeks',
        isInactionOption: false
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Sentiment continues to decline, attrition risk increases',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'Attrition risk increases by ~10% per month; recruiting costs rise significantly'
      }
    ]
  },
  
  // Keep existing signals with interpretation framework added
  'recovery-deficit': {
    whatIsChanging: 'Recovery windows are shrinking below healthy baseline',
    whyItMatters: 'Inadequate recovery leads to chronic fatigue and increased errors',
    whatBreaksIfIgnored: 'Burnout probability increases 25% per month, attrition risk doubles',
    consequence: 'This pattern tends to precede chronic fatigue and increased error rates.',
    actions: [
      {
        action: 'Mandate minimum 2 consecutive days off per week (no after-hours work)',
        expectedEffect: 'Increase recovery score by 40-50%, reduce fatigue',
        effort: 'Medium',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Reduce sprint intensity or scope to allow recovery periods',
        expectedEffect: 'Improve sustainable pace, reduce burnout risk by 30%',
        effort: 'High',
        timeframe: '2 weeks',
        isInactionOption: false
      },
      {
        action: 'Introduce "recovery Fridays" (half-day or async-only work)',
        expectedEffect: 'Increase weekly recovery by 20-30%',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Chronic fatigue sets in, error rates increase, attrition risk rises',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'Burnout probability increases by 25% per month; attrition risk doubles'
      }
    ]
  },
  
  'handoff-bottleneck': {
    whatIsChanging: 'Cross-team handoffs are slowing down beyond normal baseline',
    whyItMatters: 'Slow handoffs create delivery delays and cross-team friction',
    whatBreaksIfIgnored: 'Delivery cycle time increases 15% per month, customer impact grows',
    consequence: 'This pattern tends to precede delivery delays and cross-team friction.',
    actions: [
      {
        action: 'Create explicit handoff SLAs and accountability (who owns what, when)',
        expectedEffect: 'Reduce handoff delays by 40-50%, improve cross-team clarity',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false
      },
      {
        action: 'Automate handoff process (tickets, workflows, notifications)',
        expectedEffect: 'Reduce manual coordination by 60%, increase handoff speed',
        effort: 'High',
        timeframe: '4 weeks',
        isInactionOption: false
      },
      {
        action: 'Run cross-team retrospective to identify bottleneck root causes',
        expectedEffect: 'Surface structural issues, guide process improvements',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Handoff bottleneck persists, delivery timelines continue to slip',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'Delivery cycle time increases by ~15% per month; customer impact grows'
      }
    ]
  },
  
  // NEW: Context Switching Index (Category King spec)
  'context-switching': {
    signalCategory: 'coordination',
    whatIsChanging: 'Context switching load is increasing beyond baseline',
    whyItMatters: 'High context switching fragments attention and reduces deep work quality',
    whatBreaksIfIgnored: 'Shallow work, errors, reduced creativity, decision fatigue within 2-3 weeks',
    consequence: 'This pattern tends to precede quality issues and cognitive overload.',
    actions: [
      {
        action: 'Batch similar work types into dedicated time blocks',
        expectedEffect: 'Reduce context switches by 30-40%, improve flow state',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Consolidate communication channels (fewer Slack channels, scheduled check-ins)',
        expectedEffect: 'Reduce notification-driven context switches by 50%',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false
      },
      {
        action: 'Limit concurrent projects per person to 2-3 max',
        expectedEffect: 'Reduce task-switching overhead by 40-60%',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Context switching load likely to increase as habits solidify',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'Productivity loss of ~20% per additional 10% increase in context switching'
      }
    ]
  },
  
  // NEW: Network Bottleneck (Category King spec)
  'network-bottleneck': {
    signalCategory: 'network',
    whatIsChanging: 'Communication and coordination is concentrated in a small portion of the team',
    whyItMatters: 'Bottlenecks create single points of failure and slow decision-making',
    whatBreaksIfIgnored: 'Key person dependency, vacation/sick leave disruptions, knowledge silos',
    consequence: 'This pattern tends to precede knowledge silos and team fragility.',
    actions: [
      {
        action: 'Distribute meeting ownership and decision authority more broadly',
        expectedEffect: 'Reduce dependency on top 10% contributors by 30-40%',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false
      },
      {
        action: 'Implement knowledge sharing sessions (weekly demos, documentation days)',
        expectedEffect: 'Spread tribal knowledge, reduce bus factor risk',
        effort: 'Medium',
        timeframe: '2-3 weeks',
        isInactionOption: false
      },
      {
        action: 'Rotate on-call and point-of-contact roles monthly',
        expectedEffect: 'Distribute interrupt load, build broader team capability',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Concentration likely to increase, making future redistribution harder',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'Attrition risk for key contributors increases; knowledge loss risk compounds'
      }
    ]
  },
  
  // NEW: Rework & Churn (Category King spec - placeholder until Jira/Asana)
  'rework-churn': {
    signalCategory: 'execution',
    whatIsChanging: 'Tasks are being reopened and reassigned at higher than baseline rates',
    whyItMatters: 'Rework wastes effort and indicates unclear requirements or quality issues',
    whatBreaksIfIgnored: 'Delivery delays compound, team morale erodes, velocity declines',
    consequence: 'This pattern tends to precede delivery delays and team frustration.',
    actions: [
      {
        action: 'Improve task definition with clearer acceptance criteria',
        expectedEffect: 'Reduce rework by 30-50%, improve first-time success rate',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false
      },
      {
        action: 'Add lightweight review checkpoints before handoffs',
        expectedEffect: 'Catch issues earlier, reduce reopening rate by 40%',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Conduct rework retrospective to identify root causes',
        expectedEffect: 'Surface systemic issues, guide process improvements',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Rework rate likely to persist or increase',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'Each 10% rework rate costs ~10% team capacity'
      }
    ]
  },
  
  // Legacy compatibility - keep old names pointing to new ones
  'meeting-load-spike': {
    deprecated: true,
    useInstead: 'coordination-risk'
  },
  'after-hours-creep': {
    deprecated: true,
    useInstead: 'boundary-erosion'
  },
  'response-delay-increase': {
    deprecated: true,
    useInstead: 'execution-drag'
  },
  'sentiment-decline': {
    deprecated: true,
    useInstead: 'morale-volatility'
  },
  'message-volume-drop': {
    deprecated: true,
    useInstead: 'dependency-spread'
  },
  // V2 signal types to new names
  'context_switching': {
    deprecated: true,
    useInstead: 'context-switching'
  },
  'network_bottleneck': {
    deprecated: true,
    useInstead: 'network-bottleneck'
  },
  'rework_churn': {
    deprecated: true,
    useInstead: 'rework-churn'
  }
};

/**
 * Get signal category for a signal type
 */
export const getSignalCategory = (signalType) => {
  return signalCategoryMap[signalType] || 'coordination';
};

/**
 * Get template for a signal type
 */
export const getSignalTemplate = (signalType) => {
  const template = signalTemplates[signalType];
  if (template?.deprecated) {
    return signalTemplates[template.useInstead] || {
      consequence: 'This pattern may indicate a shift in team health patterns.',
      actions: []
    };
  }
  return template || {
    consequence: 'This pattern may indicate a shift in team health patterns.',
    actions: []
  };
};

/**
 * Get consequence statement for a signal type
 */
export const getConsequenceStatement = (signalType) => {
  const template = getSignalTemplate(signalType);
  return template.consequence || 'This pattern may indicate a shift in team health patterns.';
};

/**
 * Get recommended actions for a signal type
 */
export const getRecommendedActions = (signalType) => {
  const template = signalTemplates[signalType];
  return template ? template.actions : [];
};

export default signalTemplates;
