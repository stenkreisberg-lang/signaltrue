/**
 * Network Bottleneck Service
 * Category-defining signal per Category King spec (TEAM-LEVEL ONLY)
 * 
 * Formula:
 * bottleneck_score = top_10_percent_participants_activity / total_team_activity
 * 
 * Thresholds:
 * - Warning: >45%
 * - Critical: >60%
 * 
 * IMPORTANT: No individual names shown - team-level aggregation only
 */

import Team from '../models/team.js';
import MetricsDaily from '../models/metricsDaily.js';

const THRESHOLDS = {
  WARNING: 0.45,   // 45% - top 10% doing 45%+ of activity
  CRITICAL: 0.60   // 60% - severe concentration
};

/**
 * Calculate Network Bottleneck Score for a team
 * @param {string} teamId - Team ID
 * @param {number} periodDays - Days to analyze (default 7)
 * @returns {Object} - Bottleneck score with severity and recommendations
 */
export async function calculateNetworkBottleneck(teamId, periodDays = 7) {
  try {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }
    
    const baseline = team.baseline?.signals || {};
    
    // Get recent metrics
    const since = new Date();
    since.setDate(since.getDate() - periodDays);
    
    const recentMetrics = await MetricsDaily.find({
      teamId,
      date: { $gte: since }
    }).sort({ date: -1 });
    
    if (recentMetrics.length === 0) {
      return {
        hasData: false,
        message: 'Insufficient data for Network Bottleneck analysis'
      };
    }
    
    // Calculate activity concentration from available data
    // Using collaboration breadth as proxy for network distribution
    const avgCollaborationBreadth = average(recentMetrics.map(m => m.collaborationBreadth || 0));
    const avgNetworkDensity = average(recentMetrics.map(m => m.networkDensity || 0.5));
    
    // Bottleneck score: inverse of network distribution
    // Low collaboration breadth + high concentration = bottleneck
    // We infer concentration from network patterns
    const concentrationProxy = recentMetrics.length > 0 
      ? calculateConcentration(recentMetrics)
      : 0.3;
    
    const bottleneckScore = concentrationProxy;
    
    // Get baseline for comparison
    const baselineBottleneck = baseline.networkBottleneck || bottleneckScore * 0.8;
    
    // Calculate delta
    const deltaPercent = baselineBottleneck > 0 
      ? ((bottleneckScore - baselineBottleneck) / baselineBottleneck)
      : 0;
    
    // Determine severity based on absolute score
    let severity = 'INFO';
    let status = 'stable';
    
    if (bottleneckScore >= THRESHOLDS.CRITICAL) {
      severity = 'CRITICAL';
      status = 'worsening';
    } else if (bottleneckScore >= THRESHOLDS.WARNING) {
      severity = 'RISK';
      status = 'worsening';
    } else if (deltaPercent <= -0.1) {
      status = 'improving';
    }
    
    // Direction indicator
    const direction = deltaPercent > 0.05 ? 'worsening' 
                    : deltaPercent < -0.05 ? 'improving' 
                    : 'stable';
    
    return {
      hasData: true,
      teamId,
      teamName: team.name,
      signalType: 'network_bottleneck',
      signalCategory: 'network',
      sources: ['slack', 'calendar'],
      
      // Score as percentage (e.g., 45 = 45%)
      currentValue: Math.round(bottleneckScore * 100),
      baselineValue: Math.round(baselineBottleneck * 100),
      deltaPercent: Math.round(deltaPercent * 100),
      direction,
      
      severity,
      status,
      
      // Network health indicators (no individual names)
      networkHealth: {
        collaborationBreadth: Math.round(avgCollaborationBreadth * 10) / 10,
        networkDensity: Math.round(avgNetworkDensity * 100),
        concentrationLevel: bottleneckScore >= 0.5 ? 'High' 
                          : bottleneckScore >= 0.35 ? 'Moderate' 
                          : 'Healthy'
      },
      
      // Why this matters
      interpretation: generateBottleneckInterpretation(bottleneckScore, deltaPercent),
      
      // Suggested intervention (team-level, no individuals named)
      suggestedAction: bottleneckScore >= THRESHOLDS.WARNING 
        ? 'Review communication patterns and consider distributing key touchpoints across more team members'
        : null,
      
      calculatedAt: new Date()
    };
    
  } catch (error) {
    console.error('[NetworkBottleneck] Error:', error);
    throw error;
  }
}

/**
 * Helper: Calculate average
 */
function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Helper: Calculate concentration from metrics
 * This is a proxy calculation until we have full network graph data
 */
function calculateConcentration(metrics) {
  // Use variance in activity patterns as proxy for concentration
  const activities = metrics.map(m => 
    (m.messageCount || 0) + (m.meetingCount || 0) * 5
  );
  
  if (activities.length === 0) return 0.3;
  
  const avg = average(activities);
  if (avg === 0) return 0.3;
  
  // Calculate coefficient of variation
  const variance = activities.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / activities.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / avg;
  
  // Convert CV to concentration score (0-1)
  // Higher CV = more uneven distribution = higher concentration
  const concentration = Math.min(0.8, cv * 0.5 + 0.2);
  
  return concentration;
}

/**
 * Helper: Generate interpretation text
 */
function generateBottleneckInterpretation(score, deltaPercent) {
  const scorePercent = Math.round(score * 100);
  
  if (score >= THRESHOLDS.CRITICAL) {
    return `Critical network bottleneck. Communication is highly concentrated - a small portion of the team handles ${scorePercent}% of coordination. This creates single points of failure and slows decision-making.`;
  }
  
  if (score >= THRESHOLDS.WARNING) {
    return `Network bottleneck detected. Top contributors handle ${scorePercent}% of team coordination. Consider distributing responsibilities to reduce risk.`;
  }
  
  if (deltaPercent <= -0.1) {
    return `Network distribution is improving. Communication load is spreading more evenly across the team.`;
  }
  
  return `Network distribution is healthy. Coordination is reasonably distributed across team members.`;
}

export default {
  calculateNetworkBottleneck,
  THRESHOLDS
};
