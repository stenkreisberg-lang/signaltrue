/**
 * Engagement Recommendation Engine
 *
 * Rule-based recommendation engine from spec Section 17.
 * Converts subscore signals and detected patterns into concrete,
 * team-level recommended actions.
 *
 * Five trigger sets (one per primary subscore domain):
 *   1. Recovery Debt    >= 65
 *   2. Focus Erosion    >= 65
 *   3. Coordination Friction >= 65
 *   4. Manager Support Gap   >= 60
 *   5. Collaboration Withdrawal >= 60
 *
 * Additional cross-signal rules fire when two subscores are co-elevated,
 * capturing compound risk states the individual triggers miss.
 *
 * Each recommendation:
 *   {
 *     actionId:    string  — stable machine key (idempotent across runs)
 *     title:       string  — short action label
 *     description: string  — one-sentence rationale
 *     priority:    'urgent'|'high'|'medium'
 *     category:    'recovery'|'focus'|'coordination'|'manager'|'collaboration'
 *     trigger:     string  — human-readable trigger condition
 *   }
 *
 * PRIVACY: No individual identification. All recommendations are team-level.
 */

// ── Thresholds ─────────────────────────────────────────────────────────────────

const T_HIGH = 65; // primary trigger threshold
const T_MANAGER = 60; // manager support gap trigger (lower per spec)
const T_COLLAB = 60; // collaboration withdrawal trigger
const T_URGENT = 80; // marks a recommendation as urgent instead of high

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Generate recommended actions for this team-week.
 *
 * @param {Object} subscores — { recoveryDebt, focusErosion, coordinationFriction,
 *                               responsivenessPressure, collaborationWithdrawal,
 *                               managerSupportGap, workloadVolatility }
 * @param {Array}  patterns  — detected patterns from engagementPatternService
 * @returns {Array}          — recommended action objects, sorted by priority
 */
export function generateRecommendations(subscores, patterns = []) {
  const actions = [];

  // Trigger set 1: Recovery Debt
  if (subscores.recoveryDebt >= T_HIGH) {
    actions.push(...recoveryDebtRecommendations(subscores.recoveryDebt));
  }

  // Trigger set 2: Focus Erosion
  if (subscores.focusErosion >= T_HIGH) {
    actions.push(...focusErosionRecommendations(subscores.focusErosion));
  }

  // Trigger set 3: Coordination Friction
  if (subscores.coordinationFriction >= T_HIGH) {
    actions.push(...coordinationFrictionRecommendations(subscores.coordinationFriction));
  }

  // Trigger set 4: Manager Support Gap
  if (subscores.managerSupportGap >= T_MANAGER) {
    actions.push(...managerSupportGapRecommendations(subscores.managerSupportGap));
  }

  // Trigger set 5: Collaboration Withdrawal
  if (subscores.collaborationWithdrawal >= T_COLLAB) {
    actions.push(...collaborationWithdrawalRecommendations(subscores.collaborationWithdrawal));
  }

  // Cross-signal compound rules
  actions.push(...compoundRules(subscores, patterns));

  // De-duplicate by actionId, keep highest-priority instance
  const deduped = deduplicateByPriority(actions);

  // Sort: urgent → high → medium
  const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2 };
  deduped.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return deduped;
}

// ── Trigger Set 1: Recovery Debt ───────────────────────────────────────────────

function recoveryDebtRecommendations(score) {
  const priority = score >= T_URGENT ? 'urgent' : 'high';
  return [
    {
      actionId: 'recovery_enforce_boundaries',
      title: 'Enforce After-Hours Communication Boundaries',
      description:
        'Establish a team norm that non-urgent messages sent after hours do not require same-day responses, reducing the implied pressure to stay always-on.',
      priority,
      category: 'recovery',
      trigger: `Recovery Debt score ${score} — after-hours activity is above team baseline`,
    },
    {
      actionId: 'recovery_audit_weekend_activity',
      title: 'Audit Weekend and Off-Day Activity Patterns',
      description:
        'Review whether recurring tasks, on-call rotations, or deadline patterns are systematically driving work into recovery windows.',
      priority: 'high',
      category: 'recovery',
      trigger: `Recovery Debt score ${score} — recovery gap violations detected`,
    },
    ...(score >= T_URGENT
      ? [
          {
            actionId: 'recovery_manager_check_in',
            title: 'Manager: Schedule a Team Wellbeing Check-In',
            description:
              'The recovery debt level is in the critical range. A structured team conversation about sustainable work pace is recommended before burnout signals emerge.',
            priority: 'urgent',
            category: 'recovery',
            trigger: `Recovery Debt score ${score} — critical threshold exceeded`,
          },
        ]
      : []),
  ];
}

// ── Trigger Set 2: Focus Erosion ───────────────────────────────────────────────

function focusErosionRecommendations(score) {
  const priority = score >= T_URGENT ? 'urgent' : 'high';
  return [
    {
      actionId: 'focus_protect_deep_work_blocks',
      title: 'Protect Dedicated Deep-Work Time Blocks',
      description:
        'Introduce a team agreement to block 2–4 hours of contiguous focus time per person per day, with no meetings scheduled during that window.',
      priority,
      category: 'focus',
      trigger: `Focus Erosion score ${score} — focus hours below team baseline`,
    },
    {
      actionId: 'focus_meeting_audit',
      title: 'Conduct a Meeting Necessity Audit',
      description:
        'Review recurring meetings for necessity and attendance. Remove or shorten meetings that fragment focus blocks without proportionate collaboration value.',
      priority: 'high',
      category: 'focus',
      trigger: `Focus Erosion score ${score} — fragmented day ratio and back-to-back meeting count elevated`,
    },
    {
      actionId: 'focus_async_first_norm',
      title: 'Introduce Async-First Communication Norms',
      description:
        'Encourage replacing ad-hoc synchronous meetings with structured async updates for status sharing, freeing calendar space for deep work.',
      priority: 'medium',
      category: 'focus',
      trigger: `Focus Erosion score ${score} — meeting hours displacing individual work time`,
    },
  ];
}

// ── Trigger Set 3: Coordination Friction ──────────────────────────────────────

function coordinationFrictionRecommendations(score) {
  const priority = score >= T_URGENT ? 'urgent' : 'high';
  return [
    {
      actionId: 'coord_reduce_meeting_size',
      title: 'Reduce Average Meeting Attendee Count',
      description:
        'Review standing meetings and ensure only essential contributors attend. Large meeting size is increasing coordination overhead without proportionate decision value.',
      priority,
      category: 'coordination',
      trigger: `Coordination Friction score ${score} — attendee-hours per person elevated`,
    },
    {
      actionId: 'coord_prune_recurring_meetings',
      title: 'Prune the Recurring Meeting Calendar',
      description:
        'Conduct a recurring-meeting review to cancel or consolidate meetings that no longer serve a clear purpose. Recurring meeting debt compounds quickly.',
      priority: 'high',
      category: 'coordination',
      trigger: `Coordination Friction score ${score} — recurring meeting ratio above baseline`,
    },
    {
      actionId: 'coord_define_dri',
      title: 'Clarify Decision Ownership (DRI Model)',
      description:
        'High coordination friction often signals unclear decision ownership. Assign a Directly Responsible Individual (DRI) to recurring cross-team decisions to reduce the need for large alignment meetings.',
      priority: 'medium',
      category: 'coordination',
      trigger: `Coordination Friction score ${score} — cross-team meeting load elevated`,
    },
  ];
}

// ── Trigger Set 4: Manager Support Gap ────────────────────────────────────────

function managerSupportGapRecommendations(score) {
  const priority = score >= T_URGENT ? 'urgent' : 'high';
  return [
    {
      actionId: 'manager_restore_1to1_cadence',
      title: 'Restore Regular 1:1 Cadence',
      description:
        'Manager 1:1 time per person has dropped below the team baseline. Re-establish a consistent weekly 1:1 schedule and treat cancellations as exceptional rather than routine.',
      priority,
      category: 'manager',
      trigger: `Manager Support Gap score ${score} — 1:1 minutes per person below baseline`,
    },
    {
      actionId: 'manager_reduce_meeting_load',
      title: 'Reduce Manager Meeting Load to Protect 1:1 Capacity',
      description:
        "The manager's calendar is likely full with coordination meetings, leaving insufficient time for direct reports. Audit the manager's meeting obligations and delegate or remove where possible.",
      priority: 'high',
      category: 'manager',
      trigger: `Manager Support Gap score ${score} — manager meeting load elevated`,
    },
    {
      actionId: 'manager_async_response_availability',
      title: 'Improve Manager Async Availability',
      description:
        'Manager response latency is elevated. Even when synchronous time is limited, timely async responses maintain team trust and unblock work.',
      priority: 'medium',
      category: 'manager',
      trigger: `Manager Support Gap score ${score} — manager response latency elevated`,
    },
  ];
}

// ── Trigger Set 5: Collaboration Withdrawal ────────────────────────────────────

function collaborationWithdrawalRecommendations(score) {
  const priority = score >= T_URGENT ? 'urgent' : 'high';
  return [
    {
      actionId: 'collab_diagnose_isolation',
      title: 'Investigate Causes of Declining Collaboration',
      description:
        'Unique collaborator counts and cross-team interaction are falling. This may reflect workload pressure, process friction, or early disengagement. A structured team conversation can surface root causes.',
      priority,
      category: 'collaboration',
      trigger: `Collaboration Withdrawal score ${score} — unique collaborators per person declining`,
    },
    {
      actionId: 'collab_reinforce_public_channels',
      title: 'Reinforce Use of Public Channels for Team Communication',
      description:
        'Encourage work-relevant conversations to happen in shared, searchable channels rather than direct messages. This restores visibility and reduces isolation.',
      priority: 'medium',
      category: 'collaboration',
      trigger: `Collaboration Withdrawal score ${score} — public channel ratio declining`,
    },
    {
      actionId: 'collab_cross_team_rituals',
      title: 'Introduce or Reinstate Cross-Team Interaction Rituals',
      description:
        'Low cross-team interaction can be addressed with lightweight, optional rituals (e.g. cross-team showcases, async updates to adjacent teams) to rebuild connection without adding meeting overhead.',
      priority: 'medium',
      category: 'collaboration',
      trigger: `Collaboration Withdrawal score ${score} — cross-team interaction ratio low`,
    },
  ];
}

// ── Compound Cross-Signal Rules ────────────────────────────────────────────────

function compoundRules(subscores, patterns) {
  const actions = [];
  const patternTypes = new Set(patterns.map((p) => p.patternType));

  // Hidden Strain compound: recovery + responsiveness without visible meeting load
  if (patternTypes.has('hidden_strain')) {
    actions.push({
      actionId: 'compound_hidden_strain_surface',
      title: 'Surface Hidden Async Strain to Leadership',
      description:
        'Work pressure is arriving through async channels and is invisible in meeting data. This pattern is frequently missed in standard workload reviews. Escalate for leadership visibility.',
      priority: 'high',
      category: 'recovery',
      trigger: 'Hidden Strain pattern detected — async pressure not visible in calendar signals',
    });
  }

  // Quiet Withdrawal compound: collaboration dropping without obvious stressor
  if (patternTypes.has('quiet_withdrawal')) {
    actions.push({
      actionId: 'compound_quiet_withdrawal_engagement',
      title: 'Run a Pulse Survey or Stay Conversation',
      description:
        'Quiet Withdrawal is an early disengagement signal. A brief, anonymous pulse survey or structured stay conversation can identify whether this reflects workload, team dynamics, or external factors.',
      priority: 'high',
      category: 'collaboration',
      trigger:
        'Quiet Withdrawal pattern detected — collaborative disengagement without overt strain signals',
    });
  }

  // Engagement Theatre compound: high volume + low reciprocity
  if (patternTypes.has('engagement_theatre')) {
    actions.push({
      actionId: 'compound_engagement_theatre_quality',
      title: 'Shift Focus from Communication Volume to Communication Quality',
      description:
        'High message and meeting volume is not generating reciprocal engagement. Introduce conversation quality norms — structured agendas, explicit asks, and thread-reply expectations — to make communication more bilateral.',
      priority: 'medium',
      category: 'collaboration',
      trigger: 'Engagement Theatre pattern detected — high activity with low reciprocity',
    });
  }

  // Recovery Debt + Focus Erosion both critical
  if (subscores.recoveryDebt >= T_URGENT && subscores.focusErosion >= T_URGENT) {
    actions.push({
      actionId: 'compound_burnout_risk_escalation',
      title: 'Escalate: Compound Burnout Risk Indicators Present',
      description:
        'Both Recovery Debt and Focus Erosion are in the critical range simultaneously. This combination represents a high risk of team burnout. Immediate workload review and leadership escalation is recommended.',
      priority: 'urgent',
      category: 'recovery',
      trigger: `Recovery Debt ${subscores.recoveryDebt} + Focus Erosion ${subscores.focusErosion} — both critical`,
    });
  }

  // Manager Bottleneck: high coordination friction + high manager support gap
  if (subscores.coordinationFriction >= T_HIGH && subscores.managerSupportGap >= T_HIGH) {
    actions.push({
      actionId: 'compound_manager_bottleneck_delegation',
      title: 'Delegate Coordination Responsibilities Away from Manager',
      description:
        'The manager is simultaneously carrying high coordination load and showing insufficient support capacity for the team. Redistributing coordination ownership (tech leads, process owners) can free manager capacity for people leadership.',
      priority: 'high',
      category: 'manager',
      trigger: `Coordination Friction ${subscores.coordinationFriction} + Manager Support Gap ${subscores.managerSupportGap} — manager bottleneck compound`,
    });
  }

  return actions;
}

// ── Deduplication ──────────────────────────────────────────────────────────────

function deduplicateByPriority(actions) {
  const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2 };
  const seen = new Map();

  for (const action of actions) {
    const existing = seen.get(action.actionId);
    if (!existing || PRIORITY_ORDER[action.priority] < PRIORITY_ORDER[existing.priority]) {
      seen.set(action.actionId, action);
    }
  }

  return Array.from(seen.values());
}
