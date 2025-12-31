import DriftPlaybook from '../models/driftPlaybook.js';

/**
 * Default Drift Response Playbooks
 * Seed these into the database
 */

export const defaultPlaybooks = [
  {
    name: 'Pause Recurring Meetings',
    category: 'Meeting Reduction',
    appliesTo: {
      driftStates: ['Early Drift', 'Developing Drift', 'Critical Drift'],
      cliStates: ['Coordination-heavy', 'Coordination overload'],
      triggerSignals: ['meetingLoad']
    },
    action: {
      title: 'Pause all non-critical recurring meetings for 2 weeks',
      description: 'Temporarily suspend standing meetings (except critical syncs) to create execution capacity',
      steps: [
        'Audit all recurring meetings',
        'Mark critical vs. nice-to-have',
        'Cancel/postpone nice-to-have meetings for 2 weeks',
        'Communicate to team with clear restart date',
        'Monitor execution capacity improvement'
      ],
      timebound: '2 weeks'
    },
    why: 'This is recommended when meeting volume increases faster than execution capacity. Coordination load has crossed sustainable thresholds.',
    expectedEffect: {
      description: 'Reduced coordination load, increased focus time, improved execution capacity',
      metrics: [
        { name: 'Meeting Load', expectedChange: '↓ 30-40%' },
        { name: 'Focus Time', expectedChange: '↑ 20-30%' },
        { name: 'Coordination Load Index', expectedChange: '↓ 25-35%' }
      ],
      timeframe: 'within 1 week'
    },
    reversibility: {
      isReversible: true,
      note: 'Fully reversible. Meetings can be reinstated after 2 weeks. This is a time-bound experiment.',
      howToRevert: 'Simply restart the recurring meetings after the 2-week period'
    },
    risk: {
      level: 'Low',
      description: 'Low risk if critical syncs are maintained. May feel uncomfortable for first few days.',
      mitigations: [
        'Keep critical customer/delivery meetings',
        'Maintain async communication channels',
        'Set clear restart date upfront'
      ]
    },
    effort: {
      level: 'Low',
      estimatedHours: 2,
      rolesInvolved: ['Team Lead', 'Individual Contributors']
    },
    successIndicators: [
      { metric: 'Meeting Hours/Week', target: '< 12 hours', measurement: 'Calendar analysis' },
      { metric: 'Focus Time', target: '> 15 hours/week', measurement: 'Calendar blocks' },
      { metric: 'Team Feedback', target: 'Positive sentiment on execution', measurement: '1-question survey' }
    ],
    examples: [
      {
        scenario: 'Engineering team with 22 hrs/week meetings, focus time at 8 hrs',
        outcome: 'After pause: 10 hrs meetings, 18 hrs focus, delivered 2 blocked features'
      }
    ],
    isActive: true,
    isDefault: true,
    priority: 10
  },
  
  {
    name: 'Implement No-Meeting Blocks',
    category: 'Focus Protection',
    appliesTo: {
      driftStates: ['Early Drift', 'Developing Drift'],
      btiStates: ['Moderate tax', 'Severe tax'],
      triggerSignals: ['focusTime', 'meetingLoad']
    },
    action: {
      title: 'Establish team-wide no-meeting blocks (e.g., Tue/Thu mornings)',
      description: 'Reserve specific calendar blocks where no meetings can be scheduled',
      steps: [
        'Identify 2-4 hour blocks per week for focus',
        'Block team calendars (make visible to org)',
        'Communicate policy to stakeholders',
        'Enforce for 2 weeks',
        'Measure focus time increase'
      ],
      timebound: '2 weeks minimum, can extend'
    },
    why: 'Recommended when focus time has dropped below sustainable levels while meeting load remains high. Protects execution capacity.',
    expectedEffect: {
      description: 'Increased uninterrupted focus time, reduced context switching, improved deep work capacity',
      metrics: [
        { name: 'Focus Time', expectedChange: '↑ 15-25%' },
        { name: 'Bandwidth Tax', expectedChange: '↓ 10-20%' },
        { name: 'Avg Focus Block Minutes', expectedChange: '↑ 30-60 min' }
      ],
      timeframe: 'within 1-2 weeks'
    },
    reversibility: {
      isReversible: true,
      note: 'Easily reversible by removing calendar blocks. Most teams keep this practice after seeing results.',
      howToRevert: 'Remove blocked time slots from shared calendars'
    },
    risk: {
      level: 'Low',
      description: 'May initially face resistance from meeting-heavy stakeholders',
      mitigations: [
        'Communicate the "why" clearly',
        'Make exceptions for true emergencies',
        'Show early wins in execution'
      ]
    },
    effort: {
      level: 'Low',
      estimatedHours: 1,
      rolesInvolved: ['Team Lead', 'Individual Contributors']
    },
    successIndicators: [
      { metric: 'Focus Blocks/Week', target: '≥ 8 blocks of 90+ min', measurement: 'Calendar analysis' },
      { metric: 'Interruptions', target: '< 8/day', measurement: 'Slack activity during focus time' },
      { metric: 'Execution Velocity', target: 'Stable or improving', measurement: 'Work completed' }
    ],
    examples: [
      {
        scenario: 'Product team with avg 45-min focus blocks, high fragmentation',
        outcome: 'After blocks: 90-min avg blocks, 40% more completed work'
      }
    ],
    isActive: true,
    isDefault: true,
    priority: 9
  },
  
  {
    name: 'Clarify Decision Ownership',
    category: 'Decision Clarity',
    appliesTo: {
      driftStates: ['Developing Drift', 'Critical Drift'],
      cliStates: ['Coordination-heavy', 'Coordination overload'],
      triggerSignals: ['meetingLoad', 'responseTime']
    },
    action: {
      title: 'Map decisions to single owners using RAPID or RACI framework',
      description: 'Reduce coordination theater by explicitly assigning decision rights',
      steps: [
        'List all recurring decisions (e.g., roadmap, design, technical choices)',
        'Assign single decision owner for each',
        'Document who must be consulted vs. informed',
        'Communicate new decision structure',
        'Monitor meeting reduction'
      ],
      timebound: '1 week setup, ongoing practice'
    },
    why: 'High coordination load often indicates unclear decision ownership. Meetings are being used to "socialize" rather than decide.',
    expectedEffect: {
      description: 'Reduced meeting volume, faster decision cycles, clearer accountability',
      metrics: [
        { name: 'Coordination Load Index', expectedChange: '↓ 20-30%' },
        { name: 'Meeting Load', expectedChange: '↓ 15-25%' },
        { name: 'Decision Closure Rate', expectedChange: '↑ 20-40%' }
      ],
      timeframe: '2-3 weeks'
    },
    reversibility: {
      isReversible: true,
      note: 'Can revert to consensus-based decision making, though rarely desired once clarity is established',
      howToRevert: 'Remove explicit decision assignments'
    },
    risk: {
      level: 'Medium',
      description: 'May surface disagreement about who should own decisions',
      mitigations: [
        'Start with low-stakes decisions',
        'Get leadership alignment first',
        'Emphasize that owners can still consult others'
      ]
    },
    effort: {
      level: 'Medium',
      estimatedHours: 4,
      rolesInvolved: ['Team Lead', 'HR', 'Leadership']
    },
    successIndicators: [
      { metric: 'Decision Latency', target: '< 3 days for most decisions', measurement: 'Decision log timestamps' },
      { metric: 'Cross-Team Sync Meetings', target: '↓ 30%', measurement: 'Calendar analysis' },
      { metric: 'Team Clarity Score', target: '> 7/10', measurement: 'Quick survey' }
    ],
    examples: [
      {
        scenario: 'Design team with 8 hrs/week "alignment meetings", slow decisions',
        outcome: 'After RAPID: 3 hrs/week syncs, decisions made in 1-2 days vs 1 week'
      }
    ],
    isActive: true,
    isDefault: true,
    priority: 8
  },
  
  {
    name: 'Implement Async-First Communication',
    category: 'Communication Norms',
    appliesTo: {
      driftStates: ['Early Drift', 'Developing Drift'],
      btiStates: ['Moderate tax', 'Severe tax'],
      triggerSignals: ['responseTime', 'focusTime']
    },
    action: {
      title: 'Shift urgent-by-default culture to async-first with clear escalation paths',
      description: 'Reduce interruption bandwidth tax by establishing async norms',
      steps: [
        'Define what is truly urgent (customer P0, production incident)',
        'Default to async (Slack threads, docs, email)',
        'Set response time expectations (4-8 hrs for non-urgent)',
        'Create escalation path for true emergencies',
        'Measure interruption reduction'
      ],
      timebound: '2 weeks adoption, ongoing practice'
    },
    why: 'High bandwidth tax often comes from treating everything as urgent. Async-first protects focus and decision quality.',
    expectedEffect: {
      description: 'Reduced interruptions, longer focus blocks, lower cognitive load',
      metrics: [
        { name: 'Bandwidth Tax', expectedChange: '↓ 20-35%' },
        { name: 'Interruptions/Day', expectedChange: '↓ 30-50%' },
        { name: 'Avg Focus Block Minutes', expectedChange: '↑ 30-50 min' }
      ],
      timeframe: 'within 2 weeks'
    },
    reversibility: {
      isReversible: true,
      note: 'Can revert to synchronous-first, though productivity typically drops',
      howToRevert: 'Remove async expectations from team norms'
    },
    risk: {
      level: 'Low',
      description: 'May feel slow initially to those used to instant responses',
      mitigations: [
        'Keep true urgent channel open',
        'Show early wins in deep work',
        'Leadership models the behavior'
      ]
    },
    effort: {
      level: 'Medium',
      estimatedHours: 3,
      rolesInvolved: ['Team Lead', 'Individual Contributors']
    },
    successIndicators: [
      { metric: 'Response Time', target: '4-8 hrs (non-urgent)', measurement: 'Slack analytics' },
      { metric: 'After-Hours Messages', target: '< 15%', measurement: 'Slack timestamps' },
      { metric: 'Focus Block Interruptions', target: '< 3/day', measurement: 'Calendar + Slack overlap' }
    ],
    examples: [
      {
        scenario: 'Support team with 15+ interruptions/day, avg 20-min focus blocks',
        outcome: 'After async-first: 6 interruptions/day, 75-min avg blocks'
      }
    ],
    isActive: true,
    isDefault: true,
    priority: 7
  },
  
  {
    name: 'Reduce Team Size or Scope',
    category: 'Capacity Adjustment',
    appliesTo: {
      driftStates: ['Critical Drift'],
      cliStates: ['Coordination overload'],
      triggerSignals: ['meetingLoad', 'focusTime', 'collaborationBreadth']
    },
    action: {
      title: 'Reduce team scope or split into smaller execution units',
      description: 'When coordination cost exceeds execution capacity, reduce surface area',
      steps: [
        'Assess current commitments vs. capacity',
        'Identify lowest-priority work to pause/defer',
        'Communicate scope reduction to stakeholders',
        'If team > 12 people, consider splitting into 2 units',
        'Monitor coordination load improvement'
      ],
      timebound: '1 sprint'
    },
    why: 'Critical drift often indicates team is carrying too much scope or coordination overhead. Reducing surface area restores execution capacity.',
    expectedEffect: {
      description: 'Lower coordination load, increased focus, better execution velocity',
      metrics: [
        { name: 'Coordination Load Index', expectedChange: '↓ 35-50%' },
        { name: 'Meeting Load', expectedChange: '↓ 25-40%' },
        { name: 'Capacity Status', expectedChange: 'Yellow → Green within 2 weeks' }
      ],
      timeframe: '2-4 weeks'
    },
    reversibility: {
      isReversible: true,
      note: 'Scope can be re-added once capacity stabilizes. Team splits are harder to reverse.',
      howToRevert: 'Re-add deferred work incrementally'
    },
    risk: {
      level: 'Medium',
      description: 'May disappoint stakeholders expecting all commitments delivered',
      mitigations: [
        'Show data on capacity vs. commitments',
        'Frame as temporary pause, not cancellation',
        'Get leadership buy-in first'
      ]
    },
    effort: {
      level: 'High',
      estimatedHours: 8,
      rolesInvolved: ['Team Lead', 'Leadership', 'Product']
    },
    successIndicators: [
      { metric: 'Coordination Load', target: '< 50%', measurement: 'CLI calculation' },
      { metric: 'Capacity Status', target: 'Green', measurement: 'Capacity score' },
      { metric: 'Team Morale', target: 'Improving', measurement: 'Pulse check' }
    ],
    examples: [
      {
        scenario: 'Platform team of 15 people, 70% coordination load, Yellow capacity',
        outcome: 'After split into 2 teams of 7-8: 40% coordination, Green capacity'
      }
    ],
    isActive: true,
    isDefault: false,
    priority: 6
  }
];

/**
 * Seed default playbooks into the database
 */
export async function seedPlaybooks() {
  try {
    for (const playbookData of defaultPlaybooks) {
      const existing = await DriftPlaybook.findOne({ name: playbookData.name });
      if (!existing) {
        const playbook = new DriftPlaybook(playbookData);
        await playbook.save();
        console.log(`✓ Seeded playbook: ${playbookData.name}`);
      } else {
        console.log(`- Playbook already exists: ${playbookData.name}`);
      }
    }
    console.log('✓ Playbook seeding complete');
  } catch (error) {
    console.error('Error seeding playbooks:', error);
    throw error;
  }
}

export default {
  defaultPlaybooks,
  seedPlaybooks
};
