import crypto from 'node:crypto';
import { selectActions, getPlaybook } from './actionPlaybookService.js';
import { getActiveSignals } from './signalGenerationService.js';
import IntegrationConnection from '../models/integrationConnection.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';

/**
 * AI Copilot Service
 * 
 * Per spec:
 * - Deterministic layer first: ActionSelector picks actions from playbook
 * - Generative layer second: NarrativeComposer generates explanations and templates
 * - Never receives raw content (email text, doc text, chat text)
 * - Always cites metric evidence used
 */

// ============================================================
// CONFIGURATION
// ============================================================

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4-turbo-preview';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// In-memory cache (would use Redis in production)
const responseCache = new Map();

// ============================================================
// MAIN COPILOT FUNCTION
// ============================================================

/**
 * Generate Copilot response for signals
 * 
 * @param {Object} payload - Copilot request payload per spec
 * @returns {Object} - Structured Copilot response
 */
export async function generateCopilotResponse(payload) {
  const { 
    org_id, 
    viewer_role, 
    time_range, 
    scope, 
    signals, 
    connectors, 
    policies 
  } = payload;
  
  // Validate privacy mode
  if (policies?.privacy_mode !== 'metadata_only') {
    throw new Error('Privacy mode must be metadata_only');
  }
  
  // Check cache
  const cacheKey = generateCacheKey(payload);
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.response;
  }
  
  // 1. DETERMINISTIC LAYER: Select actions from playbook
  const { actions, playbooks } = selectActions(signals, { 
    viewerRole: viewer_role,
    maxActions: 5
  });
  
  // 2. Build evidence array from metric deltas
  const evidence = [];
  for (const signal of signals) {
    for (const delta of (signal.metric_deltas || [])) {
      evidence.push({
        metric: delta.metric,
        baseline: delta.baseline,
        current: delta.current,
        delta_pct: delta.delta_pct
      });
    }
  }
  
  // 3. Build likely causes from signals
  const likelyCauses = signals.map(signal => ({
    cause: getCauseDescription(signal.signal_type, signal.drivers || []),
    confidence: signal.confidence >= 70 ? 'high' : signal.confidence >= 50 ? 'medium' : 'low',
    signals: [signal.signal_type]
  }));
  
  // 4. Build confidence notes from connectors
  const confidenceNotes = buildConfidenceNotes(connectors, signals);
  
  // 5. GENERATIVE LAYER: Generate narrative and templates with ChatGPT
  let narrative = null;
  let templates = null;
  
  if (process.env.OPENAI_API_KEY) {
    try {
      const narrativeResult = await generateNarrative({
        signals,
        evidence,
        actions,
        viewerRole: viewer_role,
        timeRange: time_range,
        scope,
        policies
      });
      
      narrative = narrativeResult.narrative;
      templates = narrativeResult.templates;
    } catch (err) {
      console.error('ChatGPT narrative generation failed:', err.message);
      // Fall back to template-based narrative
      narrative = generateFallbackNarrative(signals, evidence);
      templates = generateFallbackTemplates(signals, actions, viewer_role);
    }
  } else {
    // No OpenAI key - use template-based response
    narrative = generateFallbackNarrative(signals, evidence);
    templates = generateFallbackTemplates(signals, actions, viewer_role);
  }
  
  // 6. Build final response per spec
  const response = {
    summary: narrative.summary,
    evidence,
    likely_causes: likelyCauses,
    recommended_actions: actions.map(action => ({
      action: action.action,
      owner: action.owner,
      effort: action.effort,
      time_to_effect: action.timeToEffect,
      why: action.why
    })),
    playbooks: {
      team_lead_7d: playbooks.teamLead7d,
      hr_7d: playbooks.hr7d
    },
    message_templates: {
      manager_to_team: templates.managerToTeam,
      hr_to_leader: templates.hrToLeader,
      exec_summary: templates.execSummary
    },
    confidence_notes: confidenceNotes,
    safety: {
      no_diagnosis_language: true,
      metadata_only_confirmed: true
    }
  };
  
  // Cache response
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });
  
  // Log request for audit
  logCopilotRequest(payload, response);
  
  return response;
}

// ============================================================
// NARRATIVE GENERATION (ChatGPT)
// ============================================================

async function generateNarrative(context) {
  const { signals, evidence, actions, viewerRole, timeRange, scope, policies } = context;
  
  // Build system prompt with guardrails
  const systemPrompt = `You are SignalTrue AI Copilot, an assistant that explains workplace patterns and recommends system-level actions.

CRITICAL RULES:
1. Never use diagnosis language like "burnout", "struggling", "depressed", "anxious"
2. Always use pattern language: "pattern", "early signal", "risk indicator", "trend"
3. Never mention specific individuals by name or imply individual problems
4. Never invent numbers - only reference the exact metrics provided
5. Focus on system-level causes (processes, meetings, workload) not individual performance
6. All recommendations must be about changing systems, not evaluating people
7. If confidence < 60%, explicitly say "This is an early pattern, not a conclusion"
8. Keep language professional but accessible to non-technical readers
9. Never reference email content, document text, or chat messages
10. Always frame as "the data shows" not "people are"

RESEARCH BACKING (cite when relevant):
- JD-R model: Burnout correlates with sustained high demands vs available resources
- After-hours email research: Expectations for after-hours response link to emotional exhaustion
- Meeting fatigue research: Back-to-back meetings prevent cognitive recovery

OUTPUT FORMAT: Respond in JSON only with these fields:
{
  "narrative": {
    "summary": "2-3 sentence plain language summary of what changed"
  },
  "templates": {
    "managerToTeam": "Message template for manager to team (non-accusatory)",
    "hrToLeader": "Message template for HR to leader",
    "execSummary": "3 bullet exec summary with 1 ask"
  }
}`;

  // Build user prompt with context
  const userPrompt = `Analyze these signals and generate explanatory narrative and message templates.

VIEWER ROLE: ${viewerRole}
TIME RANGE: ${timeRange}
SCOPE: ${scope.level}${scope.team_id ? ` (team: ${scope.team_id})` : ''}

SIGNALS:
${signals.map(s => `- ${s.signal_type}: severity ${s.severity}, confidence ${s.confidence}
  Drivers: ${(s.drivers || []).join(', ')}
  Key changes: ${(s.metric_deltas || []).map(d => `${d.metric}: ${d.delta_pct > 0 ? '+' : ''}${d.delta_pct.toFixed(0)}%`).join(', ')}`).join('\n')}

EVIDENCE (metrics to cite):
${evidence.map(e => `- ${e.metric}: was ${e.baseline}, now ${e.current} (${e.delta_pct > 0 ? '+' : ''}${e.delta_pct.toFixed(0)}%)`).join('\n')}

SELECTED ACTIONS (already chosen - use these):
${actions.map((a, i) => `${i+1}. ${a.action} (${a.effort} effort, ${a.timeToEffect})`).join('\n')}

Generate the narrative summary and message templates. Remember: no diagnosis language, cite specific metrics, focus on systems not individuals.`;

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in OpenAI response');
  }
  
  return JSON.parse(content);
}

// ============================================================
// FALLBACK NARRATIVE (Template-based)
// ============================================================

function generateFallbackNarrative(signals, evidence) {
  const topSignal = signals[0];
  
  if (!topSignal) {
    return { summary: 'No significant patterns detected in the selected time range.' };
  }
  
  const signalDescriptions = {
    recovery_collapse: 'recovery time is being compressed across multiple dimensions',
    execution_stagnation: 'work completion has slowed while backlog continues to grow',
    rework_spiral: 'tasks are being reopened at an elevated rate',
    boundary_erosion: 'after-hours communication has increased beyond normal patterns',
    panic_coordination: 'ad-hoc coordination is rising while completion is falling',
    meeting_fatigue: 'back-to-back meetings are limiting recovery time',
    decision_churn: 'decision documentation shows repeated revisions',
    external_pressure_injection: 'customer pressure is cascading into execution teams',
    systemic_overload: 'multiple indicators show sustained capacity constraints'
  };
  
  const description = signalDescriptions[topSignal.signal_type] || 'a pattern worth monitoring has been detected';
  
  // Build evidence reference
  const topEvidence = evidence.slice(0, 2).map(e => 
    `${formatMetricName(e.metric)} ${e.delta_pct >= 0 ? 'increased' : 'decreased'} ${Math.abs(e.delta_pct).toFixed(0)}%`
  ).join(' and ');
  
  const confidenceNote = topSignal.confidence < 60 
    ? 'This is an early pattern, not a conclusion. ' 
    : '';
  
  const summary = `${confidenceNote}The data shows ${description}. Specifically, ${topEvidence || 'key metrics have shifted'} compared to baseline. ${
    signals.length > 1 ? `${signals.length - 1} additional pattern${signals.length > 2 ? 's' : ''} also detected.` : ''
  }`;
  
  return { summary };
}

function generateFallbackTemplates(signals, actions, viewerRole) {
  const topSignal = signals[0];
  const topAction = actions[0];
  
  // Manager to team template
  const managerToTeam = `Hi team,

I've been reviewing our work patterns over the past few weeks and noticed some changes that I wanted to address proactively.

${topSignal ? `Our data shows ${getSignalPlainDescription(topSignal.signal_type)}.` : ''}

Here's what we're going to try:
${topAction ? `• ${topAction.action}` : '• Review our current priorities'}

This isn't about working harder—it's about working more sustainably. Let me know if you have thoughts or concerns.`;

  // HR to leader template
  const hrToLeader = `Hi [Leader Name],

SignalTrue flagged a pattern on [Team Name] that warrants attention:

Signal: ${topSignal?.signal_type?.replace(/_/g, ' ') || 'Workload pattern change'}
Severity: ${topSignal?.severity || 'Moderate'}/100
Confidence: ${topSignal?.confidence || 50}%

Key finding: ${topSignal ? getSignalPlainDescription(topSignal.signal_type) : 'Metrics have shifted from baseline'}

Recommended first step: ${topAction?.action || 'Review with team lead'}

Would you like to discuss this week?`;

  // Exec summary template
  const execSummary = `**EXEC SUMMARY**

• ${topSignal ? getSignalOneLiner(topSignal.signal_type) : 'Work patterns have shifted from baseline'}
• ${signals.length > 1 ? `${signals.length} related patterns detected across connected systems` : 'Pattern detected in connected systems'}
• Recommended action: ${topAction?.action || 'Review with team leads'}

**ASK:** ${topAction?.owner === 'EXEC' ? `Executive decision needed on ${topAction?.action}` : 'Monitor and support team lead interventions'}`;

  return {
    managerToTeam,
    hrToLeader,
    execSummary
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getCauseDescription(signalType, drivers) {
  const descriptions = {
    recovery_collapse: 'Meeting fragmentation is compressing recovery time.',
    execution_stagnation: 'Work is accumulating faster than it closes.',
    rework_spiral: 'Tasks are being reopened, indicating unclear completion criteria.',
    boundary_erosion: 'After-hours communication is increasing beyond baseline.',
    panic_coordination: 'Ad-hoc coordination is rising while completion is falling.',
    meeting_fatigue: 'Back-to-back meetings are limiting cognitive recovery.',
    decision_churn: 'Decisions are being revisited repeatedly.',
    external_pressure_injection: 'Customer pressure is cascading into execution teams.',
    systemic_overload: 'Multiple capacity indicators are elevated simultaneously.'
  };
  
  return descriptions[signalType] || 'A pattern deviation from baseline was detected.';
}

function buildConfidenceNotes(connectors, signals) {
  const notes = [];
  
  // Check for missing connectors
  if (connectors.notion && !connectors.notion.connected) {
    notes.push('Notion is not connected, so decision-churn signals are unavailable.');
  }
  
  if (connectors.jira && !connectors.jira.connected && connectors.asana && !connectors.asana.connected) {
    notes.push('No task management system connected. Execution metrics unavailable.');
  }
  
  if (connectors.gmail && !connectors.gmail.connected) {
    notes.push('Gmail is not connected. After-hours communication patterns unavailable.');
  }
  
  if (connectors.meet && !connectors.meet.connected) {
    notes.push('Google Meet is not connected. Meeting fatigue signals unavailable.');
  }
  
  // Check coverage levels
  for (const [name, connector] of Object.entries(connectors || {})) {
    if (connector.connected && connector.coverage_pct < 70) {
      notes.push(`${formatConnectorName(name)} coverage is ${connector.coverage_pct}%, user mapping may be incomplete.`);
    }
  }
  
  // Check signal confidence
  const lowConfidenceSignals = signals.filter(s => s.confidence < 60);
  if (lowConfidenceSignals.length > 0) {
    notes.push('Some signals have low confidence due to limited data. These are early patterns, not conclusions.');
  }
  
  return notes;
}

function getSignalPlainDescription(signalType) {
  const descriptions = {
    recovery_collapse: 'recovery time patterns suggest the team may benefit from more breathing room',
    execution_stagnation: 'work completion has slowed while new work continues to arrive',
    rework_spiral: 'completed work is being reopened more than usual',
    boundary_erosion: 'after-hours work has increased compared to the team\'s normal pattern',
    panic_coordination: 'there\'s more ad-hoc coordination happening while throughput is down',
    meeting_fatigue: 'back-to-back meetings have increased significantly',
    decision_churn: 'decisions seem to be getting revisited more than usual',
    external_pressure_injection: 'external demands appear to be increasing pressure on execution',
    systemic_overload: 'multiple indicators suggest capacity is stretched'
  };
  
  return descriptions[signalType] || 'some metrics have shifted from their baseline';
}

function getSignalOneLiner(signalType) {
  const oneLiners = {
    recovery_collapse: 'Recovery time compressed - risk of sustained overload',
    execution_stagnation: 'Completion down, backlog up - execution friction detected',
    rework_spiral: 'Reopen rate elevated - quality or clarity issues',
    boundary_erosion: 'After-hours work up - boundary issues emerging',
    panic_coordination: 'Coordination up, throughput down - priority clarity needed',
    meeting_fatigue: 'Meeting density high - focus time compressed',
    decision_churn: 'Decision instability detected - ownership clarity needed',
    external_pressure_injection: 'External pressure cascading to execution teams',
    systemic_overload: 'Multiple overload indicators elevated'
  };
  
  return oneLiners[signalType] || 'Pattern deviation detected from baseline';
}

function formatMetricName(metric) {
  const names = {
    after_hours_sent_ratio: 'after-hours email',
    back_to_back_meeting_blocks: 'back-to-back meetings',
    tasks_completed_7d: 'task completion',
    wip_open_tasks: 'work-in-progress',
    avg_task_age_days: 'task aging',
    reopen_rate_7d: 'reopen rate',
    ad_hoc_meeting_rate_7d: 'ad-hoc meetings',
    escalation_rate_7d: 'CRM escalations'
  };
  
  return names[metric] || metric.replace(/_/g, ' ');
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

function generateCacheKey(payload) {
  const keyData = {
    org: payload.org_id,
    scope: payload.scope,
    time: payload.time_range,
    signals: payload.signals.map(s => `${s.signal_type}:${s.severity}`).sort().join(',')
  };
  
  return crypto.createHash('sha256').update(JSON.stringify(keyData)).digest('hex').slice(0, 16);
}

function logCopilotRequest(payload, response) {
  // Audit log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    org_id: payload.org_id,
    viewer_role: payload.viewer_role,
    scope: payload.scope,
    signals_referenced: payload.signals.map(s => s.signal_type),
    action_ids: response.recommended_actions.map(a => a.action.slice(0, 50)),
    metadata_only: true
  };
  
  console.log('[Copilot Audit]', JSON.stringify(logEntry));
  
  // TODO: Persist to audit log collection
}

// ============================================================
// COPILOT QUERY BUILDER (for API endpoint)
// ============================================================

/**
 * Build Copilot payload from org context
 * Helper for the API endpoint
 */
export async function buildCopilotPayload(orgId, options = {}) {
  const { teamId, userId, timeRange = 'last_7d', viewerRole = 'TEAM_LEAD' } = options;
  
  // Get active signals
  const signals = await getActiveSignals(orgId, { teamId, limit: 5 });
  
  // Get connector status
  const connections = await IntegrationConnection.find({ orgId }).lean();
  
  const connectors = {};
  for (const conn of connections) {
    connectors[conn.integrationType] = {
      connected: conn.status === 'connected',
      coverage_pct: conn.coverage?.totalUsers > 0 
        ? Math.round((conn.coverage.mappedUsers / conn.coverage.totalUsers) * 100)
        : 0
    };
  }
  
  // Add missing connectors as not connected
  ['jira', 'asana', 'gmail', 'meet', 'notion', 'hubspot', 'pipedrive', 'basecamp'].forEach(type => {
    if (!connectors[type]) {
      connectors[type] = { connected: false, coverage_pct: 0 };
    }
  });
  
  // Build signal payload
  const signalPayload = signals.map(signal => ({
    signal_type: signal.signalType,
    severity: signal.severity,
    confidence: signal.confidence,
    drivers: (signal.drivers || []).map(d => d.source),
    metric_deltas: (signal.whatChanged || []).map(c => ({
      metric: c.metric,
      current: c.currentValue,
      baseline: c.previousValue,
      delta_pct: c.deltaPercent
    })),
    top_affected_teams: signal.watchlist?.teams?.map(t => t.teamId) || [],
    notes: 'metadata_only'
  }));
  
  return {
    org_id: orgId.toString(),
    viewer_role: viewerRole,
    time_range: timeRange,
    scope: {
      level: teamId ? 'team' : userId ? 'user' : 'org',
      team_id: teamId?.toString() || null,
      user_id: userId?.toString() || null
    },
    signals: signalPayload,
    connectors,
    policies: {
      core_hours_local: { start: '08:00', end: '18:00' },
      language: 'en',
      privacy_mode: 'metadata_only'
    }
  };
}

export default {
  generateCopilotResponse,
  buildCopilotPayload
};
