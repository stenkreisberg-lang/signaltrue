import express from 'express';
import IntegrationConnection from '../models/integrationConnection.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import CategoryKingSignal from '../models/categoryKingSignal.js';
import WorkEvent from '../models/workEvent.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================================
// INTEGRATION DASHBOARD API
// ============================================================

/**
 * GET /api/integration-dashboard/status
 * Returns consolidated status for all integrations per spec:
 * - Status: Connected / Error / Needs admin
 * - Scope summary: "metadata only"
 * - Last sync timestamp
 * - Coverage: "X users mapped / Y total"
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.user;
    
    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID required' });
    }
    
    // Get all integration connections for this org
    const connections = await IntegrationConnection.find({ orgId }).lean();
    
    // Build response for all integration types
    const integrationTypes = [
      { type: 'jira', name: 'Jira', category: 'Project Management' },
      { type: 'asana', name: 'Asana', category: 'Project Management' },
      { type: 'gmail', name: 'Gmail', category: 'Communication' },
      { type: 'meet', name: 'Google Meet', category: 'Meetings' },
      { type: 'notion', name: 'Notion', category: 'Documentation' },
      { type: 'hubspot', name: 'HubSpot', category: 'CRM' },
      { type: 'pipedrive', name: 'Pipedrive', category: 'CRM' },
      { type: 'basecamp', name: 'Basecamp', category: 'Project Management' }
    ];
    
    const integrations = integrationTypes.map(({ type, name, category }) => {
      const conn = connections.find(c => c.integrationType === type);
      
      // Check if this integration is available (env vars configured)
      const available = isIntegrationAvailable(type);
      
      if (!conn || conn.status === 'disconnected') {
        return {
          type,
          name,
          category,
          available,
          status: 'disconnected',
          statusMessage: null,
          scopeSummary: 'metadata only',
          lastSync: null,
          coverage: { mapped: 0, total: 0, percent: 0 },
          connectedAt: null,
          whatWeMeasure: getWhatWeMeasure(type)
        };
      }
      
      return {
        type,
        name,
        category,
        available,
        status: conn.status,
        statusMessage: conn.statusMessage,
        scopeSummary: conn.measurementScope || 'metadata only',
        lastSync: conn.sync?.lastSuccessfulSyncAt || conn.sync?.lastSyncAt,
        lastSyncStatus: conn.sync?.lastSyncStatus,
        coverage: {
          mapped: conn.coverage?.mappedUsers || 0,
          total: conn.coverage?.totalUsers || 0,
          percent: conn.coverage?.totalUsers > 0 
            ? Math.round((conn.coverage.mappedUsers / conn.coverage.totalUsers) * 100)
            : 0
        },
        connectedAt: conn.connectedAt,
        backfillProgress: conn.sync?.backfillProgress || 0,
        backfillComplete: conn.sync?.backfillComplete || false,
        whatWeMeasure: getWhatWeMeasure(type)
      };
    });
    
    // Calculate overall data coverage
    const connectedCount = connections.filter(c => c.status === 'connected').length;
    const overallCoverage = {
      connectedIntegrations: connectedCount,
      totalIntegrations: integrationTypes.length,
      dataQualityScore: calculateDataQualityScore(connections)
    };
    
    res.json({
      integrations,
      overallCoverage,
      oauthBaseUrl: '/api/integrations'
    });
    
  } catch (err) {
    console.error('Integration dashboard status error:', err);
    res.status(500).json({ message: 'Failed to fetch integration status' });
  }
});

/**
 * GET /api/integration-dashboard/data-dictionary
 * Admin "Data Dictionary" page showing exactly stored fields per connector
 */
router.get('/data-dictionary', authenticateToken, async (req, res) => {
  try {
    const dictionary = {
      jira: {
        name: 'Jira',
        eventTypes: [
          'task_created', 'task_status_changed', 'task_assigned', 
          'task_comment_added', 'task_reopened', 'task_due_date_changed', 'task_priority_changed'
        ],
        metadataFields: [
          { field: 'issueId', description: 'Jira issue ID (internal)' },
          { field: 'issueKey', description: 'Jira issue key (e.g., PROJ-123)' },
          { field: 'projectId', description: 'Project identifier' },
          { field: 'issueType', description: 'Type (Bug, Story, Task, etc.)' },
          { field: 'priority', description: 'Priority level' },
          { field: 'statusCurrent', description: 'Current status' },
          { field: 'statusPrevious', description: 'Previous status (for transitions)' },
          { field: 'reopenCount', description: 'Number of times task was reopened' },
          { field: 'commentCountDelta', description: 'Number of new comments (count only)' },
          { field: 'cycleTimeStartedAt', description: 'When work started (for cycle time)' },
          { field: 'cycleTimeCompletedAt', description: 'When work completed' }
        ],
        notStored: ['Issue summary/title', 'Description text', 'Comment content', 'Attachment content']
      },
      asana: {
        name: 'Asana',
        eventTypes: [
          'task_created', 'task_completed', 'task_assigned', 
          'task_due_date_changed', 'task_moved_sections', 'task_reopened', 'comment_added'
        ],
        metadataFields: [
          { field: 'taskId', description: 'Asana task ID' },
          { field: 'projectId', description: 'Project identifier' },
          { field: 'dueOn', description: 'Due date' },
          { field: 'sectionName', description: 'Section/column name (for status)' },
          { field: 'reopenCount', description: 'Number of times task was reopened' },
          { field: 'commentCountDelta', description: 'Number of new comments (count only)' }
        ],
        notStored: ['Task name', 'Task description', 'Comment content', 'Attachment content']
      },
      gmail: {
        name: 'Gmail',
        eventTypes: ['email_sent', 'email_received'],
        metadataFields: [
          { field: 'messageIdHash', description: 'Hashed message ID (for deduplication)' },
          { field: 'threadIdHash', description: 'Hashed thread ID (for grouping)' },
          { field: 'timestamp', description: 'When email was sent/received' },
          { field: 'toCount', description: 'Number of recipients (count only)' },
          { field: 'ccCount', description: 'Number of CC recipients (count only)' },
          { field: 'isExternal', description: 'Whether any recipient is outside domain' },
          { field: 'isAfterHours', description: 'Whether sent outside core hours' },
          { field: 'replyLatencySeconds', description: 'Time to reply (derived from thread)' }
        ],
        notStored: ['Email subject', 'Email body', 'Recipient email addresses', 'Attachment content']
      },
      meet: {
        name: 'Google Meet',
        eventTypes: ['meet_started', 'meet_ended', 'meet_participant_joined'],
        metadataFields: [
          { field: 'meetingIdHash', description: 'Hashed meeting ID' },
          { field: 'startTime', description: 'Meeting start time' },
          { field: 'endTime', description: 'Meeting end time' },
          { field: 'durationMinutes', description: 'Meeting duration in minutes' },
          { field: 'participantCountPeak', description: 'Peak number of participants' },
          { field: 'isExternalParticipant', description: 'Whether external guests attended' },
          { field: 'isAdHoc', description: 'Whether meeting was ad-hoc vs scheduled' }
        ],
        notStored: ['Meeting title', 'Meeting description', 'Participant names', 'Recording content']
      },
      notion: {
        name: 'Notion',
        eventTypes: ['page_created', 'page_updated', 'comment_added', 'database_updated', 'page_shared'],
        metadataFields: [
          { field: 'pageIdHash', description: 'Hashed page ID' },
          { field: 'parentDbId', description: 'Parent database ID (if in DB)' },
          { field: 'collaboratorCount', description: 'Number of collaborators' },
          { field: 'editChurn', description: 'Edit frequency without closure' },
          { field: 'timestamp', description: 'When page was created/updated' }
        ],
        notStored: ['Page title', 'Page content', 'Comment text', 'Rich text content']
      },
      hubspot: {
        name: 'HubSpot',
        eventTypes: ['deal_created', 'deal_stage_changed', 'deal_close_date_changed', 'ticket_created'],
        metadataFields: [
          { field: 'dealIdHash', description: 'Hashed deal ID' },
          { field: 'stage', description: 'Current deal stage' },
          { field: 'stagePrevious', description: 'Previous deal stage' },
          { field: 'stageChangeCount', description: 'Number of stage changes' },
          { field: 'closeDateCurrent', description: 'Current expected close date' },
          { field: 'closeDatePrevious', description: 'Previous expected close date' },
          { field: 'amount', description: 'Deal amount (optional, configurable)' }
        ],
        notStored: ['Deal name', 'Contact names', 'Company names', 'Notes content', 'Email content']
      },
      pipedrive: {
        name: 'Pipedrive',
        eventTypes: ['deal_created', 'deal_stage_changed', 'deal_close_date_changed', 'activity_created'],
        metadataFields: [
          { field: 'dealIdHash', description: 'Hashed deal ID' },
          { field: 'stage', description: 'Current deal stage' },
          { field: 'stagePrevious', description: 'Previous deal stage' },
          { field: 'stageChangeCount', description: 'Number of stage changes' },
          { field: 'activityType', description: 'Activity type (call/meeting/email)' }
        ],
        notStored: ['Deal title', 'Person names', 'Organization names', 'Notes content']
      },
      basecamp: {
        name: 'Basecamp',
        eventTypes: ['post_created', 'todo_created', 'todo_completed', 'checkin_response', 'comment_added'],
        metadataFields: [
          { field: 'postIdHash', description: 'Hashed post ID' },
          { field: 'todoIdHash', description: 'Hashed to-do ID' },
          { field: 'responseGapSeconds', description: 'Time to first response' },
          { field: 'timestamp', description: 'When event occurred' }
        ],
        notStored: ['Post title', 'Post content', 'To-do title', 'Comment content', 'Check-in answers']
      }
    };
    
    res.json({
      privacyStatement: 'SignalTrue stores only metadata. We never store email bodies, document content, message text, or any sensitive content.',
      dictionary
    });
    
  } catch (err) {
    console.error('Data dictionary error:', err);
    res.status(500).json({ message: 'Failed to fetch data dictionary' });
  }
});

/**
 * GET /api/integration-dashboard/signals
 * Returns Category-King signals with severity, confidence, and recommendations
 */
router.get('/signals', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.user;
    const { teamId, status = 'active', limit = 20 } = req.query;
    
    const query = { orgId, status };
    if (teamId) query.teamId = teamId;
    
    const signals = await CategoryKingSignal.find(query)
      .sort({ severity: -1, confidence: -1 })
      .limit(parseInt(limit))
      .lean();
    
    // Format signals for dashboard display
    const formattedSignals = signals.map(signal => ({
      id: signal._id,
      type: signal.signalType,
      category: signal.signalCategory,
      title: signal.title,
      severity: signal.severity,
      severityLevel: signal.severityLevel,
      confidence: signal.confidence,
      explanation: signal.explanation,
      whatChanged: signal.whatChanged,
      drivers: signal.drivers,
      recommendedActions: signal.recommendedActions,
      watchlist: signal.watchlist,
      sources: signal.sources,
      status: signal.status,
      trendDays: signal.trendDays,
      isSustained: signal.isSustained,
      firstDetectedAt: signal.firstDetectedAt,
      researchBacking: signal.researchBacking
    }));
    
    res.json({ signals: formattedSignals });
    
  } catch (err) {
    console.error('Signals fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch signals' });
  }
});

/**
 * GET /api/integration-dashboard/metrics
 * Returns Category-King composite metrics (CVIR, RCI, WAP, PIS)
 */
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.user;
    const { teamId, days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const query = { orgId, date: { $gte: startDate } };
    if (teamId) query.teamId = teamId;
    
    const metrics = await IntegrationMetricsDaily.find(query)
      .sort({ date: -1 })
      .limit(parseInt(days))
      .lean();
    
    // Calculate summary metrics
    const latestMetrics = metrics[0] || {};
    
    res.json({
      categoryKingMetrics: {
        cvir: {
          value: latestMetrics.cvir || 0,
          trend7d: latestMetrics.cvirTrend7d || 0,
          description: 'Completion vs Interruption Ratio',
          interpretation: getCVIRInterpretation(latestMetrics.cvir, latestMetrics.cvirTrend7d)
        },
        rci: {
          value: latestMetrics.rci || 0,
          components: latestMetrics.rciComponents || {},
          description: 'Recovery Collapse Index',
          interpretation: getRCIInterpretation(latestMetrics.rci)
        },
        wap: {
          value: latestMetrics.wap || 0,
          components: latestMetrics.wapComponents || {},
          description: 'Work Aging Pressure',
          interpretation: getWAPInterpretation(latestMetrics.wap)
        },
        pis: {
          value: latestMetrics.pis || 0,
          components: latestMetrics.pisComponents || {},
          description: 'Pressure Injection Score',
          interpretation: getPISInterpretation(latestMetrics.pis)
        }
      },
      taskMetrics: {
        wipOpenTasks: latestMetrics.wipOpenTasks || 0,
        wipGrowth7d: latestMetrics.wipGrowth7d || 0,
        avgTaskAgeDays: latestMetrics.avgTaskAgeDays || 0,
        tasksCompleted7d: latestMetrics.tasksCompleted7d || 0,
        completionChange7d: latestMetrics.completionChange7d || 0,
        reopenRate7d: latestMetrics.reopenRate7d || 0,
        cycleTimeMedianDays: latestMetrics.cycleTimeMedianDays || 0
      },
      communicationMetrics: {
        afterHoursSentRatio: latestMetrics.afterHoursSentRatio || 0,
        afterHoursDrift: latestMetrics.afterHoursDrift || 0,
        replyLatencyDrift: latestMetrics.replyLatencyDrift || 0,
        emailSent7d: latestMetrics.emailSent7d || 0
      },
      meetingMetrics: {
        meetingDurationTotalHours7d: latestMetrics.meetingDurationTotalHours7d || 0,
        adHocMeetingRate7d: latestMetrics.adHocMeetingRate7d || 0,
        backToBackMeetingBlocks: latestMetrics.backToBackMeetingBlocks || 0,
        meetingFragmentationIndex: latestMetrics.meetingFragmentationIndex || 0
      },
      crmMetrics: {
        escalationRate7d: latestMetrics.escalationRate7d || 0,
        closeDateSlipRate7d: latestMetrics.closeDateSlipRate7d || 0,
        handoffSpike48h: latestMetrics.handoffSpike48h || 0
      },
      confidence: latestMetrics.confidence || 0,
      sources: latestMetrics.sources || [],
      date: latestMetrics.date
    });
    
  } catch (err) {
    console.error('Metrics fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch metrics' });
  }
});

/**
 * POST /api/integration-dashboard/signals/:id/acknowledge
 */
router.post('/signals/:id/acknowledge', authenticateToken, async (req, res) => {
  try {
    const signal = await CategoryKingSignal.findByIdAndUpdate(
      req.params.id,
      {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user.userId
      },
      { new: true }
    );
    
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    
    res.json({ signal });
  } catch (err) {
    console.error('Signal acknowledge error:', err);
    res.status(500).json({ message: 'Failed to acknowledge signal' });
  }
});

/**
 * POST /api/integration-dashboard/signals/:id/dismiss
 */
router.post('/signals/:id/dismiss', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const signal = await CategoryKingSignal.findByIdAndUpdate(
      req.params.id,
      {
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissedBy: req.user.userId,
        dismissedReason: reason
      },
      { new: true }
    );
    
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    
    res.json({ signal });
  } catch (err) {
    console.error('Signal dismiss error:', err);
    res.status(500).json({ message: 'Failed to dismiss signal' });
  }
});

/**
 * GET /api/integration-dashboard/sync-history
 * Returns sync history for integrations
 */
router.get('/sync-history', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.user;
    const { type, limit = 10 } = req.query;
    
    const query = { orgId };
    if (type) query.integrationType = type;
    
    const connections = await IntegrationConnection.find(query)
      .select('integrationType sync status statusMessage')
      .lean();
    
    res.json({ connections });
    
  } catch (err) {
    console.error('Sync history error:', err);
    res.status(500).json({ message: 'Failed to fetch sync history' });
  }
});

/**
 * POST /api/integration-dashboard/:type/sync
 * Trigger manual sync for an integration
 */
router.post('/:type/sync', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { orgId } = req.user;
    
    const connection = await IntegrationConnection.findOne({ 
      orgId, 
      integrationType: type,
      status: 'connected'
    });
    
    if (!connection) {
      return res.status(404).json({ message: 'Integration not connected' });
    }
    
    // Mark sync as in progress
    connection.sync.lastSyncAt = new Date();
    connection.sync.lastSyncStatus = 'in_progress';
    await connection.save();
    
    // TODO: Trigger actual sync in background
    // For now, return success
    res.json({ 
      message: 'Sync initiated',
      status: 'in_progress'
    });
    
  } catch (err) {
    console.error('Manual sync error:', err);
    res.status(500).json({ message: 'Failed to initiate sync' });
  }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function isIntegrationAvailable(type) {
  const envVars = {
    jira: 'JIRA_CLIENT_ID',
    asana: 'ASANA_CLIENT_ID',
    gmail: 'GOOGLE_CLIENT_ID',
    meet: 'GOOGLE_CLIENT_ID',
    notion: 'NOTION_CLIENT_ID',
    hubspot: 'HUBSPOT_CLIENT_ID',
    pipedrive: 'PIPEDRIVE_CLIENT_ID',
    basecamp: 'BASECAMP_CLIENT_ID'
  };
  
  return !!process.env[envVars[type]];
}

function getWhatWeMeasure(type) {
  const measures = {
    jira: [
      'Task completion rates and cycle time',
      'Work-in-progress saturation',
      'Task aging and overdue patterns',
      'Reopen/rework frequency'
    ],
    asana: [
      'Task completion and aging',
      'Overdue task accumulation',
      'Assignment churn patterns',
      'Section/status flow efficiency'
    ],
    gmail: [
      'After-hours email patterns',
      'Response time trends',
      'Email volume changes',
      'Thread complexity indicators'
    ],
    meet: [
      'Meeting duration and frequency',
      'Ad-hoc vs scheduled meeting ratio',
      'Back-to-back meeting pressure',
      'Meeting fragmentation patterns'
    ],
    notion: [
      'Documentation edit frequency',
      'Page collaboration patterns',
      'Decision closure indicators',
      'Orphaned page detection'
    ],
    hubspot: [
      'Deal stage change velocity',
      'Close date slip patterns',
      'Ticket escalation rates',
      'Handoff to execution correlation'
    ],
    pipedrive: [
      'Deal progression patterns',
      'Stage change frequency',
      'Activity volume trends',
      'Pipeline pressure indicators'
    ],
    basecamp: [
      'Post engagement patterns',
      'To-do completion rates',
      'Response gap trends',
      'Check-in participation'
    ]
  };
  
  return measures[type] || [];
}

function calculateDataQualityScore(connections) {
  const connected = connections.filter(c => c.status === 'connected');
  if (connected.length === 0) return 0;
  
  let score = 0;
  
  // Points for connected integrations
  score += connected.length * 10;
  
  // Points for successful syncs
  const successfulSyncs = connected.filter(c => c.sync?.lastSyncStatus === 'success').length;
  score += successfulSyncs * 5;
  
  // Points for user coverage
  const avgCoverage = connected.reduce((acc, c) => {
    return acc + (c.coverage?.mappedUsers || 0) / Math.max(c.coverage?.totalUsers || 1, 1);
  }, 0) / connected.length;
  score += avgCoverage * 20;
  
  return Math.min(Math.round(score), 100);
}

function getCVIRInterpretation(value, trend) {
  if (!value) return 'Insufficient data';
  
  if (value < 0.5) {
    return 'Low completion ratio - work is accumulating faster than completing';
  } else if (value < 1.0) {
    return 'Moderate completion ratio - interruptions may be impacting delivery';
  } else {
    return 'Healthy completion ratio - work is completing at a sustainable pace';
  }
}

function getRCIInterpretation(value) {
  if (!value) return 'Insufficient data';
  
  if (value >= 70) {
    return 'Critical: Recovery time is severely compromised. Risk of burnout is elevated.';
  } else if (value >= 50) {
    return 'Elevated: Recovery gaps are narrowing. Monitor for sustained patterns.';
  } else if (value >= 30) {
    return 'Moderate: Some recovery pressure detected but within manageable range.';
  } else {
    return 'Healthy: Adequate recovery time between high-demand periods.';
  }
}

function getWAPInterpretation(value) {
  if (!value) return 'Insufficient data';
  
  if (value >= 70) {
    return 'Critical: Work backlog is aging rapidly. Chronic pressure is building.';
  } else if (value >= 50) {
    return 'Elevated: Task aging is accelerating. May indicate capacity constraints.';
  } else if (value >= 30) {
    return 'Moderate: Some work aging detected but manageable.';
  } else {
    return 'Healthy: Work is flowing through at sustainable pace.';
  }
}

function getPISInterpretation(value) {
  if (!value) return 'Insufficient data';
  
  if (value >= 70) {
    return 'Critical: External pressure is cascading into execution overload.';
  } else if (value >= 50) {
    return 'Elevated: Customer/sales pressure is increasing demand on delivery teams.';
  } else if (value >= 30) {
    return 'Moderate: Some external pressure detected but not yet cascading.';
  } else {
    return 'Healthy: External demands are being absorbed without overload.';
  }
}

export default router;
