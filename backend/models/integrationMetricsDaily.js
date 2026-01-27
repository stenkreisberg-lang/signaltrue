import mongoose from 'mongoose';

/**
 * IntegrationMetricsDaily model - Daily metrics computed from work_events
 * 
 * Per Category-King spec:
 * - All metrics computed daily + weekly rollups
 * - Covers WIP saturation, task aging, completion rate, reopen loop, flow efficiency
 * - After-hours spillover, response-time drift, meeting metrics
 * - Category-King composite metrics: CVIR, RCI, WAP, PIS
 */

const integrationMetricsDailySchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Date (normalized to 00:00 UTC)
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // ============================================================
  // JIRA/ASANA TASK METRICS
  // ============================================================
  
  // WIP Saturation
  wipOpenTasks: { type: Number, default: 0 },           // Count of assigned issues not in Done
  wipGrowth7d: { type: Number, default: 0 },            // Delta of open tasks last 7 days
  
  // Task Aging Index
  avgTaskAgeDays: { type: Number, default: 0 },         // Avg age of open tasks
  p90TaskAgeDays: { type: Number, default: 0 },         // 90th percentile age
  
  // Completion Rate
  tasksCompleted7d: { type: Number, default: 0 },
  tasksCreated7d: { type: Number, default: 0 },
  completionChange7d: { type: Number, default: 0 },     // % change vs previous 7 days
  
  // Reopen Loop
  tasksReopened7d: { type: Number, default: 0 },
  reopenRate7d: { type: Number, default: 0 },           // reopened / completed
  
  // Flow Efficiency Proxy
  cycleTimeMedianDays: { type: Number, default: 0 },    // Median cycle time
  cycleTimeP90Days: { type: Number, default: 0 },
  
  // Overdue metrics
  overdueTasksCount: { type: Number, default: 0 },
  overdueGrowth7d: { type: Number, default: 0 },
  
  // Assignment churn
  assignmentChurn7d: { type: Number, default: 0 },      // Count of reassigned tasks
  
  // ============================================================
  // EMAIL METRICS (Gmail)
  // ============================================================
  
  // Volume
  emailSent7d: { type: Number, default: 0 },
  emailReceived7d: { type: Number, default: 0 },
  
  // After-hours spillover
  afterHoursSentCount: { type: Number, default: 0 },
  afterHoursSentRatio: { type: Number, default: 0 },    // after_hours / total
  afterHoursBaseline28d: { type: Number, default: 0 },  // Trailing 28-day baseline
  afterHoursDrift: { type: Number, default: 0 },        // % change from baseline
  
  // Response time drift
  replyLatencyMedian7d: { type: Number, default: 0 },   // Median reply latency (seconds)
  replyLatencyBaseline28d: { type: Number, default: 0 },
  replyLatencyDrift: { type: Number, default: 0 },      // % change from baseline
  
  // Thread metrics
  threadBloat7d: { type: Number, default: 0 },          // Count threads with >N replies
  externalEmailRatio: { type: Number, default: 0 },     // Ratio of external emails
  
  // ============================================================
  // MEETING METRICS (Google Meet / Calendar)
  // ============================================================
  
  meetingDurationTotalHours7d: { type: Number, default: 0 },
  meetingCount7d: { type: Number, default: 0 },
  
  // Ad-hoc vs scheduled
  adHocMeetingCount7d: { type: Number, default: 0 },
  adHocMeetingRate7d: { type: Number, default: 0 },     // ad-hoc / total
  
  // Back-to-back pressure
  backToBackMeetingBlocks: { type: Number, default: 0 }, // Meetings with <=5 min gap
  
  // Fragmentation
  meetingFragmentationIndex: { type: Number, default: 0 }, // count * (1/avg_gap)
  avgGapBetweenMeetingsMins: { type: Number, default: 0 },
  
  // External coordination
  meetingsWithExternalParticipants: { type: Number, default: 0 },
  
  // ============================================================
  // NOTION METRICS (Documentation/Decisions)
  // ============================================================
  
  // Decision decay proxy
  editChurn7d: { type: Number, default: 0 },            // Edits per page without closure
  orphanPages30d: { type: Number, default: 0 },         // Pages with no edits after 7 days
  highCollabPages7d: { type: Number, default: 0 },      // Pages with many collaborators
  
  // Cognitive load proxy
  docChurnPerUser7d: { type: Number, default: 0 },
  distinctPagesEditedPerDay: { type: Number, default: 0 },
  
  // ============================================================
  // CRM METRICS (HubSpot/Pipedrive)
  // ============================================================
  
  // Escalation rate
  dealsWithMultipleStageChanges7d: { type: Number, default: 0 },
  escalationRate7d: { type: Number, default: 0 },       // % of deals with >2 stage changes
  
  // Close date slip
  closeDateSlips7d: { type: Number, default: 0 },
  closeDateSlipRate7d: { type: Number, default: 0 },
  
  // Handoff spike (CRM → execution)
  handoffSpike48h: { type: Number, default: 0 },        // CRM changes followed by task spikes
  
  // Ticket pressure
  ticketsCreated7d: { type: Number, default: 0 },
  
  // ============================================================
  // BASECAMP METRICS (Async collaboration)
  // ============================================================
  
  postsCreated7d: { type: Number, default: 0 },
  todosCreated7d: { type: Number, default: 0 },
  todosCompleted7d: { type: Number, default: 0 },
  
  // Passive disengagement
  responseGapMedian: { type: Number, default: 0 },      // Time to first comment
  unansweredPostRate7d: { type: Number, default: 0 },
  
  // ============================================================
  // CATEGORY-KING COMPOSITE METRICS
  // ============================================================
  
  // A) Completion vs Interruption Ratio (CVIR)
  // CVIR = completed_tasks_7d / (interrupt_events_7d + 1)
  interruptEvents7d: { type: Number, default: 0 },      // Slack bursts + ad-hoc meet + email spikes
  cvir: { type: Number, default: 0 },
  cvirTrend7d: { type: Number, default: 0 },            // Change over 7 days
  
  // B) Recovery Collapse Index (RCI)
  // RCI = z(back_to_back) + z(after_hours_ratio) + z(1/avg_gap)
  rci: { type: Number, default: 0 },                    // Normalized 0-100
  rciComponents: {
    backToBackZ: { type: Number, default: 0 },
    afterHoursZ: { type: Number, default: 0 },
    gapInverseZ: { type: Number, default: 0 }
  },
  
  // C) Work Aging Pressure (WAP)
  // WAP = z(avg_task_age) + z(wip_growth) + z(overdue_growth)
  wap: { type: Number, default: 0 },                    // Normalized 0-100
  wapComponents: {
    taskAgeZ: { type: Number, default: 0 },
    wipGrowthZ: { type: Number, default: 0 },
    overdueGrowthZ: { type: Number, default: 0 }
  },
  
  // D) Pressure Injection Score (PIS)
  // PIS = z(CRM_escalation_rate) + z(handoff_spike)
  pis: { type: Number, default: 0 },                    // Normalized 0-100
  pisComponents: {
    escalationZ: { type: Number, default: 0 },
    handoffZ: { type: Number, default: 0 }
  },
  
  // ============================================================
  // BASELINE DATA (for robust-z calculations)
  // ============================================================
  
  baseline: {
    // 28-day trailing medians
    wipOpenTasksMedian: Number,
    avgTaskAgeDaysMedian: Number,
    tasksCompleted7dMedian: Number,
    afterHoursSentRatioMedian: Number,
    replyLatencyMedianMedian: Number,
    backToBackBlocksMedian: Number,
    escalationRate7dMedian: Number,
    
    // 28-day MAD (Median Absolute Deviation)
    wipOpenTasksMAD: Number,
    avgTaskAgeDaysMAD: Number,
    tasksCompleted7dMAD: Number,
    afterHoursSentRatioMAD: Number,
    replyLatencyMedianMAD: Number,
    backToBackBlocksMAD: Number,
    escalationRate7dMAD: Number,
    
    // Data coverage for confidence calculation
    dataCoverage: {
      jiraConnected: { type: Boolean, default: false },
      asanaConnected: { type: Boolean, default: false },
      gmailConnected: { type: Boolean, default: false },
      meetConnected: { type: Boolean, default: false },
      notionConnected: { type: Boolean, default: false },
      hubspotConnected: { type: Boolean, default: false },
      pipedriveConnected: { type: Boolean, default: false },
      basecampConnected: { type: Boolean, default: false },
      userMappingPercent: { type: Number, default: 0 }
    }
  },
  
  // ============================================================
  // METADATA
  // ============================================================
  
  // Data sources that contributed to this day's metrics
  sources: [{
    type: String,
    enum: ['jira', 'asana', 'gmail', 'meet', 'notion', 'hubspot', 'pipedrive', 'basecamp', 'slack', 'calendar']
  }],
  
  // Events processed for this day
  eventsProcessed: { type: Number, default: 0 },
  
  // Confidence score (0-100) based on data coverage
  confidence: { type: Number, default: 0 }
  
}, { timestamps: true });

// Compound indexes for common queries
integrationMetricsDailySchema.index({ orgId: 1, date: -1 });
integrationMetricsDailySchema.index({ orgId: 1, teamId: 1, date: -1 });
integrationMetricsDailySchema.index({ orgId: 1, userId: 1, date: -1 });
integrationMetricsDailySchema.index({ orgId: 1, teamId: 1, userId: 1, date: 1 }, { unique: true });

export default mongoose.model('IntegrationMetricsDaily', integrationMetricsDailySchema);
