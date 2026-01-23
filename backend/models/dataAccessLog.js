import mongoose from 'mongoose';

/**
 * Data Access Log Model
 * Audit trail for all team-level data access
 * Required for compliance and anti-weaponization monitoring
 */
const dataAccessLogSchema = new mongoose.Schema({
  // Who accessed the data
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true,
    enum: ['member', 'admin', 'hr_admin', 'master_admin']
  },
  
  // What endpoint was accessed
  endpoint: {
    type: String,
    required: true,
    index: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  
  // Which team/org data
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    index: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  
  // Access metadata
  ipAddress: String,
  userAgent: String,
  accessedAt: {
    type: Date,
    default: Date.now,
    required: true
    // Note: index is created below with TTL expireAfterSeconds option
  },
  
  // Request details
  queryParams: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Why was data accessed (optional)
  purpose: {
    type: String,
    enum: [
      'dashboard_view',
      'report_generation',
      'export',
      'api_integration',
      'admin_review',
      'other'
    ],
    default: 'dashboard_view'
  },
  
  // Compliance flags
  containsSensitiveData: {
    type: Boolean,
    default: false
  },
  wasExported: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for audit queries
dataAccessLogSchema.index({ userId: 1, accessedAt: -1 });
dataAccessLogSchema.index({ teamId: 1, accessedAt: -1 });
dataAccessLogSchema.index({ orgId: 1, accessedAt: -1 });
dataAccessLogSchema.index({ endpoint: 1, accessedAt: -1 });

// Auto-delete logs older than 1 year (compliance retention)
dataAccessLogSchema.index({ accessedAt: 1 }, { expireAfterSeconds: 31536000 }); // 365 days

// Static method: Get access summary for a team
dataAccessLogSchema.statics.getTeamAccessSummary = async function(teamId, days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return await this.aggregate([
    {
      $match: {
        teamId: mongoose.Types.ObjectId(teamId),
        accessedAt: { $gte: cutoff }
      }
    },
    {
      $group: {
        _id: {
          userId: '$userId',
          endpoint: '$endpoint'
        },
        count: { $sum: 1 },
        lastAccess: { $max: '$accessedAt' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Static method: Detect unusual access patterns
dataAccessLogSchema.statics.detectUnusualAccess = async function(userId, hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const recentAccess = await this.find({
    userId,
    accessedAt: { $gte: cutoff }
  });
  
  // Flag if more than 100 requests in 24 hours
  if (recentAccess.length > 100) {
    return {
      unusual: true,
      reason: 'high_volume',
      count: recentAccess.length,
      threshold: 100
    };
  }
  
  // Flag if accessing multiple teams rapidly
  const uniqueTeams = new Set(recentAccess.map(log => log.teamId?.toString()).filter(Boolean));
  if (uniqueTeams.size > 20) {
    return {
      unusual: true,
      reason: 'bulk_access',
      teamsAccessed: uniqueTeams.size,
      threshold: 20
    };
  }
  
  return { unusual: false };
};

export default mongoose.model('DataAccessLog', dataAccessLogSchema);
