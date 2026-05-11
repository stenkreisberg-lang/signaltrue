import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import DriftEvent from '../models/driftEvent.js';
import BehavioralDriftIndex from '../models/behavioralDriftIndex.js';
import Team from '../models/team.js';
import DriftPlaybook from '../models/driftPlaybook.js';
import WorkEvent from '../models/workEvent.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import Signal from '../models/signal.js';
import CategoryKingSignal from '../models/categoryKingSignal.js';
import WeekContext from '../models/weekContext.js';
import { generateWeeklyAIAnalysis, INDUSTRY_BENCHMARKS } from './weeklyAIAnalysisService.js';
import { calculateTeamStatus, getStatusMeta, STATUS_LEVELS } from './escalationService.js';
import { ccSuperadmin } from './superadminNotifyService.js';

// ─── Signal type presentation (same as in signals.js) ───
const SIGNAL_TYPE_PRESENTATION = {
  'meeting-load-spike': { family: 'Capacity Drift', businessTitle: 'Meeting load is crowding out productive work', whatItMeans: 'Teams are spending more time coordinating than executing.' },
  'after-hours-creep': { family: 'Capacity Drift', businessTitle: 'Work is spilling further outside working hours', whatItMeans: 'Capacity pressure may be building before people explicitly report overload.' },
  'focus-erosion': { family: 'Capacity Drift', businessTitle: 'Focused work time is getting fragmented', whatItMeans: 'Execution quality can drop when attention is repeatedly split.' },
  'recovery-deficit': { family: 'Capacity Drift', businessTitle: 'Recovery time between workdays is shrinking', whatItMeans: 'Sustained recovery loss often precedes strain, slower decisions, and burnout risk.' },
  'context-switching': { family: 'Capacity Drift', businessTitle: 'Work patterns are becoming more fragmented', whatItMeans: 'Higher fragmentation usually means less sustained progress on meaningful work.' },
  'network-bottleneck': { family: 'Coordination Drift', businessTitle: 'Cross-team coordination depends on too few people', whatItMeans: 'This can slow decisions and create fragile points of failure.' },
  'handoff-bottleneck': { family: 'Coordination Drift', businessTitle: 'Handoffs are creating coordination drag', whatItMeans: 'Execution friction often rises when ownership and handoffs are unclear.' },
  'response-delay-increase': { family: 'Coordination Drift', businessTitle: 'Responsiveness is slowing down', whatItMeans: 'This can be an early sign of overload, unclear ownership, or collaboration friction.' },
  'message-volume-drop': { family: 'Cohesion Drift', businessTitle: 'Team connection signals are thinning out', whatItMeans: 'This does not prove disengagement, but it can signal weaker team cohesion conditions.' },
  'rework-churn': { family: 'Coordination Drift', businessTitle: 'More work is being revisited or reworked', whatItMeans: 'Rework often points to coordination breakdowns, unclear decisions, or overload.' },
  'sentiment-decline': { family: 'Cohesion Drift', businessTitle: 'Team cohesion conditions may be weakening', whatItMeans: 'This should be treated as a directional structural signal, not a direct reading of emotion.' },
  'meeting-exclusion': { family: 'Culture Drift', businessTitle: 'Some team members are being left out of meetings', whatItMeans: 'Exclusion from meetings often means exclusion from decisions and context.' },
  'peripheral-member': { family: 'Culture Drift', businessTitle: 'A team member is becoming structurally peripheral', whatItMeans: 'Peripheral members often disengage quietly before anyone notices.' },
  'hybrid-response-gap': { family: 'Culture Drift', businessTitle: 'Remote or hybrid members wait longer for responses', whatItMeans: 'When remote members consistently wait longer, it signals an invisible inclusion gap.' },
  'fading-voice': { family: 'Culture Drift', businessTitle: 'A team member has declining participation over time', whatItMeans: 'A fading voice is often the earliest metadata signal of disengagement or burnout.' },
};

// ─── CK signal type labels ───
const CK_SIGNAL_LABELS = {
  'execution_stagnation': { label: 'Execution Stagnation', family: 'Coordination', rec: 'Review task backlogs and unblock stalled items. Consider a focused sprint reset.' },
  'rework_spiral': { label: 'Rework Spiral', family: 'Coordination', rec: 'Audit the last 3 items that were reopened. Look for unclear requirements or rushed handoffs.' },
  'overcommitment_risk': { label: 'Overcommitment Risk', family: 'Capacity', rec: 'Reduce WIP limits and defer new commitments until current work is shipped.' },
  'wip_overload': { label: 'WIP Overload', family: 'Capacity', rec: 'Cap active tasks per person at 3. Move everything else to a "next up" column.' },
  'boundary_erosion': { label: 'Boundary Erosion', family: 'Capacity', rec: 'Enforce no-meeting blocks and limit after-hours notifications. Model healthy boundaries from leadership.' },
  'panic_coordination': { label: 'Panic Coordination', family: 'Coordination', rec: 'Identify what triggered the coordination spike. Establish a calmer escalation path for next time.' },
  'meeting_fatigue': { label: 'Meeting Fatigue', family: 'Capacity', rec: 'Cancel the lowest-value recurring meeting this week. Shorten default meeting durations to 25/50 min.' },
  'response_drift': { label: 'Response Drift', family: 'Coordination', rec: 'Check if key people are overloaded. Set explicit response-time norms for different channels.' },
  'decision_churn': { label: 'Decision Churn', family: 'Coordination', rec: 'Identify decisions that keep getting revisited. Assign a single decision owner with a deadline.' },
  'documentation_decay': { label: 'Documentation Decay', family: 'Cohesion', rec: 'Schedule 1 hour of documentation cleanup. Archive stale pages and update key docs.' },
  'cognitive_overload': { label: 'Cognitive Overload', family: 'Capacity', rec: 'Reduce context-switching by batching similar work. Protect 2-hour deep-work blocks.' },
  'external_pressure_injection': { label: 'External Pressure Injection', family: 'External', rec: 'Buffer the team from raw client urgency. Filter and prioritize external requests before routing.' },
  'escalation_cascade': { label: 'Escalation Cascade', family: 'Coordination', rec: 'Review escalation triggers. Empower front-line decision-making where possible.' },
  'handoff_spike': { label: 'Handoff Spike', family: 'Coordination', rec: 'Clarify handoff protocols. Assign clear "last responsible person" for each workflow stage.' },
  'recovery_collapse': { label: 'Recovery Collapse', family: 'Capacity', rec: 'This is urgent. Protect recovery windows immediately — block mornings, reduce meeting days, enforce boundaries.' },
  'work_aging_pressure': { label: 'Work Aging Pressure', family: 'Coordination', rec: 'Old work is piling up. Triage and close stale items. Focus energy on finishing, not starting.' },
  'systemic_overload': { label: 'Systemic Overload', family: 'Capacity', rec: 'Multiple overload indicators firing. Leadership should visibly reduce scope and protect the team this week.' },
  'passive_disengagement': { label: 'Passive Disengagement', family: 'Cohesion', rec: 'Check in directly with quieter team members. Create low-pressure opportunities to contribute.' },
  'async_breakdown': { label: 'Async Breakdown', family: 'Coordination', rec: 'Async collaboration is failing. Agree on response-time norms and consolidate async channels.' },
};

// Configure nodemailer (update with real SMTP in production)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASS || 'password',
  },
});

// ─── Helper functions ───
function pct(curr, prev) {
  if (prev == null || prev === 0) return curr > 0 ? '+100%' : '0%';
  const d = Math.round(((curr - prev) / prev) * 100);
  return (d > 0 ? '+' : '') + d + '%';
}
function pctChangeLabel(curr, prev) {
  if (prev == null || prev === 0) return curr > 0 ? '↑ new' : '—';
  const d = Math.round(((curr - prev) / prev) * 100);
  return d > 0 ? `↑ ${d}%` : d < 0 ? `↓ ${Math.abs(d)}%` : '→ same';
}
function trendIcon(curr, prev, higherIsBad = true) {
  if (curr === prev || (curr === 0 && prev === 0)) return '➡️';
  if (higherIsBad) return curr > prev ? '🔴' : '🟢';
  return curr > prev ? '🟢' : '🔴';
}
function fmtNum(n, decimals = 0) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toFixed(decimals);
}
function avgField(arr, field) {
  const vals = arr.map(m => m[field]).filter(v => v != null && !isNaN(v));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

// ─── Styles ───
const S = {
  card: 'background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; padding:20px 24px; margin-bottom:20px;',
  cardAlert: (color) => `background:#ffffff; border-left:4px solid ${color}; border:1px solid #e5e7eb; border-left:4px solid ${color}; border-radius:12px; padding:20px 24px; margin-bottom:16px;`,
  h2: 'color:#111827; font-size:22px; font-weight:700; margin:0 0 4px 0;',
  h3: 'color:#6366f1; font-size:17px; font-weight:700; margin:24px 0 12px 0;',
  h4: 'color:#374151; font-size:15px; font-weight:600; margin:16px 0 8px 0;',
  p: 'color:#4b5563; font-size:14px; line-height:1.6; margin:0 0 8px 0;',
  pSmall: 'color:#9ca3af; font-size:12px; line-height:1.5; margin:4px 0;',
  badge: (bg, color) => `display:inline-block; background:${bg}; color:${color}; font-size:12px; font-weight:600; padding:2px 10px; border-radius:20px; margin-right:6px;`,
  table: 'border-collapse:collapse; width:100%; font-family:sans-serif; font-size:13px;',
  th: 'text-align:left; padding:8px 10px; border-bottom:2px solid #e5e7eb; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;',
  thR: 'text-align:right; padding:8px 10px; border-bottom:2px solid #e5e7eb; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;',
  td: 'padding:6px 10px; border-bottom:1px solid #f3f4f6;',
  tdR: 'text-align:right; padding:6px 10px; border-bottom:1px solid #f3f4f6;',
  tdBold: 'text-align:right; padding:6px 10px; border-bottom:1px solid #f3f4f6; font-weight:600;',
  divider: 'border:0; border-top:1px solid #e5e7eb; margin:24px 0;',
  recBox: 'background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px 16px; margin:8px 0;',
  warnBox: 'background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:12px 16px; margin:8px 0;',
  alertBox: 'background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:12px 16px; margin:8px 0;',
};

// ─── Manager Discussion Prompt Generator ───
function generateManagerPrompts({ tw, lw, sixWeekAvg, observations, orgStatus, teamBDIData, twSignals }) {
  const prompts = [];

  // Meeting load prompts
  if (tw.meetingHours > 0) {
    const hoursPerDay = tw.meetingHours / 5;
    if (hoursPerDay > 3.5) {
      prompts.push(`Your team is averaging ${fmtNum(hoursPerDay, 1)} hours of meetings per day. Which meetings this week felt most valuable, and which could have been an email or async update?`);
    }
    if (tw.meetingHours > lw.meetingHours * 1.2) {
      prompts.push(`Meeting hours jumped ${Math.round(((tw.meetingHours - lw.meetingHours) / lw.meetingHours) * 100)}% this week. Was this driven by a specific project, or is coordination overhead growing?`);
    }
  }

  // Back-to-back prompts
  if (tw.backToBack > 5) {
    prompts.push(`There were ${Math.round(tw.backToBack)} back-to-back meeting blocks this week. Are people getting enough transition time between calls? Could you add 10-minute buffers?`);
  }

  // After-hours prompts
  const afterHoursPct = Math.round((tw.afterHoursRatio || 0) * 100);
  if (afterHoursPct > 20) {
    prompts.push(`${afterHoursPct}% of messages were sent outside working hours. Is the team feeling deadline pressure, or has after-hours work become a cultural norm?`);
  }

  // Focus time prompts
  if (tw.focusTimeAvailability && tw.focusTimeAvailability / 5 < 2.5) {
    prompts.push(`Focus time availability is only ${fmtNum(tw.focusTimeAvailability / 5, 1)} hours per day. What's making it hard for people to get uninterrupted work done?`);
  }

  // Communication drop
  if (lw.messages > 0 && tw.messages < lw.messages * 0.75) {
    prompts.push(`Team messaging dropped significantly. Is the team in deep-work mode, or are people disengaging from shared channels?`);
  }

  // Drift state prompts
  const driftingTeams = teamBDIData.filter(t => ['Early Drift', 'Developing Drift', 'Critical Drift'].includes(t.bdi?.driftState));
  if (driftingTeams.length > 0) {
    const names = driftingTeams.map(t => t.teamName).join(', ');
    prompts.push(`${names} ${driftingTeams.length > 1 ? 'are' : 'is'} showing drift signals. Have you noticed anything different in team dynamics or workload recently?`);
  }

  // Escalation-related
  if (orgStatus.status === STATUS_LEVELS.EMERGING_DRIFT || orgStatus.status === STATUS_LEVELS.CONFIRMED_DRIFT) {
    prompts.push(`The organization is in "${orgStatus.status}" status. What's the single biggest pressure your team is facing right now?`);
  }

  // Signal-specific
  const capacitySignals = twSignals.filter(s => SIGNAL_TYPE_PRESENTATION[s.signalType]?.family === 'Capacity Drift');
  if (capacitySignals.length >= 2) {
    prompts.push(`Multiple capacity signals are active. If you had to cut 20% of this week's commitments, what would you drop?`);
  }

  // Calendar fragmentation
  if (tw.calendarFragmentation > 60) {
    prompts.push(`Calendar fragmentation is high (${fmtNum(tw.calendarFragmentation, 0)}/100). Are meetings spread too thin across the day? Could you consolidate them into blocks?`);
  }

  return prompts;
}

export async function generateWeeklyBrief(orgId) {
  const org = await Organization.findById(orgId);
  const teams = await Team.find({ orgId });
  const now = new Date();

  // ─── Date windows ───
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - 7);
  thisWeekStart.setHours(0, 0, 0, 0);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const sixWeekStart = new Date(thisWeekStart);
  sixWeekStart.setDate(sixWeekStart.getDate() - 42); // 6 full weeks before this week

  // ─── Data coverage: how many users have calendar events this week ───
  const totalUsers = await User.countDocuments({ orgId: org._id });
  const usersWithDataThisWeek = await WorkEvent.distinct('actorUserId', {
    orgId: org._id,
    source: { $in: ['microsoft-outlook', 'google-calendar'] },
    eventType: 'meeting',
    actorUserId: { $ne: null },
    timestamp: { $gte: thisWeekStart, $lte: now },
  });
  const connectedUserCount = Math.max(usersWithDataThisWeek.length, 1); // avoid div-by-zero
  const coveragePct = totalUsers > 0 ? Math.round((usersWithDataThisWeek.length / totalUsers) * 100) : 0;

  // ─── Fetch all data in parallel ───
  const [
    twEvents, lwEvents,
    twMetricsArr, lwMetricsArr,
    sixWeekMetricsArr,
    twSignals, lwSignals,
    twCKSignals, lwCKSignals,
    driftEvents,
    contextTags
  ] = await Promise.all([
    WorkEvent.aggregate([
      { $match: { orgId: org._id, timestamp: { $gte: thisWeekStart, $lte: now } } },
      { $group: { _id: { source: '$source', eventType: '$eventType' }, count: { $sum: 1 } } }
    ]),
    WorkEvent.aggregate([
      { $match: { orgId: org._id, timestamp: { $gte: lastWeekStart, $lt: thisWeekStart } } },
      { $group: { _id: { source: '$source', eventType: '$eventType' }, count: { $sum: 1 } } }
    ]),
    IntegrationMetricsDaily.find({ orgId: org._id, date: { $gte: thisWeekStart, $lte: now } }).lean(),
    IntegrationMetricsDaily.find({ orgId: org._id, date: { $gte: lastWeekStart, $lt: thisWeekStart } }).lean(),
    IntegrationMetricsDaily.find({ orgId: org._id, date: { $gte: sixWeekStart, $lt: thisWeekStart } }).lean(),
    Signal.find({ orgId: org._id, firstDetected: { $gte: thisWeekStart, $lte: now } }).populate('teamId', 'name').lean(),
    Signal.find({ orgId: org._id, firstDetected: { $gte: lastWeekStart, $lt: thisWeekStart } }).populate('teamId', 'name').lean(),
    CategoryKingSignal.find({ orgId: org._id, detectedAt: { $gte: thisWeekStart, $lte: now } }).lean(),
    CategoryKingSignal.find({ orgId: org._id, detectedAt: { $gte: lastWeekStart, $lt: thisWeekStart } }).lean(),
    DriftEvent.find({ orgId, date: { $gte: thisWeekStart } }).sort({ date: -1 }).lean(),
    WeekContext.find({ orgId: org._id, weekStart: { $lte: now }, weekEnd: { $gte: thisWeekStart } }).lean(),
  ]);

  // ─── BDI data ───
  const teamBDIData = [];
  for (const team of teams) {
    const latestBDI = await BehavioralDriftIndex.findOne({ team: team._id })
      .sort({ calculatedAt: -1 }).populate('recommendedPlaybooks').limit(1).lean();
    const prevBDI = await BehavioralDriftIndex.findOne({ team: team._id, calculatedAt: { $lt: thisWeekStart } })
      .sort({ calculatedAt: -1 }).limit(1).lean();
    if (latestBDI) teamBDIData.push({ teamName: team.name, bdi: latestBDI, prevBDI });
  }

  // ─── Derived metrics ───
  const getCount = (arr, source, eventType) => (arr.find(e => e._id.source === source && e._id.eventType === eventType))?.count || 0;
  const getCountByType = (arr, eventType) => arr.filter(e => e._id.eventType === eventType).reduce((s, e) => s + e.count, 0);
  const twMeetings = getCountByType(twEvents, 'meeting');
  const lwMeetings = getCountByType(lwEvents, 'meeting');
  const twMessages = getCountByType(twEvents, 'message');
  const lwMessages = getCountByType(lwEvents, 'message');
  const twTotal = twEvents.reduce((s, e) => s + e.count, 0);
  const lwTotal = lwEvents.reduce((s, e) => s + e.count, 0);

  // Latest vs previous metrics averages — divided by connectedUserCount for per-person figures
  const tw = {
    meetings: avgField(twMetricsArr, 'meetingCount7d') / connectedUserCount,
    meetingHours: avgField(twMetricsArr, 'meetingDurationTotalHours7d') / connectedUserCount,
    backToBack: avgField(twMetricsArr, 'backToBackMeetingBlocks') / connectedUserCount,
    messages: avgField(twMetricsArr, 'messageCount7d') / connectedUserCount,
    msgsPerDay: avgField(twMetricsArr, 'messagesPerDay') / connectedUserCount,
    afterHoursMsg: avgField(twMetricsArr, 'afterHoursMessageCount') / connectedUserCount,
    afterHoursRatio: avgField(twMetricsArr, 'afterHoursMessageRatio'),   // already a ratio, no division
    channels: avgField(twMetricsArr, 'uniqueChannels7d'),
    afterHoursEmail: avgField(twMetricsArr, 'afterHoursSentRatio'),
    focusTimeAvailability: avgField(twMetricsArr, 'focusTimeAvailabilityHours') / connectedUserCount,
    calendarFragmentation: avgField(twMetricsArr, 'calendarFragmentationScore'),
    recurringBurden: avgField(twMetricsArr, 'recurringMeetingBurden'),
  };
  const lw = {
    meetings: avgField(lwMetricsArr, 'meetingCount7d') / connectedUserCount,
    meetingHours: avgField(lwMetricsArr, 'meetingDurationTotalHours7d') / connectedUserCount,
    backToBack: avgField(lwMetricsArr, 'backToBackMeetingBlocks') / connectedUserCount,
    messages: avgField(lwMetricsArr, 'messageCount7d') / connectedUserCount,
    msgsPerDay: avgField(lwMetricsArr, 'messagesPerDay') / connectedUserCount,
    afterHoursMsg: avgField(lwMetricsArr, 'afterHoursMessageCount') / connectedUserCount,
    afterHoursRatio: avgField(lwMetricsArr, 'afterHoursMessageRatio'),
    channels: avgField(lwMetricsArr, 'uniqueChannels7d'),
    afterHoursEmail: avgField(lwMetricsArr, 'afterHoursSentRatio'),
    focusTimeAvailability: avgField(lwMetricsArr, 'focusTimeAvailabilityHours') / connectedUserCount,
    calendarFragmentation: avgField(lwMetricsArr, 'calendarFragmentationScore'),
    recurringBurden: avgField(lwMetricsArr, 'recurringMeetingBurden'),
  };

  // ─── 6-week baseline averages (per-person) ───
  const sixWeekAvg = {
    meetings: avgField(sixWeekMetricsArr, 'meetingCount7d') / connectedUserCount,
    meetingHours: avgField(sixWeekMetricsArr, 'meetingDurationTotalHours7d') / connectedUserCount,
    backToBack: avgField(sixWeekMetricsArr, 'backToBackMeetingBlocks') / connectedUserCount,
    messages: avgField(sixWeekMetricsArr, 'messageCount7d') / connectedUserCount,
    msgsPerDay: avgField(sixWeekMetricsArr, 'messagesPerDay') / connectedUserCount,
    afterHoursMsg: avgField(sixWeekMetricsArr, 'afterHoursMessageCount') / connectedUserCount,
    afterHoursRatio: avgField(sixWeekMetricsArr, 'afterHoursMessageRatio'),
    afterHoursRatioPct: avgField(sixWeekMetricsArr, 'afterHoursMessageRatio') * 100,
    channels: avgField(sixWeekMetricsArr, 'uniqueChannels7d'),
    focusTimeAvailability: avgField(sixWeekMetricsArr, 'focusTimeAvailabilityHours') / connectedUserCount,
    calendarFragmentation: avgField(sixWeekMetricsArr, 'calendarFragmentationScore'),
    recurringBurden: avgField(sixWeekMetricsArr, 'recurringMeetingBurden'),
  };

  // Per-source event counts
  const twOutlook = getCount(twEvents, 'microsoft-outlook', 'meeting');
  const lwOutlook = getCount(lwEvents, 'microsoft-outlook', 'meeting');
  const twGcal = getCount(twEvents, 'google-calendar', 'meeting');
  const lwGcal = getCount(lwEvents, 'google-calendar', 'meeting');
  const twTeamsMsg = getCount(twEvents, 'microsoft-teams', 'message');
  const lwTeamsMsg = getCount(lwEvents, 'microsoft-teams', 'message');
  const twSlack = getCount(twEvents, 'slack', 'message');
  const lwSlack = getCount(lwEvents, 'slack', 'message');
  const twGchat = getCount(twEvents, 'google-chat', 'message');
  const lwGchat = getCount(lwEvents, 'google-chat', 'message');

  // Connected integrations
  const integrations = org.integrations || {};
  const connectedSources = [];
  if (integrations.microsoft?.accessToken) connectedSources.push('Microsoft (Outlook + Teams)');
  if (integrations.slack?.accessToken) connectedSources.push('Slack');
  if (integrations.google?.accessToken) connectedSources.push('Google Calendar');
  if (integrations.googleChat?.accessToken) connectedSources.push('Google Chat');

  // ─── Analyze observations (what changed) + risks + recommendations ───
  const observations = [];
  const risks = [];
  const recommendations = [];

  // Helper: confidence based on cross-metric reinforcement and persistence
  function obsConfidence(conditions) {
    // conditions: array of booleans representing supporting evidence
    const supporting = conditions.filter(Boolean).length;
    if (supporting >= 3) return 'High';
    if (supporting >= 2) return 'Medium';
    return 'Low';
  }

  // Meeting analysis
  if (twMeetings > 0 || lwMeetings > 0) {
    const meetDelta = lwMeetings > 0 ? ((twMeetings - lwMeetings) / lwMeetings) * 100 : 0;
    const aboveSixWeek = sixWeekAvg.meetings > 0 && twMeetings > sixWeekAvg.meetings * 1.15;
    if (meetDelta > 15) {
      const conf = obsConfidence([meetDelta > 25, aboveSixWeek, tw.backToBack > lw.backToBack]);
      observations.push({ text: `Meetings increased ${Math.round(meetDelta)}% week-over-week (${lwMeetings} → ${twMeetings}). This suggests growing coordination demand or a phase of active planning.`, confidence: conf });
      risks.push('Sustained meeting growth crowds out focused work time and can trigger capacity drift within 2-3 weeks.');
      recommendations.push('Audit this week\'s calendar: cancel or shorten the 2-3 lowest-value recurring meetings. Protect at least one 2-hour focus block per day.');
    } else if (meetDelta < -15) {
      const conf = obsConfidence([meetDelta < -25, tw.messages >= lw.messages]);
      observations.push({ text: `Meetings decreased ${Math.abs(Math.round(meetDelta))}% week-over-week (${lwMeetings} → ${twMeetings}). Teams may have more space for execution.`, confidence: conf });
    }
  }

  // Meeting duration + back-to-back
  if (tw.meetingHours > 0) {
    const hoursPerDay = tw.meetingHours / 5;
    if (hoursPerDay > 4) {
      const conf = obsConfidence([hoursPerDay > 5, tw.backToBack > 5, tw.afterHoursRatio > 0.2]);
      observations.push({ text: `Average meeting load is ${fmtNum(hoursPerDay, 1)} hours/day (${fmtNum(tw.meetingHours, 1)} total hours this week). This is above the healthy threshold of 3 hours/day.`, confidence: conf });
      risks.push('When meeting load exceeds 60% of the workday, execution velocity typically drops and after-hours work increases.');
      recommendations.push('Introduce "meeting-free mornings" or designate 1-2 no-meeting days per week. Default meeting durations to 25 or 50 minutes.');
    } else if (hoursPerDay > 2.5) {
      observations.push({ text: `Meeting time is ${fmtNum(hoursPerDay, 1)} hours/day (${fmtNum(tw.meetingHours, 1)} total hours). This is moderate but worth watching.`, confidence: 'Low' });
    }
  }
  if (tw.backToBack > 5) {
    const b2bDelta = lw.backToBack > 0 ? ((tw.backToBack - lw.backToBack) / lw.backToBack) * 100 : 100;
    const conf = obsConfidence([tw.backToBack > 8, b2bDelta > 20, tw.afterHoursRatio > 0.2]);
    observations.push({ text: `${Math.round(tw.backToBack)} back-to-back meeting blocks detected (≤5 min gap between meetings)${b2bDelta > 20 ? `, up ${Math.round(b2bDelta)}% from last week` : ''}.`, confidence: conf });
    risks.push('Back-to-back meetings eliminate micro-recovery. Research shows decision quality degrades significantly after 3+ consecutive meetings.');
    recommendations.push('Add 10-minute buffers between meetings. If back-to-back blocks exceed 3 per day, actively reschedule or decline one.');
  }

  // Messaging analysis
  if (twMessages > 0 || lwMessages > 0) {
    const msgDelta = lwMessages > 0 ? ((twMessages - lwMessages) / lwMessages) * 100 : 0;
    if (msgDelta > 25) {
      const conf = obsConfidence([msgDelta > 40, twMeetings >= lwMeetings]);
      observations.push({ text: `Team messaging is up ${Math.round(msgDelta)}% (${lwMessages} → ${twMessages} messages). This may indicate increased coordination needs or an active project phase.`, confidence: conf });
    } else if (msgDelta < -25 && lwMessages > 5) {
      const conf = obsConfidence([msgDelta < -40, twMeetings <= lwMeetings, tw.channels < lw.channels]);
      observations.push({ text: `Team messaging dropped ${Math.abs(Math.round(msgDelta))}% (${lwMessages} → ${twMessages}). Declining message volume can be an early cohesion signal — especially if meetings also didn't increase.`, confidence: conf });
      risks.push('A sustained drop in communication volume (without a matching decline in workload) can indicate weakening team connection.');
      recommendations.push('Check in with team leads to understand the drop. If teams are siloing, consider reinstating a brief async standup or weekly sync.');
    }
  }

  // After-hours analysis
  if (tw.afterHoursMsg > 0 || tw.afterHoursEmail > 0.15) {
    const totalAfterHours = tw.afterHoursMsg;
    const afterHoursRatioPct = Math.round((tw.afterHoursRatio || 0) * 100);
    if (afterHoursRatioPct >= 30) {
      const conf = obsConfidence([afterHoursRatioPct >= 40, tw.afterHoursRatio > lw.afterHoursRatio, tw.meetingHours > 15]);
      observations.push({ text: `${afterHoursRatioPct}% of team messages were sent outside working hours (before 8am or after 6pm). ${totalAfterHours > 0 ? `That's ${Math.round(totalAfterHours)} after-hours messages this week.` : ''}`, confidence: conf });
      risks.push('After-hours ratios above 25% are associated with increased burnout risk and declining next-day focus quality.');
      recommendations.push('Implement "quiet hours" in Teams/Slack (e.g., schedule send for next morning). Leadership should model boundary-setting by not sending after 6pm.');
    } else if (afterHoursRatioPct >= 15) {
      observations.push({ text: `After-hours messaging is at ${afterHoursRatioPct}% — within normal range but worth monitoring.`, confidence: 'Low' });
    }
    if (tw.afterHoursRatio > lw.afterHoursRatio && lw.afterHoursRatio > 0) {
      const afterHoursDrift = Math.round(((tw.afterHoursRatio - lw.afterHoursRatio) / lw.afterHoursRatio) * 100);
      if (afterHoursDrift > 20) {
        observations.push({ text: `After-hours ratio increased ${afterHoursDrift}% compared to last week — this is a negative trend.`, confidence: 'Medium' });
      }
    }
  }

  // Focus time analysis (new metric)
  if (tw.focusTimeAvailability != null && tw.focusTimeAvailability > 0) {
    const focusPerDay = tw.focusTimeAvailability / 5;
    if (focusPerDay < 2) {
      const conf = obsConfidence([focusPerDay < 1.5, tw.calendarFragmentation > 60, tw.backToBack > 5]);
      observations.push({ text: `Focus time is compressed to ${fmtNum(focusPerDay, 1)} hrs/day (${fmtNum(tw.focusTimeAvailability, 1)}h total). Teams need at least 2h/day of uninterrupted time for deep work.`, confidence: conf });
      risks.push('Focus time below 2h/day is a strong predictor of rising after-hours work and declining output quality.');
    }
  }

  // Calendar fragmentation (new metric)
  if (tw.calendarFragmentation > 60) {
    const conf = obsConfidence([tw.calendarFragmentation > 75, tw.backToBack > 5, tw.focusTimeAvailability < 15]);
    observations.push({ text: `Calendar fragmentation score: ${fmtNum(tw.calendarFragmentation, 0)}/100. Calendars are highly fragmented — meetings scattered throughout the day break deep work.`, confidence: conf });
  }

  // Signals analysis
  if (twSignals.length > 0) {
    const criticalSignals = twSignals.filter(s => s.severity === 'Critical');
    const riskSignals = twSignals.filter(s => s.severity === 'Risk');
    
    if (criticalSignals.length > 0) {
      const signalNames = criticalSignals.map(s => {
        const pres = SIGNAL_TYPE_PRESENTATION[s.signalType];
        return pres?.businessTitle || s.title;
      });
      observations.push({ text: `⚠️ ${criticalSignals.length} critical drift signal(s) detected: ${signalNames.join('; ')}.`, confidence: 'High' });
      
      for (const sig of criticalSignals) {
        const pres = SIGNAL_TYPE_PRESENTATION[sig.signalType];
        if (pres) {
          risks.push(`${pres.businessTitle}: ${pres.whatItMeans}`);
        }
        if (sig.recommendedActions?.length > 0) {
          recommendations.push(sig.recommendedActions[0].action);
        }
      }
    }
    if (riskSignals.length > 0) {
      const signalNames = riskSignals.map(s => {
        const pres = SIGNAL_TYPE_PRESENTATION[s.signalType];
        return pres?.businessTitle || s.title;
      });
      observations.push({ text: `${riskSignals.length} risk-level signal(s) detected: ${signalNames.join('; ')}.`, confidence: 'Medium' });
    }
  }

  // CK Signals analysis
  const highCK = twCKSignals.filter(s => s.severity >= 65);
  if (highCK.length > 0) {
    for (const ck of highCK.sort((a, b) => b.severity - a.severity).slice(0, 3)) {
      const label = CK_SIGNAL_LABELS[ck.signalType] || {};
      const conf = ck.severity >= 80 ? 'High' : 'Medium';
      observations.push({ text: `${label.label || ck.signalType} signal detected (severity ${ck.severity}/100): ${ck.explanation || ''}`, confidence: conf });
      if (label.rec) recommendations.push(label.rec);
    }
  }

  // Determine overall health verdict — uses escalation service (5-level)
  const critCount = twSignals.filter(s => s.severity === 'Critical').length + twCKSignals.filter(s => s.severity >= 80).length;
  const riskCount = twSignals.filter(s => s.severity === 'Risk').length + twCKSignals.filter(s => s.severity >= 65 && s.severity < 80).length;
  const driftingTeams = teamBDIData.filter(t => ['Early Drift', 'Developing Drift', 'Critical Drift'].includes(t.bdi.driftState));

  // Build org-level escalation status
  const orgStatus = calculateTeamStatus({
    currentMetrics: {
      meetingHours: tw.meetingHours,
      backToBack: tw.backToBack,
      afterHoursRatio: tw.afterHoursRatio,
      focusTimeAvailability: tw.focusTimeAvailability,
      calendarFragmentation: tw.calendarFragmentation,
      recurringBurden: tw.recurringBurden,
      asyncVolume: tw.messages,
    },
    previousMetrics: {
      meetingHours: lw.meetingHours,
      backToBack: lw.backToBack,
      afterHoursRatio: lw.afterHoursRatio,
      focusTimeAvailability: lw.focusTimeAvailability,
      calendarFragmentation: lw.calendarFragmentation,
      recurringBurden: lw.recurringBurden,
      asyncVolume: lw.messages,
    },
    weeklyHistory: [],  // could be populated from sixWeekMetricsArr in future
    baseline: {},
    contextTags,
    bdiData: driftingTeams.length > 0 ? driftingTeams.sort((a, b) => b.bdi.driftScore - a.bdi.driftScore)[0].bdi : null,
  });

  const verdictColor = orgStatus.color;
  const verdictIcon = orgStatus.icon;
  const verdictText = orgStatus.status;
  const verdictConfidence = orgStatus.confidence;
  const verdictSummary = orgStatus.reason;

  // If no observations were generated but we have data, add a neutral one
  if (observations.length === 0 && twTotal > 0) {
    observations.push({ text: `Overall work activity is stable with ${twTotal} events tracked across ${connectedSources.length} data source(s). No significant changes detected week-over-week.`, confidence: 'Low' });
    recommendations.push('Continue monitoring. Stable weeks are a good time to invest in process improvement or address small friction points before they grow.');
  }

  // ─── AI Analysis Layer ───
  const employeeCount = totalUsers; // already fetched above for coverage
  const aiAnalysis = await generateWeeklyAIAnalysis({
    orgName: org.name,
    industry: org.industry || 'Other',
    orgSize: org.size || `${employeeCount} employees`,
    teamCount: teams.length,
    employeeCount,
    connectedUserCount,   // how many users have calendar data — AI uses this for context
    coveragePct,          // % of org with data — AI can flag low coverage
    tw, lw, sixWeekAvg,   // these are already per-person figures
    twMeetings, lwMeetings, twMessages, lwMessages,
    twSignals, lwSignals, twCKSignals, lwCKSignals,
    teamBDIData,
    observations: observations.map(o => typeof o === 'string' ? o : o.text),
    risks,
    connectedSources,
    contextTags,
    teamStatus: orgStatus.status,
  });

  // ════════════════════════════════════════════════════════════
  // BUILD THE HTML — Optimized for 60-second scan
  // Structure:
  //   1. Header (status + confidence + 1-line summary)
  //   2. Key Metrics Snapshot (5 metrics)
  //   3. What Changed (3 bullets max)
  //   4. Why It Matters (2 bullets max)
  //   5. Recommended Actions — role-based (HR / Manager / CTA)
  //   6. Manager Discussion Prompts
  //   7. AI Hypotheses (if available)
  //   8. Week-over-Week Comparison (with 6-week avg column)
  //   9. Drift Signals Detail (kept but compact)
  //  10. Team Health (BDI)
  //  11. Industry Benchmark (demoted, secondary)
  //  12. Footer
  // ════════════════════════════════════════════════════════════

  const confBadgeColor = verdictConfidence === 'High' ? '#10b981' : verdictConfidence === 'Medium' ? '#f59e0b' : '#9ca3af';

  let html = '';

  // ─── Header ───
  html += `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width:640px; margin:0 auto; color:#111827;">`;
  html += `<div style="background:linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius:16px 16px 0 0; padding:28px 28px 20px 28px; color:white;">`;
  html += `<h1 style="margin:0; font-size:24px; font-weight:700;">📊 Weekly Intelligence Brief</h1>`;
  html += `<p style="margin:6px 0 0 0; font-size:14px; opacity:0.9;">${org.name} — Week of ${thisWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>`;
  html += `</div>`;

  // ─── 1. Verdict Banner (status + confidence + summary) ───
  html += `<div style="${S.card} border-top:0; border-radius:0; margin-top:0; border-left:4px solid ${verdictColor};">`;
  html += `<div style="display:flex; align-items:center; margin-bottom:8px;">`;
  html += `<span style="font-size:28px; margin-right:12px;">${verdictIcon}</span>`;
  html += `<div>`;
  html += `<h2 style="margin:0; font-size:20px; color:${verdictColor};">${verdictText}</h2>`;
  html += `<p style="margin:2px 0 0 0; font-size:12px; color:#6b7280;">`;
  html += `<span style="${S.badge(confBadgeColor + '20', confBadgeColor)}">Confidence: ${verdictConfidence}</span>`;
  if (contextTags.length > 0) {
    html += ` <span style="${S.badge('#dbeafe', '#2563eb')}">Context: ${contextTags.map(t => t.tag.replace(/_/g, ' ')).join(', ')}</span>`;
  }
  html += `</p>`;
  html += `</div></div>`;
  html += `<p style="${S.p} margin:0;">${verdictSummary}</p>`;
  if (orgStatus.escalationAction && orgStatus.status !== STATUS_LEVELS.STABLE) {
    html += `<p style="${S.pSmall} margin:4px 0 0 0;"><strong>Escalation:</strong> ${orgStatus.escalationAction}</p>`;
  }
  html += `</div>`;

  // ─── 2. Key Metrics Snapshot (5 metrics) ───
  html += `<div style="${S.card} border-radius:0; margin-top:0;">`;
  html += `<div style="display:flex; gap:10px; flex-wrap:wrap;">`;
  
  const snapshotMetrics = [
    { label: 'Meetings', value: twMeetings, change: pctChangeLabel(twMeetings, lwMeetings), color: twMeetings > lwMeetings ? '#ef4444' : '#10b981' },
    { label: 'Meeting Hours', value: `${fmtNum(tw.meetingHours, 1)}h`, change: pctChangeLabel(tw.meetingHours, lw.meetingHours), color: tw.meetingHours > lw.meetingHours ? '#ef4444' : '#10b981' },
    { label: 'After-Hours', value: `${Math.round((tw.afterHoursRatio || 0) * 100)}%`, change: pctChangeLabel(tw.afterHoursRatio, lw.afterHoursRatio), color: tw.afterHoursRatio > lw.afterHoursRatio ? '#ef4444' : '#10b981' },
    { label: 'Focus Time', value: tw.focusTimeAvailability ? `${fmtNum(tw.focusTimeAvailability, 1)}h` : '—', change: tw.focusTimeAvailability && lw.focusTimeAvailability ? pctChangeLabel(tw.focusTimeAvailability, lw.focusTimeAvailability) : '—', color: tw.focusTimeAvailability < lw.focusTimeAvailability ? '#ef4444' : '#10b981' },
    { label: 'Signals', value: `${twSignals.length + twCKSignals.length}`, change: critCount > 0 ? `${critCount} critical` : riskCount > 0 ? `${riskCount} risk` : 'None critical', color: critCount > 0 ? '#ef4444' : '#6b7280' },
  ];
  
  for (const m of snapshotMetrics) {
    html += `<div style="flex:1; min-width:100px; text-align:center; padding:8px; background:#f9fafb; border-radius:8px;">
      <div style="font-size:20px; font-weight:700; color:#111827;">${m.value}</div>
      <div style="font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px;">${m.label}</div>
      <div style="font-size:10px; color:${m.color};">${m.change}</div>
    </div>`;
  }
  html += `</div>`;
  html += `</div>`;

  // ─── 3. What Changed This Week (top 3 observations) ───
  html += `<div style="${S.card}">`;
  html += `<h3 style="${S.h3} margin-top:0;">📋 What Changed</h3>`;
  const topObs = observations.slice(0, 3);
  if (topObs.length > 0) {
    for (const obs of topObs) {
      const isWarning = obs.text.startsWith('⚠️');
      const confColor = obs.confidence === 'High' ? '#10b981' : obs.confidence === 'Medium' ? '#f59e0b' : '#9ca3af';
      html += `<div style="padding:8px 12px; margin-bottom:8px; background:${isWarning ? '#fef2f2' : '#f9fafb'}; border-radius:8px; border-left:3px solid ${isWarning ? '#ef4444' : '#e5e7eb'};">`;
      html += `<p style="${S.p} margin:0;">${obs.text}</p>`;
      html += `<p style="margin:4px 0 0 0; font-size:11px;"><span style="${S.badge(confColor + '20', confColor)}">Confidence: ${obs.confidence}</span></p>`;
      html += `</div>`;
    }
    if (observations.length > 3) {
      html += `<p style="${S.pSmall}">+ ${observations.length - 3} more observations — see full details on your SignalTrue dashboard.</p>`;
    }
  } else {
    html += `<p style="${S.p}">No significant changes detected this week.</p>`;
  }
  html += `</div>`;

  // ─── 4. Why It Matters (top 2 risks) ───
  if (risks.length > 0) {
    html += `<div style="${S.card}">`;
    html += `<h3 style="${S.h3} margin-top:0;">⚠️ Why It Matters</h3>`;
    for (const risk of risks.slice(0, 2)) {
      html += `<div style="${S.warnBox}">`;
      html += `<p style="${S.p} margin:0;">${risk}</p>`;
      html += `</div>`;
    }
    if (risks.length > 2) {
      html += `<p style="${S.pSmall}">+ ${risks.length - 2} more risk factors — see full analysis on dashboard.</p>`;
    }
    html += `</div>`;
  }

  // ─── 5. Recommended Actions — Role-Based ───
  html += `<div style="${S.card}">`;
  html += `<h3 style="${S.h3} margin-top:0;">✅ Recommended Actions</h3>`;

  // If AI returned role-based recommendations, use those
  if (aiAnalysis && (aiAnalysis.hrActions?.length || aiAnalysis.managerActions?.length || aiAnalysis.leadershipActions?.length)) {
    const renderRoleActions = (title, icon, actions, boxStyle) => {
      if (!actions?.length) return '';
      let s = `<h4 style="${S.h4}">${icon} ${title}</h4>`;
      for (const a of actions.slice(0, 2)) {
        const effortColor = a.effort === 'Low' ? '#10b981' : a.effort === 'Medium' ? '#f59e0b' : '#ef4444';
        s += `<div style="${boxStyle}">`;
        s += `<p style="${S.p} margin:0 0 4px 0;"><strong>${a.action}</strong></p>`;
        s += `<p style="${S.pSmall} margin:0;">`;
        s += `<span style="${S.badge(effortColor + '20', effortColor)}">${a.effort} effort</span> `;
        s += `Expected: ${a.expectedOutcome} · Review in ${a.reviewWindow}`;
        s += `</p></div>`;
      }
      return s;
    };

    html += renderRoleActions('For HR', '👤', aiAnalysis.hrActions, S.recBox);
    html += renderRoleActions('For Managers', '👥', aiAnalysis.managerActions, `${S.recBox} border-left:3px solid #6366f1;`);
    if (orgStatus.status !== STATUS_LEVELS.STABLE && orgStatus.status !== STATUS_LEVELS.WATCH) {
      html += renderRoleActions('For Leadership', '🏢', aiAnalysis.leadershipActions, `${S.recBox} border-left:3px solid #ef4444;`);
    }
  } else if (recommendations.length > 0) {
    // Fallback: use rule-based recommendations
    html += `<p style="${S.pSmall}">Based on this week's data patterns.</p>`;
    recommendations.slice(0, 3).forEach((rec, i) => {
      html += `<div style="${S.recBox}">`;
      html += `<p style="${S.p} margin:0;"><strong>${i + 1}.</strong> ${rec}</p>`;
      html += `</div>`;
    });
  } else {
    html += `<p style="${S.p}">No specific actions needed this week. Continue monitoring.</p>`;
  }

  // CTA button
  html += `<div style="text-align:center; margin-top:16px;">`;
  html += `<a href="${process.env.FRONTEND_URL || 'https://app.signaltrue.ai'}/dashboard" style="display:inline-block; background:#6366f1; color:white; padding:10px 28px; border-radius:8px; font-weight:600; font-size:14px; text-decoration:none;">View Full Analysis on Dashboard →</a>`;
  html += `</div>`;
  html += `</div>`;

  // ─── 6. Manager Discussion Prompts ───
  const managerPrompts = generateManagerPrompts({ tw, lw, sixWeekAvg, observations, orgStatus, teamBDIData, twSignals });
  if (managerPrompts.length > 0) {
    html += `<div style="${S.card} border-left:4px solid #8b5cf6;">`;
    html += `<h3 style="${S.h3} margin-top:0;">💬 Manager Discussion Prompts</h3>`;
    html += `<p style="${S.pSmall}">Diagnostic questions for your next 1:1 or team check-in. These are based on this week's data — not prescriptive, just conversation starters.</p>`;
    for (const prompt of managerPrompts.slice(0, 5)) {
      html += `<div style="padding:8px 12px; margin-bottom:6px; background:#faf5ff; border-radius:8px;">`;
      html += `<p style="${S.p} margin:0;"><strong>Q:</strong> ${prompt}</p>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  // ─── 7. AI Hypotheses (structured) ───
  if (aiAnalysis?.hypotheses?.length > 0) {
    html += `<div style="${S.card} border-left:4px solid #6366f1;">`;
    html += `<div style="display:flex; align-items:center; margin-bottom:12px;">`;
    html += `<span style="font-size:20px; margin-right:10px;">🧠</span>`;
    html += `<h3 style="${S.h3} margin:0;">AI Interpretation</h3>`;
    html += `</div>`;
    for (const h of aiAnalysis.hypotheses.slice(0, 3)) {
      const hConf = h.confidence === 'High' ? '#10b981' : h.confidence === 'Medium' ? '#f59e0b' : '#9ca3af';
      html += `<div style="padding:12px 14px; margin-bottom:10px; background:#f0f0ff; border-radius:8px;">`;
      html += `<p style="${S.p} margin:0 0 4px 0;"><strong>${h.patternObserved}</strong> <span style="${S.badge(hConf + '20', hConf)}">${h.confidence}</span></p>`;
      if (h.evidence?.length > 0) {
        html += `<p style="${S.pSmall} margin:0 0 4px 0;">Evidence: ${h.evidence.join(' · ')}</p>`;
      }
      html += `<p style="${S.p} margin:0 0 4px 0;">${h.whatThisMayMean}</p>`;
      if (h.whatCouldAlsoExplainIt) {
        html += `<p style="${S.pSmall} margin:0; color:#6b7280;"><em>Alternative explanation:</em> ${h.whatCouldAlsoExplainIt}</p>`;
      }
      html += `</div>`;
    }

    // Trend outlook
    if (aiAnalysis.trendOutlook) {
      html += `<div style="margin-top:12px; padding:10px 14px; background:#fffbeb; border-radius:8px; border-left:3px solid #f59e0b;">`;
      html += `<p style="${S.p} margin:0 0 4px 0;"><strong>👁️ Trend Outlook:</strong> ${aiAnalysis.trendOutlook.likelyNextStageRisk || ''}</p>`;
      if (aiAnalysis.trendOutlook.metricToWatchNextWeek) {
        html += `<p style="${S.pSmall} margin:0;">Watch next week: <strong>${aiAnalysis.trendOutlook.metricToWatchNextWeek}</strong>`;
        if (aiAnalysis.trendOutlook.escalationTrigger) html += ` · Escalation trigger: ${aiAnalysis.trendOutlook.escalationTrigger}`;
        html += `</p>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  }

  // ─── 8. Week-over-Week Comparison Table (with 6-week avg) ───
  html += `<div style="${S.card}">`;
  html += `<h3 style="${S.h3} margin-top:0;">📊 Week-over-Week Comparison</h3>`;
  html += `<table style="${S.table}">`;
  html += `<thead><tr>`;
  html += `<th style="${S.th}">Metric</th>`;
  html += `<th style="${S.thR}">6-Wk Avg</th>`;
  html += `<th style="${S.thR}">Last Week</th>`;
  html += `<th style="${S.thR}">This Week</th>`;
  html += `<th style="${S.thR}">Change</th>`;
  html += `</tr></thead><tbody>`;

  const addTableRow = (label, sixWk, lwVal, twVal, higherIsBad = true, fmt = 0) => {
    const icon = trendIcon(twVal, lwVal, higherIsBad);
    const vs6wk = sixWk > 0 && twVal > sixWk * 1.15 && higherIsBad ? ' ⚠️' : sixWk > 0 && twVal < sixWk * 0.85 && !higherIsBad ? ' ⚠️' : '';
    html += `<tr>`;
    html += `<td style="${S.td}">${label}</td>`;
    html += `<td style="${S.tdR}; color:#9ca3af;">${fmtNum(sixWk, fmt)}</td>`;
    html += `<td style="${S.tdR}">${fmtNum(lwVal, fmt)}</td>`;
    html += `<td style="${S.tdBold}">${fmtNum(twVal, fmt)}${vs6wk}</td>`;
    html += `<td style="${S.tdR}">${icon} ${pctChangeLabel(twVal, lwVal)}</td>`;
    html += `</tr>`;
  };

  // Core metrics
  addTableRow('📅 Meetings', sixWeekAvg.meetings, lwMeetings, twMeetings, true);
  addTableRow('💬 Team Messages', sixWeekAvg.messages, lwMessages, twMessages, false);
  addTableRow('📊 Total Events', 0, lwTotal, twTotal, false);

  // Per-source if available
  if (twOutlook > 0 || lwOutlook > 0) addTableRow('&nbsp;&nbsp;↳ Outlook Meetings', 0, lwOutlook, twOutlook, true);
  if (twGcal > 0 || lwGcal > 0) addTableRow('&nbsp;&nbsp;↳ Google Calendar', 0, lwGcal, twGcal, true);
  if (twTeamsMsg > 0 || lwTeamsMsg > 0) addTableRow('&nbsp;&nbsp;↳ Teams Messages', 0, lwTeamsMsg, twTeamsMsg, false);
  if (twSlack > 0 || lwSlack > 0) addTableRow('&nbsp;&nbsp;↳ Slack Messages', 0, lwSlack, twSlack, false);
  if (twGchat > 0 || lwGchat > 0) addTableRow('&nbsp;&nbsp;↳ Google Chat', 0, lwGchat, twGchat, false);

  // Detailed metrics section
  if (twMetricsArr.length > 0 || lwMetricsArr.length > 0) {
    html += `<tr><td colspan="5" style="padding:10px 10px 4px; font-weight:600; color:#6366f1; border-bottom:2px solid #e5e7eb; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Detailed Metrics (rolling 7-day avg)</td></tr>`;
    addTableRow('⏱️ Meeting Hours', sixWeekAvg.meetingHours, lw.meetingHours, tw.meetingHours, true, 1);
    addTableRow('⚡ Back-to-Back Blocks', sixWeekAvg.backToBack, lw.backToBack, tw.backToBack, true, 0);
    addTableRow('💬 Messages / Day', sixWeekAvg.msgsPerDay, lw.msgsPerDay, tw.msgsPerDay, false, 1);
    addTableRow('🌙 After-Hours Messages', sixWeekAvg.afterHoursMsg, lw.afterHoursMsg, tw.afterHoursMsg, true, 0);
    addTableRow('🌙 After-Hours Ratio', Math.round((sixWeekAvg.afterHoursRatio || 0) * 100), Math.round((lw.afterHoursRatio || 0) * 100), Math.round((tw.afterHoursRatio || 0) * 100), true);
    addTableRow('🎯 Focus Time (hrs)', sixWeekAvg.focusTimeAvailability, lw.focusTimeAvailability || 0, tw.focusTimeAvailability || 0, false, 1);
    addTableRow('🧩 Calendar Fragmentation', sixWeekAvg.calendarFragmentation, lw.calendarFragmentation || 0, tw.calendarFragmentation || 0, true, 0);
    addTableRow('🔄 Recurring Meeting Burden', Math.round((sixWeekAvg.recurringBurden || 0) * 100), Math.round((lw.recurringBurden || 0) * 100), Math.round((tw.recurringBurden || 0) * 100), true);
    if (tw.channels > 0 || lw.channels > 0) addTableRow('📂 Active Channels', sixWeekAvg.channels, lw.channels, tw.channels, false, 0);
  }

  html += `</tbody></table>`;
  html += `</div>`;

  // ─── 9. Active Drift Signals (compact) ───
  if (twSignals.length > 0 || twCKSignals.length > 0) {
    html += `<div style="${S.card}">`;
    html += `<h3 style="${S.h3} margin-top:0;">🎯 Active Drift Signals</h3>`;

    const familyMap = {};
    for (const sig of twSignals) {
      const pres = SIGNAL_TYPE_PRESENTATION[sig.signalType] || {};
      const family = pres.family || 'General';
      if (!familyMap[family]) familyMap[family] = [];
      familyMap[family].push({
        title: pres.businessTitle || sig.title,
        severity: sig.severity,
        whatItMeans: pres.whatItMeans || '',
        team: sig.teamId?.name || 'Organization',
        actions: sig.recommendedActions || [],
        consequence: sig.consequence?.statement || '',
      });
    }

    for (const [family, sigs] of Object.entries(familyMap)) {
      const familyColor = family === 'Capacity Drift' ? '#ef4444' : family === 'Coordination Drift' ? '#f59e0b' : family === 'Culture Drift' ? '#8b5cf6' : '#3b82f6';
      html += `<h4 style="${S.h4}"><span style="${S.badge(familyColor + '15', familyColor)}">${family}</span></h4>`;
      
      for (const sig of sigs.slice(0, 3)) {
        const sevColor = sig.severity === 'Critical' ? '#ef4444' : sig.severity === 'Risk' ? '#f59e0b' : '#6b7280';
        html += `<div style="${S.cardAlert(sevColor)}">`;
        html += `<p style="${S.p} margin:0 0 4px 0;"><strong>${sig.title}</strong> <span style="${S.badge(sevColor + '20', sevColor)}">${sig.severity}</span></p>`;
        if (sig.team !== 'Organization') html += `<p style="${S.pSmall}">Team: ${sig.team}</p>`;
        if (sig.whatItMeans) html += `<p style="${S.p}">${sig.whatItMeans}</p>`;
        if (sig.actions.length > 0) {
          html += `<p style="${S.p} margin-bottom:2px;"><strong>Action:</strong> ${sig.actions[0].action}</p>`;
        }
        html += `</div>`;
      }
    }

    // CK Signals (compact)
    if (highCK.length > 0) {
      html += `<h4 style="${S.h4}">Automated Pipeline Signals</h4>`;
      for (const ck of highCK.sort((a, b) => b.severity - a.severity).slice(0, 3)) {
        const label = CK_SIGNAL_LABELS[ck.signalType] || {};
        const sevColor = ck.severity >= 80 ? '#ef4444' : '#f59e0b';
        html += `<div style="${S.cardAlert(sevColor)}">`;
        html += `<p style="${S.p} margin:0;"><strong>${label.label || ck.signalType}</strong> <span style="${S.badge(sevColor + '20', sevColor)}">Severity ${ck.severity}</span></p>`;
        if (label.rec) html += `<p style="${S.pSmall}"><strong>Action:</strong> ${label.rec}</p>`;
        html += `</div>`;
      }
    }

    const lwSignalCount = lwSignals.length + lwCKSignals.length;
    const twSignalCount = twSignals.length + twCKSignals.length;
    if (lwSignalCount > 0 || twSignalCount > 0) {
      html += `<p style="${S.pSmall}">Signal count: last week ${lwSignalCount} → this week ${twSignalCount} (${pct(twSignalCount, lwSignalCount)})</p>`;
    }

    html += `</div>`;
  }

  // ─── 10. Team Health (BDI) ───
  if (teamBDIData.length > 0) {
    html += `<div style="${S.card}">`;
    html += `<h3 style="${S.h3} margin-top:0;">🏥 Team Health Status</h3>`;

    for (const { teamName, bdi, prevBDI } of teamBDIData) {
      const stateColor = bdi.driftState === 'Critical Drift' ? '#ef4444' : bdi.driftState === 'Developing Drift' ? '#f97316' : bdi.driftState === 'Early Drift' ? '#eab308' : '#10b981';
      const prevScore = prevBDI?.driftScore ?? '—';
      const scoreTrend = prevBDI ? (bdi.driftScore > prevBDI.driftScore ? '↑' : bdi.driftScore < prevBDI.driftScore ? '↓' : '→') : '';
      
      html += `<div style="${S.cardAlert(stateColor)}">`;
      html += `<p style="${S.p} margin:0 0 4px 0;"><strong>${teamName}</strong> <span style="${S.badge(stateColor + '20', stateColor)}">${bdi.driftState}</span></p>`;
      html += `<p style="${S.p}">Drift Score: <strong>${prevScore} → ${bdi.driftScore}/100 ${scoreTrend}</strong> | Confidence: ${bdi.confidence}</p>`;
      
      if (bdi.drivers?.length > 0) {
        html += `<p style="${S.p}"><strong>Key drivers:</strong> ${bdi.drivers.slice(0, 3).map(d => `${d.signal} (${d.contribution}%)`).join(', ')}</p>`;
      }

      if (bdi.recommendedPlaybooks?.length > 0) {
        const pb = bdi.recommendedPlaybooks[0];
        html += `<div style="${S.recBox}">`;
        html += `<p style="${S.p} margin:0;"><strong>Recommended:</strong> ${pb.action?.title || pb.title || pb.name} — ${pb.action?.description || pb.why || 'See dashboard for details'}</p>`;
        html += `</div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  }

  // ─── 11. Industry Benchmark (demoted — secondary, compact) ───
  if (aiAnalysis?.industryComparison) {
    html += `<div style="${S.card} opacity:0.85;">`;
    html += `<h3 style="${S.h3} margin-top:0; font-size:14px; color:#9ca3af;">📎 Industry Context: ${org.industry || 'General'}</h3>`;
    html += `<p style="${S.pSmall}">${aiAnalysis.industryComparison}</p>`;
    html += `</div>`;
  }

  // ─── 12. Footer ───
  html += `<div style="padding:16px 24px; background:#f9fafb; border-radius:0 0 12px 12px; border:1px solid #e5e7eb; border-top:0;">`;
  // Data coverage banner
  const coverageColor = coveragePct >= 80 ? '#16a34a' : coveragePct >= 40 ? '#d97706' : '#dc2626';
  html += `<p style="${S.pSmall}">📊 <strong>Data coverage:</strong> <span style="color:${coverageColor}; font-weight:600;">${usersWithDataThisWeek.length} of ${totalUsers} employees (${coveragePct}%)</span> have calendar data this week — all per-person figures are based on connected accounts only.</p>`;
  html += `<p style="${S.pSmall}">Data sources: ${connectedSources.length > 0 ? connectedSources.join(' · ') : 'None connected'}</p>`;
  html += `<p style="${S.pSmall}">Report period: ${thisWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} compared with ${lastWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(thisWeekStart.getTime() - 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>`;
  html += `<p style="${S.pSmall}">Generated by <strong>SignalTrue</strong> at ${now.toLocaleString()} · Status: ${verdictText} (${verdictConfidence} confidence)</p>`;
  html += `</div>`;

  html += `</div>`;
  
  return html;
}

export async function sendWeeklyBrief(orgId) {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error(`Organization ${orgId} not found`);

  // Recipients: this org's master_admin / hr_admin / admin users
  const hrUsers = await User.find({ orgId, role: { $in: ['master_admin', 'hr_admin', 'admin'] } });
  const recipients = hrUsers.map(u => u.email);

  if (!recipients.length) {
    console.warn(`[WeeklyBrief] No HR/admin recipients for org ${org.name} — skipping send`);
    return;
  }

  console.log(`[WeeklyBrief] Generating brief for ${org.name}, sending to: ${recipients.join(', ')}`);
  const html = await generateWeeklyBrief(orgId);

  const weekLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const subject = `Weekly Intelligence Brief — ${org.name} — ${weekLabel}`;

  // Send to client org admins
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: 'SignalTrue <brief@signaltrue.ai>',
      to: recipients,
      subject,
      html,
    });
    if (error) {
      console.error(`[WeeklyBrief] ❌ Resend error:`, JSON.stringify(error));
      throw new Error(`Resend failed: ${error.message || error.name}`);
    }
    console.log(`[WeeklyBrief] ✅ Sent to ${recipients.join(', ')} (id: ${data?.id})`);
  } else {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@signaltrue.ai',
      to: recipients.join(','),
      subject,
      html,
    });
    console.log(`[WeeklyBrief] ✅ Sent to ${recipients.join(', ')} via SMTP`);
  }

  // CC superadmin (stenkreisberg@gmail.com) so they can verify
  await ccSuperadmin({
    subject,
    html,
    originalRecipient: recipients.join(', '),
    reportType: 'Weekly Intelligence Brief',
    orgName: org.name,
  });
}

export default { sendWeeklyBrief, generateWeeklyBrief };