/**
 * Signal Templates - Implementation-ready specifications
 * 
 * Constants and configuration for all 6 signal types:
 * - Recovery Gap Index (RGI)
 * - Focus Fragmentation Score (FFS)
 * - Meeting Load Drift (MLD)
 * - Responsiveness Pressure Index (RPI)
 * - Engagement Asymmetry Signal (EAS)
 * - Signal Convergence Detector (SCD)
 */

// ========== SHARED CONSTANTS ==========

export const BASELINE_WEEKS = 6;  // Baseline window: last 6 full weeks after calibration
export const SUSTAIN_WEEKS_RISK = 2;  // Sustained deviation for RISK severity
export const SUSTAIN_WEEKS_CRITICAL = 3;  // Sustained deviation for CRITICAL severity

// Working hours (configurable per org/team)
export const WORKDAY_START = '09:00';
export const WORKDAY_END = '18:00';

// Minimum data requirements
export const MIN_GROUP_SIZE = 8;  // Privacy threshold
export const MIN_DAYS_WITH_DATA = 4;  // Minimum days per week for valid signal
export const MIN_COVERAGE = 0.6;  // Minimum data coverage to avoid redaction

// ========== CONFIDENCE SCORE CALCULATION ==========

/**
 * Calculate confidence score for any signal
 * confidence = clamp01(0.25 * data_coverage + 0.25 * baseline_confidence + 0.25 * sustain_factor + 0.25 * source_quality)
 */
export function calculateConfidence(factors) {
  const {
    dataCoverage = 0,
    baselineConfidence = 0,
    sustainFactor = 0.5,
    sourceQuality = 0.5
  } = factors;
  
  const confidence = 0.25 * dataCoverage + 
                     0.25 * baselineConfidence + 
                     0.25 * sustainFactor + 
                     0.25 * sourceQuality;
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Calculate sustain factor based on sustained weeks and severity
 */
export function calculateSustainFactor(sustainedWeeks, severity) {
  if (severity === 'CRITICAL' && sustainedWeeks >= SUSTAIN_WEEKS_CRITICAL) return 1.0;
  if (severity === 'RISK' && sustainedWeeks >= SUSTAIN_WEEKS_RISK) return 1.0;
  return 0.5;
}

/**
 * Calculate source quality based on available data sources
 */
export function calculateSourceQuality(hasCalendar, hasSlack) {
  if (hasCalendar && hasSlack) return 1.0;
  if (hasCalendar) return 0.7;
  return 0.5;  // Sparse data
}

// ========== ROBUST Z-SCORE CALCULATION ==========

/**
 * Calculate robust z-score using MAD (Median Absolute Deviation)
 * robust_z = (current_value - baseline_median) / (1.4826 * baseline_mad)
 */
export function calculateRobustZScore(currentValue, baselineMedian, baselineMAD) {
  if (!baselineMAD || baselineMAD === 0) return null;
  return (currentValue - baselineMedian) / (1.4826 * baselineMAD);
}

/**
 * Fallback: Calculate standard z-score
 * z = (current_value - baseline_mean) / baseline_std
 */
export function calculateZScore(currentValue, baselineMean, baselineStd) {
  if (!baselineStd || baselineStd === 0) return null;
  return (currentValue - baselineMean) / baselineStd;
}

// ========== SIGNAL TYPE TEMPLATES ==========

export const SIGNAL_TEMPLATES = {
  
  // ========== 1) RECOVERY GAP INDEX (RGI) ==========
  recovery_gap_index: {
    type: 'recovery_gap_index',
    name: 'Recovery Gap Index',
    description: 'Detect shrinking recovery windows (early exhaustion risk)',
    
    // Configuration
    config: {
      RECOVERY_MIN_HOURS: 11,  // Minimum healthy recovery gap
      MIN_DAYS_WITH_DATA: 4     // Minimum days per week required
    },
    
    // Metrics to compute weekly
    metrics: [
      'RGI_mean',                    // Mean recovery gap hours
      'RGI_p10',                     // 10th percentile (worst nights)
      'RGI_subthreshold_days_pct'    // % days with gap < RECOVERY_MIN_HOURS
    ],
    
    // Thresholds for severity escalation
    thresholds: {
      INFO: {
        rules: [
          { metric: 'RGI_mean', condition: 'decrease_pct >= 10', sustained: 1 },
          { metric: 'robust_z', condition: 'value <= -1.0', sustained: 1 }
        ]
      },
      RISK: {
        rules: [
          { 
            metric: 'RGI_mean', 
            condition: 'decrease_pct >= 15 OR robust_z <= -1.5', 
            sustained: 2 
          },
          { 
            metric: 'RGI_subthreshold_days_pct', 
            condition: 'value >= 30', 
            sustained: 2 
          }
        ]
      },
      CRITICAL: {
        rules: [
          { 
            metric: 'RGI_mean', 
            condition: 'decrease_pct >= 20 OR robust_z <= -2.0', 
            sustained: 3 
          },
          { 
            metric: 'RGI_subthreshold_days_pct', 
            condition: 'value >= 50', 
            sustained: 1  // current week only
          }
        ]
      }
    },
    
    // Consequence statements by severity
    consequences: {
      INFO: 'Recovery windows are tightening. Early sign of exhaustion risk if sustained.',
      RISK: 'Sustained recovery loss increases exhaustion risk and reduces cognitive resilience.',
      CRITICAL: 'Recovery time has collapsed. High risk of fatigue-driven errors and disengagement.'
    },
    
    // Time-to-impact estimates (days)
    timeToImpact: {
      INFO: { min: 21, max: 42 },
      RISK: { min: 14, max: 35 },
      CRITICAL: { min: 7, max: 21 }
    },
    
    // Top driver keys
    driverKeys: [
      'after_hours_activity_rate',
      'late_meetings_count',
      'early_meetings_count'
    ],
    
    // Recommended actions with trade-offs
    actions: [
      {
        actionId: 'rgi_action_1',
        title: 'Enforce quiet hours for messages and meetings',
        effort: 'MED',
        expectedEffect: 'Restore recovery windows to healthy baseline',
        tradeOffs: 'May reduce flexibility for async work across timezones'
      },
      {
        actionId: 'rgi_action_2',
        title: 'Remove or shift late recurring meetings',
        effort: 'LOW',
        expectedEffect: 'Immediately reclaim evening recovery time',
        tradeOffs: 'Need to find alternate time slots or reduce meeting frequency'
      },
      {
        actionId: 'rgi_action_3',
        title: 'Introduce protected recovery policy on critical days',
        effort: 'MED',
        expectedEffect: 'Prevent worst-case recovery gaps',
        tradeOffs: 'Requires team discipline and leadership enforcement'
      }
    ]
  },
  
  // ========== 2) FOCUS FRAGMENTATION SCORE (FFS) ==========
  focus_fragmentation: {
    type: 'focus_fragmentation',
    name: 'Focus Fragmentation Score',
    description: 'Detect loss of uninterrupted focus blocks due to meeting density',
    
    config: {
      FOCUS_MIN_MINUTES: 90,  // Minimum duration for a focus block
      BACK_TO_BACK_GAP: 10,   // Gap <= 10 minutes = back-to-back
      CLUSTER_GAP: 30          // Gap >= 30 minutes = separate meeting cluster
    },
    
    metrics: [
      'days_with_focus_block_pct',  // % days with max_focus_block >= 90 min
      'back_to_back_rate',           // back-to-back meetings / total meetings
      'meeting_blocks_avg'           // avg number of meeting clusters per day
    ],
    
    thresholds: {
      INFO: {
        rules: [
          { metric: 'days_with_focus_block_pct', condition: 'drop >= 15pp', sustained: 1 },
          { metric: 'robust_z', condition: 'FFS value >= +1.0', sustained: 1 }
        ]
      },
      RISK: {
        rules: [
          { metric: 'days_with_focus_block_pct', condition: 'drop >= 25pp OR robust_z >= +1.5', sustained: 2 },
          { metric: 'days_with_focus_block_pct', condition: 'value <= 40', sustained: 1 }
        ]
      },
      CRITICAL: {
        rules: [
          { metric: 'days_with_focus_block_pct', condition: 'drop >= 35pp OR robust_z >= +2.0', sustained: 3 },
          { metric: 'days_with_focus_block_pct', condition: 'value <= 20', sustained: 1 }
        ]
      }
    },
    
    consequences: {
      INFO: 'Focus windows are shrinking. Decision quality and throughput often decline next.',
      RISK: 'Sustained fragmentation increases cognitive load and slows execution.',
      CRITICAL: 'Deep work has largely disappeared. Expect delays, rework, and stress escalation.'
    },
    
    timeToImpact: {
      INFO: { min: 14, max: 35 },
      RISK: { min: 7, max: 21 },
      CRITICAL: { min: 3, max: 14 }
    },
    
    driverKeys: [
      'back_to_back_rate',
      'meeting_hours_per_day',
      'recurring_meeting_hours_share'
    ],
    
    actions: [
      {
        actionId: 'ffs_action_1',
        title: 'Introduce two no-meeting blocks per week',
        effort: 'MED',
        expectedEffect: 'Restore protected deep work time',
        tradeOffs: 'Reduces scheduling flexibility; requires team coordination'
      },
      {
        actionId: 'ffs_action_2',
        title: 'Collapse recurring meetings. Remove lowest-value 1–2',
        effort: 'LOW',
        expectedEffect: 'Immediately reduce meeting density',
        tradeOffs: 'May lose some coordination touchpoints; requires async alternatives'
      },
      {
        actionId: 'ffs_action_3',
        title: 'Set meeting default to 25/50 minutes',
        effort: 'LOW',
        expectedEffect: 'Create natural gaps between meetings',
        tradeOffs: 'Some meetings may feel rushed; need disciplined facilitation'
      }
    ]
  },
  
  // ========== 3) MEETING LOAD DRIFT (MLD) ==========
  meeting_load_drift: {
    type: 'meeting_load_drift',
    name: 'Meeting Load Drift',
    description: 'Detect sustained upward drift in meeting load (creeping overload)',
    
    config: {
      DRIFT_WEEKS: 4,           // Window for slope calculation
      ABSOLUTE_THRESHOLD: 2.0    // Hours/user/week absolute minimum drift
    },
    
    metrics: [
      'meeting_hours_per_user',   // Total meeting hours / active users
      'drift_slope'               // Linear regression slope over last 4 weeks
    ],
    
    thresholds: {
      INFO: {
        rules: [
          { metric: 'delta_pct_vs_baseline', condition: 'value >= 10', sustained: 1 },
          { metric: 'drift_slope', condition: 'value >= 0.25', sustained: 1 }
        ]
      },
      RISK: {
        rules: [
          { metric: 'delta_pct_vs_baseline', condition: 'value >= 15 OR drift_slope >= 0.35', sustained: 2 }
        ]
      },
      CRITICAL: {
        rules: [
          { metric: 'delta_pct_vs_baseline', condition: 'value >= 25 OR drift_slope >= 0.5', sustained: 3 }
        ]
      }
    },
    
    consequences: {
      INFO: 'Meeting load is rising. Teams typically lose focus time next.',
      RISK: 'Sustained meeting creep reduces autonomy and increases execution delays.',
      CRITICAL: 'Meeting overload is accelerating. High risk of throughput collapse and fatigue.'
    },
    
    timeToImpact: {
      INFO: { min: 21, max: 42 },
      RISK: { min: 14, max: 35 },
      CRITICAL: { min: 7, max: 21 }
    },
    
    driverKeys: [
      'recurring_meetings_added_count',
      'avg_attendees_increase',
      'meeting_hours_in_large_meetings_share'
    ],
    
    actions: [
      {
        actionId: 'mld_action_1',
        title: 'Remove 1–2 low-impact recurring meetings',
        effort: 'LOW',
        expectedEffect: 'Reverse meeting creep trend',
        tradeOffs: 'May lose some status visibility; need async updates'
      },
      {
        actionId: 'mld_action_2',
        title: 'Cap attendee count. Require agenda for >=8 attendees',
        effort: 'MED',
        expectedEffect: 'Reduce meeting sprawl and improve efficiency',
        tradeOffs: 'Some stakeholders may feel excluded; need clear DRI roles'
      },
      {
        actionId: 'mld_action_3',
        title: 'Convert status meetings to async updates',
        effort: 'MED',
        expectedEffect: 'Reclaim synchronous time for high-value collaboration',
        tradeOffs: 'Requires discipline to read and respond to async updates'
      }
    ]
  },
  
  // ========== 4) RESPONSIVENESS PRESSURE INDEX (RPI) ==========
  responsiveness_pressure: {
    type: 'responsiveness_pressure',
    name: 'Responsiveness Pressure Index',
    description: 'Detect tightening response-time norms (reactivity pressure)',
    
    config: {
      RESPONSE_WINDOW_HOURS: 24,  // Max time to consider a response
      MIN_THREADS: 50,             // Minimum threads per week
      MIN_MESSAGES: 500            // Minimum messages per week
    },
    
    metrics: [
      'median_response_minutes',   // Median time to first reply
      'p25_response_minutes',      // 25th percentile response time
      'IQR_response_minutes'       // Interquartile range (variance)
    ],
    
    thresholds: {
      INFO: {
        rules: [
          { 
            metric: 'median_response_minutes', 
            condition: 'decrease >= 15% AND IQR decrease >= 10%', 
            sustained: 1 
          }
        ]
      },
      RISK: {
        rules: [
          { 
            metric: 'median_response_minutes', 
            condition: 'decrease >= 25% AND IQR decrease >= 20%', 
            sustained: 2 
          }
        ]
      },
      CRITICAL: {
        rules: [
          { 
            metric: 'median_response_minutes', 
            condition: 'decrease >= 35% AND IQR decrease >= 30%', 
            sustained: 3 
          }
        ]
      }
    },
    
    consequences: {
      INFO: 'Response norms are tightening. Early sign of urgency creep.',
      RISK: 'Sustained responsiveness pressure reduces focus and increases stress.',
      CRITICAL: 'High reactivity pressure. Expect burnout risk and shallow decision-making.'
    },
    
    timeToImpact: {
      INFO: { min: 21, max: 42 },
      RISK: { min: 14, max: 35 },
      CRITICAL: { min: 7, max: 21 }
    },
    
    driverKeys: [
      'urgent_channel_share',
      'after_hours_message_share',
      'messages_per_active_user'
    ],
    
    actions: [
      {
        actionId: 'rpi_action_1',
        title: 'Define response-time expectations by channel',
        effort: 'MED',
        expectedEffect: 'Reset norms and reduce reactivity pressure',
        tradeOffs: 'Requires team agreement and consistent enforcement'
      },
      {
        actionId: 'rpi_action_2',
        title: 'Create async update cadence for non-urgent work',
        effort: 'MED',
        expectedEffect: 'Reduce constant context-switching',
        tradeOffs: 'May delay some decisions; need clear urgency thresholds'
      },
      {
        actionId: 'rpi_action_3',
        title: 'Protect focus blocks. Disable notifications during blocks',
        effort: 'HIGH',
        expectedEffect: 'Restore deep work capacity',
        tradeOffs: 'Requires org-wide policy and leadership buy-in'
      }
    ]
  },
  
  // ========== 5) ENGAGEMENT ASYMMETRY SIGNAL (EAS) ==========
  engagement_asymmetry: {
    type: 'engagement_asymmetry',
    name: 'Engagement Asymmetry Signal',
    description: 'Detect participation imbalance as an early disengagement hint',
    
    config: {
      MIN_ACTIVE_USERS: 8,   // Minimum for distribution signals
      MIN_MESSAGES: 500       // Minimum messages per week
    },
    
    metrics: [
      'top20_share',          // Messages from top 20% users / total messages
      'initiators_share',     // Threads started by top 20% / total threads
      'EAS'                   // 0.5 * top20_share + 0.5 * initiators_share
    ],
    
    thresholds: {
      INFO: {
        rules: [
          { metric: 'top20_share', condition: 'increase >= 10pp', sustained: 1 },
          { metric: 'robust_z', condition: 'EAS value >= +1.0', sustained: 1 }
        ]
      },
      RISK: {
        rules: [
          { metric: 'top20_share', condition: 'increase >= 15pp OR robust_z >= +1.5', sustained: 2 }
        ]
      },
      CRITICAL: {
        rules: [
          { metric: 'top20_share', condition: 'increase >= 20pp OR robust_z >= +2.0', sustained: 3 }
        ]
      }
    },
    
    consequences: {
      INFO: 'Participation is concentrating. Watch for uneven collaboration load.',
      RISK: 'Sustained imbalance often precedes disengagement and team friction.',
      CRITICAL: 'Collaboration is carried by a shrinking subset. High risk of burnout for carriers and withdrawal for others.'
    },
    
    timeToImpact: {
      INFO: { min: 21, max: 60 },
      RISK: { min: 14, max: 45 },
      CRITICAL: { min: 7, max: 30 }
    },
    
    driverKeys: [
      'active_users_count_change',
      'threads_started_total_change',
      'messages_total_change'
    ],
    
    actions: [
      {
        actionId: 'eas_action_1',
        title: 'Rotate ownership for recurring meetings and updates',
        effort: 'LOW',
        expectedEffect: 'Distribute participation load more evenly',
        tradeOffs: 'May temporarily reduce efficiency as new owners ramp up'
      },
      {
        actionId: 'eas_action_2',
        title: 'Reduce meeting attendance sprawl. Clarify owners',
        effort: 'MED',
        expectedEffect: 'Reduce passive participation burden',
        tradeOffs: 'Some stakeholders may feel less informed'
      },
      {
        actionId: 'eas_action_3',
        title: 'Audit workload distribution and decision rights',
        effort: 'HIGH',
        expectedEffect: 'Address root cause of imbalance',
        tradeOffs: 'Requires leadership time and potential structural changes'
      }
    ]
  },
  
  // ========== 6) SIGNAL CONVERGENCE DETECTOR (SCD) ==========
  signal_convergence: {
    type: 'signal_convergence',
    name: 'Signal Convergence Detector',
    description: 'Escalate when multiple independent risk signals move together (system-level issue)',
    
    config: {
      // Signal weights for scoring
      signalWeights: {
        recovery_gap_index: 1.2,
        focus_fragmentation: 1.0,
        meeting_load_drift: 0.9,
        responsiveness_pressure: 0.8,
        engagement_asymmetry: 0.7
      },
      // Severity weights
      severityWeights: {
        INFO: 0.5,
        RISK: 1.0,
        CRITICAL: 1.5
      }
    },
    
    metrics: [
      'active_count',      // Number of risk-active signals
      'weighted_score'     // Sum of (signal_weight * severity_weight)
    ],
    
    thresholds: {
      INFO: {
        rules: [
          { metric: 'active_count', condition: 'value >= 2', sustained: 1 }
        ]
      },
      RISK: {
        rules: [
          { metric: 'active_count', condition: 'value >= 3', sustained: 1 },
          { metric: 'weighted_score', condition: 'value >= 3.0', sustained: 1 }
        ]
      },
      CRITICAL: {
        rules: [
          { metric: 'active_count', condition: 'value >= 4', sustained: 1 },
          { metric: 'weighted_score', condition: 'value >= 4.5', sustained: 1 }
        ]
      }
    },
    
    consequences: {
      INFO: 'Multiple stress indicators are shifting together.',
      RISK: 'Converging signals indicate a system-level overload pattern.',
      CRITICAL: 'System-level overload. High likelihood of performance and wellbeing degradation unless structure changes.'
    },
    
    timeToImpact: {
      INFO: { min: 14, max: 35 },
      RISK: { min: 7, max: 21 },
      CRITICAL: { min: 3, max: 14 }
    },
    
    driverKeys: [
      'convergent_signals',  // Array of which signals converged
      'convergence_duration_weeks',
      'highest_severity_signal'
    ],
    
    actions: [
      {
        actionId: 'scd_action_1',
        title: 'Run a meeting reset week (cancel non-critical recurring meetings)',
        effort: 'MED',
        expectedEffect: 'Break overload cycle and create breathing room',
        tradeOffs: 'Short-term coordination gaps; need strong async discipline'
      },
      {
        actionId: 'scd_action_2',
        title: 'Define quiet hours and response norms',
        effort: 'MED',
        expectedEffect: 'Address multiple pressure points simultaneously',
        tradeOffs: 'Requires cross-team alignment and enforcement'
      },
      {
        actionId: 'scd_action_3',
        title: 'Leadership review: priorities, resourcing, decision rights',
        effort: 'HIGH',
        expectedEffect: 'Address systemic root causes',
        tradeOffs: 'Significant time investment; may surface difficult decisions'
      }
    ]
  }
};

// ========== HELPER FUNCTIONS ==========

/**
 * Get signal template by type
 */
export function getSignalTemplate(signalType) {
  return SIGNAL_TEMPLATES[signalType];
}

/**
 * Get consequence text for a signal type and severity
 */
export function getConsequence(signalType, severity) {
  const template = SIGNAL_TEMPLATES[signalType];
  return template?.consequences?.[severity] || '';
}

/**
 * Get time-to-impact for a signal type and severity
 */
export function getTimeToImpact(signalType, severity) {
  const template = SIGNAL_TEMPLATES[signalType];
  return template?.timeToImpact?.[severity] || { min: 14, max: 35 };
}

/**
 * Get recommended actions for a signal type
 */
export function getRecommendedActions(signalType) {
  const template = SIGNAL_TEMPLATES[signalType];
  return template?.actions || [];
}

/**
 * Determine severity based on thresholds and sustained weeks
 */
export function determineSeverity(signalType, metrics, sustainedWeeks) {
  const template = SIGNAL_TEMPLATES[signalType];
  if (!template) return 'INFO';
  
  const { thresholds } = template;
  
  // Check CRITICAL first
  if (sustainedWeeks >= SUSTAIN_WEEKS_CRITICAL) {
    if (checkThresholdRules(thresholds.CRITICAL.rules, metrics, sustainedWeeks)) {
      return 'CRITICAL';
    }
  }
  
  // Then RISK
  if (sustainedWeeks >= SUSTAIN_WEEKS_RISK) {
    if (checkThresholdRules(thresholds.RISK.rules, metrics, sustainedWeeks)) {
      return 'RISK';
    }
  }
  
  // Finally INFO
  if (checkThresholdRules(thresholds.INFO.rules, metrics, sustainedWeeks)) {
    return 'INFO';
  }
  
  return null;  // No threshold met
}

/**
 * Check if any threshold rule is satisfied (helper function)
 */
function checkThresholdRules(rules, metrics, sustainedWeeks) {
  // This is a placeholder - actual implementation would parse conditions
  // and evaluate against provided metrics
  return rules.some(rule => {
    // Parse and evaluate rule.condition against metrics
    // Check if sustainedWeeks meets rule.sustained requirement
    return false;  // TODO: Implement condition parser
  });
}

export default SIGNAL_TEMPLATES;
