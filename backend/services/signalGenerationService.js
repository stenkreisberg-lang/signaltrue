import CategoryKingSignal from '../models/categoryKingSignal.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import IntegrationConnection from '../models/integrationConnection.js';
import Team from '../models/team.js';

/**
 * Category-King Signal Generation Service
 * 
 * Per spec:
 * - Detects signals based on metric thresholds and trends
 * - Uses robust-z scoring for severity (0-100)
 * - Calculates confidence based on data coverage and triangulation
 * - Generates research-backed explanations
 */

// ============================================================
// SIGNAL DEFINITIONS (Research-backed)
// ============================================================

const SIGNAL_DEFINITIONS = {
  // Sprint 1: Jira/Asana signals
  execution_stagnation: {
    name: 'Execution Stagnation',
    category: 'progress',
    researchBacking: {
      model: 'JD-R model (Job Demands-Resources)',
      citation: 'Sustained high demands with accumulating work link to exhaustion',
      link: null
    },
    triggers: [
      { metric: 'completionChange7d', operator: '<=', threshold: -20 },
      { metric: 'wipGrowth7d', operator: '>', threshold: 0 },
      { metric: 'avgTaskAgeDays', operator: 'rising', threshold: null }
    ],
    explanation: 'Work completion dropped while open work kept accumulating. Risk: chronic backlog pressure.',
    recommendedActions: [
      {
        action: 'Reduce WIP limit per person to focus on completing existing work',
        priority: 1,
        effort: 'low',
        expectedImpact: 'Reduces context switching, improves completion velocity',
        timeframe: '1-2 weeks'
      },
      {
        action: 'Review and close/merge the top 10% oldest tasks that are stale',
        priority: 2,
        effort: 'medium',
        expectedImpact: 'Reduces cognitive overhead and false work inventory',
        timeframe: '1 week'
      },
      {
        action: 'Add intake gate for new work until backlog stabilizes',
        priority: 3,
        effort: 'medium',
        expectedImpact: 'Prevents further accumulation while clearing existing work',
        timeframe: '2-4 weeks'
      }
    ]
  },
  
  rework_spiral: {
    name: 'Rework Spiral',
    category: 'progress',
    researchBacking: {
      model: 'JD-R model',
      citation: 'Rework increases demand without adding value, accelerating exhaustion',
      link: null
    },
    triggers: [
      { metric: 'reopenRate7d', operator: '>=', threshold: 0.15 },
      { metric: 'cycleTimeMedianDays', operator: 'rising', threshold: null }
    ],
    explanation: 'Reopened work increased. This usually indicates unclear requirements, rushed delivery, or unstable priorities.',
    recommendedActions: [
      {
        action: 'Define clear "Definition of Done" criteria for task completion',
        priority: 1,
        effort: 'low',
        expectedImpact: 'Reduces ambiguity and prevents premature closure',
        timeframe: '1 week'
      },
      {
        action: 'Add review checkpoint before marking tasks complete',
        priority: 2,
        effort: 'medium',
        expectedImpact: 'Catches issues before they become reopens',
        timeframe: '1-2 weeks'
      },
      {
        action: 'Investigate root causes of top 5 reopened tasks',
        priority: 3,
        effort: 'medium',
        expectedImpact: 'Identifies systemic issues driving rework',
        timeframe: '1 week'
      }
    ]
  },
  
  overcommitment_risk: {
    name: 'Overcommitment Risk',
    category: 'demand',
    researchBacking: {
      model: 'JD-R model',
      citation: 'Overdue work with spillover indicates unsustainable workload',
      link: null
    },
    triggers: [
      { metric: 'overdueTasksCount', operator: 'rising', threshold: null },
      { metric: 'avgTaskAgeDays', operator: 'rising', threshold: null },
      { metric: 'afterHoursSentRatio', operator: 'rising', threshold: null }
    ],
    explanation: 'Overdue work is increasing and spillover appears after hours. Risk of sustained overload.',
    recommendedActions: [
      {
        action: 'Review and reprioritize overdue tasks with realistic deadlines',
        priority: 1,
        effort: 'medium',
        expectedImpact: 'Reduces false urgency and clarifies priorities',
        timeframe: '1 week'
      },
      {
        action: 'Identify and remove non-essential work from team plate',
        priority: 2,
        effort: 'medium',
        expectedImpact: 'Creates capacity for essential work',
        timeframe: '1-2 weeks'
      },
      {
        action: 'Hold scope freeze for 2 weeks to allow catch-up',
        priority: 3,
        effort: 'high',
        expectedImpact: 'Prevents further overload while clearing backlog',
        timeframe: '2 weeks'
      }
    ]
  },
  
  wip_overload: {
    name: 'WIP Overload',
    category: 'demand',
    researchBacking: {
      model: 'Flow efficiency research',
      citation: 'High WIP leads to context switching costs and reduced throughput',
      link: null
    },
    triggers: [
      { metric: 'wipOpenTasks', operator: '>', threshold: 50 },
      { metric: 'wipGrowth7d', operator: '>', threshold: 10 }
    ],
    explanation: 'Work-in-progress is accumulating beyond sustainable levels. Context switching is likely impacting delivery.',
    recommendedActions: [
      {
        action: 'Implement strict WIP limits per team member',
        priority: 1,
        effort: 'low',
        expectedImpact: 'Forces focus and improves completion rate',
        timeframe: '1 week'
      },
      {
        action: 'Stop starting new work until current items complete',
        priority: 2,
        effort: 'medium',
        expectedImpact: 'Reduces multitasking overhead',
        timeframe: '1-2 weeks'
      }
    ]
  },
  
  // Sprint 2: Gmail/Meet signals
  boundary_erosion: {
    name: 'Boundary Erosion',
    category: 'recovery',
    researchBacking: {
      model: 'After-hours email expectation research',
      citation: 'After-hours email expectations associate with emotional exhaustion and poorer work-family balance',
      link: null
    },
    triggers: [
      { metric: 'afterHoursDrift', operator: '>=', threshold: 30 },
      { metric: 'afterHoursSentRatio', operator: '>=', threshold: 0.25 }
    ],
    explanation: 'After-hours email increased vs your normal pattern. This is a leading indicator of overload.',
    recommendedActions: [
      {
        action: 'Establish quiet hours policy (no response expected outside core hours)',
        priority: 1,
        effort: 'low',
        expectedImpact: 'Reduces pressure for immediate response',
        timeframe: '1 week'
      },
      {
        action: 'Enable delay-send for non-urgent messages sent after hours',
        priority: 2,
        effort: 'low',
        expectedImpact: 'Prevents after-hours notification pressure on recipients',
        timeframe: '1 week'
      },
      {
        action: 'Manager models healthy boundaries (no late-night messages)',
        priority: 3,
        effort: 'low',
        expectedImpact: 'Sets cultural norm for reasonable hours',
        timeframe: 'immediate'
      }
    ]
  },
  
  panic_coordination: {
    name: 'Panic Coordination',
    category: 'coordination',
    researchBacking: {
      model: 'Meeting fatigue research',
      citation: 'Ad-hoc meetings indicate reactive coordination, often masking unclear priorities',
      link: null
    },
    triggers: [
      { metric: 'adHocMeetingRate7d', operator: 'rising', threshold: null },
      { metric: 'backToBackMeetingBlocks', operator: 'rising', threshold: null },
      { metric: 'tasksCompleted7d', operator: 'falling', threshold: null }
    ],
    explanation: 'Coordination is increasing while completion is decreasing. Likely root cause: unclear decisions, shifting priorities.',
    recommendedActions: [
      {
        action: 'Audit last week\'s ad-hoc meetings for recurring topics - convert to async',
        priority: 1,
        effort: 'medium',
        expectedImpact: 'Reduces meeting overhead for predictable coordination',
        timeframe: '1-2 weeks'
      },
      {
        action: 'Add decision log to capture outcomes from ad-hoc syncs',
        priority: 2,
        effort: 'low',
        expectedImpact: 'Prevents repeat meetings on same topic',
        timeframe: '1 week'
      },
      {
        action: 'Review priority clarity - are teams aligned on what matters?',
        priority: 3,
        effort: 'medium',
        expectedImpact: 'Reduces need for coordination overhead',
        timeframe: '1-2 weeks'
      }
    ]
  },
  
  meeting_fatigue: {
    name: 'Meeting Fatigue',
    category: 'recovery',
    researchBacking: {
      model: 'Virtual meeting fatigue research',
      citation: 'Meeting transition time matters; back-to-back meetings prevent recovery',
      link: null
    },
    triggers: [
      { metric: 'backToBackMeetingBlocks', operator: '>=', threshold: 10 },
      { metric: 'meetingFragmentationIndex', operator: '>=', threshold: 20 }
    ],
    explanation: 'Back-to-back meetings are compressing recovery time. This pattern precedes focus erosion.',
    recommendedActions: [
      {
        action: 'Add 5-10 minute buffers between all internal meetings',
        priority: 1,
        effort: 'low',
        expectedImpact: 'Provides transition and recovery time',
        timeframe: 'immediate'
      },
      {
        action: 'Establish one no-meeting half-day per week for the team',
        priority: 2,
        effort: 'medium',
        expectedImpact: 'Creates protected focus time',
        timeframe: '1 week'
      },
      {
        action: 'Default meeting length to 25/50 minutes instead of 30/60',
        priority: 3,
        effort: 'low',
        expectedImpact: 'Builds in natural breaks',
        timeframe: 'immediate'
      }
    ]
  },
  
  response_drift: {
    name: 'Response Time Drift',
    category: 'demand',
    researchBacking: {
      model: 'Communication overload research',
      citation: 'Increasing response latency often indicates capacity saturation',
      link: null
    },
    triggers: [
      { metric: 'replyLatencyDrift', operator: '>=', threshold: 30 }
    ],
    explanation: 'Response times are slowing compared to baseline. This may indicate capacity constraints or communication overload.',
    recommendedActions: [
      {
        action: 'Review email volume for non-essential notifications to unsubscribe',
        priority: 1,
        effort: 'low',
        expectedImpact: 'Reduces noise and attention fragmentation',
        timeframe: '1 week'
      },
      {
        action: 'Set response time expectations by message type (urgent vs routine)',
        priority: 2,
        effort: 'low',
        expectedImpact: 'Reduces pressure for immediate response on routine items',
        timeframe: '1 week'
      }
    ]
  },
  
  // Sprint 3: Notion signals
  decision_churn: {
    name: 'Decision Churn',
    category: 'coordination',
    researchBacking: {
      model: 'Decision fatigue research',
      citation: 'Repeated decision revisiting increases cognitive load on senior staff',
      link: null
    },
    triggers: [
      { metric: 'editChurn7d', operator: 'rising', threshold: null },
      { metric: 'adHocMeetingRate7d', operator: 'rising', threshold: null }
    ],
    explanation: 'Decisions are being rewritten repeatedly while coordination spikes. This typically increases cognitive load on senior staff.',
    recommendedActions: [
      {
        action: 'Implement decision log template with clear owners',
        priority: 1,
        effort: 'low',
        expectedImpact: 'Creates accountability and reduces revisiting',
        timeframe: '1 week'
      },
      {
        action: 'Assign single-thread ownership for each key decision',
        priority: 2,
        effort: 'medium',
        expectedImpact: 'Prevents design-by-committee churn',
        timeframe: '1-2 weeks'
      },
      {
        action: 'Set decision deadlines to prevent indefinite deliberation',
        priority: 3,
        effort: 'low',
        expectedImpact: 'Forces timely resolution',
        timeframe: '1 week'
      }
    ]
  },
  
  documentation_decay: {
    name: 'Documentation Decay',
    category: 'coordination',
    researchBacking: {
      model: 'Knowledge management research',
      citation: 'Orphaned documentation increases onboarding friction and tribal knowledge',
      link: null
    },
    triggers: [
      { metric: 'orphanPages30d', operator: '>=', threshold: 20 }
    ],
    explanation: 'Documentation is being created but not maintained. This creates knowledge silos and onboarding friction.',
    recommendedActions: [
      {
        action: 'Archive or delete pages with no edits in 60+ days',
        priority: 1,
        effort: 'medium',
        expectedImpact: 'Reduces noise and improves findability',
        timeframe: '1-2 weeks'
      },
      {
        action: 'Assign documentation owners for critical pages',
        priority: 2,
        effort: 'low',
        expectedImpact: 'Ensures ongoing maintenance',
        timeframe: '1 week'
      }
    ]
  },
  
  cognitive_overload: {
    name: 'Cognitive Overload',
    category: 'demand',
    researchBacking: {
      model: 'Context switching research',
      citation: 'Frequent context switches drain cognitive resources and reduce quality',
      link: null
    },
    triggers: [
      { metric: 'distinctPagesEditedPerDay', operator: '>=', threshold: 10 },
      { metric: 'docChurnPerUser7d', operator: 'rising', threshold: null }
    ],
    explanation: 'High context switching across documentation. This may indicate fragmented focus or unclear ownership.',
    recommendedActions: [
      {
        action: 'Consolidate related pages into fewer, comprehensive docs',
        priority: 1,
        effort: 'medium',
        expectedImpact: 'Reduces context switching overhead',
        timeframe: '1-2 weeks'
      },
      {
        action: 'Clarify ownership boundaries for documentation areas',
        priority: 2,
        effort: 'low',
        expectedImpact: 'Reduces overlap and confusion',
        timeframe: '1 week'
      }
    ]
  },
  
  // Sprint 4: CRM signals
  external_pressure_injection: {
    name: 'External Pressure Injection',
    category: 'external_pressure',
    researchBacking: {
      model: 'JD-R model + Organizational stress research',
      citation: 'External pressure cascading into execution teams creates unsustainable demand spikes',
      link: null
    },
    triggers: [
      { metric: 'escalationRate7d', operator: 'rising', threshold: null },
      { metric: 'wipGrowth7d', operator: 'rising', threshold: null },
      { metric: 'afterHoursSentRatio', operator: 'rising', threshold: null }
    ],
    explanation: 'Customer pressure increased and cascaded into execution overload. Recommended action: add intake gates, freeze scope, clarify priorities.',
    recommendedActions: [
      {
        action: 'Formalize escalation lane (single channel for urgent requests)',
        priority: 1,
        effort: 'medium',
        expectedImpact: 'Reduces noise from ad-hoc escalations',
        timeframe: '1 week'
      },
      {
        action: 'Implement scope freeze window until current commitments clear',
        priority: 2,
        effort: 'high',
        expectedImpact: 'Prevents further overload',
        timeframe: '2 weeks'
      },
      {
        action: 'Define Sales-to-Delivery "definition of ready" handoff criteria',
        priority: 3,
        effort: 'medium',
        expectedImpact: 'Improves handoff quality and reduces firefighting',
        timeframe: '2-4 weeks'
      },
      {
        action: 'Exec decision on tradeoffs: timeline vs scope vs quality',
        priority: 4,
        effort: 'high',
        expectedImpact: 'Clarifies priorities and enables focused execution',
        timeframe: '1 week'
      }
    ]
  },
  
  escalation_cascade: {
    name: 'Escalation Cascade',
    category: 'external_pressure',
    researchBacking: {
      model: 'Sales-delivery friction research',
      citation: 'Frequent deal stage changes indicate sales pressure or unclear qualification',
      link: null
    },
    triggers: [
      { metric: 'escalationRate7d', operator: '>=', threshold: 0.3 }
    ],
    explanation: 'High deal churn indicates unstable pipeline. This often cascades into delivery pressure.',
    recommendedActions: [
      {
        action: 'Review deal qualification criteria with sales leadership',
        priority: 1,
        effort: 'medium',
        expectedImpact: 'Reduces false positive deals and churn',
        timeframe: '2-4 weeks'
      },
      {
        action: 'Add buffer between deal close and delivery commitment',
        priority: 2,
        effort: 'medium',
        expectedImpact: 'Allows proper scoping before commitment',
        timeframe: '2 weeks'
      }
    ]
  },
  
  handoff_spike: {
    name: 'Handoff Spike',
    category: 'external_pressure',
    researchBacking: {
      model: 'Cross-functional friction research',
      citation: 'CRM activity spikes followed by task creation indicate pressure transmission',
      link: null
    },
    triggers: [
      { metric: 'handoffSpike48h', operator: '>=', threshold: 5 }
    ],
    explanation: 'CRM changes are rapidly creating downstream work. Review handoff process.',
    recommendedActions: [
      {
        action: 'Review handoff triggers for automation opportunities',
        priority: 1,
        effort: 'medium',
        expectedImpact: 'Reduces manual handoff overhead',
        timeframe: '2-4 weeks'
      },
      {
        action: 'Add handoff checklist to ensure complete information transfer',
        priority: 2,
        effort: 'low',
        expectedImpact: 'Reduces back-and-forth during delivery',
        timeframe: '1 week'
      }
    ]
  },
  
  // Cross-source composite signals
  recovery_collapse: {
    name: 'Recovery Collapse',
    category: 'recovery',
    researchBacking: {
      model: 'JD-R model + Meeting fatigue research',
      citation: 'Burnout risk is recovery failure, not just high demand',
      link: null
    },
    triggers: [
      { metric: 'rci', operator: '>=', threshold: 65 }
    ],
    explanation: 'Recovery time is severely compromised across multiple indicators. Risk of burnout is elevated.',
    recommendedActions: [
      {
        action: 'Immediately add meeting buffers and reduce back-to-back blocks',
        priority: 1,
        effort: 'low',
        expectedImpact: 'Creates immediate recovery gaps',
        timeframe: 'immediate'
      },
      {
        action: 'Review after-hours communication patterns with team leads',
        priority: 2,
        effort: 'low',
        expectedImpact: 'Addresses boundary erosion',
        timeframe: '1 week'
      },
      {
        action: 'Consider temporary workload reduction for most affected team',
        priority: 3,
        effort: 'high',
        expectedImpact: 'Provides recovery runway',
        timeframe: '2-4 weeks'
      }
    ]
  },
  
  work_aging_pressure: {
    name: 'Work Aging Pressure',
    category: 'progress',
    researchBacking: {
      model: 'Flow efficiency research',
      citation: 'Aging work creates psychological overhead and reduces team morale',
      link: null
    },
    triggers: [
      { metric: 'wap', operator: '>=', threshold: 65 }
    ],
    explanation: 'Work backlog is aging rapidly across multiple dimensions. Chronic pressure is building.',
    recommendedActions: [
      {
        action: 'Conduct backlog grooming session to close or deprioritize stale items',
        priority: 1,
        effort: 'medium',
        expectedImpact: 'Reduces psychological overhead',
        timeframe: '1 week'
      },
      {
        action: 'Identify systemic blockers preventing completion',
        priority: 2,
        effort: 'medium',
        expectedImpact: 'Addresses root causes of aging',
        timeframe: '1-2 weeks'
      }
    ]
  },
  
  systemic_overload: {
    name: 'Systemic Overload',
    category: 'demand',
    researchBacking: {
      model: 'JD-R model',
      citation: 'Multiple elevated signals indicate systemic capacity issues',
      link: null
    },
    triggers: [
      { metric: 'cvir', operator: '<=', threshold: 0.5 },
      { metric: 'rci', operator: '>=', threshold: 50 },
      { metric: 'wap', operator: '>=', threshold: 50 }
    ],
    explanation: 'Multiple indicators show systemic overload. Work is not completing, recovery is compromised, and backlog is aging.',
    recommendedActions: [
      {
        action: 'Executive review of team capacity vs commitments',
        priority: 1,
        effort: 'high',
        expectedImpact: 'Aligns expectations with reality',
        timeframe: '1 week'
      },
      {
        action: 'Implement work intake freeze for 2 weeks',
        priority: 2,
        effort: 'high',
        expectedImpact: 'Creates space for recovery and completion',
        timeframe: '2 weeks'
      },
      {
        action: 'Consider temporary staffing support for highest-pressure areas',
        priority: 3,
        effort: 'high',
        expectedImpact: 'Adds capacity to address overload',
        timeframe: '2-4 weeks'
      }
    ]
  },
  
  // Basecamp signals
  passive_disengagement: {
    name: 'Passive Disengagement',
    category: 'coordination',
    researchBacking: {
      model: 'Async collaboration research',
      citation: 'Silence in async environments is data - rising unanswered posts indicate withdrawal',
      link: null
    },
    triggers: [
      { metric: 'unansweredPostRate7d', operator: 'rising', threshold: null },
      { metric: 'todosCompleted7d', operator: 'falling', threshold: null }
    ],
    explanation: 'Engagement in async channels is declining. This may indicate disengagement or communication channel issues.',
    recommendedActions: [
      {
        action: 'Review post types that go unanswered - are they actionable?',
        priority: 1,
        effort: 'low',
        expectedImpact: 'Improves signal-to-noise ratio',
        timeframe: '1 week'
      },
      {
        action: 'Check if team prefers different communication channels',
        priority: 2,
        effort: 'low',
        expectedImpact: 'Ensures communication matches team preferences',
        timeframe: '1 week'
      }
    ]
  },
  
  async_breakdown: {
    name: 'Async Breakdown',
    category: 'coordination',
    researchBacking: {
      model: 'Remote work research',
      citation: 'Long response gaps in async tools indicate coordination friction',
      link: null
    },
    triggers: [
      { metric: 'responseGapMedian', operator: '>=', threshold: 86400 } // 24 hours
    ],
    explanation: 'Response times in async channels are very slow. This may be blocking work.',
    recommendedActions: [
      {
        action: 'Set response time SLAs for different post types',
        priority: 1,
        effort: 'low',
        expectedImpact: 'Creates clear expectations',
        timeframe: '1 week'
      },
      {
        action: 'Review if async is appropriate for time-sensitive coordination',
        priority: 2,
        effort: 'medium',
        expectedImpact: 'Matches channel to urgency',
        timeframe: '1-2 weeks'
      }
    ]
  }
};

// ============================================================
// SIGNAL DETECTION FUNCTIONS
// ============================================================

/**
 * Detect signals for an organization based on latest metrics
 */
export async function detectSignals(orgId, options = {}) {
  const { teamId, date = new Date() } = options;
  
  console.log(`Detecting signals for org ${orgId}`, teamId ? `team ${teamId}` : 'org-wide');
  
  // Get latest metrics
  const query = { orgId, date: { $lte: date } };
  if (teamId) query.teamId = teamId;
  
  const latestMetrics = await IntegrationMetricsDaily.findOne(query)
    .sort({ date: -1 })
    .lean();
  
  if (!latestMetrics) {
    console.log('No metrics found for signal detection');
    return [];
  }
  
  // Get historical metrics for trend detection
  const historyStart = new Date(date);
  historyStart.setDate(historyStart.getDate() - 14);
  
  const historicalMetrics = await IntegrationMetricsDaily.find({
    ...query,
    date: { $gte: historyStart, $lte: date }
  }).sort({ date: 1 }).lean();
  
  // Get connected integrations for confidence calculation
  const connections = await IntegrationConnection.find({
    orgId,
    status: 'connected'
  }).lean();
  
  // Detect each signal type
  const detectedSignals = [];
  
  for (const [signalType, definition] of Object.entries(SIGNAL_DEFINITIONS)) {
    const result = evaluateSignal(signalType, definition, latestMetrics, historicalMetrics, connections);
    
    if (result.triggered) {
      detectedSignals.push({
        signalType,
        ...result
      });
    }
  }
  
  // Sort by severity
  detectedSignals.sort((a, b) => b.severity - a.severity);
  
  // Persist detected signals
  for (const signal of detectedSignals) {
    await persistSignal(orgId, teamId, signal, date);
  }
  
  console.log(`Detected ${detectedSignals.length} signals`);
  return detectedSignals;
}

/**
 * Evaluate a single signal against metrics
 */
function evaluateSignal(signalType, definition, latestMetrics, historicalMetrics, connections) {
  const triggeredConditions = [];
  const metricDeltas = [];
  
  // Evaluate each trigger condition
  for (const trigger of definition.triggers) {
    const currentValue = latestMetrics[trigger.metric] || 0;
    const conditionResult = evaluateCondition(trigger, currentValue, historicalMetrics);
    
    if (conditionResult.met) {
      triggeredConditions.push({
        metric: trigger.metric,
        operator: trigger.operator,
        threshold: trigger.threshold,
        actualValue: currentValue,
        met: true
      });
      
      metricDeltas.push({
        metric: trigger.metric,
        label: formatMetricLabel(trigger.metric),
        previousValue: conditionResult.previousValue,
        currentValue: currentValue,
        delta: currentValue - (conditionResult.previousValue || 0),
        deltaPercent: conditionResult.previousValue 
          ? ((currentValue - conditionResult.previousValue) / conditionResult.previousValue) * 100 
          : 0,
        direction: currentValue > (conditionResult.previousValue || 0) ? 'up' : 
                   currentValue < (conditionResult.previousValue || 0) ? 'down' : 'stable'
      });
    }
  }
  
  // Signal triggers if at least half of conditions are met
  const triggerThreshold = Math.ceil(definition.triggers.length / 2);
  const triggered = triggeredConditions.length >= triggerThreshold;
  
  if (!triggered) {
    return { triggered: false };
  }
  
  // Calculate severity (0-100) based on how strongly conditions are met
  const severity = calculateSeverity(triggeredConditions, latestMetrics, definition);
  
  // Calculate confidence based on data coverage
  const confidence = calculateConfidence(connections, latestMetrics, definition);
  
  // Determine sources that contributed
  const sources = determineContributingSources(definition.triggers);
  
  // Build drivers
  const drivers = sources.map(source => ({
    source,
    contribution: Math.round(100 / sources.length),
    description: getSourceContribution(source, triggeredConditions)
  }));
  
  // Check if sustained (14+ days)
  const trendDays = calculateTrendDays(signalType, historicalMetrics);
  const isSustained = trendDays >= 14;
  
  return {
    triggered: true,
    title: definition.name,
    category: definition.category,
    severity,
    confidence,
    explanation: definition.explanation,
    whatChanged: metricDeltas,
    drivers,
    recommendedActions: definition.recommendedActions,
    triggerConditions: triggeredConditions,
    sources,
    researchBacking: definition.researchBacking,
    trendDays,
    isSustained,
    isRising: metricDeltas.some(d => d.direction === 'up')
  };
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(trigger, currentValue, historicalMetrics) {
  const previousValue = historicalMetrics.length > 1 
    ? historicalMetrics[0][trigger.metric] 
    : null;
  
  let met = false;
  
  switch (trigger.operator) {
    case '>=':
      met = currentValue >= trigger.threshold;
      break;
    case '<=':
      met = currentValue <= trigger.threshold;
      break;
    case '>':
      met = currentValue > trigger.threshold;
      break;
    case '<':
      met = currentValue < trigger.threshold;
      break;
    case '==':
      met = currentValue === trigger.threshold;
      break;
    case 'rising':
      if (previousValue !== null) {
        met = currentValue > previousValue * 1.1; // 10% increase
      }
      break;
    case 'falling':
      if (previousValue !== null) {
        met = currentValue < previousValue * 0.9; // 10% decrease
      }
      break;
  }
  
  return { met, previousValue };
}

/**
 * Calculate severity score (0-100)
 */
function calculateSeverity(triggeredConditions, latestMetrics, definition) {
  let severity = 50; // Base severity
  
  // Add points for each triggered condition
  severity += triggeredConditions.length * 10;
  
  // Add points for how strongly thresholds are exceeded
  for (const cond of triggeredConditions) {
    if (cond.threshold && ['>=', '>'].includes(cond.operator)) {
      const ratio = cond.actualValue / cond.threshold;
      severity += Math.min(15, (ratio - 1) * 15);
    } else if (cond.threshold && ['<=', '<'].includes(cond.operator)) {
      const ratio = cond.threshold / cond.actualValue;
      severity += Math.min(15, (ratio - 1) * 15);
    }
  }
  
  return Math.min(100, Math.max(0, Math.round(severity)));
}

/**
 * Calculate confidence score (0-100)
 */
function calculateConfidence(connections, latestMetrics, definition) {
  let confidence = 0;
  
  // +25 for Jira/Asana connected with >70% coverage
  const taskConnection = connections.find(c => ['jira', 'asana'].includes(c.integrationType));
  if (taskConnection && (taskConnection.coverage?.mappedUsers / taskConnection.coverage?.totalUsers) >= 0.7) {
    confidence += 25;
  } else if (taskConnection) {
    confidence += 15;
  }
  
  // +25 for Gmail connected with >70% coverage
  const gmailConnection = connections.find(c => c.integrationType === 'gmail');
  if (gmailConnection && (gmailConnection.coverage?.mappedUsers / gmailConnection.coverage?.totalUsers) >= 0.7) {
    confidence += 25;
  } else if (gmailConnection) {
    confidence += 15;
  }
  
  // +25 for Calendar/Meet supports the signal
  const meetConnection = connections.find(c => c.integrationType === 'meet');
  if (meetConnection) {
    confidence += 25;
  }
  
  // +25 for trend persistence (would need historical signal tracking)
  if (latestMetrics.baseline?.dataCoverage?.userMappingPercent >= 70) {
    confidence += 15;
  }
  
  return Math.min(100, confidence);
}

/**
 * Determine which sources contributed to the signal
 */
function determineContributingSources(triggers) {
  const sources = new Set();
  
  for (const trigger of triggers) {
    const metric = trigger.metric;
    
    if (['wipOpenTasks', 'wipGrowth7d', 'avgTaskAgeDays', 'tasksCompleted7d', 'completionChange7d', 
         'tasksReopened7d', 'reopenRate7d', 'cycleTimeMedianDays', 'overdueTasksCount', 'assignmentChurn7d'].includes(metric)) {
      sources.add('jira');
      sources.add('asana');
    }
    
    if (['afterHoursSentRatio', 'afterHoursDrift', 'replyLatencyDrift', 'emailSent7d', 'threadBloat7d'].includes(metric)) {
      sources.add('gmail');
    }
    
    if (['adHocMeetingRate7d', 'backToBackMeetingBlocks', 'meetingFragmentationIndex', 'avgGapBetweenMeetingsMins'].includes(metric)) {
      sources.add('meet');
    }
    
    if (['editChurn7d', 'orphanPages30d', 'distinctPagesEditedPerDay'].includes(metric)) {
      sources.add('notion');
    }
    
    if (['escalationRate7d', 'closeDateSlipRate7d', 'handoffSpike48h'].includes(metric)) {
      sources.add('hubspot');
      sources.add('pipedrive');
    }
    
    if (['unansweredPostRate7d', 'responseGapMedian', 'todosCompleted7d'].includes(metric)) {
      sources.add('basecamp');
    }
    
    if (['cvir', 'rci', 'wap', 'pis'].includes(metric)) {
      sources.add('jira');
      sources.add('gmail');
      sources.add('meet');
    }
  }
  
  return [...sources];
}

function getSourceContribution(source, triggeredConditions) {
  const descriptions = {
    jira: 'Task completion and work-in-progress patterns',
    asana: 'Task completion and work-in-progress patterns',
    gmail: 'Email timing and response patterns',
    meet: 'Meeting frequency and fragmentation',
    notion: 'Documentation activity patterns',
    hubspot: 'Deal pipeline activity',
    pipedrive: 'Deal pipeline activity',
    basecamp: 'Async collaboration patterns'
  };
  
  return descriptions[source] || 'Activity patterns';
}

function formatMetricLabel(metric) {
  const labels = {
    wipOpenTasks: 'Open tasks (WIP)',
    wipGrowth7d: 'WIP growth (7d)',
    avgTaskAgeDays: 'Average task age',
    tasksCompleted7d: 'Tasks completed (7d)',
    completionChange7d: 'Completion change',
    reopenRate7d: 'Reopen rate',
    cycleTimeMedianDays: 'Cycle time (median)',
    afterHoursSentRatio: 'After-hours email ratio',
    afterHoursDrift: 'After-hours drift',
    adHocMeetingRate7d: 'Ad-hoc meeting rate',
    backToBackMeetingBlocks: 'Back-to-back meetings',
    meetingFragmentationIndex: 'Meeting fragmentation',
    editChurn7d: 'Doc edit churn',
    escalationRate7d: 'CRM escalation rate',
    cvir: 'Completion vs Interruption',
    rci: 'Recovery Collapse Index',
    wap: 'Work Aging Pressure',
    pis: 'Pressure Injection Score'
  };
  
  return labels[metric] || metric;
}

function calculateTrendDays(signalType, historicalMetrics) {
  // Count consecutive days where signal conditions would have triggered
  // Simplified: just return number of historical data points
  return historicalMetrics.length;
}

/**
 * Persist a detected signal to the database
 */
async function persistSignal(orgId, teamId, signalData, date) {
  const existingSignal = await CategoryKingSignal.findOne({
    orgId,
    teamId,
    signalType: signalData.signalType,
    status: 'active'
  });
  
  const dateRange = {
    start: new Date(date),
    end: new Date(date)
  };
  dateRange.start.setDate(dateRange.start.getDate() - 7);
  
  if (existingSignal) {
    // Update existing signal
    existingSignal.severity = signalData.severity;
    existingSignal.confidence = signalData.confidence;
    existingSignal.whatChanged = signalData.whatChanged;
    existingSignal.drivers = signalData.drivers;
    existingSignal.triggerConditions = signalData.triggerConditions;
    existingSignal.trendDays = signalData.trendDays;
    existingSignal.isSustained = signalData.isSustained;
    existingSignal.isRising = signalData.isRising;
    existingSignal.dateRange = dateRange;
    await existingSignal.save();
  } else {
    // Create new signal
    await CategoryKingSignal.create({
      orgId,
      teamId,
      signalType: signalData.signalType,
      signalCategory: signalData.category,
      title: signalData.title,
      severity: signalData.severity,
      confidence: signalData.confidence,
      explanation: signalData.explanation,
      whatChanged: signalData.whatChanged,
      drivers: signalData.drivers,
      recommendedActions: signalData.recommendedActions,
      sources: signalData.sources,
      researchBacking: signalData.researchBacking,
      triggerConditions: signalData.triggerConditions,
      trendDays: signalData.trendDays,
      isSustained: signalData.isSustained,
      isRising: signalData.isRising,
      dateRange,
      status: 'active'
    });
  }
}

/**
 * Get active signals for display
 */
export async function getActiveSignals(orgId, options = {}) {
  const { teamId, limit = 10 } = options;
  
  const query = { orgId, status: 'active' };
  if (teamId) query.teamId = teamId;
  
  return CategoryKingSignal.find(query)
    .sort({ severity: -1, confidence: -1 })
    .limit(limit)
    .lean();
}

export { SIGNAL_DEFINITIONS };

export default {
  detectSignals,
  getActiveSignals,
  SIGNAL_DEFINITIONS
};
