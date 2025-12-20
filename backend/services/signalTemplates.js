/**
 * Signal Templates
 * Defines consequence statements and recommended actions for each signal type
 */

export const signalTemplates = {
  'meeting-load-spike': {
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
  
  'after-hours-creep': {
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
  
  'focus-erosion': {
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
  
  'response-delay-increase': {
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
  
  'message-volume-drop': {
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
  
  'recovery-deficit': {
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
  
  'sentiment-decline': {
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
  
  'handoff-bottleneck': {
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
  }
};

/**
 * Get template for a signal type
 */
export const getSignalTemplate = (signalType) => {
  return signalTemplates[signalType] || {
    consequence: 'This pattern may indicate a shift in team health patterns.',
    actions: []
  };
};

/**
 * Get consequence statement for a signal type
 */
export const getConsequenceStatement = (signalType) => {
  const template = signalTemplates[signalType];
  return template ? template.consequence : 'This pattern may indicate a shift in team health patterns.';
};

/**
 * Get recommended actions for a signal type
 */
export const getRecommendedActions = (signalType) => {
  const template = signalTemplates[signalType];
  return template ? template.actions : [];
};

export default signalTemplates;
