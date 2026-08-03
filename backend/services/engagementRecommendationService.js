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
      title: 'Review Outside-Schedule Activity',
      description:
        'Check the direct messaging and email ratios, connector coverage, time zones, deadlines, and on-call context. If the team confirms an unwanted pattern, test a norm that non-urgent messages do not require an outside-schedule response.',
      priority,
      category: 'recovery',
      trigger: `Outside-schedule activity model ${score} — internal review band crossed`,
    },
  ];
}

// ── Trigger Set 2: Focus Erosion ───────────────────────────────────────────────

function focusErosionRecommendations(score) {
  const priority = score >= T_URGENT ? 'urgent' : 'high';
  return [
    {
      actionId: 'focus_protect_deep_work_blocks',
      title: 'Test One Protected Focus Window',
      description:
        'Inspect focus availability, fragmentation, and meeting hours. If the team confirms a problem, test one protected focus window and compare the same direct metrics after two weeks.',
      priority,
      category: 'focus',
      trigger: `Focus-availability model ${score} — internal review band crossed`,
    },
    {
      actionId: 'focus_meeting_audit',
      title: 'Conduct a Meeting Necessity Audit',
      description:
        'Review one recurring meeting for purpose, attendance, and duration. Change it only after checking the direct calendar values and team context.',
      priority: 'high',
      category: 'focus',
      trigger: `Focus-availability model ${score} — review the underlying calendar metrics`,
    },
  ];
}

// ── Trigger Set 3: Coordination Friction ──────────────────────────────────────

function coordinationFrictionRecommendations(score) {
  const priority = score >= T_URGENT ? 'urgent' : 'high';
  return [
    {
      actionId: 'coord_reduce_meeting_size',
      title: 'Review the Largest Coordination Driver',
      description:
        'Identify whether attendee-hours, meeting size, or recurrence moved most. Review one meeting with its owner and measure the same direct value after any change.',
      priority,
      category: 'coordination',
      trigger: `Coordination-metadata model ${score} — internal review band crossed`,
    },
    {
      actionId: 'coord_prune_recurring_meetings',
      title: 'Prune the Recurring Meeting Calendar',
      description:
        'If recurrence is the direct driver, ask the meeting owner whether one series can be shortened, combined, or ended, then compare participant-hours.',
      priority: 'high',
      category: 'coordination',
      trigger: `Coordination-metadata model ${score} — inspect recurrence before acting`,
    },
  ];
}

// ── Trigger Set 4: Manager Support Gap ────────────────────────────────────────

function managerSupportGapRecommendations(score) {
  const priority = score >= T_URGENT ? 'urgent' : 'high';
  return [
    {
      actionId: 'manager_restore_1to1_cadence',
      title: 'Validate Recorded 1:1 Cadence',
      description:
        'First confirm that the calendar integration identifies 1:1 meetings correctly. Then ask the team lead whether the measured change was intentional and restore the agreed cadence only if needed.',
      priority,
      category: 'manager',
      trigger: `Recorded 1:1-time model ${score} — internal review band crossed`,
    },
  ];
}

// ── Trigger Set 5: Collaboration Withdrawal ────────────────────────────────────

function collaborationWithdrawalRecommendations(score) {
  const priority = score >= T_URGENT ? 'urgent' : 'high';
  return [
    {
      actionId: 'collab_diagnose_isolation',
      title: 'Review Collaboration-Metadata Coverage and Context',
      description:
        'Check that relevant channels and accounts are connected, then ask whether the measured change reflects planned work. Use a team conversation or voluntary survey for context the metadata cannot provide.',
      priority,
      category: 'collaboration',
      trigger: `Collaboration-metadata model ${score} — internal review band crossed`,
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
      title: 'Review the after-hours and response-pattern deviation',
      description:
        'Outside-schedule and response metadata moved while meeting-load indicators did not. Validate connector coverage and ask what changed before choosing an action.',
      priority: 'high',
      category: 'recovery',
      trigger: 'Internal co-occurrence rule matched for messaging and calendar metadata',
    });
  }

  // Quiet Withdrawal compound: collaboration dropping without obvious stressor
  if (patternTypes.has('quiet_withdrawal')) {
    actions.push({
      actionId: 'compound_quiet_withdrawal_engagement',
      title: 'Run a Pulse Survey or Stay Conversation',
      description:
        'Collaboration metadata moved below baseline without explaining the cause. A brief, anonymous pulse survey or structured team conversation can add the context that metadata cannot provide.',
      priority: 'high',
      category: 'collaboration',
      trigger: 'Collaboration metadata decline met an internal review rule',
    });
  }

  // Engagement Theatre compound: high volume + low reciprocity
  if (patternTypes.has('engagement_theatre')) {
    actions.push({
      actionId: 'compound_engagement_theatre_quality',
      title: 'Review high activity with low reciprocity',
      description:
        'High message and meeting volume coincides with lower measured reciprocity. Validate whether the metadata captures the relevant channels, then test structured agendas, explicit asks, or clearer thread ownership.',
      priority: 'medium',
      category: 'collaboration',
      trigger: 'Internal co-occurrence rule matched for activity and reciprocity metadata',
    });
  }

  // Recovery Debt + Focus Erosion both critical
  if (subscores.recoveryDebt >= T_URGENT && subscores.focusErosion >= T_URGENT) {
    actions.push({
      actionId: 'compound_recovery_focus_review',
      title: 'Review combined recovery and focus deviations',
      description:
        'Both recovery and focus model dimensions crossed the strong internal review band. Review the direct calendar and after-hours metrics with leadership; the model does not establish burnout or its cause.',
      priority: 'urgent',
      category: 'recovery',
      trigger: `Recovery pattern ${subscores.recoveryDebt} + focus pattern ${subscores.focusErosion} — both above the strong internal review band`,
    });
  }

  // Recorded 1:1 time and coordination metadata both cross internal review bands.
  if (subscores.coordinationFriction >= T_HIGH && subscores.managerSupportGap >= T_HIGH) {
    actions.push({
      actionId: 'compound_manager_bottleneck_delegation',
      title: 'Review Coordination and Recorded 1:1 Time Together',
      description:
        'The two model components moved together. Verify meeting ownership and 1:1 identification, ask the team lead for context, and test one change tied to a direct calendar metric.',
      priority: 'high',
      category: 'manager',
      trigger: `Coordination metadata ${subscores.coordinationFriction} + recorded 1:1 time ${subscores.managerSupportGap} — internal co-occurrence rule`,
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
