/**
 * Work Health Delta Service
 * 30-Day before/after comparison (Pilot Killer feature)
 * 
 * Compares:
 * - Baseline (first 7 days)
 * - Current (last 7 days)
 * 
 * Metrics tracked:
 * - Focus time
 * - Meeting load
 * - Fragmentation
 * - After-hours work
 * - Load balance
 * - Meeting ROI
 */

import { WorkHealthDelta, MeetingROI } from '../models/loopClosing.js';
import MetricsDaily from '../models/metricsDaily.js';
import Team from '../models/team.js';

/**
 * Get metrics for a date range
 * @param {string} teamId - Team ID
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @returns {Object} - Aggregated metrics
 */
async function getMetricsForPeriod(teamId, startDate, endDate) {
  const metrics = await MetricsDaily.find({
    teamId,
    date: { $gte: startDate, $lte: endDate }
  });

  if (metrics.length === 0) {
    return {
      focusTimeHours: 0,
      meetingLoadHours: 0,
      fragmentationIndex: 0,
      afterHoursHours: 0,
      loadBalanceIndex: 50,
      meetingROI: 50,
      daysCounted: 0
    };
  }

  // Aggregate metrics
  const totals = metrics.reduce((acc, m) => {
    // Focus time from ratio (assume 8h workday)
    acc.focusTimeHours += (m.focusTimeRatio || 0) * 8;
    // Meeting load
    acc.meetingLoadHours += m.meetingHoursWeek || 0;
    // Response time as proxy for fragmentation
    acc.fragmentationIndex += m.responseMedianMins || 0;
    // After hours rate
    acc.afterHoursRate += m.afterHoursRate || 0;
    // Energy index as proxy for load balance
    acc.energyIndex += m.energyIndex || 50;
    return acc;
  }, {
    focusTimeHours: 0,
    meetingLoadHours: 0,
    fragmentationIndex: 0,
    afterHoursRate: 0,
    energyIndex: 0
  });

  const days = metrics.length;
  
  return {
    focusTimeHours: Math.round((totals.focusTimeHours / days) * 10) / 10,
    meetingLoadHours: Math.round((totals.meetingLoadHours / days) * 10) / 10,
    fragmentationIndex: Math.round((totals.fragmentationIndex / days) * 10) / 10,
    afterHoursHours: Math.round((totals.afterHoursRate / days) * 4) / 10, // Convert rate to hours estimate
    loadBalanceIndex: Math.round(totals.energyIndex / days),
    meetingROI: 50, // Will be enriched from MeetingROI model
    daysCounted: days
  };
}

/**
 * Get meeting ROI for a period
 * @param {string} teamId - Team ID
 * @param {Date} startDate - Start of period
 * @param {Date} endDate - End of period
 * @returns {number} - Average ROI score
 */
async function getMeetingROIForPeriod(teamId, startDate, endDate) {
  const roiRecords = await MeetingROI.find({
    teamId,
    date: { $gte: startDate, $lte: endDate }
  });

  if (roiRecords.length === 0) return 50;

  const avgROI = roiRecords.reduce((sum, r) => sum + (r.roiScore || 50), 0) / roiRecords.length;
  return Math.round(avgROI);
}

/**
 * Calculate percentage delta
 * @param {number} baseline - Baseline value
 * @param {number} current - Current value
 * @returns {number} - Percentage change
 */
function calculateDelta(baseline, current) {
  if (baseline === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - baseline) / baseline) * 1000) / 10;
}

/**
 * Determine delta status (green/yellow/red)
 * Positive changes are green for: focusTime, loadBalance, meetingROI
 * Negative changes are green for: meetingLoad, fragmentation, afterHours
 * 
 * @param {string} metric - Metric name
 * @param {number} delta - Percentage change
 * @returns {string} - 'green' | 'yellow' | 'red'
 */
function determineDeltaStatus(metric, delta) {
  // Metrics where increase is good
  const positiveIsGood = ['focusTime', 'loadBalance', 'meetingROI'];
  // Metrics where decrease is good
  const negativeIsGood = ['meetingLoad', 'fragmentation', 'afterHours'];

  const isGoodDirection = positiveIsGood.includes(metric) 
    ? delta > 0 
    : negativeIsGood.includes(metric) 
      ? delta < 0 
      : false;

  const absDelta = Math.abs(delta);

  if (isGoodDirection) {
    return absDelta > 5 ? 'green' : 'yellow';
  }
  
  if (absDelta > 15) return 'red';
  if (absDelta > 5) return 'yellow';
  return 'yellow';
}

/**
 * Determine overall status
 * @param {Object} deltas - All delta values
 * @param {Object} statuses - All status values
 * @returns {string} - 'improved' | 'stable' | 'declined'
 */
function determineOverallStatus(deltas, statuses) {
  const statusValues = Object.values(statuses);
  const greenCount = statusValues.filter(s => s === 'green').length;
  const redCount = statusValues.filter(s => s === 'red').length;

  if (greenCount >= 3 && redCount === 0) return 'improved';
  if (redCount >= 2) return 'declined';
  return 'stable';
}

/**
 * Generate summary message
 * @param {string} overallStatus - Overall status
 * @param {Object} deltas - Delta values
 * @returns {string} - Human-readable summary
 */
function generateSummaryMessage(overallStatus, deltas) {
  const highlights = [];
  
  if (Math.abs(deltas.focusTime) > 5) {
    const direction = deltas.focusTime > 0 ? '+' : '';
    highlights.push(`focus time ${direction}${deltas.focusTime}%`);
  }
  
  if (Math.abs(deltas.meetingLoad) > 5) {
    const direction = deltas.meetingLoad > 0 ? '+' : '';
    highlights.push(`meeting load ${direction}${deltas.meetingLoad}%`);
  }
  
  if (Math.abs(deltas.afterHours) > 5) {
    const direction = deltas.afterHours > 0 ? '+' : '';
    highlights.push(`after-hours work ${direction}${deltas.afterHours}%`);
  }

  const verb = overallStatus === 'improved' 
    ? 'improved' 
    : overallStatus === 'declined' 
      ? 'declined' 
      : 'remained stable';

  if (highlights.length === 0) {
    return `Work health ${verb} over the 30-day period`;
  }

  return `Work health ${verb}: ${highlights.join(', ')}`;
}

/**
 * Compute 30-Day Work Health Delta Report
 * @param {string} teamId - Team ID
 * @param {Object} options - Optional date overrides
 * @returns {Object} - Complete delta report
 */
export async function computeWorkHealthDelta(teamId, options = {}) {
  const team = await Team.findById(teamId);
  if (!team) throw new Error('Team not found');

  // Define periods
  const now = options.endDate || new Date();
  const periodEnd = new Date(now);
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 30);

  // Baseline: first 7 days
  const baselineStart = new Date(periodStart);
  const baselineEnd = new Date(periodStart);
  baselineEnd.setDate(baselineEnd.getDate() + 7);

  // Current: last 7 days
  const currentEnd = new Date(periodEnd);
  const currentStart = new Date(periodEnd);
  currentStart.setDate(currentStart.getDate() - 7);

  // Fetch metrics for both periods
  const [baselineMetrics, currentMetrics] = await Promise.all([
    getMetricsForPeriod(teamId, baselineStart, baselineEnd),
    getMetricsForPeriod(teamId, currentStart, currentEnd)
  ]);

  // Enrich with Meeting ROI
  const [baselineROI, currentROI] = await Promise.all([
    getMeetingROIForPeriod(teamId, baselineStart, baselineEnd),
    getMeetingROIForPeriod(teamId, currentStart, currentEnd)
  ]);

  baselineMetrics.meetingROI = baselineROI;
  currentMetrics.meetingROI = currentROI;

  // Calculate deltas
  const deltas = {
    focusTime: calculateDelta(baselineMetrics.focusTimeHours, currentMetrics.focusTimeHours),
    meetingLoad: calculateDelta(baselineMetrics.meetingLoadHours, currentMetrics.meetingLoadHours),
    fragmentation: calculateDelta(baselineMetrics.fragmentationIndex, currentMetrics.fragmentationIndex),
    afterHours: calculateDelta(baselineMetrics.afterHoursHours, currentMetrics.afterHoursHours),
    loadBalance: calculateDelta(baselineMetrics.loadBalanceIndex, currentMetrics.loadBalanceIndex),
    meetingROI: calculateDelta(baselineMetrics.meetingROI, currentMetrics.meetingROI)
  };

  // Determine status for each metric
  const deltaStatus = {
    focusTime: determineDeltaStatus('focusTime', deltas.focusTime),
    meetingLoad: determineDeltaStatus('meetingLoad', deltas.meetingLoad),
    fragmentation: determineDeltaStatus('fragmentation', deltas.fragmentation),
    afterHours: determineDeltaStatus('afterHours', deltas.afterHours),
    loadBalance: determineDeltaStatus('loadBalance', deltas.loadBalance),
    meetingROI: determineDeltaStatus('meetingROI', deltas.meetingROI)
  };

  // Overall verdict
  const overallStatus = determineOverallStatus(deltas, deltaStatus);
  const summaryMessage = generateSummaryMessage(overallStatus, deltas);

  return {
    teamId,
    orgId: team.orgId,
    reportDate: now,
    
    periodStart,
    periodEnd,
    
    baseline: {
      periodStart: baselineStart,
      periodEnd: baselineEnd,
      ...baselineMetrics
    },
    
    current: {
      periodStart: currentStart,
      periodEnd: currentEnd,
      ...currentMetrics
    },
    
    deltas,
    deltaStatus,
    overallStatus,
    summaryMessage,
    
    pdfGenerated: false,
    pdfUrl: null
  };
}

/**
 * Store Work Health Delta Report
 * @param {Object} reportData - Report data
 * @returns {Object} - Saved document
 */
export async function storeWorkHealthDelta(reportData) {
  const existing = await WorkHealthDelta.findOne({
    teamId: reportData.teamId,
    reportDate: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      $lt: new Date(new Date().setHours(23, 59, 59, 999))
    }
  });

  if (existing) {
    Object.assign(existing, reportData);
    return existing.save();
  }

  return WorkHealthDelta.create(reportData);
}

/**
 * Get Work Health Delta history
 * @param {string} teamId - Team ID
 * @param {number} count - Number of reports to fetch
 * @returns {Array} - Historical reports
 */
export async function getWorkHealthDeltaHistory(teamId, count = 10) {
  return WorkHealthDelta.find({ teamId })
    .sort({ reportDate: -1 })
    .limit(count);
}

/**
 * Get latest Work Health Delta Report
 * @param {string} teamId - Team ID
 * @returns {Object} - Latest report
 */
export async function getLatestWorkHealthDelta(teamId) {
  return WorkHealthDelta.findOne({ teamId }).sort({ reportDate: -1 });
}

/**
 * Generate PDF-friendly report data
 * @param {Object} report - Work Health Delta report
 * @returns {Object} - Formatted for PDF generation
 */
export function formatReportForPDF(report) {
  return {
    title: 'Work Health Delta Report',
    team: report.teamId,
    period: `${report.periodStart.toLocaleDateString()} - ${report.periodEnd.toLocaleDateString()}`,
    summary: report.summaryMessage,
    overallStatus: report.overallStatus,
    metrics: [
      {
        name: 'Focus Time',
        baseline: `${report.baseline.focusTimeHours}h/day`,
        current: `${report.current.focusTimeHours}h/day`,
        delta: `${report.deltas.focusTime > 0 ? '+' : ''}${report.deltas.focusTime}%`,
        status: report.deltaStatus.focusTime
      },
      {
        name: 'Meeting Load',
        baseline: `${report.baseline.meetingLoadHours}h/week`,
        current: `${report.current.meetingLoadHours}h/week`,
        delta: `${report.deltas.meetingLoad > 0 ? '+' : ''}${report.deltas.meetingLoad}%`,
        status: report.deltaStatus.meetingLoad
      },
      {
        name: 'Fragmentation',
        baseline: `${report.baseline.fragmentationIndex} switches/day`,
        current: `${report.current.fragmentationIndex} switches/day`,
        delta: `${report.deltas.fragmentation > 0 ? '+' : ''}${report.deltas.fragmentation}%`,
        status: report.deltaStatus.fragmentation
      },
      {
        name: 'After-Hours Work',
        baseline: `${report.baseline.afterHoursHours}h/week`,
        current: `${report.current.afterHoursHours}h/week`,
        delta: `${report.deltas.afterHours > 0 ? '+' : ''}${report.deltas.afterHours}%`,
        status: report.deltaStatus.afterHours
      },
      {
        name: 'Load Balance',
        baseline: `${report.baseline.loadBalanceIndex}/100`,
        current: `${report.current.loadBalanceIndex}/100`,
        delta: `${report.deltas.loadBalance > 0 ? '+' : ''}${report.deltas.loadBalance}%`,
        status: report.deltaStatus.loadBalance
      },
      {
        name: 'Meeting ROI',
        baseline: `${report.baseline.meetingROI}/100`,
        current: `${report.current.meetingROI}/100`,
        delta: `${report.deltas.meetingROI > 0 ? '+' : ''}${report.deltas.meetingROI}%`,
        status: report.deltaStatus.meetingROI
      }
    ]
  };
}

export default {
  computeWorkHealthDelta,
  storeWorkHealthDelta,
  getWorkHealthDeltaHistory,
  getLatestWorkHealthDelta,
  formatReportForPDF
};
