import WorkEvent from '../models/workEvent.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import IntegrationConnection from '../models/integrationConnection.js';
import User from '../models/user.js';
import Team from '../models/team.js';

/**
 * Integration Metrics Computation Service
 * 
 * Per Category-King spec:
 * - Computes daily + weekly rollups from work_events
 * - Uses trailing 28-day baselines with robust-z scoring
 * - Calculates composite Category-King metrics (CVIR, RCI, WAP, PIS)
 */

// ============================================================
// MAIN COMPUTATION FUNCTIONS
// ============================================================

/**
 * Compute daily metrics for an organization
 * Should be run daily via cron job
 */
export async function computeDailyMetrics(orgId, date = new Date()) {
  const normalizedDate = normalizeToUTC(date);
  const startOfDay = new Date(normalizedDate);
  const endOfDay = new Date(normalizedDate);
  endOfDay.setDate(endOfDay.getDate() + 1);
  
  console.log(`Computing daily metrics for org ${orgId} on ${normalizedDate.toISOString()}`);
  
  // Get connected integrations for data coverage
  const connections = await IntegrationConnection.find({ 
    orgId, 
    status: 'connected' 
  }).lean();
  
  const dataCoverage = buildDataCoverage(connections);
  
  // Get all teams for this org
  const teams = await Team.find({ orgId }).lean();
  
  // Compute org-level metrics
  await computeOrgMetrics(orgId, normalizedDate, startOfDay, endOfDay, dataCoverage);
  
  // Compute team-level metrics
  for (const team of teams) {
    await computeTeamMetrics(orgId, team._id, normalizedDate, startOfDay, endOfDay, dataCoverage);
  }
  
  console.log(`Daily metrics computation complete for org ${orgId}`);
}

/**
 * Compute metrics for a specific team
 */
async function computeTeamMetrics(orgId, teamId, date, startOfDay, endOfDay, dataCoverage) {
  // Get events for this team in the date range (7-day window for rolling metrics)
  const window7dStart = new Date(date);
  window7dStart.setDate(window7dStart.getDate() - 7);
  
  const events = await WorkEvent.find({
    orgId,
    teamId,
    timestamp: { $gte: window7dStart, $lt: endOfDay }
  }).lean();
  
  // Compute task metrics (Jira/Asana)
  const taskMetrics = computeTaskMetrics(events, date);
  
  // Compute email metrics (Gmail)
  const emailMetrics = computeEmailMetrics(events, date);
  
  // Compute meeting metrics (Google Meet/Calendar)
  const meetingMetrics = computeMeetingMetrics(events, date);
  
  // Compute Notion metrics
  const notionMetrics = computeNotionMetrics(events, date);
  
  // Compute CRM metrics (HubSpot/Pipedrive)
  const crmMetrics = computeCRMMetrics(events, date);
  
  // Compute Basecamp metrics
  const basecampMetrics = computeBasecampMetrics(events, date);
  
  // Get baseline data for robust-z calculations
  const baseline = await getTrailingBaseline(orgId, teamId, null, date, 28);
  
  // Compute Category-King composite metrics
  const compositeMetrics = computeCompositeMetrics(
    taskMetrics, 
    emailMetrics, 
    meetingMetrics, 
    crmMetrics,
    baseline
  );
  
  // Calculate confidence score
  const confidence = calculateConfidence(dataCoverage, events.length);
  
  // Determine which sources contributed
  const sources = [...new Set(events.map(e => e.source))];
  
  // Upsert daily metrics
  await IntegrationMetricsDaily.findOneAndUpdate(
    { orgId, teamId, userId: null, date },
    {
      $set: {
        ...taskMetrics,
        ...emailMetrics,
        ...meetingMetrics,
        ...notionMetrics,
        ...crmMetrics,
        ...basecampMetrics,
        ...compositeMetrics,
        baseline: {
          ...baseline,
          dataCoverage
        },
        sources,
        eventsProcessed: events.length,
        confidence
      }
    },
    { upsert: true }
  );
}

/**
 * Compute org-level aggregate metrics
 */
async function computeOrgMetrics(orgId, date, startOfDay, endOfDay, dataCoverage) {
  const window7dStart = new Date(date);
  window7dStart.setDate(window7dStart.getDate() - 7);
  
  const events = await WorkEvent.find({
    orgId,
    timestamp: { $gte: window7dStart, $lt: endOfDay }
  }).lean();
  
  const taskMetrics = computeTaskMetrics(events, date);
  const emailMetrics = computeEmailMetrics(events, date);
  const meetingMetrics = computeMeetingMetrics(events, date);
  const notionMetrics = computeNotionMetrics(events, date);
  const crmMetrics = computeCRMMetrics(events, date);
  const basecampMetrics = computeBasecampMetrics(events, date);
  
  const baseline = await getTrailingBaseline(orgId, null, null, date, 28);
  const compositeMetrics = computeCompositeMetrics(
    taskMetrics, 
    emailMetrics, 
    meetingMetrics, 
    crmMetrics,
    baseline
  );
  
  const confidence = calculateConfidence(dataCoverage, events.length);
  const sources = [...new Set(events.map(e => e.source))];
  
  await IntegrationMetricsDaily.findOneAndUpdate(
    { orgId, teamId: null, userId: null, date },
    {
      $set: {
        ...taskMetrics,
        ...emailMetrics,
        ...meetingMetrics,
        ...notionMetrics,
        ...crmMetrics,
        ...basecampMetrics,
        ...compositeMetrics,
        baseline: {
          ...baseline,
          dataCoverage
        },
        sources,
        eventsProcessed: events.length,
        confidence
      }
    },
    { upsert: true }
  );
}

// ============================================================
// TASK METRICS (Jira/Asana)
// ============================================================

function computeTaskMetrics(events, date) {
  const taskEvents = events.filter(e => 
    ['jira', 'asana'].includes(e.source)
  );
  
  const window7dStart = new Date(date);
  window7dStart.setDate(window7dStart.getDate() - 7);
  
  const events7d = taskEvents.filter(e => new Date(e.timestamp) >= window7dStart);
  
  // Task completions in 7d
  const completedEvents = events7d.filter(e => 
    e.eventType === 'task_completed' || 
    (e.eventType === 'task_status_changed' && 
     ['done', 'closed', 'complete', 'resolved'].includes(e.metadata?.statusCurrent?.toLowerCase()))
  );
  const tasksCompleted7d = completedEvents.length;
  
  // Tasks created in 7d
  const createdEvents = events7d.filter(e => e.eventType === 'task_created');
  const tasksCreated7d = createdEvents.length;
  
  // Tasks reopened in 7d
  const reopenedEvents = events7d.filter(e => e.eventType === 'task_reopened');
  const tasksReopened7d = reopenedEvents.length;
  
  // Reopen rate
  const reopenRate7d = tasksCompleted7d > 0 
    ? tasksReopened7d / tasksCompleted7d 
    : 0;
  
  // WIP: Count of open tasks (simplified - would need task state tracking for accuracy)
  // This is a proxy based on created - completed
  const wipOpenTasks = Math.max(0, tasksCreated7d - tasksCompleted7d);
  
  // Calculate previous 7d for comparison
  const window14dStart = new Date(date);
  window14dStart.setDate(window14dStart.getDate() - 14);
  const eventsPrev7d = taskEvents.filter(e => 
    new Date(e.timestamp) >= window14dStart && 
    new Date(e.timestamp) < window7dStart
  );
  const completedPrev7d = eventsPrev7d.filter(e => 
    e.eventType === 'task_completed' || 
    (e.eventType === 'task_status_changed' && 
     ['done', 'closed', 'complete', 'resolved'].includes(e.metadata?.statusCurrent?.toLowerCase()))
  ).length;
  
  // Completion change %
  const completionChange7d = completedPrev7d > 0
    ? ((tasksCompleted7d - completedPrev7d) / completedPrev7d) * 100
    : 0;
  
  // WIP growth
  const createdPrev7d = eventsPrev7d.filter(e => e.eventType === 'task_created').length;
  const wipPrev = Math.max(0, createdPrev7d - completedPrev7d);
  const wipGrowth7d = wipOpenTasks - wipPrev;
  
  // Cycle time (from status transitions)
  const cycleTimes = events7d
    .filter(e => e.metadata?.cycleTimeStartedAt && e.metadata?.cycleTimeCompletedAt)
    .map(e => {
      const start = new Date(e.metadata.cycleTimeStartedAt);
      const end = new Date(e.metadata.cycleTimeCompletedAt);
      return (end - start) / (1000 * 60 * 60 * 24); // days
    })
    .filter(ct => ct > 0 && ct < 365); // filter outliers
  
  const cycleTimeMedianDays = median(cycleTimes) || 0;
  const cycleTimeP90Days = percentile(cycleTimes, 90) || 0;
  
  // Task aging (would need task state for accurate calculation)
  // Proxy: average age based on created events still in progress
  const avgTaskAgeDays = cycleTimeMedianDays * 1.5; // rough proxy
  const p90TaskAgeDays = cycleTimeP90Days * 1.5;
  
  // Overdue metrics (from due date events)
  const overdueEvents = events7d.filter(e => 
    e.metadata?.dueOn && new Date(e.metadata.dueOn) < date
  );
  const overdueTasksCount = overdueEvents.length;
  
  // Assignment churn
  const assignmentEvents = events7d.filter(e => e.eventType === 'task_assigned');
  const assignmentChurn7d = assignmentEvents.length;
  
  return {
    wipOpenTasks,
    wipGrowth7d,
    avgTaskAgeDays,
    p90TaskAgeDays,
    tasksCompleted7d,
    tasksCreated7d,
    completionChange7d,
    tasksReopened7d,
    reopenRate7d,
    cycleTimeMedianDays,
    cycleTimeP90Days,
    overdueTasksCount,
    overdueGrowth7d: 0, // TODO: implement
    assignmentChurn7d
  };
}

// ============================================================
// EMAIL METRICS (Gmail)
// ============================================================

function computeEmailMetrics(events, date) {
  const emailEvents = events.filter(e => e.source === 'gmail');
  
  const window7dStart = new Date(date);
  window7dStart.setDate(window7dStart.getDate() - 7);
  const events7d = emailEvents.filter(e => new Date(e.timestamp) >= window7dStart);
  
  // Volume
  const sentEvents = events7d.filter(e => e.eventType === 'email_sent');
  const receivedEvents = events7d.filter(e => e.eventType === 'email_received');
  const emailSent7d = sentEvents.length;
  const emailReceived7d = receivedEvents.length;
  
  // After-hours
  const afterHoursSent = sentEvents.filter(e => e.metadata?.isAfterHours);
  const afterHoursSentCount = afterHoursSent.length;
  const afterHoursSentRatio = emailSent7d > 0 
    ? afterHoursSentCount / emailSent7d 
    : 0;
  
  // Reply latency
  const replyLatencies = events7d
    .filter(e => e.metadata?.replyLatencySeconds > 0)
    .map(e => e.metadata.replyLatencySeconds);
  const replyLatencyMedian7d = median(replyLatencies) || 0;
  
  // Thread bloat (threads with many replies)
  const threadCounts = {};
  events7d.forEach(e => {
    if (e.metadata?.threadIdHash) {
      threadCounts[e.metadata.threadIdHash] = (threadCounts[e.metadata.threadIdHash] || 0) + 1;
    }
  });
  const threadBloat7d = Object.values(threadCounts).filter(count => count > 5).length;
  
  // External email ratio
  const externalEmails = events7d.filter(e => e.metadata?.isExternal);
  const externalEmailRatio = events7d.length > 0 
    ? externalEmails.length / events7d.length 
    : 0;
  
  return {
    emailSent7d,
    emailReceived7d,
    afterHoursSentCount,
    afterHoursSentRatio,
    afterHoursBaseline28d: 0, // populated from baseline
    afterHoursDrift: 0, // populated from baseline comparison
    replyLatencyMedian7d,
    replyLatencyBaseline28d: 0,
    replyLatencyDrift: 0,
    threadBloat7d,
    externalEmailRatio
  };
}

// ============================================================
// MEETING METRICS (Google Meet / Calendar)
// ============================================================

function computeMeetingMetrics(events, date) {
  const meetEvents = events.filter(e => e.source === 'meet' || e.source === 'calendar');
  
  const window7dStart = new Date(date);
  window7dStart.setDate(window7dStart.getDate() - 7);
  const events7d = meetEvents.filter(e => new Date(e.timestamp) >= window7dStart);
  
  // Meeting count and duration
  const meetingStarts = events7d.filter(e => e.eventType === 'meet_started');
  const meetingCount7d = meetingStarts.length;
  
  const durations = events7d
    .filter(e => e.metadata?.durationMinutes > 0)
    .map(e => e.metadata.durationMinutes);
  const meetingDurationTotalHours7d = durations.reduce((sum, d) => sum + d, 0) / 60;
  
  // Ad-hoc meetings
  const adHocMeetings = events7d.filter(e => e.metadata?.isAdHoc);
  const adHocMeetingCount7d = adHocMeetings.length;
  const adHocMeetingRate7d = meetingCount7d > 0 
    ? adHocMeetingCount7d / meetingCount7d 
    : 0;
  
  // Back-to-back detection (meetings within 5 min of each other)
  const sortedMeetings = meetingStarts
    .map(e => ({ start: new Date(e.metadata?.startTime || e.timestamp), end: new Date(e.metadata?.endTime || e.timestamp) }))
    .sort((a, b) => a.start - b.start);
  
  let backToBackMeetingBlocks = 0;
  for (let i = 1; i < sortedMeetings.length; i++) {
    const gap = (sortedMeetings[i].start - sortedMeetings[i-1].end) / (1000 * 60); // minutes
    if (gap >= 0 && gap <= 5) {
      backToBackMeetingBlocks++;
    }
  }
  
  // Meeting fragmentation
  const gaps = [];
  for (let i = 1; i < sortedMeetings.length; i++) {
    const gap = (sortedMeetings[i].start - sortedMeetings[i-1].end) / (1000 * 60);
    if (gap > 0) gaps.push(gap);
  }
  const avgGapBetweenMeetingsMins = mean(gaps) || 0;
  const meetingFragmentationIndex = avgGapBetweenMeetingsMins > 0 
    ? meetingCount7d * (60 / avgGapBetweenMeetingsMins) 
    : 0;
  
  // External meetings
  const meetingsWithExternalParticipants = events7d.filter(e => e.metadata?.isExternalParticipant).length;
  
  return {
    meetingDurationTotalHours7d,
    meetingCount7d,
    adHocMeetingCount7d,
    adHocMeetingRate7d,
    backToBackMeetingBlocks,
    meetingFragmentationIndex,
    avgGapBetweenMeetingsMins,
    meetingsWithExternalParticipants
  };
}

// ============================================================
// NOTION METRICS
// ============================================================

function computeNotionMetrics(events, date) {
  const notionEvents = events.filter(e => e.source === 'notion');
  
  const window7dStart = new Date(date);
  window7dStart.setDate(window7dStart.getDate() - 7);
  const events7d = notionEvents.filter(e => new Date(e.timestamp) >= window7dStart);
  
  // Edit churn (edits per page)
  const pageEdits = {};
  events7d.filter(e => e.eventType === 'page_updated').forEach(e => {
    if (e.metadata?.pageIdHash) {
      pageEdits[e.metadata.pageIdHash] = (pageEdits[e.metadata.pageIdHash] || 0) + 1;
    }
  });
  const editChurn7d = mean(Object.values(pageEdits)) || 0;
  
  // High collaboration pages
  const highCollabPages7d = events7d.filter(e => 
    e.metadata?.collaboratorCount > 3
  ).length;
  
  // Distinct pages edited per day
  const pagesPerDay = {};
  events7d.forEach(e => {
    const day = new Date(e.timestamp).toISOString().split('T')[0];
    if (!pagesPerDay[day]) pagesPerDay[day] = new Set();
    if (e.metadata?.pageIdHash) pagesPerDay[day].add(e.metadata.pageIdHash);
  });
  const distinctPagesEditedPerDay = mean(Object.values(pagesPerDay).map(s => s.size)) || 0;
  
  return {
    editChurn7d,
    orphanPages30d: 0, // TODO: requires longer history
    highCollabPages7d,
    docChurnPerUser7d: editChurn7d, // simplified
    distinctPagesEditedPerDay
  };
}

// ============================================================
// CRM METRICS (HubSpot/Pipedrive)
// ============================================================

function computeCRMMetrics(events, date) {
  const crmEvents = events.filter(e => 
    ['hubspot', 'pipedrive'].includes(e.source)
  );
  
  const window7dStart = new Date(date);
  window7dStart.setDate(window7dStart.getDate() - 7);
  const events7d = crmEvents.filter(e => new Date(e.timestamp) >= window7dStart);
  
  // Deals with multiple stage changes
  const dealStageChanges = {};
  events7d.filter(e => e.eventType === 'deal_stage_changed').forEach(e => {
    if (e.metadata?.dealIdHash) {
      dealStageChanges[e.metadata.dealIdHash] = (dealStageChanges[e.metadata.dealIdHash] || 0) + 1;
    }
  });
  const dealsWithMultipleStageChanges7d = Object.values(dealStageChanges).filter(c => c > 2).length;
  const totalDeals = Object.keys(dealStageChanges).length;
  const escalationRate7d = totalDeals > 0 
    ? dealsWithMultipleStageChanges7d / totalDeals 
    : 0;
  
  // Close date slips
  const closeDateEvents = events7d.filter(e => e.eventType === 'deal_close_date_changed');
  const closeDateSlips7d = closeDateEvents.length;
  const closeDateSlipRate7d = totalDeals > 0 
    ? closeDateSlips7d / totalDeals 
    : 0;
  
  // Handoff spike (CRM changes followed by task creation)
  // This would need cross-source correlation
  const handoffSpike48h = 0; // TODO: implement cross-source correlation
  
  // Tickets
  const ticketsCreated7d = events7d.filter(e => e.eventType === 'ticket_created').length;
  
  return {
    dealsWithMultipleStageChanges7d,
    escalationRate7d,
    closeDateSlips7d,
    closeDateSlipRate7d,
    handoffSpike48h,
    ticketsCreated7d
  };
}

// ============================================================
// BASECAMP METRICS
// ============================================================

function computeBasecampMetrics(events, date) {
  const basecampEvents = events.filter(e => e.source === 'basecamp');
  
  const window7dStart = new Date(date);
  window7dStart.setDate(window7dStart.getDate() - 7);
  const events7d = basecampEvents.filter(e => new Date(e.timestamp) >= window7dStart);
  
  const postsCreated7d = events7d.filter(e => e.eventType === 'post_created').length;
  const todosCreated7d = events7d.filter(e => e.eventType === 'todo_created').length;
  const todosCompleted7d = events7d.filter(e => e.eventType === 'todo_completed').length;
  
  // Response gaps
  const responseGaps = events7d
    .filter(e => e.metadata?.responseGapSeconds > 0)
    .map(e => e.metadata.responseGapSeconds);
  const responseGapMedian = median(responseGaps) || 0;
  
  // Unanswered posts (posts without comments) - simplified
  const unansweredPostRate7d = postsCreated7d > 0 
    ? Math.max(0, 1 - (events7d.filter(e => e.eventType === 'comment_added').length / postsCreated7d))
    : 0;
  
  return {
    postsCreated7d,
    todosCreated7d,
    todosCompleted7d,
    responseGapMedian,
    unansweredPostRate7d
  };
}

// ============================================================
// CATEGORY-KING COMPOSITE METRICS
// ============================================================

function computeCompositeMetrics(taskMetrics, emailMetrics, meetingMetrics, crmMetrics, baseline) {
  const epsilon = 0.001;
  
  // A) CVIR - Completion vs Interruption Ratio
  // CVIR = completed_tasks_7d / (interrupt_events_7d + 1)
  const interruptEvents7d = (meetingMetrics.adHocMeetingCount7d || 0) + 
                            Math.floor((emailMetrics.emailReceived7d || 0) / 10); // email spikes proxy
  const cvir = (taskMetrics.tasksCompleted7d || 0) / (interruptEvents7d + 1);
  
  // CVIR trend (would need previous period)
  const cvirTrend7d = 0; // TODO: compute from history
  
  // B) RCI - Recovery Collapse Index
  // RCI = z(back_to_back) + z(after_hours_ratio) + z(1/avg_gap)
  const backToBackZ = computeRobustZ(
    meetingMetrics.backToBackMeetingBlocks || 0,
    baseline.backToBackBlocksMedian || 0,
    baseline.backToBackBlocksMAD || 1
  );
  
  const afterHoursZ = computeRobustZ(
    emailMetrics.afterHoursSentRatio || 0,
    baseline.afterHoursSentRatioMedian || 0,
    baseline.afterHoursSentRatioMAD || 0.1
  );
  
  const gapInverse = meetingMetrics.avgGapBetweenMeetingsMins > 0 
    ? 60 / meetingMetrics.avgGapBetweenMeetingsMins 
    : 0;
  const gapInverseZ = computeRobustZ(gapInverse, 0.5, 0.3);
  
  const rciRaw = backToBackZ + afterHoursZ + gapInverseZ;
  const rci = clampSeverity(rciRaw);
  
  // C) WAP - Work Aging Pressure
  // WAP = z(avg_task_age) + z(wip_growth) + z(overdue_growth)
  const taskAgeZ = computeRobustZ(
    taskMetrics.avgTaskAgeDays || 0,
    baseline.avgTaskAgeDaysMedian || 0,
    baseline.avgTaskAgeDaysMAD || 1
  );
  
  const wipGrowthZ = computeRobustZ(
    taskMetrics.wipGrowth7d || 0,
    0, // baseline is 0 growth
    5  // assume 5 is typical MAD
  );
  
  const overdueGrowthZ = computeRobustZ(
    taskMetrics.overdueGrowth7d || 0,
    0,
    3
  );
  
  const wapRaw = taskAgeZ + wipGrowthZ + overdueGrowthZ;
  const wap = clampSeverity(wapRaw);
  
  // D) PIS - Pressure Injection Score
  // PIS = z(CRM_escalation_rate) + z(handoff_spike)
  const escalationZ = computeRobustZ(
    crmMetrics.escalationRate7d || 0,
    baseline.escalationRate7dMedian || 0,
    baseline.escalationRate7dMAD || 0.1
  );
  
  const handoffZ = computeRobustZ(
    crmMetrics.handoffSpike48h || 0,
    0,
    2
  );
  
  const pisRaw = escalationZ + handoffZ;
  const pis = clampSeverity(pisRaw);
  
  return {
    interruptEvents7d,
    cvir,
    cvirTrend7d,
    rci,
    rciComponents: {
      backToBackZ,
      afterHoursZ,
      gapInverseZ
    },
    wap,
    wapComponents: {
      taskAgeZ,
      wipGrowthZ,
      overdueGrowthZ
    },
    pis,
    pisComponents: {
      escalationZ,
      handoffZ
    }
  };
}

// ============================================================
// BASELINE COMPUTATION
// ============================================================

async function getTrailingBaseline(orgId, teamId, userId, date, days) {
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - days);
  
  const query = { 
    orgId, 
    date: { $gte: startDate, $lt: date }
  };
  if (teamId) query.teamId = teamId;
  if (userId) query.userId = userId;
  
  const historicalMetrics = await IntegrationMetricsDaily.find(query)
    .sort({ date: -1 })
    .lean();
  
  if (historicalMetrics.length === 0) {
    return {}; // No baseline data yet
  }
  
  // Compute medians and MADs for key metrics
  const wipOpenTasks = historicalMetrics.map(m => m.wipOpenTasks || 0);
  const avgTaskAgeDays = historicalMetrics.map(m => m.avgTaskAgeDays || 0);
  const tasksCompleted7d = historicalMetrics.map(m => m.tasksCompleted7d || 0);
  const afterHoursSentRatio = historicalMetrics.map(m => m.afterHoursSentRatio || 0);
  const replyLatencyMedian = historicalMetrics.map(m => m.replyLatencyMedian7d || 0);
  const backToBackBlocks = historicalMetrics.map(m => m.backToBackMeetingBlocks || 0);
  const escalationRate = historicalMetrics.map(m => m.escalationRate7d || 0);
  
  return {
    wipOpenTasksMedian: median(wipOpenTasks),
    wipOpenTasksMAD: mad(wipOpenTasks),
    avgTaskAgeDaysMedian: median(avgTaskAgeDays),
    avgTaskAgeDaysMAD: mad(avgTaskAgeDays),
    tasksCompleted7dMedian: median(tasksCompleted7d),
    tasksCompleted7dMAD: mad(tasksCompleted7d),
    afterHoursSentRatioMedian: median(afterHoursSentRatio),
    afterHoursSentRatioMAD: mad(afterHoursSentRatio),
    replyLatencyMedianMedian: median(replyLatencyMedian),
    replyLatencyMedianMAD: mad(replyLatencyMedian),
    backToBackBlocksMedian: median(backToBackBlocks),
    backToBackBlocksMAD: mad(backToBackBlocks),
    escalationRate7dMedian: median(escalationRate),
    escalationRate7dMAD: mad(escalationRate)
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function normalizeToUTC(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function buildDataCoverage(connections) {
  const coverage = {
    jiraConnected: false,
    asanaConnected: false,
    gmailConnected: false,
    meetConnected: false,
    notionConnected: false,
    hubspotConnected: false,
    pipedriveConnected: false,
    basecampConnected: false,
    userMappingPercent: 0
  };
  
  let totalMapped = 0;
  let totalUsers = 0;
  
  for (const conn of connections) {
    if (conn.status === 'connected') {
      coverage[`${conn.integrationType}Connected`] = true;
      totalMapped += conn.coverage?.mappedUsers || 0;
      totalUsers += conn.coverage?.totalUsers || 0;
    }
  }
  
  coverage.userMappingPercent = totalUsers > 0 
    ? Math.round((totalMapped / totalUsers) * 100) 
    : 0;
  
  return coverage;
}

function calculateConfidence(dataCoverage, eventsCount) {
  let score = 0;
  
  // +25 for task management connected
  if (dataCoverage.jiraConnected || dataCoverage.asanaConnected) {
    score += 25;
  }
  
  // +25 for communication connected
  if (dataCoverage.gmailConnected) {
    score += 25;
  }
  
  // +25 for calendar/meetings
  if (dataCoverage.meetConnected) {
    score += 25;
  }
  
  // +15 for user mapping
  score += Math.min(15, dataCoverage.userMappingPercent * 0.15);
  
  // +10 for having enough events
  if (eventsCount > 100) {
    score += 10;
  } else if (eventsCount > 20) {
    score += 5;
  }
  
  return Math.min(100, Math.round(score));
}

/**
 * Compute robust z-score using MAD
 * robust_z = (value - median) / (MAD + epsilon)
 */
function computeRobustZ(value, median, mad) {
  const epsilon = 0.001;
  return (value - median) / (mad + epsilon);
}

/**
 * Convert robust-z to severity (0-100)
 * severity = clamp(50 + 15*robust_z, 0, 100)
 */
function clampSeverity(robustZ) {
  const raw = 50 + 15 * robustZ;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

function mad(arr) {
  if (!arr || arr.length === 0) return 0;
  const med = median(arr);
  const deviations = arr.map(v => Math.abs(v - med));
  return median(deviations);
}

function percentile(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Compute weekly rollups for an organization
 * Aggregates daily metrics into weekly summaries
 */
export async function computeWeeklyRollups(orgId) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  console.log(`Computing weekly rollups for org ${orgId}`);
  
  // Get all daily metrics from the past week
  const dailyMetrics = await IntegrationMetricsDaily.find({
    orgId,
    date: { $gte: weekAgo, $lte: now },
    granularity: 'daily'
  }).lean();
  
  if (dailyMetrics.length === 0) {
    console.log(`No daily metrics found for org ${orgId}`);
    return null;
  }
  
  // Group by scope (org, team, user)
  const byScope = {};
  for (const metric of dailyMetrics) {
    const key = `${metric.scope?.level || 'org'}-${metric.scope?.teamId || 'all'}-${metric.scope?.userId || 'all'}`;
    if (!byScope[key]) {
      byScope[key] = [];
    }
    byScope[key].push(metric);
  }
  
  // Create weekly rollup for each scope
  const rollups = [];
  for (const [key, metrics] of Object.entries(byScope)) {
    const avgMetrics = {
      taskCompletionRate: average(metrics.map(m => m.taskCompletionRate)),
      wipCurrent: average(metrics.map(m => m.wipCurrent)),
      cycleTimeMedianHours: average(metrics.map(m => m.cycleTimeMedianHours)),
      reopenRate: average(metrics.map(m => m.reopenRate)),
      afterHoursRatio: average(metrics.map(m => m.afterHoursRatio)),
      meetingMinutesTotal: sum(metrics.map(m => m.meetingMinutesTotal)),
      avgRecoveryMinutes: average(metrics.map(m => m.avgRecoveryMinutes)),
      categoryKingMetrics: {
        cvir: average(metrics.map(m => m.categoryKingMetrics?.cvir)),
        rci: average(metrics.map(m => m.categoryKingMetrics?.rci)),
        wap: average(metrics.map(m => m.categoryKingMetrics?.wap)),
        pis: average(metrics.map(m => m.categoryKingMetrics?.pis))
      }
    };
    
    const sample = metrics[0];
    const weeklyMetric = {
      orgId,
      date: normalizeToUTC(now),
      granularity: 'weekly',
      scope: sample.scope,
      ...avgMetrics,
      dataCoverage: sample.dataCoverage
    };
    
    rollups.push(weeklyMetric);
  }
  
  // Upsert weekly rollups
  for (const rollup of rollups) {
    await IntegrationMetricsDaily.findOneAndUpdate(
      {
        orgId: rollup.orgId,
        date: rollup.date,
        granularity: 'weekly',
        'scope.level': rollup.scope?.level,
        'scope.teamId': rollup.scope?.teamId,
        'scope.userId': rollup.scope?.userId
      },
      { $set: rollup },
      { upsert: true }
    );
  }
  
  console.log(`Created ${rollups.length} weekly rollups for org ${orgId}`);
  return rollups;
}

function sum(arr) {
  const valid = arr.filter(v => v != null && !isNaN(v));
  return valid.reduce((a, b) => a + b, 0);
}

function average(arr) {
  const valid = arr.filter(v => v != null && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export default {
  computeDailyMetrics,
  computeWeeklyRollups,
  computeRobustZ,
  clampSeverity,
  median,
  mad
};
