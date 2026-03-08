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
import { generateWeeklyAIAnalysis, INDUSTRY_BENCHMARKS } from './weeklyAIAnalysisService.js';

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

  // ─── Fetch all data in parallel ───
  const [
    twEvents, lwEvents,
    twMetricsArr, lwMetricsArr,
    twSignals, lwSignals,
    twCKSignals, lwCKSignals,
    driftEvents
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
    Signal.find({ orgId: org._id, firstDetected: { $gte: thisWeekStart, $lte: now } }).populate('teamId', 'name').lean(),
    Signal.find({ orgId: org._id, firstDetected: { $gte: lastWeekStart, $lt: thisWeekStart } }).populate('teamId', 'name').lean(),
    CategoryKingSignal.find({ orgId: org._id, detectedAt: { $gte: thisWeekStart, $lte: now } }).lean(),
    CategoryKingSignal.find({ orgId: org._id, detectedAt: { $gte: lastWeekStart, $lt: thisWeekStart } }).lean(),
    DriftEvent.find({ orgId, date: { $gte: thisWeekStart } }).sort({ date: -1 }).lean(),
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

  // Latest vs previous metrics averages
  const tw = {
    meetings: avgField(twMetricsArr, 'meetingCount7d'),
    meetingHours: avgField(twMetricsArr, 'meetingDurationTotalHours7d'),
    backToBack: avgField(twMetricsArr, 'backToBackMeetingBlocks'),
    messages: avgField(twMetricsArr, 'messageCount7d'),
    msgsPerDay: avgField(twMetricsArr, 'messagesPerDay'),
    afterHoursMsg: avgField(twMetricsArr, 'afterHoursMessageCount'),
    afterHoursRatio: avgField(twMetricsArr, 'afterHoursMessageRatio'),
    channels: avgField(twMetricsArr, 'uniqueChannels7d'),
    afterHoursEmail: avgField(twMetricsArr, 'afterHoursSentRatio'),
  };
  const lw = {
    meetings: avgField(lwMetricsArr, 'meetingCount7d'),
    meetingHours: avgField(lwMetricsArr, 'meetingDurationTotalHours7d'),
    backToBack: avgField(lwMetricsArr, 'backToBackMeetingBlocks'),
    messages: avgField(lwMetricsArr, 'messageCount7d'),
    msgsPerDay: avgField(lwMetricsArr, 'messagesPerDay'),
    afterHoursMsg: avgField(lwMetricsArr, 'afterHoursMessageCount'),
    afterHoursRatio: avgField(lwMetricsArr, 'afterHoursMessageRatio'),
    channels: avgField(lwMetricsArr, 'uniqueChannels7d'),
    afterHoursEmail: avgField(lwMetricsArr, 'afterHoursSentRatio'),
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

  // Meeting analysis
  if (twMeetings > 0 || lwMeetings > 0) {
    const meetDelta = lwMeetings > 0 ? ((twMeetings - lwMeetings) / lwMeetings) * 100 : 0;
    if (meetDelta > 15) {
      observations.push(`Meetings increased ${Math.round(meetDelta)}% week-over-week (${lwMeetings} → ${twMeetings}). This suggests growing coordination demand or a phase of active planning.`);
      risks.push('Sustained meeting growth crowds out focused work time and can trigger capacity drift within 2-3 weeks.');
      recommendations.push('Audit this week\'s calendar: cancel or shorten the 2-3 lowest-value recurring meetings. Protect at least one 2-hour focus block per day.');
    } else if (meetDelta < -15) {
      observations.push(`Meetings decreased ${Math.abs(Math.round(meetDelta))}% week-over-week (${lwMeetings} → ${twMeetings}). Teams may have more space for execution.`);
    }
  }

  // Meeting duration + back-to-back
  if (tw.meetingHours > 0) {
    const hoursPerDay = tw.meetingHours / 5; // assume 5 workdays
    if (hoursPerDay > 4) {
      observations.push(`Average meeting load is ${fmtNum(hoursPerDay, 1)} hours/day (${fmtNum(tw.meetingHours, 1)} total hours this week). This is above the healthy threshold of 3 hours/day.`);
      risks.push('When meeting load exceeds 60% of the workday, execution velocity typically drops and after-hours work increases.');
      recommendations.push('Introduce "meeting-free mornings" or designate 1-2 no-meeting days per week. Default meeting durations to 25 or 50 minutes.');
    } else if (hoursPerDay > 2.5) {
      observations.push(`Meeting time is ${fmtNum(hoursPerDay, 1)} hours/day (${fmtNum(tw.meetingHours, 1)} total hours). This is moderate but worth watching.`);
    }
  }
  if (tw.backToBack > 5) {
    const b2bDelta = lw.backToBack > 0 ? ((tw.backToBack - lw.backToBack) / lw.backToBack) * 100 : 100;
    observations.push(`${Math.round(tw.backToBack)} back-to-back meeting blocks detected (≤5 min gap between meetings)${b2bDelta > 20 ? `, up ${Math.round(b2bDelta)}% from last week` : ''}.`);
    risks.push('Back-to-back meetings eliminate micro-recovery. Research shows decision quality degrades significantly after 3+ consecutive meetings.');
    recommendations.push('Add 10-minute buffers between meetings. If back-to-back blocks exceed 3 per day, actively reschedule or decline one.');
  }

  // Messaging analysis
  if (twMessages > 0 || lwMessages > 0) {
    const msgDelta = lwMessages > 0 ? ((twMessages - lwMessages) / lwMessages) * 100 : 0;
    if (msgDelta > 25) {
      observations.push(`Team messaging is up ${Math.round(msgDelta)}% (${lwMessages} → ${twMessages} messages). This may indicate increased coordination needs or an active project phase.`);
    } else if (msgDelta < -25 && lwMessages > 5) {
      observations.push(`Team messaging dropped ${Math.abs(Math.round(msgDelta))}% (${lwMessages} → ${twMessages}). Declining message volume can be an early cohesion signal — especially if meetings also didn't increase.`);
      risks.push('A sustained drop in communication volume (without a matching decline in workload) can indicate weakening team connection.');
      recommendations.push('Check in with team leads to understand the drop. If teams are siloing, consider reinstating a brief async standup or weekly sync.');
    }
  }

  // After-hours analysis
  if (tw.afterHoursMsg > 0 || tw.afterHoursEmail > 0.15) {
    const totalAfterHours = tw.afterHoursMsg;
    const afterHoursRatioPct = Math.round((tw.afterHoursRatio || 0) * 100);
    if (afterHoursRatioPct >= 30) {
      observations.push(`${afterHoursRatioPct}% of team messages were sent outside working hours (before 8am or after 6pm). ${totalAfterHours > 0 ? `That's ${Math.round(totalAfterHours)} after-hours messages this week.` : ''}`);
      risks.push('After-hours ratios above 25% are associated with increased burnout risk and declining next-day focus quality.');
      recommendations.push('Implement "quiet hours" in Teams/Slack (e.g., schedule send for next morning). Leadership should model boundary-setting by not sending after 6pm.');
    } else if (afterHoursRatioPct >= 15) {
      observations.push(`After-hours messaging is at ${afterHoursRatioPct}% — within normal range but worth monitoring.`);
    }
    // Check if worsening
    if (tw.afterHoursRatio > lw.afterHoursRatio && lw.afterHoursRatio > 0) {
      const afterHoursDrift = Math.round(((tw.afterHoursRatio - lw.afterHoursRatio) / lw.afterHoursRatio) * 100);
      if (afterHoursDrift > 20) {
        observations.push(`After-hours ratio increased ${afterHoursDrift}% compared to last week — this is a negative trend.`);
      }
    }
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
      observations.push(`⚠️ ${criticalSignals.length} critical drift signal(s) detected: ${signalNames.join('; ')}.`);
      
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
      observations.push(`${riskSignals.length} risk-level signal(s) detected: ${signalNames.join('; ')}.`);
    }
  }

  // CK Signals analysis
  const highCK = twCKSignals.filter(s => s.severity >= 65);
  if (highCK.length > 0) {
    for (const ck of highCK.sort((a, b) => b.severity - a.severity).slice(0, 3)) {
      const label = CK_SIGNAL_LABELS[ck.signalType] || {};
      observations.push(`${label.label || ck.signalType} signal detected (severity ${ck.severity}/100): ${ck.explanation || ''}`);
      if (label.rec) recommendations.push(label.rec);
    }
  }

  // Determine overall health verdict
  const critCount = twSignals.filter(s => s.severity === 'Critical').length + twCKSignals.filter(s => s.severity >= 80).length;
  const riskCount = twSignals.filter(s => s.severity === 'Risk').length + twCKSignals.filter(s => s.severity >= 65 && s.severity < 80).length;
  const driftingTeams = teamBDIData.filter(t => ['Early Drift', 'Developing Drift', 'Critical Drift'].includes(t.bdi.driftState));
  
  let verdictColor, verdictIcon, verdictText, verdictSummary;
  if (critCount > 0 || driftingTeams.some(t => t.bdi.driftState === 'Critical Drift')) {
    verdictColor = '#ef4444'; verdictIcon = '🔴'; verdictText = 'Needs Attention';
    verdictSummary = 'Critical signals detected. Immediate review and action recommended.';
  } else if (riskCount > 0 || driftingTeams.length > 0) {
    verdictColor = '#f59e0b'; verdictIcon = '🟡'; verdictText = 'Watch Closely';
    verdictSummary = 'Early warning signals present. Monitor trends and consider preventive action.';
  } else {
    verdictColor = '#10b981'; verdictIcon = '🟢'; verdictText = 'Healthy';
    verdictSummary = 'No significant drift detected. Work patterns are within normal range.';
  }

  // If no observations were generated but we have data, add a neutral one
  if (observations.length === 0 && twTotal > 0) {
    observations.push(`Overall work activity is stable with ${twTotal} events tracked across ${connectedSources.length} data source(s). No significant changes detected week-over-week.`);
    recommendations.push('Continue monitoring. Stable weeks are a good time to invest in process improvement or address small friction points before they grow.');
  }

  // ─── AI Analysis Layer ───
  // Feed all computed data to the LLM for cross-metric insights, industry benchmarking,
  // strategic recommendations, and a look-ahead warning.
  const employeeCount = await User.countDocuments({ orgId: org._id });
  const aiAnalysis = await generateWeeklyAIAnalysis({
    orgName: org.name,
    industry: org.industry || 'Other',
    orgSize: org.size || `${employeeCount} employees`,
    teamCount: teams.length,
    employeeCount,
    tw, lw,
    twMeetings, lwMeetings, twMessages, lwMessages,
    twSignals, lwSignals, twCKSignals, lwCKSignals,
    teamBDIData,
    observations, risks,
    connectedSources,
  });

  // ════════════════════════════════════════════════════════════
  // BUILD THE HTML
  // ════════════════════════════════════════════════════════════

  let html = '';

  // ─── Header ───
  html += `<div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width:640px; margin:0 auto; color:#111827;">`;
  html += `<div style="background:linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius:16px 16px 0 0; padding:28px 28px 20px 28px; color:white;">`;
  html += `<h1 style="margin:0; font-size:24px; font-weight:700;">📊 Weekly Intelligence Brief</h1>`;
  html += `<p style="margin:6px 0 0 0; font-size:14px; opacity:0.9;">${org.name} — Week of ${thisWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>`;
  html += `</div>`;

  // ─── 1. Executive Summary / Verdict ───
  html += `<div style="${S.card} border-top:0; border-radius:0 0 12px 12px; margin-top:0;">`;
  html += `<div style="display:flex; align-items:center; margin-bottom:12px;">`;
  html += `<span style="font-size:28px; margin-right:12px;">${verdictIcon}</span>`;
  html += `<div>`;
  html += `<h2 style="margin:0; font-size:20px; color:${verdictColor};">${verdictText}</h2>`;
  html += `<p style="${S.p} margin:2px 0 0 0;">${verdictSummary}</p>`;
  html += `</div></div>`;
  
  // Quick stats strip
  html += `<div style="display:flex; gap:16px; margin-top:12px; flex-wrap:wrap;">`;
  html += `<div style="flex:1; min-width:100px; text-align:center; padding:8px; background:#f9fafb; border-radius:8px;">
    <div style="font-size:22px; font-weight:700; color:#111827;">${twMeetings}</div>
    <div style="font-size:11px; color:#6b7280; text-transform:uppercase;">Meetings</div>
    <div style="font-size:11px; color:${twMeetings > lwMeetings ? '#ef4444' : twMeetings < lwMeetings ? '#10b981' : '#6b7280'};">${pctChangeLabel(twMeetings, lwMeetings)}</div>
  </div>`;
  html += `<div style="flex:1; min-width:100px; text-align:center; padding:8px; background:#f9fafb; border-radius:8px;">
    <div style="font-size:22px; font-weight:700; color:#111827;">${twMessages}</div>
    <div style="font-size:11px; color:#6b7280; text-transform:uppercase;">Messages</div>
    <div style="font-size:11px; color:${twMessages > lwMessages ? '#10b981' : twMessages < lwMessages ? '#ef4444' : '#6b7280'};">${pctChangeLabel(twMessages, lwMessages)}</div>
  </div>`;
  html += `<div style="flex:1; min-width:100px; text-align:center; padding:8px; background:#f9fafb; border-radius:8px;">
    <div style="font-size:22px; font-weight:700; color:#111827;">${fmtNum(tw.meetingHours, 1)}h</div>
    <div style="font-size:11px; color:#6b7280; text-transform:uppercase;">Meeting Hours</div>
    <div style="font-size:11px; color:${tw.meetingHours > lw.meetingHours ? '#ef4444' : '#10b981'};">${pctChangeLabel(tw.meetingHours, lw.meetingHours)}</div>
  </div>`;
  html += `<div style="flex:1; min-width:100px; text-align:center; padding:8px; background:#f9fafb; border-radius:8px;">
    <div style="font-size:22px; font-weight:700; color:#111827;">${twSignals.length + twCKSignals.length}</div>
    <div style="font-size:11px; color:#6b7280; text-transform:uppercase;">Signals</div>
    <div style="font-size:11px; color:#6b7280;">${critCount > 0 ? `${critCount} critical` : riskCount > 0 ? `${riskCount} risk` : 'None critical'}</div>
  </div>`;
  html += `</div>`;
  html += `</div>`;

  // ─── 2. What Changed This Week (narrative) ───
  html += `<div style="${S.card}">`;
  html += `<h3 style="${S.h3} margin-top:0;">📋 What Changed This Week</h3>`;
  if (observations.length > 0) {
    for (const obs of observations) {
      const isWarning = obs.startsWith('⚠️');
      html += `<div style="padding:8px 12px; margin-bottom:8px; background:${isWarning ? '#fef2f2' : '#f9fafb'}; border-radius:8px; border-left:3px solid ${isWarning ? '#ef4444' : '#e5e7eb'};">`;
      html += `<p style="${S.p} margin:0;">${obs}</p>`;
      html += `</div>`;
    }
  } else {
    html += `<p style="${S.p}">No significant changes detected this week.</p>`;
  }
  html += `</div>`;

  // ─── 3. Week-over-Week Comparison Table ───
  html += `<div style="${S.card}">`;
  html += `<h3 style="${S.h3} margin-top:0;">📊 Week-over-Week Comparison</h3>`;
  html += `<table style="${S.table}">`;
  html += `<thead><tr>`;
  html += `<th style="${S.th}">Metric</th>`;
  html += `<th style="${S.thR}">Last Week</th>`;
  html += `<th style="${S.thR}">This Week</th>`;
  html += `<th style="${S.thR}">Change</th>`;
  html += `</tr></thead><tbody>`;

  const addTableRow = (label, lwVal, twVal, higherIsBad = true, fmt = 0) => {
    const icon = trendIcon(twVal, lwVal, higherIsBad);
    html += `<tr>`;
    html += `<td style="${S.td}">${label}</td>`;
    html += `<td style="${S.tdR}">${fmtNum(lwVal, fmt)}</td>`;
    html += `<td style="${S.tdBold}">${fmtNum(twVal, fmt)}</td>`;
    html += `<td style="${S.tdR}">${icon} ${pctChangeLabel(twVal, lwVal)}</td>`;
    html += `</tr>`;
  };

  // Activity totals
  addTableRow('📅 Meetings', lwMeetings, twMeetings, true);
  addTableRow('💬 Team Messages', lwMessages, twMessages, false);
  addTableRow('📊 Total Events', lwTotal, twTotal, false);

  // Per-source if available
  if (twOutlook > 0 || lwOutlook > 0) addTableRow('&nbsp;&nbsp;↳ Outlook Meetings', lwOutlook, twOutlook, true);
  if (twGcal > 0 || lwGcal > 0) addTableRow('&nbsp;&nbsp;↳ Google Calendar', lwGcal, twGcal, true);
  if (twTeamsMsg > 0 || lwTeamsMsg > 0) addTableRow('&nbsp;&nbsp;↳ Teams Messages', lwTeamsMsg, twTeamsMsg, false);
  if (twSlack > 0 || lwSlack > 0) addTableRow('&nbsp;&nbsp;↳ Slack Messages', lwSlack, twSlack, false);
  if (twGchat > 0 || lwGchat > 0) addTableRow('&nbsp;&nbsp;↳ Google Chat', lwGchat, twGchat, false);

  // Detailed metrics section
  if (twMetricsArr.length > 0 || lwMetricsArr.length > 0) {
    html += `<tr><td colspan="4" style="padding:10px 10px 4px; font-weight:600; color:#6366f1; border-bottom:2px solid #e5e7eb; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Detailed Metrics (rolling 7-day avg)</td></tr>`;
    addTableRow('⏱️ Meeting Hours', lw.meetingHours, tw.meetingHours, true, 1);
    addTableRow('⚡ Back-to-Back Blocks', lw.backToBack, tw.backToBack, true, 0);
    addTableRow('💬 Messages / Day', lw.msgsPerDay, tw.msgsPerDay, false, 1);
    addTableRow('🌙 After-Hours Messages', lw.afterHoursMsg, tw.afterHoursMsg, true, 0);
    addTableRow('🌙 After-Hours Ratio', Math.round((lw.afterHoursRatio || 0) * 100), Math.round((tw.afterHoursRatio || 0) * 100), true);
    if (tw.channels > 0 || lw.channels > 0) addTableRow('📂 Active Channels', lw.channels, tw.channels, false, 0);
  }

  html += `</tbody></table>`;
  html += `</div>`;

  // ─── 4. Risk Assessment ───
  if (risks.length > 0) {
    html += `<div style="${S.card}">`;
    html += `<h3 style="${S.h3} margin-top:0;">⚠️ Risk Assessment — Why This Matters</h3>`;
    for (const risk of risks) {
      html += `<div style="${S.warnBox}">`;
      html += `<p style="${S.p} margin:0;">${risk}</p>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  // ─── 4b. AI Intelligence Analysis (powered by LLM) ───
  if (aiAnalysis) {
    // Executive Narrative
    if (aiAnalysis.executiveNarrative) {
      html += `<div style="${S.card} border-left:4px solid #6366f1;">`;
      html += `<div style="display:flex; align-items:center; margin-bottom:12px;">`;
      html += `<span style="font-size:20px; margin-right:10px;">🧠</span>`;
      html += `<h3 style="${S.h3} margin:0;">AI Analysis</h3>`;
      html += `</div>`;
      html += `<p style="${S.p}">${aiAnalysis.executiveNarrative}</p>`;
      html += `</div>`;
    }

    // Cross-Metric Insights
    if (aiAnalysis.crossMetricInsights?.length > 0) {
      html += `<div style="${S.card}">`;
      html += `<h3 style="${S.h3} margin-top:0;">🔗 Cross-Metric Insights</h3>`;
      html += `<p style="${S.pSmall}">Patterns the AI identified across multiple data points.</p>`;
      for (const insight of aiAnalysis.crossMetricInsights) {
        html += `<div style="padding:10px 14px; margin-bottom:8px; background:#f0f0ff; border-radius:8px; border-left:3px solid #6366f1;">`;
        html += `<p style="${S.p} margin:0;">${insight}</p>`;
        html += `</div>`;
      }
      html += `</div>`;
    }

    // Industry Benchmarking
    if (aiAnalysis.industryComparison) {
      const bench = INDUSTRY_BENCHMARKS[org.industry] || INDUSTRY_BENCHMARKS['Other'];
      html += `<div style="${S.card}">`;
      html += `<h3 style="${S.h3} margin-top:0;">🏢 Industry Benchmark: ${org.industry || 'General'}</h3>`;
      html += `<p style="${S.p}">${aiAnalysis.industryComparison}</p>`;
      html += `<div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:12px;">`;
      html += `<div style="flex:1; min-width:120px; text-align:center; padding:10px; background:#f9fafb; border-radius:8px;">
        <div style="font-size:11px; color:#6b7280; text-transform:uppercase;">Industry Avg</div>
        <div style="font-size:18px; font-weight:700; color:#6b7280;">${bench.meetingHoursPerWeek}h</div>
        <div style="font-size:11px; color:#6b7280;">mtg hours/wk</div>
      </div>`;
      html += `<div style="flex:1; min-width:120px; text-align:center; padding:10px; background:${tw.meetingHours > bench.meetingHoursPerWeek ? '#fef2f2' : '#f0fdf4'}; border-radius:8px;">
        <div style="font-size:11px; color:#6b7280; text-transform:uppercase;">Your Org</div>
        <div style="font-size:18px; font-weight:700; color:${tw.meetingHours > bench.meetingHoursPerWeek ? '#ef4444' : '#10b981'};">${fmtNum(tw.meetingHours, 1)}h</div>
        <div style="font-size:11px; color:#6b7280;">mtg hours/wk</div>
      </div>`;
      html += `<div style="flex:1; min-width:120px; text-align:center; padding:10px; background:#f9fafb; border-radius:8px;">
        <div style="font-size:11px; color:#6b7280; text-transform:uppercase;">Industry Avg</div>
        <div style="font-size:18px; font-weight:700; color:#6b7280;">${bench.afterHoursPct}%</div>
        <div style="font-size:11px; color:#6b7280;">after-hours</div>
      </div>`;
      html += `<div style="flex:1; min-width:120px; text-align:center; padding:10px; background:${(tw.afterHoursRatio || 0) * 100 > bench.afterHoursPct ? '#fef2f2' : '#f0fdf4'}; border-radius:8px;">
        <div style="font-size:11px; color:#6b7280; text-transform:uppercase;">Your Org</div>
        <div style="font-size:18px; font-weight:700; color:${(tw.afterHoursRatio || 0) * 100 > bench.afterHoursPct ? '#ef4444' : '#10b981'};">${Math.round((tw.afterHoursRatio || 0) * 100)}%</div>
        <div style="font-size:11px; color:#6b7280;">after-hours</div>
      </div>`;
      html += `</div>`;
      html += `</div>`;
    }

    // Strategic Recommendations from AI
    if (aiAnalysis.strategicRecommendations?.length > 0) {
      html += `<div style="${S.card}">`;
      html += `<h3 style="${S.h3} margin-top:0;">🎯 AI Strategic Recommendations</h3>`;
      html += `<p style="${S.pSmall}">Prioritised actions generated by AI based on your data, industry context, and cross-metric patterns.</p>`;
      for (const rec of aiAnalysis.strategicRecommendations) {
        const effortColor = rec.effort === 'Low' ? '#10b981' : rec.effort === 'Medium' ? '#f59e0b' : '#ef4444';
        html += `<div style="${S.recBox} border-left:3px solid #6366f1;">`;
        html += `<p style="${S.p} margin:0 0 6px 0;"><strong>#${rec.priority}:</strong> ${rec.action}</p>`;
        html += `<p style="${S.pSmall} margin:0 0 4px 0;"><strong>Why:</strong> ${rec.rationale}</p>`;
        html += `<p style="${S.pSmall} margin:0;">`;
        html += `<span style="${S.badge(effortColor + '20', effortColor)}">${rec.effort} effort</span> `;
        html += `<strong>Expected impact:</strong> ${rec.expectedImpact}`;
        html += `</p>`;
        html += `</div>`;
      }
      html += `</div>`;
    }

    // Look-Ahead Warning
    if (aiAnalysis.lookAheadWarning) {
      html += `<div style="${S.card} border-left:4px solid #f59e0b;">`;
      html += `<h3 style="${S.h3} margin-top:0;">👁️ AI Look-Ahead</h3>`;
      html += `<p style="${S.p}">${aiAnalysis.lookAheadWarning}</p>`;
      html += `</div>`;
    }
  }

  // ─── 5. Recommendations ───
  if (recommendations.length > 0) {
    html += `<div style="${S.card}">`;
    html += `<h3 style="${S.h3} margin-top:0;">✅ Recommended Actions</h3>`;
    html += `<p style="${S.pSmall}">Prioritized actions based on this week's data. Each is designed to be low-effort and reversible.</p>`;
    recommendations.forEach((rec, i) => {
      html += `<div style="${S.recBox}">`;
      html += `<p style="${S.p} margin:0;"><strong>${i + 1}.</strong> ${rec}</p>`;
      html += `</div>`;
    });
    html += `</div>`;
  }

  // ─── 6. Drift Signals Detail ───
  if (twSignals.length > 0 || twCKSignals.length > 0) {
    html += `<div style="${S.card}">`;
    html += `<h3 style="${S.h3} margin-top:0;">🎯 Active Drift Signals</h3>`;

    // Group signals by family
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
      
      for (const sig of sigs) {
        const sevColor = sig.severity === 'Critical' ? '#ef4444' : sig.severity === 'Risk' ? '#f59e0b' : '#6b7280';
        html += `<div style="${S.cardAlert(sevColor)}">`;
        html += `<p style="${S.p} margin:0 0 4px 0;"><strong>${sig.title}</strong> <span style="${S.badge(sevColor + '20', sevColor)}">${sig.severity}</span></p>`;
        if (sig.team !== 'Organization') html += `<p style="${S.pSmall}">Team: ${sig.team}</p>`;
        if (sig.whatItMeans) html += `<p style="${S.p}">${sig.whatItMeans}</p>`;
        if (sig.consequence) html += `<p style="${S.p}"><em>What usually follows:</em> ${sig.consequence}</p>`;
        if (sig.actions.length > 0) {
          html += `<p style="${S.p} margin-bottom:2px;"><strong>Suggested action:</strong> ${sig.actions[0].action}</p>`;
          if (sig.actions[0].timeframe) html += `<p style="${S.pSmall}">Timeframe: ${sig.actions[0].timeframe} | Effort: ${sig.actions[0].effort || 'Low'}</p>`;
        }
        html += `</div>`;
      }
    }

    // CK Signals
    if (highCK.length > 0) {
      html += `<h4 style="${S.h4}">Automated Pipeline Signals</h4>`;
      for (const ck of highCK.sort((a, b) => b.severity - a.severity).slice(0, 5)) {
        const label = CK_SIGNAL_LABELS[ck.signalType] || {};
        const sevColor = ck.severity >= 80 ? '#ef4444' : ck.severity >= 65 ? '#f59e0b' : '#6b7280';
        html += `<div style="${S.cardAlert(sevColor)}">`;
        html += `<p style="${S.p} margin:0 0 4px 0;"><strong>${label.label || ck.signalType}</strong> <span style="${S.badge(sevColor + '20', sevColor)}">Severity ${ck.severity}</span></p>`;
        if (ck.explanation) html += `<p style="${S.p}">${ck.explanation}</p>`;
        if (label.rec) html += `<p style="${S.p}"><strong>Recommended:</strong> ${label.rec}</p>`;
        html += `</div>`;
      }
    }

    // WoW signal comparison
    const lwSignalCount = lwSignals.length + lwCKSignals.length;
    const twSignalCount = twSignals.length + twCKSignals.length;
    if (lwSignalCount > 0 || twSignalCount > 0) {
      html += `<p style="${S.pSmall}">Signal count: last week ${lwSignalCount} → this week ${twSignalCount} (${pct(twSignalCount, lwSignalCount)})</p>`;
    }

    html += `</div>`;
  }

  // ─── 7. Team Health (BDI) ───
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

      // Recommended playbook action
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

  // ─── 8. Outlook for Next Week ───
  html += `<div style="${S.card}">`;
  html += `<h3 style="${S.h3} margin-top:0;">🔮 Outlook for Next Week</h3>`;
  
  const outlookItems = [];
  
  if (tw.backToBack > lw.backToBack && tw.backToBack > 3) {
    outlookItems.push('Back-to-back meeting pressure is rising. Without intervention, expect increased after-hours work and slower response times.');
  }
  if (tw.afterHoursRatio > 0.25) {
    outlookItems.push('After-hours work is elevated. If this continues, recovery quality will decline and you may see focus erosion signals within 1-2 weeks.');
  }
  if (twMeetings > lwMeetings * 1.1 && twMessages < lwMessages * 0.9) {
    outlookItems.push('Meetings are increasing while messaging is declining — this often indicates teams are shifting from async to sync coordination, which is less efficient at scale.');
  }
  if (driftingTeams.length > 0) {
    outlookItems.push(`${driftingTeams.length} team(s) are in drift state. Without corrective action, drift typically deepens over the next 2-3 weeks.`);
  }
  if (critCount > 0) {
    outlookItems.push('Critical signals are active. The top priority this week should be addressing those signals before they cascade.');
  }
  if (outlookItems.length === 0) {
    outlookItems.push('Current trajectory looks stable. This is a good week to invest in proactive improvements: review meeting hygiene, check in with remote team members, and clean up any accumulating tech or process debt.');
  }

  for (const item of outlookItems) {
    html += `<p style="${S.p}">• ${item}</p>`;
  }
  html += `</div>`;

  // ─── Footer ───
  html += `<div style="padding:16px 24px; background:#f9fafb; border-radius:0 0 12px 12px; border:1px solid #e5e7eb; border-top:0;">`;
  html += `<p style="${S.pSmall}">Data sources: ${connectedSources.length > 0 ? connectedSources.join(' · ') : 'None connected'}</p>`;
  html += `<p style="${S.pSmall}">Report period: ${thisWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} compared with ${lastWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(thisWeekStart.getTime() - 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>`;
  html += `<p style="${S.pSmall}">Generated by <strong>SignalTrue</strong> at ${now.toLocaleString()}</p>`;
  html += `</div>`;

  html += `</div>`;
  
  return html;
}

export async function sendWeeklyBrief(orgId) {
  const org = await Organization.findById(orgId);
  const hrUsers = await User.find({ orgId, role: { $in: ['hr_admin', 'admin', 'master_admin'] } });
  if (!hrUsers.length) return;
  const html = await generateWeeklyBrief(orgId);
  const recipients = hrUsers.map(u => u.email);

  const weekLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const subject = `Weekly Intelligence Brief — ${org.name} — ${weekLabel}`;

  // Prefer Resend if configured, else fall back to nodemailer SMTP
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'SignalTrue <brief@signaltrue.ai>',
      to: recipients,
      subject,
      html,
    });
  } else {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@signaltrue.ai',
      to: recipients.join(','),
      subject,
      html,
    });
  }
}

export default { sendWeeklyBrief, generateWeeklyBrief };