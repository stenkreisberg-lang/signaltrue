import CoordinationLoadIndex from '../models/coordinationLoadIndex.js';
import BandwidthTaxIndicator from '../models/bandwidthTaxIndicator.js';
import SilenceRiskIndicator from '../models/silenceRiskIndicator.js';
import Team from '../models/team.js';
import MetricsDaily from '../models/metricsDaily.js';

/**
 * Calculate Coordination Load Index for a team
 */
export async function calculateCLI(teamId, periodStart, periodEnd) {
  try {
    const team = await Team.findById(teamId).populate('orgId');
    if (!team) {
      throw new Error('Team not found');
    }

    const metrics = await getTeamMetrics(teamId, periodStart, periodEnd);
    
    const cli = new CoordinationLoadIndex({
      orgId: team.orgId,
      teamId: team._id,
      periodStart,
      periodEnd,
      meetingTime: metrics.meetingTime,
      backToBackMeetings: metrics.backToBackMeetings,
      crossTeamSync: metrics.crossTeamSync,
      availableFocusTime: metrics.availableFocusTime
    });

    // Get baseline if exists
    const baseline = await getLatestCLI(teamId);
    if (baseline) {
      cli.baseline = {
        coordinationLoad: baseline.coordinationLoad,
        state: baseline.state,
        date: baseline.periodStart
      };
    }

    await cli.save();
    
    // Add recommended actions based on state
    if (cli.state === 'Coordination overload') {
      cli.recommendedActions = [{
        action: 'Pause recurring meetings for two weeks',
        expectedEffect: 'Reduce coordination load by 30-40%, increase execution capacity',
        timebound: '2 weeks'
      }];
      await cli.save();
    }
    
    return cli;
  } catch (error) {
    console.error('Error calculating CLI:', error);
    throw error;
  }
}

/**
 * Calculate Bandwidth Tax Indicator for a team
 */
export async function calculateBTI(teamId, periodStart, periodEnd) {
  try {
    const team = await Team.findById(teamId).populate('orgId');
    if (!team) {
      throw new Error('Team not found');
    }

    const metrics = await getTeamMetrics(teamId, periodStart, periodEnd);
    
    const bti = new BandwidthTaxIndicator({
      orgId: team.orgId,
      teamId: team._id,
      periodStart,
      periodEnd,
      avgResponseTimeHours: metrics.avgResponseTimeHours,
      afterHoursActivityPercent: metrics.afterHoursActivityPercent,
      avgFocusBlockMinutes: metrics.avgFocusBlockMinutes,
      interruptionsPerDay: metrics.interruptionsPerDay
    });

    // Get baseline if exists
    const baseline = await getLatestBTI(teamId);
    if (baseline) {
      bti.baseline = {
        bandwidthTaxScore: baseline.bandwidthTaxScore,
        state: baseline.state,
        date: baseline.periodStart
      };
    }

    await bti.save();
    
    // Detect triggers
    bti.triggers = [];
    if (bti.avgResponseTimeHours < 2 && bti.afterHoursActivityPercent > 20) {
      bti.triggers.push({
        name: 'Response Time Paradox',
        detected: true,
        severity: 'high',
        description: 'Faster response times combined with high after-hours activity suggests cognitive overload masked by responsiveness'
      });
    }
    if (bti.avgFocusBlockMinutes < 30) {
      bti.triggers.push({
        name: 'Focus Block Degradation',
        detected: true,
        severity: 'high',
        description: 'Uninterrupted focus blocks have shrunk to unsustainable levels'
      });
    }
    if (bti.afterHoursActivityPercent > 30) {
      bti.triggers.push({
        name: 'After-Hours Creep',
        detected: true,
        severity: 'medium',
        description: 'Significant work happening outside normal hours'
      });
    }
    
    await bti.save();
    
    return bti;
  } catch (error) {
    console.error('Error calculating BTI:', error);
    throw error;
  }
}

/**
 * Calculate Silence Risk Indicator for a team
 */
export async function calculateSRI(teamId, periodStart, periodEnd) {
  try {
    const team = await Team.findById(teamId).populate('orgId');
    if (!team) {
      throw new Error('Team not found');
    }

    const metrics = await getTeamMetrics(teamId, periodStart, periodEnd);
    
    const sri = new SilenceRiskIndicator({
      orgId: team.orgId,
      teamId: team._id,
      periodStart,
      periodEnd,
      asyncContributionCount: metrics.asyncContributionCount,
      uniqueCollaborators: metrics.uniqueCollaborators,
      upwardResponseTimeHours: metrics.upwardResponseTimeHours,
      sentimentVariance: metrics.sentimentVariance
    });

    // Get baseline if exists
    const baseline = await getLatestSRI(teamId);
    if (baseline) {
      sri.baseline = {
        asyncContributionCount: baseline.asyncContributionCount,
        uniqueCollaborators: baseline.uniqueCollaborators,
        upwardResponseTimeHours: baseline.upwardResponseTimeHours,
        sentimentVariance: baseline.sentimentVariance,
        silenceRiskScore: baseline.silenceRiskScore,
        state: baseline.state,
        date: baseline.periodStart
      };
    }

    await sri.save();
    
    // Detect proxies
    sri.proxies = [];
    if (sri.deviation.asyncContributionChange < -20) {
      sri.proxies.push({
        name: 'Declining Contributions',
        detected: true,
        severity: 'high',
        description: 'Significant reduction in async messages, threads, and reactions'
      });
    }
    if (sri.deviation.collaborationNetworkChange < -20) {
      sri.proxies.push({
        name: 'Narrowing Network',
        detected: true,
        severity: 'medium',
        description: 'Fewer unique people being interacted with'
      });
    }
    if (sri.deviation.upwardResponseChange > 40) {
      sri.proxies.push({
        name: 'Slower Upward Responses',
        detected: true,
        severity: 'medium',
        description: 'Taking longer to respond to leadership communications'
      });
    }
    
    await sri.save();
    
    return sri;
  } catch (error) {
    console.error('Error calculating SRI:', error);
    throw error;
  }
}

/**
 * Get team metrics for calculations
 */
async function getTeamMetrics(teamId, periodStart, periodEnd) {
  const team = await Team.findById(teamId);
  
  const dailyMetrics = await MetricsDaily.find({
    teamId,
    date: { $gte: periodStart, $lte: periodEnd }
  }).sort({ date: -1 });
  
  if (dailyMetrics.length === 0) {
    // Use current team signals if no daily metrics
    return {
      // CLI metrics
      meetingTime: team.calendarSignals?.meetingHoursWeek || 0,
      backToBackMeetings: (team.calendarSignals?.meetingHoursWeek || 0) * 0.3, // estimate
      crossTeamSync: (team.calendarSignals?.meetingHoursWeek || 0) * 0.2, // estimate
      availableFocusTime: team.calendarSignals?.focusHoursWeek || 40,
      
      // BTI metrics
      avgResponseTimeHours: team.slackSignals?.avgResponseDelayHours || 4,
      afterHoursActivityPercent: ((team.calendarSignals?.afterHoursMeetings || 0) / (team.calendarSignals?.meetingHoursWeek || 1)) * 100,
      avgFocusBlockMinutes: 90,
      interruptionsPerDay: 10,
      
      // SRI metrics
      asyncContributionCount: team.slackSignals?.messageCount || 0,
      uniqueCollaborators: 10,
      upwardResponseTimeHours: team.slackSignals?.avgResponseDelayHours || 4,
      sentimentVariance: team.slackSignals?.sentiment || 0.5
    };
  }
  
  // Average metrics over the period
  const avgMetrics = dailyMetrics.reduce((acc, day) => {
    acc.meetingTime += day.meetingHours || 0;
    acc.backToBackMeetings += day.backToBackHours || 0;
    acc.crossTeamSync += day.crossTeamMeetingHours || 0;
    acc.availableFocusTime += day.focusHours || 0;
    acc.avgResponseTimeHours += day.avgResponseHours || 0;
    acc.afterHoursActivityPercent += day.afterHoursPercent || 0;
    acc.avgFocusBlockMinutes += day.avgFocusBlockMinutes || 0;
    acc.interruptionsPerDay += day.interruptions || 0;
    acc.asyncContributionCount += day.messageCount || 0;
    acc.uniqueCollaborators += day.uniqueCollaborators || 0;
    acc.upwardResponseTimeHours += day.upwardResponseHours || 0;
    acc.sentimentVariance += day.sentimentVariance || 0;
    return acc;
  }, {
    meetingTime: 0,
    backToBackMeetings: 0,
    crossTeamSync: 0,
    availableFocusTime: 0,
    avgResponseTimeHours: 0,
    afterHoursActivityPercent: 0,
    avgFocusBlockMinutes: 0,
    interruptionsPerDay: 0,
    asyncContributionCount: 0,
    uniqueCollaborators: 0,
    upwardResponseTimeHours: 0,
    sentimentVariance: 0
  });
  
  const count = dailyMetrics.length;
  Object.keys(avgMetrics).forEach(key => {
    avgMetrics[key] = avgMetrics[key] / count;
  });
  
  return avgMetrics;
}

/**
 * Get latest CLI for a team
 */
export async function getLatestCLI(teamId) {
  return await CoordinationLoadIndex.findOne({ teamId })
    .sort({ periodStart: -1 });
}

/**
 * Get latest BTI for a team
 */
export async function getLatestBTI(teamId) {
  return await BandwidthTaxIndicator.findOne({ teamId })
    .sort({ periodStart: -1 });
}

/**
 * Get latest SRI for a team
 */
export async function getLatestSRI(teamId) {
  return await SilenceRiskIndicator.findOne({ teamId })
    .sort({ periodStart: -1 });
}

/**
 * Calculate all indices for a team
 */
export async function calculateAllIndices(teamId, periodStart, periodEnd) {
  const [cli, bti, sri] = await Promise.all([
    calculateCLI(teamId, periodStart, periodEnd),
    calculateBTI(teamId, periodStart, periodEnd),
    calculateSRI(teamId, periodStart, periodEnd)
  ]);
  
  return { cli, bti, sri };
}

export default {
  calculateCLI,
  calculateBTI,
  calculateSRI,
  calculateAllIndices,
  getLatestCLI,
  getLatestBTI,
  getLatestSRI
};
