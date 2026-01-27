import mongoose from 'mongoose';

/**
 * WorkEvent model - Normalized event stream for all integrations
 * 
 * Per Category-King spec:
 * - Append-only event stream
 * - Stores only metadata (no content bodies)
 * - Batch backfill on connect (last 90 days), then incremental sync
 */

const workEventSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Source integration
  source: {
    type: String,
    required: true,
    enum: ['jira', 'asana', 'gmail', 'meet', 'notion', 'hubspot', 'pipedrive', 'basecamp', 'slack', 'calendar'],
    index: true
  },
  
  // Event type per source
  eventType: {
    type: String,
    required: true,
    enum: [
      // Jira/Asana events
      'task_created',
      'task_status_changed',
      'task_assigned',
      'task_comment_added',
      'task_reopened',
      'task_due_date_changed',
      'task_priority_changed',
      'task_completed',
      'task_moved_sections',
      
      // Gmail events
      'email_sent',
      'email_received',
      
      // Google Meet events
      'meet_started',
      'meet_ended',
      'meet_participant_joined',
      
      // Notion events
      'page_created',
      'page_updated',
      'comment_added',
      'database_updated',
      'page_shared',
      
      // CRM events (HubSpot/Pipedrive)
      'deal_created',
      'deal_stage_changed',
      'deal_close_date_changed',
      'ticket_created',
      'activity_created',
      
      // Basecamp events
      'post_created',
      'todo_created',
      'todo_completed',
      'checkin_response'
    ],
    index: true
  },
  
  // Actor (who performed the action)
  actorUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Target (who was affected, e.g., email recipient, task assignee)
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Team association
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    index: true
  },
  
  // When the event occurred
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  
  // External ID for deduplication
  externalId: {
    type: String,
    index: true
  },
  
  // Structured metadata (strict allowlist per source)
  metadata: {
    // --- Jira/Asana fields ---
    issueId: String,
    issueKey: String,
    projectId: String,
    issueType: String,
    priority: String,
    statusCurrent: String,
    statusPrevious: String,
    assigneeUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reporterUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cycleTimeStartedAt: Date,
    cycleTimeCompletedAt: Date,
    reopenCount: Number,
    commentCountDelta: Number,
    dueOn: Date,
    sectionName: String,
    
    // --- Gmail fields ---
    messageIdHash: String,
    threadIdHash: String,
    toCount: Number,
    ccCount: Number,
    bccCount: Number,
    isExternal: Boolean,
    replyLatencySeconds: Number,
    isAfterHours: Boolean,
    
    // --- Google Meet fields ---
    meetingIdHash: String,
    startTime: Date,
    endTime: Date,
    participantCountPeak: Number,
    isExternalParticipant: Boolean,
    isAdHoc: Boolean,
    durationMinutes: Number,
    
    // --- Notion fields ---
    pageIdHash: String,
    parentDbId: String,
    collaboratorCount: Number,
    editChurn: Number,
    
    // --- CRM fields (HubSpot/Pipedrive) ---
    dealIdHash: String,
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    stage: String,
    stagePrevious: String,
    stageChangeCount: Number,
    closeDatePrevious: Date,
    closeDateCurrent: Date,
    ticketId: String,
    activityType: String,
    
    // --- Basecamp fields ---
    postIdHash: String,
    todoIdHash: String,
    responseGapSeconds: Number
  },
  
  // Privacy marker (always metadata_only for compliance)
  privacyLevel: {
    type: String,
    enum: ['metadata_only'],
    default: 'metadata_only'
  },
  
  // Processing flags
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  processedAt: Date
  
}, { 
  timestamps: true,
  // Optimize for append-only pattern
  capped: false 
});

// Compound indexes for common queries
workEventSchema.index({ orgId: 1, source: 1, timestamp: -1 });
workEventSchema.index({ orgId: 1, teamId: 1, timestamp: -1 });
workEventSchema.index({ orgId: 1, actorUserId: 1, timestamp: -1 });
workEventSchema.index({ orgId: 1, eventType: 1, timestamp: -1 });
workEventSchema.index({ source: 1, externalId: 1 }, { unique: true, sparse: true });

// TTL index to automatically delete old events (optional, can be configured)
// workEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 year

export default mongoose.model('WorkEvent', workEventSchema);
