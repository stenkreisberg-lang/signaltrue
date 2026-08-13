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
  meeting_load_drift: 'coordination',
  'context-switching': 'coordination',
  context_switching: 'coordination',

  'execution-drag': 'execution',
  'focus-erosion': 'execution',
  focus_fragmentation: 'execution',
  'rework-churn': 'execution',
  rework_churn: 'execution',
  responsiveness_pressure: 'execution',
  'response-delay-increase': 'execution',

  'boundary-erosion': 'recovery',
  'after-hours-creep': 'recovery',
  'recovery-deficit': 'recovery',
  recovery_gap_index: 'recovery',

  'network-bottleneck': 'network',
  network_bottleneck: 'network',
  'handoff-bottleneck': 'network',
  'dependency-spread': 'network',
  engagement_asymmetry: 'network',

  // Composite signals
  signal_convergence: 'coordination',
  'morale-volatility': 'recovery',
  'sentiment-decline': 'recovery',
};

export const signalTemplates = {
  // NEW: Coordination Risk (was: meeting-load-spike)
  'coordination-risk': {
    whatIsChanging: 'Meeting load is increasing beyond team baseline',
    whyItMatters: 'Excessive coordination reduces focus time and slows decision-making',
    whatBreaksIfIgnored: 'Focus availability may continue to shrink and delivery may slow',
    consequence: 'This pattern tends to precede focus erosion and decision delays.',
    actions: [
      {
        action: 'Remove 1-2 recurring meetings that have low engagement or unclear outcomes',
        expectedEffect: 'Intended metric movement: lower recurring meeting hours',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Convert suitable status meetings to async updates',
        expectedEffect: 'Intended metric movement: lower synchronous time and clearer records',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false,
      },
      {
        action: 'Add no-meeting focus blocks (2 days per week, 2-hour blocks)',
        expectedEffect: 'Intended metric movement: more protected focus time',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect:
          'Continued meeting overload likely to increase stress and reduce output quality',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'The observed meeting-load deviation may persist or widen',
      },
    ],
  },

  // NEW: Boundary Erosion (was: after-hours-creep)
  'boundary-erosion': {
    whatIsChanging: 'After-hours work is trending upward beyond normal baseline',
    whyItMatters: 'Shrinking recovery windows can make the current work pattern less sustainable',
    whatBreaksIfIgnored: 'After-hours work may become a normalized operating pattern',
    consequence: 'This pattern warrants a review of workload, escalation, and recovery conditions.',
    actions: [
      {
        action: 'Set and enforce quiet hours policy (no messages/meetings after 6pm)',
        expectedEffect: 'Intended metric movement: less non-urgent after-hours activity',
        effort: 'Medium',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Fix escalation rules (clarify on-call rotation, decision authority)',
        expectedEffect: 'Intended metric movement: fewer unnecessary after-hours interruptions',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false,
      },
      {
        action: 'Rotate on-call or decision owner to distribute after-hours load',
        expectedEffect: 'Intended metric movement: after-hours demand distributed more evenly',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'After-hours creep likely to normalize, making it harder to reverse',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'The after-hours deviation may persist and become harder to reverse',
      },
    ],
  },

  // KEEP: Focus Erosion (unchanged per spec)
  'focus-erosion': {
    whatIsChanging: 'Uninterrupted focus time is declining below baseline',
    whyItMatters: 'Fragmented attention reduces deep work quality and delivery speed',
    whatBreaksIfIgnored: 'Delivery delays and quality problems may become more likely',
    consequence: 'This pattern tends to precede delivery delays and quality issues.',
    actions: [
      {
        action: 'Block 4-hour focus windows daily (no meetings, Slack notifications off)',
        expectedEffect: 'Intended metric movement: longer uninterrupted focus windows',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Reduce or combine recurring meetings that lack a clear decision purpose',
        expectedEffect: 'Intended metric movement: more calendar space for focused work',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false,
      },
      {
        action: 'Set Slack status to "Focus Mode" during deep work periods',
        expectedEffect: 'Intended metric movement: fewer notification-driven interruptions',
        effort: 'Low',
        timeframe: 'Immediate',
        isInactionOption: false,
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Focus time continues to decline, delivery timelines slip',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'The focus-time deviation may persist or widen',
      },
    ],
  },

  // NEW: Execution Drag (was: response-delay-increase)
  'execution-drag': {
    whatIsChanging: 'Response times are lengthening beyond team baseline',
    whyItMatters: 'Slower decisions create bottlenecks and frustrate team execution',
    whatBreaksIfIgnored: 'Decision and handoff delays may continue to accumulate',
    consequence: 'This pattern tends to precede decision bottlenecks and team frustration.',
    actions: [
      {
        action: 'Set explicit SLAs for response time (e.g., 24h for non-urgent, 4h for urgent)',
        expectedEffect: 'Intended metric movement: more predictable response timing',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Delegate decision authority to reduce bottlenecks',
        expectedEffect: 'Intended metric movement: fewer approval bottlenecks',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false,
      },
      {
        action: 'Use async tools (docs, tickets) instead of waiting for Slack replies',
        expectedEffect: 'Reduce dependency on real-time responses, increase autonomy',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Response delays continue to grow, team velocity drops',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'The observed response-delay deviation may persist or widen',
      },
    ],
  },

  // NEW: Dependency Spread (was: message-volume-drop - reinterpreted)
  'dependency-spread': {
    whatIsChanging: 'Cross-team dependencies are increasing beyond baseline',
    whyItMatters: 'More handoffs slow delivery and increase coordination overhead',
    whatBreaksIfIgnored: 'Handoffs and coordination bottlenecks may compound',
    consequence: 'This pattern tends to precede communication breakdown and team fragmentation.',
    actions: [
      {
        action: 'Schedule team check-in or retrospective to surface blockers',
        expectedEffect: 'Re-establish communication norms, identify hidden issues',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Introduce daily standups or async status updates',
        expectedEffect: 'Intended metric movement: clearer and more predictable handoffs',
        effort: 'Medium',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Audit team composition (departures, leaves, reassignments)',
        expectedEffect: 'Identify if drop is due to team changes vs. disengagement',
        effort: 'Low',
        timeframe: '3 days',
        isInactionOption: false,
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Communication gap widens, team cohesion deteriorates',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'The observed dependency pattern may persist or widen',
      },
    ],
  },

  // Legacy name retained for compatibility; this template uses metadata only.
  'morale-volatility': {
    whatIsChanging: 'Team collaboration participation is unusually volatile',
    whyItMatters: 'Volatile participation can indicate changing work or coordination conditions',
    whatBreaksIfIgnored: 'Collaboration gaps may persist without local context or validation',
    consequence:
      'This metadata pattern does not measure morale; review coverage and team context before acting.',
    actions: [
      {
        action: 'Run anonymous team pulse survey to identify specific pain points',
        expectedEffect: 'Collect direct context that metadata cannot provide',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Increase recognition and appreciation (public shoutouts, wins sharing)',
        expectedEffect: 'Create a direct forum for recognition and team context',
        effort: 'Low',
        timeframe: 'Immediate',
        isInactionOption: false,
      },
      {
        action: 'Address known stressors (overwork, unclear goals, conflict)',
        expectedEffect: 'Address confirmed work-condition issues found through consultation',
        effort: 'High',
        timeframe: '3 weeks',
        isInactionOption: false,
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'The participation pattern may continue without explanation',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'The metadata pattern remains unexplained and untested',
      },
    ],
  },

  // Keep existing signals with interpretation framework added
  'recovery-deficit': {
    whatIsChanging: 'Recovery windows are shrinking below healthy baseline',
    whyItMatters: 'Inadequate recovery leads to chronic fatigue and increased errors',
    whatBreaksIfIgnored: 'Recovery gaps may become a persistent work-system condition',
    consequence: 'This pattern tends to precede chronic fatigue and increased error rates.',
    actions: [
      {
        action: 'Mandate minimum 2 consecutive days off per week (no after-hours work)',
        expectedEffect: 'Intended metric movement: more complete recovery windows',
        effort: 'Medium',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Reduce sprint intensity or scope to allow recovery periods',
        expectedEffect: 'Intended metric movement: lower after-hours spillover',
        effort: 'High',
        timeframe: '2 weeks',
        isInactionOption: false,
      },
      {
        action: 'Introduce "recovery Fridays" (half-day or async-only work)',
        expectedEffect: 'Intended metric movement: more protected recovery time',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'The observed recovery deficit may persist or widen',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'The recovery-window deviation remains unaddressed',
      },
    ],
  },

  'handoff-bottleneck': {
    whatIsChanging: 'Cross-team handoffs are slowing down beyond normal baseline',
    whyItMatters: 'Slow handoffs create delivery delays and cross-team friction',
    whatBreaksIfIgnored: 'Delivery delays and customer impact may continue to accumulate',
    consequence: 'This pattern tends to precede delivery delays and cross-team friction.',
    actions: [
      {
        action: 'Create explicit handoff SLAs and accountability (who owns what, when)',
        expectedEffect: 'Intended metric movement: shorter and more predictable handoffs',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false,
      },
      {
        action: 'Automate handoff process (tickets, workflows, notifications)',
        expectedEffect: 'Intended metric movement: less manual coordination and faster handoffs',
        effort: 'High',
        timeframe: '4 weeks',
        isInactionOption: false,
      },
      {
        action: 'Run cross-team retrospective to identify bottleneck root causes',
        expectedEffect: 'Surface structural issues, guide process improvements',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Handoff bottleneck persists, delivery timelines continue to slip',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'The observed handoff delay may persist or widen',
      },
    ],
  },

  // NEW: Context Switching Index (Category King spec)
  'context-switching': {
    signalCategory: 'coordination',
    whatIsChanging: 'Context switching load is increasing beyond baseline',
    whyItMatters: 'High context switching fragments attention and reduces deep work quality',
    whatBreaksIfIgnored:
      'Fragmentation may continue to reduce sustained focus and decision quality',
    consequence: 'This pattern tends to precede quality issues and cognitive overload.',
    actions: [
      {
        action: 'Batch similar work types into dedicated time blocks',
        expectedEffect: 'Intended metric movement: fewer avoidable context switches',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Consolidate communication channels (fewer Slack channels, scheduled check-ins)',
        expectedEffect: 'Intended metric movement: fewer notification-driven context switches',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false,
      },
      {
        action: 'Limit concurrent projects per person to 2-3 max',
        expectedEffect: 'Intended metric movement: fewer simultaneous work streams',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false,
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Context switching load likely to increase as habits solidify',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'The observed fragmentation pattern may persist or widen',
      },
    ],
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
        expectedEffect: 'Intended metric movement: coordination spread across more contributors',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false,
      },
      {
        action: 'Implement knowledge sharing sessions (weekly demos, documentation days)',
        expectedEffect: 'Spread tribal knowledge, reduce bus factor risk',
        effort: 'Medium',
        timeframe: '2-3 weeks',
        isInactionOption: false,
      },
      {
        action: 'Rotate on-call and point-of-contact roles monthly',
        expectedEffect: 'Distribute interrupt load, build broader team capability',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Concentration likely to increase, making future redistribution harder',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'The concentrated dependency and continuity exposure may compound',
      },
    ],
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
        expectedEffect: 'Intended metric movement: lower reopening and reassignment rates',
        effort: 'Medium',
        timeframe: '2 weeks',
        isInactionOption: false,
      },
      {
        action: 'Add lightweight review checkpoints before handoffs',
        expectedEffect: 'Intended metric movement: fewer late-stage reopenings',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Conduct rework retrospective to identify root causes',
        expectedEffect: 'Surface systemic issues, guide process improvements',
        effort: 'Low',
        timeframe: '1 week',
        isInactionOption: false,
      },
      {
        action: 'Do nothing (monitor for 2 more weeks)',
        expectedEffect: 'Rework rate likely to persist or increase',
        effort: 'Low',
        timeframe: 'N/A',
        isInactionOption: true,
        inactionCost: 'The measured rework pattern may continue to consume delivery capacity',
      },
    ],
  },

  // Legacy compatibility - keep old names pointing to new ones
  'meeting-load-spike': {
    deprecated: true,
    useInstead: 'coordination-risk',
  },
  'after-hours-creep': {
    deprecated: true,
    useInstead: 'boundary-erosion',
  },
  'response-delay-increase': {
    deprecated: true,
    useInstead: 'execution-drag',
  },
  'sentiment-decline': {
    deprecated: true,
    useInstead: 'morale-volatility',
  },
  'message-volume-drop': {
    deprecated: true,
    useInstead: 'dependency-spread',
  },
  // V2 signal types to new names
  context_switching: {
    deprecated: true,
    useInstead: 'context-switching',
  },
  network_bottleneck: {
    deprecated: true,
    useInstead: 'network-bottleneck',
  },
  rework_churn: {
    deprecated: true,
    useInstead: 'rework-churn',
  },
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
    return (
      signalTemplates[template.useInstead] || {
        consequence: 'This pattern may indicate a shift in team health patterns.',
        actions: [],
      }
    );
  }
  return (
    template || {
      consequence: 'This pattern may indicate a shift in team health patterns.',
      actions: [],
    }
  );
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
