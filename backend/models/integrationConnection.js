import mongoose from 'mongoose';
import { encryptString, decryptString } from '../utils/crypto.js';

/**
 * IntegrationConnection model - Track connector status per integration
 * 
 * Per Category-King spec:
 * - Each tile must show: Status, Scope summary, Last sync timestamp, Coverage, Actions
 * - Support for: Jira, Asana, Gmail, Google Meet, Notion, HubSpot, Pipedrive, Basecamp
 */

const integrationConnectionSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Integration type
  integrationType: {
    type: String,
    required: true,
    enum: ['jira', 'asana', 'gmail', 'meet', 'notion', 'hubspot', 'pipedrive', 'basecamp'],
    index: true
  },
  
  // Connection status
  status: {
    type: String,
    enum: ['connected', 'error', 'needs_admin', 'disconnected', 'pending_auth'],
    default: 'disconnected'
  },
  
  // Status message for errors
  statusMessage: String,
  statusUpdatedAt: Date,
  
  // OAuth tokens (encrypted)
  auth: {
    accessToken: { type: String, set: encryptString, get: decryptString },
    refreshToken: { type: String, set: encryptString, get: decryptString },
    tokenExpiresAt: Date,
    scopes: [String],
    
    // Platform-specific auth data
    cloudId: String,          // Atlassian cloud ID (Jira)
    siteUrl: String,          // Atlassian site URL (Jira)
    workspaceId: String,      // Asana workspace ID
    workspaceName: String,    // Asana workspace name
    notionWorkspaceId: String, // Notion workspace ID
    hubspotPortalId: String,  // HubSpot portal ID
    pipedriveCompanyDomain: String, // Pipedrive company domain
    basecampAccountId: String // Basecamp account ID
  },
  
  // Connected by
  connectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  connectedAt: Date,
  
  // Sync information
  sync: {
    enabled: { type: Boolean, default: true },
    lastSyncAt: Date,
    lastSuccessfulSyncAt: Date,
    lastSyncStatus: {
      type: String,
      enum: ['success', 'partial', 'failed', 'in_progress']
    },
    lastSyncMessage: String,
    lastSyncEventsCount: Number,
    
    // Backfill progress
    backfillComplete: { type: Boolean, default: false },
    backfillStartedAt: Date,
    backfillCompletedAt: Date,
    backfillProgress: { type: Number, default: 0 }, // 0-100
    
    // Incremental sync cursor
    syncCursor: String,
    lastEventTimestamp: Date
  },
  
  // Coverage metrics
  coverage: {
    totalUsers: { type: Number, default: 0 },
    mappedUsers: { type: Number, default: 0 },
    unmappedEmails: [String], // Emails we couldn't match to users
    lastCoverageUpdatedAt: Date
  },
  
  // What we measure (for display in dashboard)
  measurementScope: {
    type: String,
    default: 'metadata only'
  },
  
  // Platform-specific settings
  settings: {
    // Jira: which projects to sync
    jiraProjects: [{ projectId: String, projectKey: String, projectName: String }],
    
    // Asana: which workspaces/projects
    asanaProjects: [{ projectId: String, projectName: String }],
    
    // Gmail: core hours config
    coreHoursStart: { type: Number, default: 8 }, // 24h format
    coreHoursEnd: { type: Number, default: 18 },
    
    // HubSpot: pipelines to track
    hubspotPipelines: [{ pipelineId: String, pipelineName: String }],
    
    // Pipedrive: pipelines to track
    pipedrivePipelines: [{ pipelineId: String, pipelineName: String }],
    
    // Notion: databases to track
    notionDatabases: [{ databaseId: String, databaseName: String }],
    
    // Basecamp: projects to track
    basecampProjects: [{ projectId: String, projectName: String }]
  },
  
  // Rate limiting info
  rateLimits: {
    remainingRequests: Number,
    resetAt: Date,
    isThrottled: { type: Boolean, default: false }
  }
  
}, { 
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Compound index for org + type uniqueness
integrationConnectionSchema.index({ orgId: 1, integrationType: 1 }, { unique: true });

// Methods
integrationConnectionSchema.methods.needsTokenRefresh = function() {
  if (!this.auth.tokenExpiresAt) return false;
  // Refresh if token expires in less than 5 minutes
  return this.auth.tokenExpiresAt < new Date(Date.now() + 5 * 60 * 1000);
};

integrationConnectionSchema.methods.getCoveragePercent = function() {
  if (this.coverage.totalUsers === 0) return 0;
  return Math.round((this.coverage.mappedUsers / this.coverage.totalUsers) * 100);
};

// Statics
integrationConnectionSchema.statics.getOrgIntegrations = async function(orgId) {
  const connections = await this.find({ orgId }).lean();
  
  // Return a map of all possible integrations with their status
  const integrationTypes = ['jira', 'asana', 'gmail', 'meet', 'notion', 'hubspot', 'pipedrive', 'basecamp'];
  const result = {};
  
  for (const type of integrationTypes) {
    const connection = connections.find(c => c.integrationType === type);
    result[type] = connection || {
      integrationType: type,
      status: 'disconnected',
      coverage: { totalUsers: 0, mappedUsers: 0 }
    };
  }
  
  return result;
};

export default mongoose.model('IntegrationConnection', integrationConnectionSchema);
