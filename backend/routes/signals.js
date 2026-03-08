import express from 'express';
import Signal from '../models/signal.js';
import Action from '../models/action.js';
import Organization from '../models/organizationModel.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const CONFIDENCE_RANK = {
  Low: 1,
  Medium: 2,
  High: 3
};

const SIGNAL_TYPE_PRESENTATION = {
  'meeting-load-spike': {
    family: 'Capacity Drift',
    businessTitle: 'Meeting load is crowding out productive work',
    businessMetric: 'Meeting load',
    businessDescription: 'Too much of the week is getting absorbed by meetings versus focused work.',
    whatItMeans: 'Teams are spending more time coordinating than executing.'
  },
  'after-hours-creep': {
    family: 'Capacity Drift',
    businessTitle: 'Work is spilling further outside working hours',
    businessMetric: 'After-hours work',
    businessDescription: 'Work patterns are extending later into evenings or outside expected work boundaries.',
    whatItMeans: 'Capacity pressure may be building before people explicitly report overload.'
  },
  'focus-erosion': {
    family: 'Capacity Drift',
    businessTitle: 'Focused work time is getting fragmented',
    businessMetric: 'Focus time',
    businessDescription: 'People have fewer uninterrupted blocks to do deep work.',
    whatItMeans: 'Execution quality can drop when attention is repeatedly split.'
  },
  'recovery-deficit': {
    family: 'Capacity Drift',
    businessTitle: 'Recovery time between workdays is shrinking',
    businessMetric: 'Recovery window',
    businessDescription: 'People appear to have less time to recover between the last signal of one day and the first of the next.',
    whatItMeans: 'Sustained recovery loss often precedes strain, slower decisions, and burnout risk.'
  },
  'context-switching': {
    family: 'Capacity Drift',
    businessTitle: 'Work patterns are becoming more fragmented',
    businessMetric: 'Context switching',
    businessDescription: 'The team is switching more often between tasks, meetings, and communication demands.',
    whatItMeans: 'Higher fragmentation usually means less sustained progress on meaningful work.'
  },
  'network-bottleneck': {
    family: 'Coordination Drift',
    businessTitle: 'Cross-team coordination depends on too few people',
    businessMetric: 'Coordination bottlenecks',
    businessDescription: 'Too much coordination appears to route through a small number of people.',
    whatItMeans: 'This can slow decisions and create fragile points of failure.'
  },
  'handoff-bottleneck': {
    family: 'Coordination Drift',
    businessTitle: 'Handoffs are creating coordination drag',
    businessMetric: 'Handoff quality',
    businessDescription: 'Work seems to be slowing or getting stuck at team or workflow boundaries.',
    whatItMeans: 'Execution friction often rises when ownership and handoffs are unclear.'
  },
  'response-delay-increase': {
    family: 'Coordination Drift',
    businessTitle: 'Responsiveness is slowing down',
    businessMetric: 'Response speed',
    businessDescription: 'Reply and coordination cycles are stretching out relative to the baseline.',
    whatItMeans: 'This can be an early sign of overload, unclear ownership, or collaboration friction.'
  },
  'message-volume-drop': {
    family: 'Cohesion Drift',
    businessTitle: 'Team connection signals are thinning out',
    businessMetric: 'Connection volume',
    businessDescription: 'Lighter collaboration activity may indicate weakening day-to-day connection.',
    whatItMeans: 'This does not prove disengagement, but it can signal weaker team cohesion conditions.'
  },
  'rework-churn': {
    family: 'Coordination Drift',
    businessTitle: 'More work is being revisited or reworked',
    businessMetric: 'Rework pressure',
    businessDescription: 'The team appears to be spending more time redoing work or correcting earlier handoffs.',
    whatItMeans: 'Rework often points to coordination breakdowns, unclear decisions, or overload.'
  },
  'sentiment-decline': {
    family: 'Cohesion Drift',
    businessTitle: 'Team cohesion conditions may be weakening',
    businessMetric: 'Cohesion conditions',
    businessDescription: 'Structural collaboration patterns suggest weaker connection conditions in the team.',
    whatItMeans: 'This should be treated as a directional structural signal, not a direct reading of emotion.'
  },
  // ---- Culture Drift (hybrid belonging) ----
  'meeting-exclusion': {
    family: 'Culture Drift',
    businessTitle: 'Some team members are being left out of meetings',
    businessMetric: 'Meeting inclusion',
    businessDescription: 'One or more people are receiving significantly fewer meeting invitations than the team norm.',
    whatItMeans: 'Exclusion from meetings often means exclusion from decisions and context, especially in hybrid setups.'
  },
  'peripheral-member': {
    family: 'Culture Drift',
    businessTitle: 'A team member is becoming structurally peripheral',
    businessMetric: 'Connection strength',
    businessDescription: 'A person on this team has a shrinking interaction footprint — fewer mentions, less collaboration activity, fewer touch points.',
    whatItMeans: 'Peripheral members often disengage quietly before anyone notices. In hybrid teams this risk is amplified.'
  },
  'hybrid-response-gap': {
    family: 'Culture Drift',
    businessTitle: 'Remote or hybrid members wait longer for responses',
    businessMetric: 'Response equity',
    businessDescription: 'People who work remotely or in hybrid mode are experiencing measurably slower response times from the team.',
    whatItMeans: 'When remote members consistently wait longer, it signals an invisible inclusion gap in the day-to-day workflow.'
  },
  'fading-voice': {
    family: 'Culture Drift',
    businessTitle: 'A team member has declining participation over time',
    businessMetric: 'Voice trend',
    businessDescription: 'Messaging and collaboration activity is trending down relative to that person\'s own baseline.',
    whatItMeans: 'A fading voice is often the earliest metadata signal of disengagement, burnout, or feeling disconnected from the team.'
  }
};

function getConfidenceRank(confidence) {
  return CONFIDENCE_RANK[confidence] || 0;
}

function shouldSuppressSignal(signal) {
  return getConfidenceRank(signal.confidence) < getConfidenceRank('Medium');
}

function summarizeDrivers(drivers = []) {
  return drivers
    .slice(0, 3)
    .map((driver) => ({
      ...driver,
      name: driver.name || driver.metric || 'Key driver'
    }));
}

function shapeSignalForPresentation(signal, { detailed = false } = {}) {
  const presentation = SIGNAL_TYPE_PRESENTATION[signal.signalType] || {};
  const plainSignal = signal.toObject ? signal.toObject() : signal;
  const confidenceRank = getConfidenceRank(plainSignal.confidence);
  const reducedDrivers = summarizeDrivers(plainSignal.drivers);
  const firstAction = plainSignal.recommendedActions?.[0] || null;

  const shaped = {
    ...plainSignal,
    familyLabel: presentation.family || 'Structural Drift',
    metricLabel: presentation.businessMetric || plainSignal.signalType,
    title: presentation.businessTitle || plainSignal.title,
    businessDescription: presentation.businessDescription || plainSignal.title,
    whatItMeans: presentation.whatItMeans || plainSignal.consequence?.statement || null,
    confidenceBehavior: confidenceRank >= 2 ? 'show' : 'suppressed',
    drivers: reducedDrivers,
    recommendedActions: detailed
      ? (plainSignal.recommendedActions || []).slice(0, 3)
      : (firstAction ? [firstAction] : []),
    explanation: presentation.businessDescription || plainSignal.title,
    limitationNote: confidenceRank >= 3
      ? 'This signal is based on strong pattern consistency versus baseline.'
      : 'This signal is shown only when confidence is at least medium. Lower-confidence signals are suppressed to reduce noise.',
    isSuppressed: false
  };

  if (!detailed) {
    delete shaped.answers;
  }

  return shaped;
}

function calculateFamilyScore(signals) {
  if (!signals.length) return 0;
  const weighted = signals.reduce((sum, signal) => {
    const severityWeight = signal.severity === 'Critical' ? 1 : signal.severity === 'Risk' ? 0.7 : 0.4;
    const confidenceWeight = signal.confidence === 'High' ? 1 : signal.confidence === 'Medium' ? 0.8 : 0.5;
    const deviationWeight = Math.min(Math.abs(signal.deviation?.deltaPercent || 0), 100) / 100;
    return sum + (severityWeight * 45 + confidenceWeight * 25 + deviationWeight * 30);
  }, 0);

  return Math.round(weighted / signals.length);
}

function buildTrendSeries(signals) {
  const buckets = new Map();
  const now = new Date();

  for (let i = 3; i >= 0; i -= 1) {
    const start = new Date(now);
    start.setDate(now.getDate() - (i + 1) * 7);
    const label = `W${4 - i}`;
    buckets.set(label, []);
  }

  signals.forEach((signal) => {
    const ageDays = Math.floor((now.getTime() - new Date(signal.firstDetected || signal.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const weekIndex = ageDays < 7 ? 'W4' : ageDays < 14 ? 'W3' : ageDays < 21 ? 'W2' : 'W1';
    if (buckets.has(weekIndex)) {
      buckets.get(weekIndex).push(signal);
    }
  });

  return Array.from(buckets.entries()).map(([label, weekSignals]) => ({
    label,
    score: calculateFamilyScore(weekSignals)
  }));
}

function summarizeConfidence(signals) {
  const high = signals.filter((s) => s.confidence === 'High').length;
  const medium = signals.filter((s) => s.confidence === 'Medium').length;
  const total = signals.length || 1;

  const label = high / total >= 0.6 ? 'High' : (high + medium) / total >= 0.6 ? 'Medium' : 'Low';

  return {
    label,
    reasons: [
      `${high} high-confidence and ${medium} medium-confidence signals are contributing to this family view.`,
      'Scores are based on structural work patterns, not message content.',
      'Low-confidence signals are suppressed from the user-facing view.'
    ]
  };
}

function buildFamilyAggregates(signals) {
  const visibleSignals = signals.filter((signal) => !shouldSuppressSignal(signal));
  const families = ['Capacity Drift', 'Coordination Drift', 'Cohesion Drift', 'Culture Drift'];

  const actionPrompts = {
    'Capacity Drift': 'Protect focus time this week by removing low-value meetings or delaying non-essential work.',
    'Coordination Drift': 'Clarify owners and tighten handoffs on the most blocked workflow before coordination drag spreads.',
    'Cohesion Drift': 'Create a deliberate connection moment this week to restore trust, visibility, and team rhythm.',
    'Culture Drift': 'Check in with anyone who may be drifting to the periphery — especially remote or hybrid members who are losing visibility.'
  };

  const shareMessages = {
    'Capacity Drift': 'Work patterns suggest rising capacity pressure. Protecting focus and recovery this week is the fastest way to reduce execution drag.',
    'Coordination Drift': 'Coordination patterns suggest handoffs and decision flow are slowing execution. Simplifying owners and escalation paths this week should help.',
    'Cohesion Drift': 'Collaboration patterns suggest team connection is thinning. A small reset in team rituals and visibility this week can stabilize cohesion.',
    'Culture Drift': 'Structural patterns suggest some team members may be losing connection and inclusion — especially in hybrid or remote setups. Small, deliberate inclusion actions this week can reverse the trend.'
  };

  return families.map((familyName) => {
    const familySignals = visibleSignals.filter((signal) => {
      const presentation = SIGNAL_TYPE_PRESENTATION[signal.signalType] || {};
      return presentation.family === familyName;
    });

    const trend = buildTrendSeries(familySignals);
    const confidence = summarizeConfidence(familySignals);
    const topSignals = familySignals
      .sort((a, b) => getConfidenceRank(b.confidence) - getConfidenceRank(a.confidence))
      .slice(0, 3)
      .map((signal) => shapeSignalForPresentation(signal));

    const descriptions = {
      'Capacity Drift': 'Overload, meeting pressure, and shrinking recovery capacity.',
      'Coordination Drift': 'Handoffs, response loops, and coordination bottlenecks across the system.',
      'Cohesion Drift': 'Connection conditions that affect collaboration resilience and team cohesion.',
      'Culture Drift': 'Inclusion gaps, peripheral members, and belonging conditions — especially in hybrid and remote teams.'
    };

    return {
      familyName,
      score: calculateFamilyScore(familySignals),
      description: descriptions[familyName],
      topSignals,
      confidence,
      trend,
      actionPrompt: actionPrompts[familyName],
      shareMessage: shareMessages[familyName]
    };
  });
}

/**
 * GET /api/signals/org/:orgId
 * Get all signals for an organization with filtering
 */
router.get('/org/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { severity, status, teamId } = req.query;
    
    // Check if org is in calibration - if so, don't show signals
    const org = await Organization.findById(orgId);
    if (org?.calibration?.isInCalibration) {
      return res.json({
        message: 'Signals will be available after calibration is complete',
        signals: [],
        inCalibration: true
      });
    }
    
    const filter = { orgId };
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (teamId) filter.teamId = teamId;
    
    const signals = await Signal.find(filter)
      .populate('teamId', 'name')
      .populate('owner', 'name email')
      .sort({ severity: -1, firstDetected: -1 }); // Critical first, then by date

    const visibleSignals = signals
      .filter((signal) => !shouldSuppressSignal(signal))
      .map((signal) => shapeSignalForPresentation(signal));

    const suppressedCount = signals.length - visibleSignals.length;

    res.json({
      signals: visibleSignals,
      displayPolicy: {
        reducedMetricSurface: true,
        suppressLowConfidenceSignals: true,
        businessLanguageEnabled: true,
        hiddenLowConfidenceCount: suppressedCount
      }
    });
  } catch (err) {
    console.error('Error fetching signals:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/signals/team/:teamId
 * Get all signals for a specific team
 */
router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status } = req.query;
    
    const filter = { teamId };
    if (status) filter.status = status;
    
    const signals = await Signal.find(filter)
      .populate('owner', 'name email')
      .sort({ severity: -1, firstDetected: -1 });

    const visibleSignals = signals
      .filter((signal) => !shouldSuppressSignal(signal))
      .map((signal) => shapeSignalForPresentation(signal));

    res.json({ signals: visibleSignals });
  } catch (err) {
    console.error('Error fetching team signals:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/signals/:id
 * Get a specific signal with full details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const signal = await Signal.findById(req.params.id)
      .populate('teamId', 'name')
      .populate('orgId', 'name')
      .populate('owner', 'name email');
    
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    
    // Get associated actions
    const actions = await Action.find({ signalId: signal._id })
      .populate('owner', 'name email')
      .sort({ createdDate: -1 });

    if (shouldSuppressSignal(signal)) {
      return res.status(404).json({
        message: 'Signal not available because confidence is too low to present safely.'
      });
    }

    res.json({ signal: shapeSignalForPresentation(signal, { detailed: true }), actions });
  } catch (err) {
    console.error('Error fetching signal:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/signals
 * Create a new signal (typically called by signal generation service)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const signalData = req.body;
    
    // Check if org is in calibration
    const org = await Organization.findById(signalData.orgId);
    if (org?.calibration?.isInCalibration) {
      return res.status(403).json({ 
        message: 'Signals cannot be created during calibration period' 
      });
    }
    
    const signal = await Signal.create(signalData);
    res.status(201).json({ signal });
  } catch (err) {
    console.error('Error creating signal:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * PUT /api/signals/:id
 * Update a signal (status, owner, etc.)
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, owner, dueDate, selectedAction, actionStartDate } = req.body;
    
    const signal = await Signal.findById(req.params.id);
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    
    if (status) signal.status = status;
    if (owner) signal.owner = owner;
    if (dueDate) signal.dueDate = dueDate;
    if (selectedAction) {
      signal.selectedAction = selectedAction;
      signal.actionStartDate = actionStartDate || new Date();
    }
    
    // Track status changes
    if (status === 'Resolved') {
      signal.resolvedAt = new Date();
    } else if (status === 'Ignored') {
      signal.ignoredAt = new Date();
      if (req.body.ignoredReason) {
        signal.ignoredReason = req.body.ignoredReason;
      }
    }
    
    await signal.save();
    
    res.json({ signal });
  } catch (err) {
    console.error('Error updating signal:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/signals/:id/outcome
 * Record outcome for a resolved signal
 */
router.post('/:id/outcome', authenticateToken, async (req, res) => {
  try {
    const { rating, timeToNormalization, notes } = req.body;
    
    const signal = await Signal.findById(req.params.id);
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    
    signal.outcome = {
      rating,
      timeToNormalization,
      notes,
      recordedAt: new Date()
    };
    
    await signal.save();
    
    res.json({ signal });
  } catch (err) {
    console.error('Error recording outcome:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/signals/org/:orgId/ignored
 * Get all ignored signals for visibility
 */
router.get('/org/:orgId/ignored', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const ignoredSignals = await Signal.find({ 
      orgId, 
      status: 'Ignored' 
    })
      .populate('teamId', 'name')
      .populate('owner', 'name email')
      .sort({ ignoredAt: -1 });
    
    res.json({ ignoredSignals });
  } catch (err) {
    console.error('Error fetching ignored signals:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/signals/org/:orgId/summary
 * Get signal summary for weekly digest
 */
router.get('/org/:orgId/summary', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Check if in calibration
    const org = await Organization.findById(orgId);
    if (org?.calibration?.isInCalibration) {
      return res.json({
        message: 'Signal summary will be available after calibration',
        inCalibration: true
      });
    }
    
    // Get critical signals
    const criticalSignals = await Signal.find({ 
      orgId, 
      severity: 'Critical',
      status: { $in: ['Open', 'Acknowledged'] }
    })
      .populate('teamId', 'name')
      .limit(3)
      .sort({ firstDetected: -1 });
    
    // Get ignored signals
    const ignoredCount = await Signal.countDocuments({ 
      orgId, 
      status: 'Ignored' 
    });
    
    // Get new signals this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newSignalsThisWeek = await Signal.countDocuments({
      orgId,
      firstDetected: { $gte: oneWeekAgo }
    });
    
    // Get top recommended actions
    const openSignals = await Signal.find({
      orgId,
      status: { $in: ['Open', 'Acknowledged'] }
    })
      .sort({ severity: -1 })
      .limit(5);

    const visibleCriticalSignals = criticalSignals
      .filter((signal) => !shouldSuppressSignal(signal))
      .map((signal) => shapeSignalForPresentation(signal));

    const recommendedActions = openSignals
      .filter((signal) => !shouldSuppressSignal(signal))
      .filter(s => s.recommendedActions && s.recommendedActions.length > 0)
      .map(s => ({
        signalId: s._id,
        signalTitle: (SIGNAL_TYPE_PRESENTATION[s.signalType]?.businessTitle) || s.title,
        severity: s.severity,
        action: s.recommendedActions[0] // First recommended action
      }));
    
    res.json({
      criticalSignals: visibleCriticalSignals,
      ignoredCount,
      newSignalsThisWeek,
      recommendedActions: recommendedActions.slice(0, 3),
      familySummaries: buildFamilyAggregates(openSignals)
    });
  } catch (err) {
    console.error('Error fetching signal summary:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/signals/org/:orgId/families
 * Return backend-driven structural drift family aggregates with historical trend data.
 */
router.get('/org/:orgId/families', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;

    const signals = await Signal.find({ orgId })
      .populate('teamId', 'name')
      .populate('owner', 'name email')
      .sort({ firstDetected: -1, createdAt: -1 });

    const families = buildFamilyAggregates(signals);

    res.json({
      families,
      generatedAt: new Date().toISOString(),
      coverage: {
        visibleSignals: signals.filter((signal) => !shouldSuppressSignal(signal)).length,
        hiddenLowConfidenceSignals: signals.filter((signal) => shouldSuppressSignal(signal)).length,
        measurementScope: 'metadata-only'
      }
    });
  } catch (err) {
    console.error('Error fetching signal family aggregates:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/signals/team/:teamId/families
 * Return team-scoped structural drift family aggregates with historical trend data.
 */
router.get('/team/:teamId/families', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const signals = await Signal.find({ teamId })
      .populate('teamId', 'name')
      .populate('owner', 'name email')
      .sort({ firstDetected: -1, createdAt: -1 });

    const families = buildFamilyAggregates(signals);

    res.json({
      families,
      generatedAt: new Date().toISOString(),
      coverage: {
        visibleSignals: signals.filter((signal) => !shouldSuppressSignal(signal)).length,
        hiddenLowConfidenceSignals: signals.filter((signal) => shouldSuppressSignal(signal)).length,
        measurementScope: 'metadata-only',
        scope: 'team'
      }
    });
  } catch (err) {
    console.error('Error fetching team signal family aggregates:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/signals/org/:orgId/weekly-digest
 * Build & optionally send a weekly digest email with family-level drift summary.
 *
 * Body (all optional):
 *   recipientEmail – override; falls back to requesting user's email
 *   sendEmail      – boolean; when false (default) returns JSON only
 *
 * Response shape (email-ready JSON):
 *   { orgName, generatedAt, healthState, families[], topRisks[], recommendedActions[], digestHtml }
 */
router.post('/org/:orgId/weekly-digest', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { recipientEmail, sendEmail } = req.body;

    // --- Org context ---
    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    if (org?.calibration?.isInCalibration) {
      return res.json({ message: 'Digest will be available after calibration', inCalibration: true });
    }

    // --- Signals & families ---
    const signals = await Signal.find({ orgId })
      .populate('teamId', 'name')
      .populate('owner', 'name email')
      .sort({ firstDetected: -1, createdAt: -1 });

    const families = buildFamilyAggregates(signals);

    // --- Derive health state from highest family score ---
    const maxScore = Math.max(...families.map(f => f.score), 0);
    const healthState = maxScore >= 70 ? 'Critical' : maxScore >= 50 ? 'Elevated' : maxScore >= 30 ? 'Watch' : 'Stable';

    // --- Top risks: critical / elevated open signals (max 3) ---
    const topRisks = signals
      .filter(s => !shouldSuppressSignal(s) && ['Critical', 'Elevated'].includes(s.severity) && ['Open', 'Acknowledged'].includes(s.status))
      .slice(0, 3)
      .map(s => shapeSignalForPresentation(s));

    // --- Recommended actions (max 3) ---
    const recommendedActions = signals
      .filter(s => !shouldSuppressSignal(s) && s.recommendedActions?.length)
      .sort((a, b) => getConfidenceRank(b.confidence) - getConfidenceRank(a.confidence))
      .slice(0, 3)
      .map(s => ({
        signalTitle: SIGNAL_TYPE_PRESENTATION[s.signalType]?.businessTitle || s.title,
        action: s.recommendedActions[0],
        family: SIGNAL_TYPE_PRESENTATION[s.signalType]?.family || 'General'
      }));

    // --- Build digest HTML ---
    const familyRows = families.map(f => {
      const trend = f.trend || [];
      const first = trend[0]?.score ?? 0;
      const last = trend[trend.length - 1]?.score ?? f.score;
      const delta = last - first;
      const deltaLabel = delta > 0 ? `+${delta} pts` : delta < 0 ? `${delta} pts` : 'no change';
      const sev = f.score >= 70 ? 'Critical' : f.score >= 50 ? 'Elevated' : f.score >= 30 ? 'Moderate' : 'Low';
      const sevColor = f.score >= 70 ? '#ef4444' : f.score >= 50 ? '#fb923c' : f.score >= 30 ? '#fbbf24' : '#34d399';
      return `
        <tr>
          <td style="padding:12px 16px;font-weight:600">${f.familyName}</td>
          <td style="padding:12px 16px;text-align:center">
            <span style="display:inline-block;padding:2px 10px;border-radius:12px;background:${sevColor}20;color:${sevColor};font-weight:700;font-size:13px">${f.score}</span>
          </td>
          <td style="padding:12px 16px;text-align:center;color:${delta > 0 ? '#ef4444' : delta < 0 ? '#22c55e' : '#94a3b8'};font-weight:600">${deltaLabel}</td>
          <td style="padding:12px 16px;text-align:center;font-size:12px;color:#64748b">${sev}</td>
        </tr>`;
    }).join('');

    const riskRows = topRisks.map(r => `
      <tr>
        <td style="padding:8px 16px;font-weight:500">${r.title}</td>
        <td style="padding:8px 16px;color:#64748b;font-size:13px">${r.familyLabel || ''}</td>
      </tr>`).join('');

    const actionRows = recommendedActions.map(a => `
      <tr>
        <td style="padding:8px 16px;font-weight:500">${a.action}</td>
        <td style="padding:8px 16px;color:#64748b;font-size:13px">${a.family}</td>
      </tr>`).join('');

    const digestHtml = `
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:40px auto;background:#0f172a;border-radius:16px;overflow:hidden;color:#e2e8f0">
    <div style="padding:32px 24px;text-align:center;border-bottom:1px solid #1e293b">
      <h1 style="margin:0;font-size:22px;color:white">SignalTrue Weekly Digest</h1>
      <p style="margin:8px 0 0;font-size:13px;color:#94a3b8">${org.name} · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
    </div>

    <div style="padding:24px;text-align:center">
      <span style="display:inline-block;padding:6px 20px;border-radius:20px;font-weight:700;font-size:14px;
        background:${healthState === 'Critical' ? '#ef444420' : healthState === 'Elevated' ? '#fb923c20' : healthState === 'Watch' ? '#fbbf2420' : '#34d39920'};
        color:${healthState === 'Critical' ? '#ef4444' : healthState === 'Elevated' ? '#fb923c' : healthState === 'Watch' ? '#fbbf24' : '#34d399'}">
        Org Health: ${healthState}
      </span>
    </div>

    <div style="padding:0 24px 24px">
      <h2 style="font-size:15px;margin:0 0 12px;color:white">Drift Families</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#cbd5e1;background:#1e293b;border-radius:8px;overflow:hidden">
        <thead><tr style="border-bottom:1px solid #334155">
          <th style="padding:10px 16px;text-align:left;font-weight:600;color:#94a3b8;font-size:12px">Family</th>
          <th style="padding:10px 16px;text-align:center;font-weight:600;color:#94a3b8;font-size:12px">Score</th>
          <th style="padding:10px 16px;text-align:center;font-weight:600;color:#94a3b8;font-size:12px">Δ Week</th>
          <th style="padding:10px 16px;text-align:center;font-weight:600;color:#94a3b8;font-size:12px">Level</th>
        </tr></thead>
        <tbody>${familyRows}</tbody>
      </table>
    </div>

    ${topRisks.length ? `
    <div style="padding:0 24px 24px">
      <h2 style="font-size:15px;margin:0 0 12px;color:white">Top Risks</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#cbd5e1;background:#1e293b;border-radius:8px;overflow:hidden">
        <tbody>${riskRows}</tbody>
      </table>
    </div>` : ''}

    ${recommendedActions.length ? `
    <div style="padding:0 24px 24px">
      <h2 style="font-size:15px;margin:0 0 12px;color:white">Recommended Actions</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#cbd5e1;background:#1e293b;border-radius:8px;overflow:hidden">
        <tbody>${actionRows}</tbody>
      </table>
    </div>` : ''}

    <div style="padding:24px;text-align:center;border-top:1px solid #1e293b">
      <a href="${process.env.FRONTEND_URL || 'https://app.signaltrue.ai'}/app/overview" style="display:inline-block;padding:10px 28px;background:#3b82f6;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">View Dashboard →</a>
      <p style="margin:16px 0 0;font-size:11px;color:#475569">This is an automated summary from SignalTrue. No individual-level data is included.</p>
    </div>
  </div>
</body></html>`;

    // --- Optionally send via Resend ---
    let emailResult = null;
    if (sendEmail) {
      if (!process.env.RESEND_API_KEY) {
        return res.status(500).json({ message: 'Email not configured. Set RESEND_API_KEY in environment.' });
      }
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const to = recipientEmail || req.user?.email;
      if (!to) return res.status(400).json({ message: 'No recipient email provided' });

      emailResult = await resend.emails.send({
        from: 'SignalTrue <digest@signaltrue.ai>',
        to,
        subject: `📊 SignalTrue Weekly Digest — ${org.name} — ${healthState}`,
        html: digestHtml
      });
    }

    res.json({
      orgName: org.name,
      generatedAt: new Date().toISOString(),
      healthState,
      families: families.map(f => {
        const trend = f.trend || [];
        const first = trend[0]?.score ?? 0;
        const last = trend[trend.length - 1]?.score ?? f.score;
        const delta = last - first;
        return {
          familyName: f.familyName,
          score: f.score,
          delta,
          severity: f.score >= 70 ? 'Critical' : f.score >= 50 ? 'Elevated' : f.score >= 30 ? 'Moderate' : 'Low',
          actionPrompt: f.actionPrompt
        };
      }),
      topRisks,
      recommendedActions,
      digestHtml,
      emailSent: !!emailResult,
      emailResult: emailResult || undefined
    });
  } catch (err) {
    console.error('Error building weekly digest:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
