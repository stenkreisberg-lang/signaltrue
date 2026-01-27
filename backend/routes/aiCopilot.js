import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { generateCopilotResponse, buildCopilotPayload } from '../services/aiCopilotService.js';
import { selectActions, getPlaybook, getAllPlaybooks } from '../services/actionPlaybookService.js';
import { getActiveSignals } from '../services/signalGenerationService.js';

const router = express.Router();

// ============================================================
// AI COPILOT API ROUTES
// Per spec: POST /ai/copilot
// ============================================================

/**
 * POST /api/ai/copilot
 * 
 * Main Copilot endpoint
 * Generates explanations, actions, playbooks, and templates
 */
router.post('/copilot', authenticateToken, async (req, res) => {
  try {
    const { orgId, userId } = req.user;
    
    // Accept either full payload or simple request
    let payload;
    
    if (req.body.signals && req.body.connectors) {
      // Full payload provided per spec
      payload = {
        ...req.body,
        org_id: orgId?.toString() // Ensure org_id matches authenticated user
      };
      
      // Validate privacy mode
      if (payload.policies?.privacy_mode !== 'metadata_only') {
        return res.status(400).json({ 
          error: 'Invalid privacy mode',
          message: 'privacy_mode must be "metadata_only"' 
        });
      }
    } else {
      // Simple request - build payload from context
      const { teamId, timeRange, viewerRole } = req.body;
      
      // Determine viewer role from user role if not provided
      const role = viewerRole || mapUserRole(req.user.role);
      
      payload = await buildCopilotPayload(orgId, {
        teamId,
        timeRange: timeRange || 'last_7d',
        viewerRole: role
      });
    }
    
    // Validate we have signals to analyze
    if (!payload.signals || payload.signals.length === 0) {
      return res.json({
        summary: 'No significant patterns detected in the selected time range.',
        evidence: [],
        likely_causes: [],
        recommended_actions: [],
        playbooks: { team_lead_7d: [], hr_7d: [] },
        message_templates: {
          manager_to_team: null,
          hr_to_leader: null,
          exec_summary: null
        },
        confidence_notes: ['No signals to analyze. This may indicate healthy patterns or insufficient data.'],
        safety: {
          no_diagnosis_language: true,
          metadata_only_confirmed: true
        }
      });
    }
    
    // Generate Copilot response
    const response = await generateCopilotResponse(payload);
    
    res.json(response);
    
  } catch (err) {
    console.error('Copilot error:', err);
    res.status(500).json({ 
      error: 'Copilot error',
      message: err.message 
    });
  }
});

/**
 * POST /api/ai/copilot/explain
 * 
 * Explain a specific signal
 * Input: signal payload
 * Output: 5-8 sentence explanation + "what changed" bullets
 */
router.post('/copilot/explain', authenticateToken, async (req, res) => {
  try {
    const { signal } = req.body;
    
    if (!signal || !signal.signal_type) {
      return res.status(400).json({ message: 'Signal object required' });
    }
    
    const playbook = getPlaybook(signal.signal_type);
    
    // Build explanation from signal data
    const explanation = buildExplanation(signal, playbook);
    
    res.json({
      signal_type: signal.signal_type,
      severity: signal.severity,
      confidence: signal.confidence,
      explanation: explanation.text,
      what_changed: explanation.whatChanged,
      research_backing: explanation.researchBacking,
      safety: {
        no_diagnosis_language: true,
        metadata_only_confirmed: true
      }
    });
    
  } catch (err) {
    console.error('Explain error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/ai/copilot/actions
 * 
 * Get recommended actions for signals
 * Output: 3-7 actions with effort, owner, why
 */
router.post('/copilot/actions', authenticateToken, async (req, res) => {
  try {
    const { signals, viewerRole } = req.body;
    
    if (!signals || !Array.isArray(signals)) {
      return res.status(400).json({ message: 'Signals array required' });
    }
    
    const role = viewerRole || mapUserRole(req.user.role);
    
    const { actions, playbooks } = selectActions(signals, {
      viewerRole: role,
      maxActions: 7
    });
    
    res.json({
      recommended_actions: actions.map(action => ({
        action: action.action,
        owner: action.owner,
        effort: action.effort,
        time_to_effect: action.timeToEffect,
        why: action.why,
        expected_impact: action.expectedImpact,
        signal_type: action.signalType
      })),
      playbooks: {
        team_lead_7d: playbooks.teamLead7d,
        hr_7d: playbooks.hr7d
      }
    });
    
  } catch (err) {
    console.error('Actions error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/ai/copilot/playbooks
 * 
 * Get all available playbooks (for admin viewing/editing)
 */
router.get('/copilot/playbooks', authenticateToken, async (req, res) => {
  try {
    // Only admins can view all playbooks
    if (!['admin', 'hr_admin', 'master_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const playbooks = getAllPlaybooks();
    
    res.json({
      playbooks: Object.entries(playbooks).map(([signalType, playbook]) => ({
        signal_type: signalType,
        priority: playbook.priority,
        actions_count: playbook.actions.length,
        actions: playbook.actions,
        team_lead_checklist: playbook.teamLeadPlaybook,
        hr_checklist: playbook.hrPlaybook
      }))
    });
    
  } catch (err) {
    console.error('Playbooks error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/ai/copilot/playbook/:signalType
 * 
 * Get playbook for a specific signal type
 */
router.get('/copilot/playbook/:signalType', authenticateToken, async (req, res) => {
  try {
    const { signalType } = req.params;
    
    const playbook = getPlaybook(signalType);
    
    res.json({
      signal_type: signalType,
      priority: playbook.priority,
      actions: playbook.actions,
      team_lead_7d: playbook.teamLeadPlaybook,
      hr_7d: playbook.hrPlaybook
    });
    
  } catch (err) {
    console.error('Playbook error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/ai/copilot/templates
 * 
 * Generate message templates for signals
 */
router.post('/copilot/templates', authenticateToken, async (req, res) => {
  try {
    const { signals, viewerRole, templateType } = req.body;
    
    if (!signals || !Array.isArray(signals)) {
      return res.status(400).json({ message: 'Signals array required' });
    }
    
    const role = viewerRole || mapUserRole(req.user.role);
    
    // Build full payload and generate response
    const payload = {
      org_id: req.user.orgId?.toString(),
      viewer_role: role,
      time_range: 'last_7d',
      scope: { level: 'team', team_id: null, user_id: null },
      signals,
      connectors: {},
      policies: {
        core_hours_local: { start: '08:00', end: '18:00' },
        language: 'en',
        privacy_mode: 'metadata_only'
      }
    };
    
    const response = await generateCopilotResponse(payload);
    
    // Return only templates if specific type requested
    if (templateType) {
      const templateMap = {
        manager: response.message_templates.manager_to_team,
        hr: response.message_templates.hr_to_leader,
        exec: response.message_templates.exec_summary
      };
      
      return res.json({
        template_type: templateType,
        template: templateMap[templateType] || null
      });
    }
    
    res.json({
      message_templates: response.message_templates
    });
    
  } catch (err) {
    console.error('Templates error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/ai/copilot/what-to-measure
 * 
 * Suggest missing integrations or coverage improvements
 */
router.post('/copilot/what-to-measure', authenticateToken, async (req, res) => {
  try {
    const { connectors } = req.body;
    
    const recommendations = [];
    
    // Check for missing critical integrations
    if (!connectors?.jira?.connected && !connectors?.asana?.connected) {
      recommendations.push({
        category: 'task_management',
        recommendation: 'Connect Jira or Asana to enable execution metrics (completion rate, WIP, cycle time)',
        impact: 'high',
        signals_enabled: ['execution_stagnation', 'rework_spiral', 'wip_overload']
      });
    }
    
    if (!connectors?.gmail?.connected) {
      recommendations.push({
        category: 'communication',
        recommendation: 'Connect Gmail to enable after-hours and response time patterns',
        impact: 'high',
        signals_enabled: ['boundary_erosion', 'response_drift']
      });
    }
    
    if (!connectors?.meet?.connected) {
      recommendations.push({
        category: 'meetings',
        recommendation: 'Connect Google Meet/Calendar to enable meeting fatigue detection',
        impact: 'high',
        signals_enabled: ['meeting_fatigue', 'panic_coordination', 'recovery_collapse']
      });
    }
    
    if (!connectors?.notion?.connected) {
      recommendations.push({
        category: 'documentation',
        recommendation: 'Connect Notion to enable decision churn detection',
        impact: 'medium',
        signals_enabled: ['decision_churn', 'documentation_decay']
      });
    }
    
    if (!connectors?.hubspot?.connected && !connectors?.pipedrive?.connected) {
      recommendations.push({
        category: 'crm',
        recommendation: 'Connect HubSpot or Pipedrive to detect external pressure injection',
        impact: 'medium',
        signals_enabled: ['external_pressure_injection', 'escalation_cascade']
      });
    }
    
    // Check for low coverage
    for (const [name, connector] of Object.entries(connectors || {})) {
      if (connector.connected && connector.coverage_pct < 70) {
        recommendations.push({
          category: 'coverage',
          recommendation: `Improve ${formatConnectorName(name)} user mapping (currently ${connector.coverage_pct}%)`,
          impact: 'medium',
          action: 'Review unmapped users in integration settings'
        });
      }
    }
    
    res.json({
      recommendations,
      current_data_quality: calculateDataQuality(connectors),
      fully_enabled_signals: getEnabledSignals(connectors)
    });
    
  } catch (err) {
    console.error('What to measure error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/ai/copilot/feedback
 * 
 * Store feedback on Copilot output
 */
router.post('/copilot/feedback', authenticateToken, async (req, res) => {
  try {
    const { signal_type, helpful, wrong_assumption, notes } = req.body;
    
    // Log feedback
    console.log('[Copilot Feedback]', {
      timestamp: new Date().toISOString(),
      org_id: req.user.orgId,
      user_id: req.user.userId,
      signal_type,
      helpful,
      wrong_assumption,
      notes
    });
    
    // TODO: Persist to feedback collection for model improvement
    
    res.json({ message: 'Feedback recorded. Thank you!' });
    
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/ai/copilot/explainability
 * 
 * AI Explainability modal content
 */
router.get('/copilot/explainability', authenticateToken, async (req, res) => {
  try {
    res.json({
      title: 'How SignalTrue AI Copilot Works',
      sections: [
        {
          heading: 'What Data We Use',
          content: 'SignalTrue analyzes metadata only—timestamps, counts, and patterns. We never read email content, document text, or chat messages.'
        },
        {
          heading: 'How We Detect Signals',
          content: 'We compare current metrics against your organization\'s own baseline (trailing 28 days). When patterns deviate significantly, we flag them as signals.'
        },
        {
          heading: 'How We Calculate Severity',
          content: 'Severity (0-100) is based on how far metrics have deviated from baseline using robust statistical methods that resist outliers.'
        },
        {
          heading: 'How We Calculate Confidence',
          content: 'Confidence reflects data quality: which integrations are connected, user mapping coverage, and whether multiple sources agree.'
        },
        {
          heading: 'How Actions Are Selected',
          content: 'Actions come from a research-backed playbook, not AI generation. The AI only helps explain patterns in plain language.'
        },
        {
          heading: 'Research Backing',
          content: 'Our signals are grounded in the Job Demands-Resources (JD-R) model, after-hours email research, and meeting fatigue studies.'
        }
      ],
      privacy_badge: 'Metadata only. No message content read.',
      compliance_note: 'SignalTrue is designed for ISO/IEC 42001 alignment (AI management standard).'
    });
    
  } catch (err) {
    console.error('Explainability error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function mapUserRole(role) {
  const roleMap = {
    'admin': 'TEAM_LEAD',
    'hr_admin': 'HR_ADMIN',
    'master_admin': 'EXEC',
    'team_member': 'TEAM_LEAD',
    'viewer': 'TEAM_LEAD'
  };
  
  return roleMap[role] || 'TEAM_LEAD';
}

function buildExplanation(signal, playbook) {
  const researchBacking = {
    recovery_collapse: 'Based on meeting fatigue research showing that transition time between meetings is crucial for cognitive recovery.',
    execution_stagnation: 'Based on the JD-R model which links sustained high demands with accumulating work to exhaustion.',
    rework_spiral: 'Based on quality research showing rework creates demand without adding value.',
    boundary_erosion: 'Based on research linking after-hours email expectations to emotional exhaustion.',
    meeting_fatigue: 'Based on virtual meeting fatigue research highlighting recovery needs.',
    decision_churn: 'Based on decision fatigue research showing repeated deliberation drains cognitive resources.'
  };
  
  const confidenceNote = signal.confidence < 60 
    ? 'This is an early pattern, not a conclusion. ' 
    : '';
  
  const text = `${confidenceNote}${playbook.actions[0]?.why || 'A pattern deviation was detected.'} ${
    signal.metric_deltas?.length > 0 
      ? `Specifically, ${signal.metric_deltas[0].metric} changed by ${signal.metric_deltas[0].delta_pct > 0 ? '+' : ''}${signal.metric_deltas[0].delta_pct}% compared to baseline.`
      : ''
  }`;
  
  const whatChanged = (signal.metric_deltas || []).map(d => ({
    metric: d.metric,
    change: `${d.delta_pct > 0 ? 'Increased' : 'Decreased'} ${Math.abs(d.delta_pct)}%`,
    from: d.baseline,
    to: d.current
  }));
  
  return {
    text,
    whatChanged,
    researchBacking: researchBacking[signal.signal_type] || null
  };
}

function formatConnectorName(name) {
  const names = {
    jira: 'Jira',
    asana: 'Asana',
    gmail: 'Gmail',
    meet: 'Google Meet',
    notion: 'Notion',
    hubspot: 'HubSpot',
    pipedrive: 'Pipedrive',
    basecamp: 'Basecamp'
  };
  
  return names[name] || name;
}

function calculateDataQuality(connectors) {
  if (!connectors) return 0;
  
  let score = 0;
  const weights = {
    jira: 20, asana: 20,
    gmail: 25,
    meet: 20,
    notion: 10,
    hubspot: 10, pipedrive: 10,
    basecamp: 5
  };
  
  for (const [name, connector] of Object.entries(connectors)) {
    if (connector.connected) {
      const weight = weights[name] || 5;
      const coverage = connector.coverage_pct || 50;
      score += weight * (coverage / 100);
    }
  }
  
  return Math.min(100, Math.round(score));
}

function getEnabledSignals(connectors) {
  const signals = [];
  
  if (connectors?.jira?.connected || connectors?.asana?.connected) {
    signals.push('execution_stagnation', 'rework_spiral', 'wip_overload', 'overcommitment_risk');
  }
  
  if (connectors?.gmail?.connected) {
    signals.push('boundary_erosion', 'response_drift');
  }
  
  if (connectors?.meet?.connected) {
    signals.push('meeting_fatigue', 'panic_coordination');
  }
  
  if (connectors?.notion?.connected) {
    signals.push('decision_churn', 'documentation_decay', 'cognitive_overload');
  }
  
  if (connectors?.hubspot?.connected || connectors?.pipedrive?.connected) {
    signals.push('external_pressure_injection', 'escalation_cascade', 'handoff_spike');
  }
  
  // Composite signals require multiple sources
  if (signals.length >= 3) {
    signals.push('recovery_collapse', 'work_aging_pressure', 'systemic_overload');
  }
  
  return [...new Set(signals)];
}

export default router;
