/**
 * AI Copilot Action Playbook Engine
 * 
 * Per spec:
 * - Deterministic layer: ActionSelector picks actions from hardcoded playbook
 * - Maps signals to specific, low-risk, system-level actions
 * - No AI needed for action selection - only for narrative generation
 */

// ============================================================
// SIGNAL → ACTIONS MAPPING (Hardcoded Playbook)
// ============================================================

const ACTION_PLAYBOOKS = {
  // Recovery signals
  recovery_collapse: {
    priority: 'critical',
    actions: [
      {
        id: 'rc_01',
        action: 'Add 5-10 minute buffers between internal meetings for 2 weeks',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'days',
        why: 'Back-to-back meeting blocks are compressing recovery time',
        expectedImpact: 'Provides transition and cognitive recovery between contexts'
      },
      {
        id: 'rc_02',
        action: 'Establish one no-meeting half-day per week (e.g., Wednesday afternoon)',
        owner: 'TEAM_LEAD',
        effort: 'M',
        timeToEffect: 'weeks',
        why: 'Meeting fragmentation is preventing deep work',
        expectedImpact: 'Creates protected time for focused work'
      },
      {
        id: 'rc_03',
        action: 'Enable delay-send for non-urgent messages outside core hours',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'days',
        why: 'After-hours communication is rising',
        expectedImpact: 'Reduces pressure for immediate response outside work hours'
      },
      {
        id: 'rc_04',
        action: 'Manager models healthy boundaries (no late-night messages)',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'weeks',
        why: 'Leadership behavior sets cultural norms',
        expectedImpact: 'Signals that after-hours response is not expected'
      }
    ],
    teamLeadPlaybook: [
      'Review your own calendar for back-to-back blocks and add buffers',
      'Announce no-meeting time to team and protect it',
      'Move non-urgent evening messages to next-day delivery',
      'Check in with team members showing highest after-hours activity',
      'Cancel or shorten one recurring meeting this week'
    ],
    hrPlaybook: [
      'Review team meeting load compared to org benchmarks',
      'Check if after-hours patterns correlate with specific projects or deadlines',
      'Prepare guidance on healthy communication norms for managers',
      'Monitor for sustained patterns (>2 weeks) indicating systemic issues',
      'Escalate to leadership if pattern persists after interventions'
    ]
  },
  
  execution_stagnation: {
    priority: 'high',
    actions: [
      {
        id: 'es_01',
        action: 'Reduce WIP limit to 3 items per person until completion rate normalizes',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'weeks',
        why: 'Work-in-progress is rising while completion is falling',
        expectedImpact: 'Forces focus on completing existing work before starting new'
      },
      {
        id: 'es_02',
        action: 'Review and close/merge the top 10% oldest tasks that are stale',
        owner: 'TEAM_LEAD',
        effort: 'M',
        timeToEffect: 'days',
        why: 'Task aging is increasing psychological overhead',
        expectedImpact: 'Clears backlog and improves perceived progress'
      },
      {
        id: 'es_03',
        action: 'Add intake gate: new work only after current sprint stabilizes',
        owner: 'TEAM_LEAD',
        effort: 'M',
        timeToEffect: 'weeks',
        why: 'New work is accumulating faster than it closes',
        expectedImpact: 'Prevents further accumulation while team catches up'
      },
      {
        id: 'es_04',
        action: 'Define clear "Definition of Done" to prevent premature closure',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'weeks',
        why: 'Reopen rate may indicate unclear completion criteria',
        expectedImpact: 'Reduces rework by clarifying expectations'
      }
    ],
    teamLeadPlaybook: [
      'Review blocked tasks and unblock or escalate today',
      'Identify and remove one non-essential task from each team member',
      'Hold a 15-min standup focused only on completions',
      'Mark stale items (>30 days) as "needs review"',
      'Postpone new feature discussions until current work completes'
    ],
    hrPlaybook: [
      'Review if execution slowdown correlates with team changes',
      'Check for external pressures (deadlines, customer escalations)',
      'Assess if workload distribution is equitable across team',
      'Monitor for signs of sustained frustration or disengagement',
      'Prepare capacity discussion points for leadership'
    ]
  },
  
  rework_spiral: {
    priority: 'high',
    actions: [
      {
        id: 'rw_01',
        action: 'Define and document "Definition of Done" for all task types',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'weeks',
        why: 'High reopen rate indicates unclear completion criteria',
        expectedImpact: 'Reduces ambiguity and prevents premature closure'
      },
      {
        id: 'rw_02',
        action: 'Add peer review checkpoint before marking tasks complete',
        owner: 'TEAM_LEAD',
        effort: 'M',
        timeToEffect: 'weeks',
        why: 'Reopened work creates wasted effort and frustration',
        expectedImpact: 'Catches issues before they become reopens'
      },
      {
        id: 'rw_03',
        action: 'Investigate root causes of top 5 reopened tasks this week',
        owner: 'TEAM_LEAD',
        effort: 'M',
        timeToEffect: 'days',
        why: 'Pattern analysis reveals systemic issues',
        expectedImpact: 'Identifies whether rework is from unclear requirements, technical debt, or communication gaps'
      }
    ],
    teamLeadPlaybook: [
      'Review the last 5 reopened tasks - what was missed?',
      'Create a simple checklist for task completion',
      'Discuss acceptance criteria before work starts',
      'Consider pairing on complex tasks to reduce rework',
      'Track and share rework causes with the team'
    ],
    hrPlaybook: [
      'Assess if rework correlates with specific projects or handoffs',
      'Check for training gaps that may cause quality issues',
      'Monitor if rework is impacting team morale',
      'Review if pressure to close fast is causing premature completion'
    ]
  },
  
  boundary_erosion: {
    priority: 'medium',
    actions: [
      {
        id: 'be_01',
        action: 'Establish quiet hours policy: no response expected after 6 PM',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'days',
        why: 'After-hours email ratio has increased significantly',
        expectedImpact: 'Reduces pressure for immediate response outside work hours'
      },
      {
        id: 'be_02',
        action: 'Enable delay-send for non-urgent messages sent after hours',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'days',
        why: 'Evening messages create implicit expectations',
        expectedImpact: 'Prevents after-hours notification pressure on recipients'
      },
      {
        id: 'be_03',
        action: 'Add "No response expected" tags for informational messages',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'days',
        why: 'Clarifies urgency and reduces unnecessary vigilance',
        expectedImpact: 'Helps recipients prioritize without stress'
      },
      {
        id: 'be_04',
        action: 'Manager leads by example: no after-hours pings for 2 weeks',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'weeks',
        why: 'Leadership behavior sets cultural expectations',
        expectedImpact: 'Signals that work-life boundaries are valued'
      }
    ],
    teamLeadPlaybook: [
      'Review your own after-hours sending patterns',
      'Schedule evening messages for morning delivery',
      'Communicate to team that late responses are not expected',
      'Check if specific projects are driving after-hours work',
      'Model the behavior you want to see'
    ],
    hrPlaybook: [
      'Review after-hours patterns by team for comparison',
      'Assess if boundary issues correlate with specific managers',
      'Prepare communication norms guidance for org',
      'Monitor for sustained patterns indicating cultural issues',
      'Consider formal policy if patterns persist'
    ]
  },
  
  panic_coordination: {
    priority: 'high',
    actions: [
      {
        id: 'pc_01',
        action: 'Audit last week\'s ad-hoc meetings and convert recurring topics to async',
        owner: 'TEAM_LEAD',
        effort: 'M',
        timeToEffect: 'weeks',
        why: 'Ad-hoc meeting rate is rising while completion is falling',
        expectedImpact: 'Reduces meeting overhead for predictable coordination needs'
      },
      {
        id: 'pc_02',
        action: 'Create decision log to capture outcomes from ad-hoc syncs',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'days',
        why: 'Prevents repeat meetings on the same topics',
        expectedImpact: 'Creates accountability and reduces re-discussion'
      },
      {
        id: 'pc_03',
        action: 'Review priority clarity with team: are we aligned on what matters?',
        owner: 'TEAM_LEAD',
        effort: 'M',
        timeToEffect: 'weeks',
        why: 'Coordination spikes often indicate unclear priorities',
        expectedImpact: 'Reduces need for reactive coordination'
      }
    ],
    teamLeadPlaybook: [
      'List all ad-hoc meetings from last week - what triggered each?',
      'Identify 2 recurring topics that could be async updates',
      'Create a simple decision log document',
      'Hold one priority-alignment discussion this week',
      'Protect a 2-hour focus block for the team'
    ],
    hrPlaybook: [
      'Review meeting load trends across org',
      'Assess if panic coordination correlates with external pressures',
      'Check for decision-making bottlenecks',
      'Monitor if coordination overhead is impacting execution',
      'Prepare meeting hygiene guidance for managers'
    ]
  },
  
  meeting_fatigue: {
    priority: 'medium',
    actions: [
      {
        id: 'mf_01',
        action: 'Add 5-minute buffers between all internal meetings',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'days',
        why: 'Back-to-back meeting blocks doubled vs baseline',
        expectedImpact: 'Provides transition and recovery time'
      },
      {
        id: 'mf_02',
        action: 'Establish one no-meeting half-day per week',
        owner: 'TEAM_LEAD',
        effort: 'M',
        timeToEffect: 'weeks',
        why: 'Meeting fragmentation is preventing deep work',
        expectedImpact: 'Creates protected focus time for complex tasks'
      },
      {
        id: 'mf_03',
        action: 'Default meeting length to 25/50 minutes instead of 30/60',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'days',
        why: 'Standard meeting lengths eliminate natural breaks',
        expectedImpact: 'Builds in buffer time automatically'
      },
      {
        id: 'mf_04',
        action: 'Cancel one recurring status meeting and replace with async update',
        owner: 'TEAM_LEAD',
        effort: 'M',
        timeToEffect: 'weeks',
        why: 'Some synchronous updates can be asynchronous',
        expectedImpact: 'Frees time while maintaining visibility'
      }
    ],
    teamLeadPlaybook: [
      'Review your calendar - how many back-to-back blocks this week?',
      'Update default meeting settings to 25/50 minutes',
      'Block a half-day as "Focus Time" on the calendar',
      'Identify one meeting that could become async',
      'Start meetings with "Can we end early?" mindset'
    ],
    hrPlaybook: [
      'Benchmark team meeting load against org averages',
      'Assess meeting culture patterns by department',
      'Review correlation between meeting load and performance',
      'Prepare meeting hygiene guidance for leadership',
      'Consider org-wide focus time policy'
    ]
  },
  
  decision_churn: {
    priority: 'medium',
    actions: [
      {
        id: 'dc_01',
        action: 'Implement decision log template with clear owners',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'weeks',
        why: 'Edit churn indicates decisions being revisited repeatedly',
        expectedImpact: 'Creates accountability and reduces re-deliberation'
      },
      {
        id: 'dc_02',
        action: 'Assign single-thread ownership for each key decision',
        owner: 'TEAM_LEAD',
        effort: 'M',
        timeToEffect: 'weeks',
        why: 'Distributed ownership leads to design-by-committee churn',
        expectedImpact: 'Clarifies who makes the call'
      },
      {
        id: 'dc_03',
        action: 'Set decision deadline for active deliberations',
        owner: 'TEAM_LEAD',
        effort: 'S',
        timeToEffect: 'days',
        why: 'Open-ended deliberation wastes cognitive resources',
        expectedImpact: 'Forces timely resolution'
      }
    ],
    teamLeadPlaybook: [
      'List open decisions that have been revisited 3+ times',
      'Assign one owner per decision with deadline',
      'Create a simple decision log (What, Who, When, Why)',
      'Review if stakeholder alignment is blocking decisions',
      'Consider "disagree and commit" for stalled decisions'
    ],
    hrPlaybook: [
      'Assess if decision churn correlates with leadership style',
      'Review decision-making authority clarity',
      'Check for communication gaps between teams',
      'Monitor impact on team morale and execution'
    ]
  },
  
  external_pressure_injection: {
    priority: 'critical',
    actions: [
      {
        id: 'ep_01',
        action: 'Formalize escalation lane: single channel for urgent customer requests',
        owner: 'EXEC',
        effort: 'M',
        timeToEffect: 'weeks',
        why: 'CRM escalation rate is rising with downstream execution impact',
        expectedImpact: 'Reduces noise from ad-hoc escalations'
      },
      {
        id: 'ep_02',
        action: 'Implement scope freeze window until current commitments clear',
        owner: 'EXEC',
        effort: 'L',
        timeToEffect: 'weeks',
        why: 'New pressure is adding to existing overload',
        expectedImpact: 'Prevents further accumulation while clearing backlog'
      },
      {
        id: 'ep_03',
        action: 'Define Sales-to-Delivery "definition of ready" handoff criteria',
        owner: 'EXEC',
        effort: 'M',
        timeToEffect: 'weeks',
        why: 'Unclear handoffs create downstream firefighting',
        expectedImpact: 'Improves handoff quality and reduces context loss'
      },
      {
        id: 'ep_04',
        action: 'Hold exec decision on tradeoffs: timeline vs scope vs quality',
        owner: 'EXEC',
        effort: 'L',
        timeToEffect: 'days',
        why: 'Teams cannot resolve competing priorities alone',
        expectedImpact: 'Clarifies what to prioritize when everything is urgent'
      }
    ],
    teamLeadPlaybook: [
      'Document current escalation patterns for exec discussion',
      'Identify 3 scope items that could be deferred',
      'Prepare capacity vs commitment analysis',
      'Shield team from direct customer escalations',
      'Communicate priority clarity to team'
    ],
    hrPlaybook: [
      'Review if pressure patterns correlate with sales cycles',
      'Assess burnout risk indicators for delivery teams',
      'Prepare talking points for exec capacity discussion',
      'Monitor after-hours patterns for affected teams',
      'Escalate if intervention is not happening'
    ]
  },
  
  systemic_overload: {
    priority: 'critical',
    actions: [
      {
        id: 'so_01',
        action: 'Executive review of team capacity vs current commitments',
        owner: 'EXEC',
        effort: 'L',
        timeToEffect: 'days',
        why: 'Multiple indicators show systemic capacity issues',
        expectedImpact: 'Aligns expectations with reality'
      },
      {
        id: 'so_02',
        action: 'Implement work intake freeze for 2 weeks',
        owner: 'EXEC',
        effort: 'L',
        timeToEffect: 'weeks',
        why: 'Team cannot recover while new work arrives',
        expectedImpact: 'Creates space for recovery and completion'
      },
      {
        id: 'so_03',
        action: 'Consider temporary staffing support for highest-pressure areas',
        owner: 'EXEC',
        effort: 'L',
        timeToEffect: 'weeks',
        why: 'Current team size may not match workload',
        expectedImpact: 'Adds capacity to address overload'
      }
    ],
    teamLeadPlaybook: [
      'Document current state for exec presentation',
      'Identify immediate workload reduction opportunities',
      'Protect team from new requests this week',
      'Check in individually with team members',
      'Prepare options for scope reduction'
    ],
    hrPlaybook: [
      'Review burnout risk indicators across affected teams',
      'Prepare capacity analysis for exec discussion',
      'Assess turnover risk if overload continues',
      'Document intervention timeline for compliance',
      'Escalate immediately if no action taken'
    ]
  }
};

// Default playbook for signals not in the mapping
const DEFAULT_PLAYBOOK = {
  priority: 'medium',
  actions: [
    {
      id: 'default_01',
      action: 'Review the specific metrics driving this signal',
      owner: 'TEAM_LEAD',
      effort: 'S',
      timeToEffect: 'days',
      why: 'Understanding the pattern is the first step',
      expectedImpact: 'Informs targeted intervention'
    },
    {
      id: 'default_02',
      action: 'Discuss with team to understand root causes',
      owner: 'TEAM_LEAD',
      effort: 'M',
      timeToEffect: 'weeks',
      why: 'Team context reveals drivers not visible in data',
      expectedImpact: 'Ensures intervention matches actual issue'
    }
  ],
  teamLeadPlaybook: [
    'Review the metrics highlighted in this signal',
    'Discuss patterns with team members',
    'Identify potential root causes',
    'Consider what changed in the last 2 weeks',
    'Plan a small intervention to test'
  ],
  hrPlaybook: [
    'Monitor if pattern persists',
    'Review correlation with team changes',
    'Prepare for escalation if needed',
    'Document timeline for compliance'
  ]
};

// ============================================================
// ACTION SELECTOR (Deterministic)
// ============================================================

/**
 * Select actions based on signal type and severity
 * This is the deterministic layer - no AI needed
 */
export function selectActions(signals, options = {}) {
  const { maxActions = 5, viewerRole = 'TEAM_LEAD' } = options;
  
  // Sort signals by severity
  const sortedSignals = [...signals].sort((a, b) => b.severity - a.severity);
  
  // Take top 2 signals by severity
  const topSignals = sortedSignals.slice(0, 2);
  
  const selectedActions = [];
  const playbooks = {
    teamLead7d: [],
    hr7d: []
  };
  
  for (const signal of topSignals) {
    const playbook = ACTION_PLAYBOOKS[signal.signalType] || DEFAULT_PLAYBOOK;
    
    // Select actions based on effort (low first) and viewer role
    const roleFilteredActions = playbook.actions.filter(action => {
      if (viewerRole === 'HR_ADMIN') return true;
      if (viewerRole === 'EXEC') return true;
      if (viewerRole === 'TEAM_LEAD') return action.owner !== 'EXEC' || signal.severity >= 80;
      return action.effort !== 'L';
    });
    
    // Sort by effort (S < M < L)
    const effortOrder = { 'S': 1, 'M': 2, 'L': 3 };
    roleFilteredActions.sort((a, b) => effortOrder[a.effort] - effortOrder[b.effort]);
    
    // Take top actions
    const actionsToAdd = roleFilteredActions.slice(0, 3).map(action => ({
      ...action,
      signalType: signal.signalType,
      signalTitle: signal.title
    }));
    
    selectedActions.push(...actionsToAdd);
    
    // Add playbook items
    playbooks.teamLead7d.push(...(playbook.teamLeadPlaybook || []));
    playbooks.hr7d.push(...(playbook.hrPlaybook || []));
  }
  
  // Dedupe and limit actions
  const uniqueActions = [];
  const seenIds = new Set();
  
  for (const action of selectedActions) {
    if (!seenIds.has(action.id) && uniqueActions.length < maxActions) {
      uniqueActions.push(action);
      seenIds.add(action.id);
    }
  }
  
  // Dedupe playbook items
  playbooks.teamLead7d = [...new Set(playbooks.teamLead7d)].slice(0, 7);
  playbooks.hr7d = [...new Set(playbooks.hr7d)].slice(0, 5);
  
  return {
    actions: uniqueActions,
    playbooks
  };
}

/**
 * Get playbook for a specific signal type
 */
export function getPlaybook(signalType) {
  return ACTION_PLAYBOOKS[signalType] || DEFAULT_PLAYBOOK;
}

/**
 * Get all available playbooks (for admin editing)
 */
export function getAllPlaybooks() {
  return ACTION_PLAYBOOKS;
}

export default {
  selectActions,
  getPlaybook,
  getAllPlaybooks,
  ACTION_PLAYBOOKS
};
