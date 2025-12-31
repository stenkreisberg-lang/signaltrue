import BehavioralDriftIndex from '../models/behavioralDriftIndex.js';
import Team from '../models/team.js';
import MetricsDaily from '../models/metricsDaily.js';
import DriftTimeline from '../models/driftTimeline.js';

/**
 * Behavioral Drift Index Service
 * Calculates and manages BDI for teams
 */

/**
 * Calculate BDI for a team for a given period
 */
export async function calculateBDI(teamId, periodStart, periodEnd) {
  try {
    const team = await Team.findById(teamId).populate('orgId');
    if (!team) {
      throw new Error('Team not found');
    }

    // Get current period metrics
    const metrics = await getTeamMetrics(teamId, periodStart, periodEnd);
    
    // Get or establish baseline (first 30 days)
    const baseline = await getOrEstablishBaseline(teamId);
    
    // Create BDI record
    const bdi = new BehavioralDriftIndex({
      orgId: team.orgId,
      teamId: team._id,
      periodStart,
      periodEnd,
      signals: {
        meetingLoad: { value: metrics.meetingLoad },
        afterHoursActivity: { value: metrics.afterHoursActivity },
        responseTime: { value: metrics.responseTime },
        asyncParticipation: { value: metrics.asyncParticipation },
        focusTime: { value: metrics.focusTime },
        collaborationBreadth: { value: metrics.collaborationBreadth }
      },
      baseline
    });

    // Save will trigger pre-save hook to calculate drift
    await bdi.save();
    
    // Update drift timeline if state changed
    await updateDriftTimeline(teamId, bdi);
    
    return bdi;
  } catch (error) {
    console.error('Error calculating BDI:', error);
    throw error;
  }
}

/**
 * Get team metrics for a period
 */
async function getTeamMetrics(teamId, periodStart, periodEnd) {
  const team = await Team.findById(teamId);
  
  // Get daily metrics for the period
  const dailyMetrics = await MetricsDaily.find({
    teamId,
    date: { $gte: periodStart, $lte: periodEnd }
  }).sort({ date: -1 });
  
  if (dailyMetrics.length === 0) {
    // Use current team signals if no daily metrics
    return {
      meetingLoad: team.calendarSignals?.meetingHoursWeek || 0,
      afterHoursActivity: team.calendarSignals?.afterHoursMeetings || 0,
      responseTime: team.slackSignals?.avgResponseDelayHours || 0,
      asyncParticipation: team.slackSignals?.messageCount || 0,
      focusTime: team.calendarSignals?.focusHoursWeek || 0,
      collaborationBreadth: 10 // placeholder, need to track unique collaborators
    };
  }
  
  // Average metrics over the period
  const avgMetrics = dailyMetrics.reduce((acc, day) => {
    acc.meetingLoad += day.meetingHours || 0;
    acc.afterHoursActivity += day.afterHoursPercent || 0;
    acc.responseTime += day.avgResponseHours || 0;
    acc.asyncParticipation += day.messageCount || 0;
    acc.focusTime += day.focusHours || 0;
    acc.collaborationBreadth += day.uniqueCollaborators || 0;
    return acc;
  }, {
    meetingLoad: 0,
    afterHoursActivity: 0,
    responseTime: 0,
    asyncParticipation: 0,
    focusTime: 0,
    collaborationBreadth: 0
  });
  
  const count = dailyMetrics.length;
  return {
    meetingLoad: avgMetrics.meetingLoad / count,
    afterHoursActivity: avgMetrics.afterHoursActivity / count,
    responseTime: avgMetrics.responseTime / count,
    asyncParticipation: avgMetrics.asyncParticipation / count,
    focusTime: avgMetrics.focusTime / count,
    collaborationBreadth: avgMetrics.collaborationBreadth / count
  };
}

/**
 * Get or establish baseline for a team
 */
async function getOrEstablishBaseline(teamId) {
  // Check if baseline exists in BDI records
  const existingBDI = await BehavioralDriftIndex.findOne({
    teamId,
    'baseline.establishedDate': { $exists: true }
  }).sort({ 'baseline.establishedDate': 1 });
  
  if (existingBDI && existingBDI.baseline) {
    return existingBDI.baseline;
  }
  
  // Establish new baseline from first 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const metrics = await getTeamMetrics(teamId, thirtyDaysAgo, new Date());
  
  return {
    meetingLoad: metrics.meetingLoad,
    afterHoursActivity: metrics.afterHoursActivity,
    responseTime: metrics.responseTime,
    asyncParticipation: metrics.asyncParticipation,
    focusTime: metrics.focusTime,
    collaborationBreadth: metrics.collaborationBreadth,
    establishedDate: new Date(),
    sampleSize: 30
  };
}

/**
 * Update drift timeline when BDI state changes
 */
async function updateDriftTimeline(teamId, bdi) {
  const team = await Team.findById(teamId);
  
  // Find active timeline or create new one
  let timeline = await DriftTimeline.findOne({
    teamId,
    status: 'Active'
  });
  
  if (!timeline) {
    // Create new timeline
    timeline = new DriftTimeline({
      orgId: team.orgId,
      teamId,
      timelineId: `${teamId}-${Date.now()}`,
      status: 'Active',
      events: []
    });
    
    // Add baseline event
    timeline.events.push({
      phase: 'Baseline',
      timestamp: bdi.baseline.establishedDate || new Date(),
      title: 'Baseline Established',
      description: `Team baseline established over ${bdi.baseline.sampleSize} days`,
      details: {
        driftState: 'Stable'
      },
      icon: '📊',
      severity: 'info'
    });
  }
  
  // Check if state changed
  const lastEvent = timeline.events[timeline.events.length - 1];
  const lastState = lastEvent?.details?.driftState;
  
  if (lastState !== bdi.state) {
    // State changed - add new event
    let phase, title, icon, severity;
    
    if (bdi.state === 'Early Drift' && lastState === 'Stable') {
      phase = 'First Signal';
      title = 'First Drift Signal Detected';
      icon = '⚠️';
      severity = 'warning';
    } else if (bdi.state === 'Developing Drift' || bdi.state === 'Critical Drift') {
      phase = 'Escalation';
      title = `Drift Escalated to ${bdi.state}`;
      icon = '🔴';
      severity = 'critical';
    } else if (bdi.state === 'Stable') {
      phase = 'Resolution';
      title = 'Drift Resolved - Returned to Stable';
      icon = '✅';
      severity = 'info';
    } else {
      phase = 'Escalation';
      title = `Drift State Changed to ${bdi.state}`;
      icon = '📈';
      severity = 'warning';
    }
    
    timeline.events.push({
      phase,
      timestamp: new Date(),
      title,
      description: bdi.summary || 'Behavioral patterns showing deviation from baseline',
      details: {
        signals: bdi.topDrivers.map(d => ({
          name: d.signal,
          value: d.currentValue,
          change: d.change
        })),
        driftState: bdi.state,
        confidenceLevel: bdi.confidence?.level
      },
      icon,
      severity
    });
  }
  
  await timeline.save();
  
  // If drift resolved, mark timeline as resolved
  if (bdi.state === 'Stable' && timeline.status === 'Active') {
    timeline.status = 'Resolved';
    await timeline.save();
  }
  
  return timeline;
}

/**
 * Get latest BDI for a team
 */
export async function getLatestBDI(teamId) {
  return await BehavioralDriftIndex.findOne({ teamId })
    .sort({ periodStart: -1 })
    .populate('recommendedPlaybooks.playbookId');
}

/**
 * Get BDI history for a team
 */
export async function getBDIHistory(teamId, limit = 30) {
  return await BehavioralDriftIndex.find({ teamId })
    .sort({ periodStart: -1 })
    .limit(limit);
}

/**
 * Get BDI summary for an organization
 */
export async function getOrgBDISummary(orgId) {
  const teams = await Team.find({ orgId });
  const teamIds = teams.map(t => t._id);
  
  // Get latest BDI for each team
  const bdis = await Promise.all(
    teamIds.map(teamId => getLatestBDI(teamId))
  );
  
  // Aggregate statistics
  const summary = {
    totalTeams: teams.length,
    stable: bdis.filter(b => b?.state === 'Stable').length,
    earlyDrift: bdis.filter(b => b?.state === 'Early Drift').length,
    developingDrift: bdis.filter(b => b?.state === 'Developing Drift').length,
    criticalDrift: bdis.filter(b => b?.state === 'Critical Drift').length,
    avgDriftScore: bdis.reduce((sum, b) => sum + (b?.driftScore || 0), 0) / bdis.length
  };
  
  return summary;
}

export default {
  calculateBDI,
  getLatestBDI,
  getBDIHistory,
  getOrgBDISummary
};
