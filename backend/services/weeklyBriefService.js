import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import BehavioralDriftIndex from '../models/behavioralDriftIndex.js';
import Team from '../models/team.js';
import WorkEvent from '../models/workEvent.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import Signal from '../models/signal.js';
import CategoryKingSignal from '../models/categoryKingSignal.js';
import WeekContext from '../models/weekContext.js';
import EngagementStrainWeekly from '../models/engagementStrainWeekly.js';
import IntegrationConnection from '../models/integrationConnection.js';
import TeamSizeGate from '../models/teamSizeGate.js';
import Intervention from '../models/intervention.js';
import BriefPrediction from '../models/briefPrediction.js';
import { generateWeeklyAIAnalysis } from './weeklyAIAnalysisService.js';
import { calculateTeamStatus, STATUS_LEVELS } from './escalationService.js';
import { ccSuperadmin } from './superadminNotifyService.js';

// ─── Signal type presentation (same as in signals.js) ───
const SIGNAL_TYPE_PRESENTATION = {
  'meeting-load-spike': {
    family: 'Capacity Drift',
    businessTitle: 'Meeting load moved above baseline',
    whatItMeans:
      'Measured coordination time increased; the metadata does not show its value or cause.',
  },
  'after-hours-creep': {
    family: 'Capacity Drift',
    businessTitle: 'More activity occurred outside configured working hours',
    whatItMeans:
      'Confirm time zones, deadlines, leave, and working agreements before interpreting it.',
  },
  'focus-erosion': {
    family: 'Capacity Drift',
    businessTitle: 'Measured uninterrupted time declined',
    whatItMeans:
      'Calendar gaps became shorter or more distributed; output quality is not measured.',
  },
  'recovery-deficit': {
    family: 'Capacity Drift',
    businessTitle: 'Recovery time between workdays is shrinking',
    whatItMeans: 'The measured schedule leaves less time between work periods than the baseline.',
  },
  'context-switching': {
    family: 'Capacity Drift',
    businessTitle: 'Work patterns are becoming more fragmented',
    whatItMeans:
      'This metric rises when meetings leave more short gaps across the measured workday.',
  },
  'network-bottleneck': {
    family: 'Coordination Drift',
    businessTitle: 'Cross-team coordination is concentrated',
    whatItMeans:
      'A smaller contributor set carries more of the measured interface; validate role intent.',
  },
  'handoff-bottleneck': {
    family: 'Coordination Drift',
    businessTitle: 'Measured handoff activity increased',
    whatItMeans: 'Review whether the increase reflects planned delivery work or unclear ownership.',
  },
  'response-delay-increase': {
    family: 'Coordination Drift',
    businessTitle: 'Measured response time increased',
    whatItMeans:
      'The metadata does not establish overload, ownership quality, or communication quality.',
  },
  'message-volume-drop': {
    family: 'Cohesion Drift',
    businessTitle: 'Measured communication volume declined',
    whatItMeans:
      'This does not measure cohesion or disengagement; confirm whether workload, channel use, leave, or data coverage changed.',
  },
  'rework-churn': {
    family: 'Coordination Drift',
    businessTitle: 'More work is being revisited or reworked',
    whatItMeans:
      'Measured rework increased; review whether ownership, decisions, or workload changed.',
  },
  'sentiment-decline': {
    family: 'Cohesion Drift',
    businessTitle: 'A cohesion proxy moved below baseline',
    whatItMeans: 'This is an internal proxy, not sentiment or a direct reading of emotion.',
  },
  'meeting-exclusion': {
    family: 'Culture Drift',
    businessTitle: 'Meeting participation is uneven',
    whatItMeans:
      'Measured meeting participation is uneven; confirm how decisions and context are shared.',
  },
  'peripheral-member': {
    family: 'Culture Drift',
    businessTitle: 'Measured network participation is uneven',
    whatItMeans:
      'Measured network participation is lower for part of the team; confirm whether that matches role expectations.',
  },
  'hybrid-response-gap': {
    family: 'Culture Drift',
    businessTitle: 'Measured response time differs by work arrangement',
    whatItMeans:
      'Validate role, time-zone, and channel differences before interpreting the pattern as inclusion.',
  },
  'fading-voice': {
    family: 'Culture Drift',
    businessTitle: 'Measured participation declined over time',
    whatItMeans: 'Participation changed relative to baseline; validate the context before acting.',
  },
};

// ─── CK signal type labels ───
const CK_SIGNAL_LABELS = {
  execution_stagnation: {
    label: 'Execution Stagnation',
    family: 'Coordination',
    rec: 'Review task backlogs and unblock stalled items. Consider a focused sprint reset.',
  },
  rework_spiral: {
    label: 'Rework Spiral',
    family: 'Coordination',
    rec: 'Audit the last 3 items that were reopened. Look for unclear requirements or rushed handoffs.',
  },
  overcommitment_risk: {
    label: 'Commitment Load Deviation',
    family: 'Capacity',
    rec: 'Reduce WIP limits and defer new commitments until current work is shipped.',
  },
  wip_overload: {
    label: 'WIP Overload',
    family: 'Capacity',
    rec: 'Cap active tasks per person at 3. Move everything else to a "next up" column.',
  },
  boundary_erosion: {
    label: 'After-Hours Pattern',
    family: 'Capacity',
    rec: 'Enforce no-meeting blocks and limit after-hours notifications. Model healthy boundaries from leadership.',
  },
  panic_coordination: {
    label: 'Coordination Spike',
    family: 'Coordination',
    rec: 'Identify what triggered the coordination spike. Establish a calmer escalation path for next time.',
  },
  meeting_fatigue: {
    label: 'Meeting Load Deviation',
    family: 'Capacity',
    rec: 'Cancel the lowest-value recurring meeting this week. Shorten default meeting durations to 25/50 min.',
  },
  response_drift: {
    label: 'Response Drift',
    family: 'Coordination',
    rec: 'Check if key people are overloaded. Set explicit response-time norms for different channels.',
  },
  decision_churn: {
    label: 'Decision Churn',
    family: 'Coordination',
    rec: 'Identify decisions that keep getting revisited. Assign a single decision owner with a deadline.',
  },
  documentation_decay: {
    label: 'Documentation Decay',
    family: 'Cohesion',
    rec: 'Schedule 1 hour of documentation cleanup. Archive stale pages and update key docs.',
  },
  cognitive_overload: {
    label: 'Context-Switching Load',
    family: 'Capacity',
    rec: 'Reduce context-switching by batching similar work. Protect 2-hour deep-work blocks.',
  },
  external_pressure_injection: {
    label: 'External Pressure Injection',
    family: 'External',
    rec: 'Buffer the team from raw client urgency. Filter and prioritize external requests before routing.',
  },
  escalation_cascade: {
    label: 'Escalation Cascade',
    family: 'Coordination',
    rec: 'Review escalation triggers. Empower front-line decision-making where possible.',
  },
  handoff_spike: {
    label: 'Handoff Spike',
    family: 'Coordination',
    rec: 'Clarify handoff protocols. Assign clear "last responsible person" for each workflow stage.',
  },
  recovery_collapse: {
    label: 'Sustained Recovery Deviation',
    family: 'Capacity',
    rec: 'Review the direct after-hours and calendar metrics, confirm context, and test one recovery-window adjustment.',
  },
  work_aging_pressure: {
    label: 'Work Aging Pressure',
    family: 'Coordination',
    rec: 'Old work is piling up. Triage and close stale items. Focus energy on finishing, not starting.',
  },
  systemic_overload: {
    label: 'Multiple Load Deviations',
    family: 'Capacity',
    rec: 'Multiple internal review rules fired. Leadership should verify the direct metrics before changing scope.',
  },
  passive_disengagement: {
    label: 'Participation Decline',
    family: 'Cohesion',
    rec: 'Validate whether participation moved to another channel or changed by role before choosing a team-level response.',
  },
  async_breakdown: {
    label: 'Async Pattern Deviation',
    family: 'Coordination',
    rec: 'Review response and reciprocity metadata, then test explicit response-time norms if the team confirms friction.',
  },
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
function pctChangeLabelSafe(curr, prev, { minBase = 1, minDelta = 0.05 } = {}) {
  if (curr == null || prev == null) return '—';
  const delta = curr - prev;
  if (Math.abs(delta) < minDelta) return '→ same';
  if (Math.abs(prev) < minBase) {
    return Math.abs(curr) < minBase ? 'low volume' : curr > prev ? '↑ new' : '↓ to low';
  }
  return pctChangeLabel(curr, prev);
}
function trendIcon(curr, prev, higherIsBad = true) {
  if (curr === prev || (curr === 0 && prev === 0)) return 'Neutral';
  if (higherIsBad) return curr > prev ? 'Review' : 'Intended';
  return curr > prev ? 'Intended' : 'Review';
}
function fmtNum(n, decimals = 0) {
  if (n == null || isNaN(n)) return '—';
  if (n > 0 && Number(n).toFixed(decimals) === Number(0).toFixed(decimals)) {
    return decimals > 0 ? `<${(1 / Math.pow(10, decimals)).toFixed(decimals)}` : '<1';
  }
  return Number(n).toFixed(decimals);
}
function avgField(arr, field) {
  const vals = arr.map((m) => m[field]).filter((v) => v != null && !isNaN(v));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}
function isOrgMetricRecord(record) {
  return !record.teamId;
}
function chooseOrgMetricRecords(records) {
  const orgRecords = records.filter(isOrgMetricRecord);
  return orgRecords.length > 0 ? orgRecords : records;
}
function chooseLatestMetricRecords(records) {
  const preferred = chooseOrgMetricRecords(records);
  if (preferred.some(isOrgMetricRecord)) {
    return [...preferred].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 1);
  }
  const latestByTeam = new Map();
  [...preferred]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((record) => {
      const key = String(record.teamId || 'unassigned');
      if (!latestByTeam.has(key)) latestByTeam.set(key, record);
    });
  return [...latestByTeam.values()];
}
function chooseWeeklyMetricSnapshots(records) {
  const preferred = chooseOrgMetricRecords(records);
  const snapshots = new Map();
  [...preferred]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((record) => {
      const date = new Date(record.date);
      const day = date.getUTCDay() || 7;
      const monday = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
      );
      monday.setUTCDate(monday.getUTCDate() - day + 1);
      const key = `${monday.toISOString().slice(0, 10)}:${record.teamId || 'org'}`;
      if (!snapshots.has(key)) snapshots.set(key, record);
    });
  return [...snapshots.values()];
}

// Catch-all buckets ("Unassigned", "General", "Other") are not real teams and
// must never be scored or presented as team-level insight.
const CATCH_ALL_TEAM_RE = /^(unassigned|general|other|default|no[ -]?team)$/i;
export function isCatchAllTeam(name) {
  return CATCH_ALL_TEAM_RE.test(String(name || '').trim());
}

const STALE_SYNC_DAYS = 7;

/**
 * Data sanity layer: detect broken ingestion BEFORE any narrative is generated.
 * A metric that collapses to zero while its 6-week average is materially non-zero
 * is almost always a pipeline failure, not a behavior change — declare it, never
 * interpret it as "healthy improvement".
 */
export function detectDataAnomalies({
  tw,
  sixWeekAvg,
  twMessages,
  sixWeekRawAvg,
  integrationConnections,
  now,
}) {
  const anomalies = [];
  const suspectMetrics = new Set();

  // Stale connectors: status says connected but nothing synced for > STALE_SYNC_DAYS
  const staleConnectors = (integrationConnections || []).filter((conn) => {
    if (conn.status !== 'connected') return false;
    const last = conn.sync?.lastSyncAt ? new Date(conn.sync.lastSyncAt) : null;
    return !last || (now - last) / (1000 * 60 * 60 * 24) > STALE_SYNC_DAYS;
  });
  for (const conn of staleConnectors) {
    const last = conn.sync?.lastSyncAt
      ? new Date(conn.sync.lastSyncAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : 'never';
    anomalies.push({
      kind: 'stale_connector',
      metric: null,
      text: `${conn.integrationType} shows status "connected" but last synced ${last === 'never' ? 'never' : `on ${last}`}. Data from this source is missing or stale — metrics that depend on it are unreliable this week.`,
    });
  }

  // Message flow collapse: messaging source connected but volume near zero vs history
  if (sixWeekRawAvg.messages >= 5 && twMessages <= Math.max(1, sixWeekRawAvg.messages * 0.1)) {
    anomalies.push({
      kind: 'message_collapse',
      metric: 'messages',
      text: `Message volume collapsed to ${twMessages} this week vs a 6-week average of ${Math.round(sixWeekRawAvg.messages)}. This pattern indicates a broken or stale messaging sync, not a real behavior change.`,
    });
    suspectMetrics.add('messages');
    suspectMetrics.add('afterHours');
  }

  // After-hours collapse to exactly zero while history is materially non-zero
  if ((tw.afterHoursRatio || 0) === 0 && (sixWeekAvg.afterHoursRatio || 0) > 0.1) {
    anomalies.push({
      kind: 'after_hours_collapse',
      metric: 'afterHours',
      text: `Out-of-hours activity reads 0% this week against a 6-week average of ${Math.round(sixWeekAvg.afterHoursRatio * 100)}%. A drop to exactly zero is almost certainly a data capture issue — do not read this as a healthy improvement.`,
    });
    suspectMetrics.add('afterHours');
  }

  // Focus time never measured: zero across current week AND history means the
  // metric is not being computed — report as unmeasured, not as a finding.
  if ((tw.focusTimeAvailability || 0) === 0 && (sixWeekAvg.focusTimeAvailability || 0) === 0) {
    suspectMetrics.add('focusTime');
  }

  return { anomalies, suspectMetrics, staleConnectors };
}

/** Extract a gradable metric value for prediction grading. */
function predictionMetricValue(metric, ctx) {
  switch (metric) {
    case 'meetings':
      return ctx.twMeetings;
    case 'messages':
      return ctx.twMessages;
    case 'meetingHours':
      return ctx.tw.meetingHours;
    case 'afterHoursRatioPct':
      return Math.round((ctx.tw.afterHoursRatio || 0) * 100);
    case 'focusTimeAvailability':
      return ctx.tw.focusTimeAvailability;
    default:
      return null;
  }
}

const PREDICTION_METRIC_LABELS = {
  meetings: 'meeting count',
  messages: 'team messages',
  meetingHours: 'meeting hours per person',
  afterHoursRatioPct: 'out-of-hours work %',
  focusTimeAvailability: 'uninterrupted time (hrs)',
};

// ─── Styles ───
const S = {
  card: 'background:#ffffff; border:1px solid #dbe3ef; border-radius:12px; padding:22px 24px; margin-bottom:18px;',
  cardAlert: (color) =>
    `background:#ffffff; border:1px solid #dbe3ef; border-top:4px solid ${color}; border-radius:12px; padding:18px 20px; margin-bottom:14px;`,
  h2: 'color:#0f172a; font-size:22px; font-weight:750; margin:0 0 4px 0; letter-spacing:-.2px;',
  h3: 'color:#0f172a; font-size:15px; font-weight:800; margin:24px 0 14px 0; text-transform:uppercase; letter-spacing:.8px;',
  h4: 'color:#334155; font-size:14px; font-weight:750; margin:18px 0 8px 0;',
  p: 'color:#334155; font-size:14px; line-height:1.65; margin:0 0 8px 0;',
  pSmall: 'color:#64748b; font-size:12px; line-height:1.55; margin:4px 0;',
  badge: (bg, color) =>
    `display:inline-block; background:${bg}; color:${color}; font-size:11px; font-weight:750; padding:4px 9px; border-radius:999px; margin-right:6px; text-transform:uppercase; letter-spacing:.35px;`,
  table: 'border-collapse:collapse; width:100%; font-family:sans-serif; font-size:13px;',
  th: 'text-align:left; padding:9px 10px; border-bottom:1px solid #cbd5e1; color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:0.7px;',
  thR: 'text-align:right; padding:9px 10px; border-bottom:1px solid #cbd5e1; color:#64748b; font-size:11px; text-transform:uppercase; letter-spacing:0.7px;',
  td: 'padding:8px 10px; border-bottom:1px solid #edf2f7; color:#334155;',
  tdR: 'text-align:right; padding:8px 10px; border-bottom:1px solid #edf2f7; color:#334155;',
  tdBold:
    'text-align:right; padding:8px 10px; border-bottom:1px solid #edf2f7; font-weight:750; color:#0f172a;',
  divider: 'border:0; border-top:1px solid #e2e8f0; margin:24px 0;',
  recBox:
    'background:#f8fafc; border:1px solid #dbe3ef; border-radius:10px; padding:13px 15px; margin:8px 0;',
  warnBox:
    'background:#fff8ed; border:1px solid #fed7aa; border-radius:10px; padding:13px 15px; margin:8px 0;',
  alertBox:
    'background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:13px 15px; margin:8px 0;',
};

// ─── Manager Discussion Prompt Generator ───
function generateManagerPrompts({ tw, lw, sixWeekAvg, orgStatus, teamBDIData, twSignals }) {
  const prompts = [];

  // Meeting load prompts
  if (tw.meetingHours > 0) {
    if (sixWeekAvg.meetingHours > 0 && tw.meetingHours > sixWeekAvg.meetingHours * 1.15) {
      prompts.push(
        `Meeting participant-hours per person are ${fmtNum(tw.meetingHours, 1)}h this week versus a ${fmtNum(sixWeekAvg.meetingHours, 1)}h six-week baseline. Which change explains the increase, and which recurring meeting should be reviewed first?`
      );
    }
    if (lw.meetingHours > 0 && tw.meetingHours > lw.meetingHours * 1.2) {
      prompts.push(
        `Meeting hours jumped ${Math.round(((tw.meetingHours - lw.meetingHours) / lw.meetingHours) * 100)}% this week. Was this driven by a specific project, or is coordination overhead growing?`
      );
    }
  }

  // Back-to-back prompts
  if (sixWeekAvg.backToBack > 0 && tw.backToBack > sixWeekAvg.backToBack * 1.15) {
    prompts.push(
      `Back-to-back meeting blocks per person rose to ${fmtNum(tw.backToBack, 1)} from a ${fmtNum(sixWeekAvg.backToBack, 1)} six-week baseline. What created the clustering, and where could a transition gap be tested?`
    );
  }

  // After-hours prompts
  const afterHoursPct = Math.round((tw.afterHoursRatio || 0) * 100);
  if (sixWeekAvg.afterHoursRatio > 0 && tw.afterHoursRatio > sixWeekAvg.afterHoursRatio + 0.05) {
    prompts.push(
      `${afterHoursPct}% of messages were sent outside the configured schedule, above the ${Math.round(sixWeekAvg.afterHoursRatio * 100)}% six-week baseline. Did deadlines, time zones, or working agreements change?`
    );
  }

  // Focus time prompts
  if (
    tw.focusTimeAvailability &&
    sixWeekAvg.focusTimeAvailability > 0 &&
    tw.focusTimeAvailability < sixWeekAvg.focusTimeAvailability * 0.85
  ) {
    prompts.push(
      `Measured uninterrupted time fell to ${fmtNum(tw.focusTimeAvailability, 1)}h per person from a ${fmtNum(sixWeekAvg.focusTimeAvailability, 1)}h six-week baseline. Which calendar change best explains the drop?`
    );
  }

  // Communication drop
  if (lw.messages > 0 && tw.messages < lw.messages * 0.75) {
    prompts.push(
      `Team messaging dropped significantly. Was this a planned quiet week, a channel change, or a connector coverage issue?`
    );
  }

  // Drift state prompts
  const driftingTeams = teamBDIData.filter((t) =>
    ['Early Drift', 'Developing Drift', 'Critical Drift'].includes(t.bdi?.driftState)
  );
  if (driftingTeams.length > 0) {
    const names = driftingTeams.map((t) => t.teamName).join(', ');
    prompts.push(
      `${names} ${driftingTeams.length > 1 ? 'are' : 'is'} showing drift signals. Have you noticed anything different in team dynamics or workload recently?`
    );
  }

  // Escalation-related
  if (
    orgStatus.status === STATUS_LEVELS.EMERGING_DRIFT ||
    orgStatus.status === STATUS_LEVELS.CONFIRMED_DRIFT
  ) {
    prompts.push(
      `The organization is in "${orgStatus.status}" status. What's the single biggest pressure your team is facing right now?`
    );
  }

  // Signal-specific
  const capacitySignals = twSignals.filter(
    (s) => SIGNAL_TYPE_PRESENTATION[s.signalType]?.family === 'Capacity Drift'
  );
  if (capacitySignals.length >= 2) {
    prompts.push(
      `Multiple capacity signals are active. If you had to cut 20% of this week's commitments, what would you drop?`
    );
  }

  // Calendar fragmentation
  if (
    sixWeekAvg.calendarFragmentation > 0 &&
    tw.calendarFragmentation > sixWeekAvg.calendarFragmentation * 1.15
  ) {
    prompts.push(
      `Calendar fragmentation is ${fmtNum(tw.calendarFragmentation, 0)}/100 versus a ${fmtNum(sixWeekAvg.calendarFragmentation, 0)}/100 six-week baseline. Which meeting pattern spread the day into shorter gaps?`
    );
  }

  return prompts;
}

export async function generateWeeklyBrief(orgId) {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error('Organization not found');
  const minimumTeamSize = Math.max(5, Number(org.settings?.minTeamSize) || 5);
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
  const coveragePct =
    totalUsers > 0 ? Math.round((usersWithDataThisWeek.length / totalUsers) * 100) : 0;

  // ─── Fetch all data in parallel ───
  const [
    twEvents,
    lwEvents,
    sixWeekEvents,
    twMetricsArr,
    lwMetricsArr,
    sixWeekMetricsArr,
    twSignals,
    lwSignals,
    twCKSignals,
    lwCKSignals,
    contextTags,
    engagementStrainDocs,
    integrationConnections,
    recentEngagementSuppressions,
  ] = await Promise.all([
    WorkEvent.aggregate([
      { $match: { orgId: org._id, timestamp: { $gte: thisWeekStart, $lte: now } } },
      { $group: { _id: { source: '$source', eventType: '$eventType' }, count: { $sum: 1 } } },
    ]),
    WorkEvent.aggregate([
      { $match: { orgId: org._id, timestamp: { $gte: lastWeekStart, $lt: thisWeekStart } } },
      { $group: { _id: { source: '$source', eventType: '$eventType' }, count: { $sum: 1 } } },
    ]),
    WorkEvent.aggregate([
      { $match: { orgId: org._id, timestamp: { $gte: sixWeekStart, $lt: thisWeekStart } } },
      { $group: { _id: { source: '$source', eventType: '$eventType' }, count: { $sum: 1 } } },
    ]),
    IntegrationMetricsDaily.find({
      orgId: org._id,
      date: { $gte: thisWeekStart, $lte: now },
    }).lean(),
    IntegrationMetricsDaily.find({
      orgId: org._id,
      date: { $gte: lastWeekStart, $lt: thisWeekStart },
    }).lean(),
    IntegrationMetricsDaily.find({
      orgId: org._id,
      date: { $gte: sixWeekStart, $lt: thisWeekStart },
    }).lean(),
    Signal.find({ orgId: org._id, firstDetected: { $gte: thisWeekStart, $lte: now } })
      .populate('teamId', 'name')
      .lean(),
    Signal.find({ orgId: org._id, firstDetected: { $gte: lastWeekStart, $lt: thisWeekStart } })
      .populate('teamId', 'name')
      .lean(),
    CategoryKingSignal.find({
      orgId: org._id,
      detectedAt: { $gte: thisWeekStart, $lte: now },
    }).lean(),
    CategoryKingSignal.find({
      orgId: org._id,
      detectedAt: { $gte: lastWeekStart, $lt: thisWeekStart },
    }).lean(),
    WeekContext.find({
      orgId: org._id,
      weekStart: { $lte: now },
      weekEnd: { $gte: thisWeekStart },
    }).lean(),
    // Engagement Strain: current-period records that pass the privacy floor.
    EngagementStrainWeekly.aggregate([
      {
        $match: {
          orgId: org._id,
          scoringVersion: '2.1.0',
          weekStart: { $gte: thisWeekStart.toISOString().slice(0, 10) },
          activePeopleCount: { $gte: minimumTeamSize },
        },
      },
      { $sort: { teamId: 1, weekStart: -1 } },
      { $group: { _id: '$teamId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ]),
    IntegrationConnection.find({ orgId: org._id }).lean(),
    TeamSizeGate.find({ orgId: org._id }).sort({ suppressedAt: -1 }).limit(20).lean(),
  ]);

  // ─── Second-stage parallel fetch: impact loop, predictions, tenure, coverage trend ───
  const [recentInterventions, priorPredictions, firstMetricRecord, lastWeekMappedActors] =
    await Promise.all([
      // Actions the org logged (decision log / impact loop) — last 60 days
      Intervention.find({
        orgId: org._id,
        startDate: { $gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
      })
        .populate('teamId', 'name')
        .sort({ startDate: -1 })
        .limit(10)
        .lean(),
      // Predictions made in earlier briefs (most recent first) — for grading + track record
      BriefPrediction.find({ orgId: org._id }).sort({ weekStart: -1 }).limit(9).lean(),
      // Oldest metric record → how many weeks of baseline history exist
      IntegrationMetricsDaily.findOne({ orgId: org._id }).sort({ date: 1 }).select('date').lean(),
      // Mapping coverage last week — to detect coverage regression
      WorkEvent.distinct('actorUserId', {
        orgId: org._id,
        actorUserId: { $ne: null },
        timestamp: { $gte: lastWeekStart, $lt: thisWeekStart },
      }),
    ]);
  const weeksOfHistory = firstMetricRecord?.date
    ? Math.max(0, Math.floor((now - new Date(firstMetricRecord.date)) / (7 * 24 * 60 * 60 * 1000)))
    : 0;

  // ─── BDI data ───
  const teamBDIData = [];
  for (const team of teams) {
    const latestBDI = await BehavioralDriftIndex.findOne({ team: team._id })
      .sort({ calculatedAt: -1 })
      .populate('recommendedPlaybooks')
      .limit(1)
      .lean();
    const prevBDI = await BehavioralDriftIndex.findOne({
      team: team._id,
      calculatedAt: { $lt: thisWeekStart },
    })
      .sort({ calculatedAt: -1 })
      .limit(1)
      .lean();
    if (latestBDI) teamBDIData.push({ teamName: team.name, bdi: latestBDI, prevBDI });
  }

  // ─── Engagement Strain — attach team names ───
  // Catch-all buckets ("Unassigned", "General") are never scored: a strain score
  // for a non-team is noise and undermines trust in the real team scores.
  const teamById = new Map(teams.map((team) => [String(team._id), team]));
  const teamNameMap = Object.fromEntries(teams.map((t) => [String(t._id), t.name]));
  const engagementStrainByTeam = engagementStrainDocs
    .map((doc) => ({
      ...doc,
      teamName: teamNameMap[String(doc.teamId)] ?? null,
    }))
    .filter((doc) => {
      const team = teamById.get(String(doc.teamId));
      const knownSize = team?.metadata?.actualSize;
      return (
        !isCatchAllTeam(doc.teamName) &&
        team?.analyticsEnabled !== false &&
        (knownSize == null || knownSize >= minimumTeamSize)
      );
    });
  const engagementDriverLabel = (driver) =>
    ({
      recovery_debt: 'Outside-schedule activity',
      focus_erosion: 'Focus availability',
      coordination_friction: 'Coordination metadata',
      responsiveness_pressure: 'Response patterns',
      collaboration_withdrawal: 'Collaboration metadata',
      manager_support_gap: 'Recorded 1:1 time',
      workload_volatility: 'Week-to-week activity',
    })[driver] || driver;
  const engagementSnapshot =
    engagementStrainByTeam.length > 0
      ? (() => {
          const avg = (field) =>
            Math.round(
              engagementStrainByTeam.reduce((sum, team) => sum + (team[field] || 0), 0) /
                engagementStrainByTeam.length
            );
          const stateOrder = ['healthy', 'watch', 'strain', 'critical'];
          const worstState = engagementStrainByTeam.reduce(
            (worst, team) =>
              stateOrder.indexOf(team.riskState) > stateOrder.indexOf(worst)
                ? team.riskState
                : worst,
            'healthy'
          );
          const strainedTeams = engagementStrainByTeam.filter((team) =>
            ['strain', 'critical'].includes(team.riskState)
          ).length;
          const topDrivers = {};
          engagementStrainByTeam.forEach((team) => {
            (team.topDrivers || []).forEach((driver) => {
              if (!topDrivers[driver.driver]) topDrivers[driver.driver] = [];
              topDrivers[driver.driver].push(driver.score || 0);
            });
          });
          const drivers = Object.entries(topDrivers)
            .map(([driver, scores]) => ({
              driver,
              score: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 2);
          return {
            avgStrainRisk: avg('engagementStrainRisk'),
            avgDataReadiness: avg('confidenceScore'),
            worstState,
            strainedTeams,
            drivers,
          };
        })()
      : null;

  // ─── Derived metrics ───
  const getCount = (arr, source, eventType) =>
    arr.find((e) => e._id.source === source && e._id.eventType === eventType)?.count || 0;
  const getCountByType = (arr, eventType) =>
    arr.filter((e) => e._id.eventType === eventType).reduce((s, e) => s + e.count, 0);
  let twMeetings = getCountByType(twEvents, 'meeting');
  let lwMeetings = getCountByType(lwEvents, 'meeting');
  const twMessages = getCountByType(twEvents, 'message');
  const lwMessages = getCountByType(lwEvents, 'message');
  const twTotal = twEvents.reduce((s, e) => s + e.count, 0);
  const lwTotal = lwEvents.reduce((s, e) => s + e.count, 0);
  const sixWeekTotal = sixWeekEvents.reduce((s, e) => s + e.count, 0);
  const sixWeekRawAvg = {
    meetings: getCountByType(sixWeekEvents, 'meeting') / 6,
    messages: getCountByType(sixWeekEvents, 'message') / 6,
    total: sixWeekTotal / 6,
    outlook: getCount(sixWeekEvents, 'microsoft-outlook', 'meeting') / 6,
    gcal: getCount(sixWeekEvents, 'google-calendar', 'meeting') / 6,
    teams: getCount(sixWeekEvents, 'microsoft-teams', 'message') / 6,
    slack: getCount(sixWeekEvents, 'slack', 'message') / 6,
    gchat: getCount(sixWeekEvents, 'google-chat', 'message') / 6,
  };

  const twOrgMetricsArr = chooseLatestMetricRecords(twMetricsArr);
  const lwOrgMetricsArr = chooseLatestMetricRecords(lwMetricsArr);
  const sixWeekOrgMetricsArr = chooseWeeklyMetricSnapshots(sixWeekMetricsArr);

  const mappedActorCount = await WorkEvent.distinct('actorUserId', {
    orgId: org._id,
    actorUserId: { $ne: null },
    timestamp: { $gte: thisWeekStart, $lte: now },
  });
  const mappedTeamCount = await WorkEvent.distinct('teamId', {
    orgId: org._id,
    teamId: { $ne: null },
    timestamp: { $gte: thisWeekStart, $lte: now },
  });
  const unmappedActorEvents = await WorkEvent.countDocuments({
    orgId: org._id,
    $or: [{ actorUserId: null }, { actorUserId: { $exists: false } }],
    timestamp: { $gte: thisWeekStart, $lte: now },
  });
  const unmappedTeamEvents = await WorkEvent.countDocuments({
    orgId: org._id,
    $or: [{ teamId: null }, { teamId: { $exists: false } }],
    timestamp: { $gte: thisWeekStart, $lte: now },
  });
  const teamMemberCounts = await User.aggregate([
    { $match: { orgId: org._id } },
    { $group: { _id: '$teamId', count: { $sum: 1 } } },
  ]);
  const teamEventCounts = await WorkEvent.aggregate([
    {
      $match: {
        orgId: org._id,
        teamId: { $ne: null },
        timestamp: { $gte: thisWeekStart, $lte: now },
      },
    },
    { $group: { _id: '$teamId', events: { $sum: 1 }, activeUsers: { $addToSet: '$actorUserId' } } },
  ]);
  const memberCountByTeam = new Map(
    teamMemberCounts.map((row) => [String(row._id || 'unassigned'), row.count])
  );
  const eventCountByTeam = new Map(
    teamEventCounts.map((row) => [
      String(row._id),
      {
        events: row.events,
        activeUsers: row.activeUsers.filter(Boolean).length,
      },
    ])
  );
  const teamReadiness = teams.map((team) => {
    const eventInfo = eventCountByTeam.get(String(team._id)) || { events: 0, activeUsers: 0 };
    const memberCount = memberCountByTeam.get(String(team._id)) || 0;
    let status = 'Ready for scoring';
    let reason = 'Enough mapped activity is available.';
    if (isCatchAllTeam(team.name)) {
      status = 'Excluded (catch-all)';
      reason = `"${team.name}" is a catch-all bucket, not a real team — assign these people to named teams to include them in scoring.`;
      return { team, memberCount, ...eventInfo, status, reason };
    }
    if (memberCount < minimumTeamSize) {
      status = 'Suppressed';
      reason = `Team has ${memberCount} member(s); the organization requires ${minimumTeamSize} for engagement scoring.`;
    } else if (eventInfo.activeUsers < minimumTeamSize) {
      status = 'Not enough mapped activity';
      reason = `${eventInfo.activeUsers} active mapped user(s) this week; ${minimumTeamSize} required.`;
    } else if (eventInfo.events === 0) {
      status = 'No mapped events';
      reason = 'No calendar or collaboration events are mapped to this team yet.';
    }
    return { team, memberCount, ...eventInfo, status, reason };
  });

  const mappingCoveragePct =
    totalUsers > 0 ? Math.round((mappedActorCount.length / totalUsers) * 100) : 0;
  const eligibleTeamReadiness = teamReadiness.filter(
    (item) => !['Excluded (catch-all)', 'Suppressed'].includes(item.status)
  );
  const readyTeamCount = eligibleTeamReadiness.filter(
    (item) => item.status === 'Ready for scoring'
  ).length;
  const teamCoveragePct =
    eligibleTeamReadiness.length > 0
      ? Math.round((readyTeamCount / eligibleTeamReadiness.length) * 100)
      : 0;
  const dataReadinessStatus =
    mappingCoveragePct >= 80 && teamCoveragePct >= 80
      ? 'Ready'
      : mappingCoveragePct >= 40
        ? 'Partial'
        : 'Needs mapping';
  const dataReadinessColor =
    dataReadinessStatus === 'Ready'
      ? '#16a34a'
      : dataReadinessStatus === 'Partial'
        ? '#f59e0b'
        : '#dc2626';

  // Latest vs previous metrics averages — divided by connectedUserCount for per-person figures
  const tw = {
    meetings: avgField(twOrgMetricsArr, 'meetingCount7d') / connectedUserCount,
    meetingHours: avgField(twOrgMetricsArr, 'meetingDurationTotalHours7d') / connectedUserCount,
    backToBack: avgField(twOrgMetricsArr, 'backToBackMeetingBlocks') / connectedUserCount,
    messages: avgField(twOrgMetricsArr, 'messageCount7d') / connectedUserCount,
    msgsPerDay: avgField(twOrgMetricsArr, 'messagesPerDay') / connectedUserCount,
    afterHoursMsg: avgField(twOrgMetricsArr, 'afterHoursMessageCount') / connectedUserCount,
    afterHoursRatio: avgField(twOrgMetricsArr, 'afterHoursMessageRatio'), // already a ratio, no division
    channels: avgField(twOrgMetricsArr, 'uniqueChannels7d'),
    afterHoursEmail: avgField(twOrgMetricsArr, 'afterHoursSentRatio'),
    focusTimeAvailability:
      avgField(twOrgMetricsArr, 'focusTimeAvailabilityHours') / connectedUserCount,
    calendarFragmentation: avgField(twOrgMetricsArr, 'calendarFragmentationScore'),
    recurringBurden: avgField(twOrgMetricsArr, 'recurringMeetingBurden'),
  };
  const lw = {
    meetings: avgField(lwOrgMetricsArr, 'meetingCount7d') / connectedUserCount,
    meetingHours: avgField(lwOrgMetricsArr, 'meetingDurationTotalHours7d') / connectedUserCount,
    backToBack: avgField(lwOrgMetricsArr, 'backToBackMeetingBlocks') / connectedUserCount,
    messages: avgField(lwOrgMetricsArr, 'messageCount7d') / connectedUserCount,
    msgsPerDay: avgField(lwOrgMetricsArr, 'messagesPerDay') / connectedUserCount,
    afterHoursMsg: avgField(lwOrgMetricsArr, 'afterHoursMessageCount') / connectedUserCount,
    afterHoursRatio: avgField(lwOrgMetricsArr, 'afterHoursMessageRatio'),
    channels: avgField(lwOrgMetricsArr, 'uniqueChannels7d'),
    afterHoursEmail: avgField(lwOrgMetricsArr, 'afterHoursSentRatio'),
    focusTimeAvailability:
      avgField(lwOrgMetricsArr, 'focusTimeAvailabilityHours') / connectedUserCount,
    calendarFragmentation: avgField(lwOrgMetricsArr, 'calendarFragmentationScore'),
    recurringBurden: avgField(lwOrgMetricsArr, 'recurringMeetingBurden'),
  };

  // ─── 6-week baseline averages (per-person) ───
  const sixWeekAvg = {
    meetings: avgField(sixWeekOrgMetricsArr, 'meetingCount7d') / connectedUserCount,
    meetingHours:
      avgField(sixWeekOrgMetricsArr, 'meetingDurationTotalHours7d') / connectedUserCount,
    backToBack: avgField(sixWeekOrgMetricsArr, 'backToBackMeetingBlocks') / connectedUserCount,
    messages: avgField(sixWeekOrgMetricsArr, 'messageCount7d') / connectedUserCount,
    msgsPerDay: avgField(sixWeekOrgMetricsArr, 'messagesPerDay') / connectedUserCount,
    afterHoursMsg: avgField(sixWeekOrgMetricsArr, 'afterHoursMessageCount') / connectedUserCount,
    afterHoursRatio: avgField(sixWeekOrgMetricsArr, 'afterHoursMessageRatio'),
    afterHoursRatioPct: avgField(sixWeekOrgMetricsArr, 'afterHoursMessageRatio') * 100,
    channels: avgField(sixWeekOrgMetricsArr, 'uniqueChannels7d'),
    focusTimeAvailability:
      avgField(sixWeekOrgMetricsArr, 'focusTimeAvailabilityHours') / connectedUserCount,
    calendarFragmentation: avgField(sixWeekOrgMetricsArr, 'calendarFragmentationScore'),
    recurringBurden: avgField(sixWeekOrgMetricsArr, 'recurringMeetingBurden'),
  };
  // Prefer deduplicated calendar-instance metrics. Raw WorkEvent counts are
  // attendee-expanded and therefore are not a truthful meeting count.
  twMeetings = Math.round(
    avgField(twOrgMetricsArr, 'meetingInstanceCount7d') ||
      avgField(twOrgMetricsArr, 'meetingCount7d') ||
      twMeetings
  );
  lwMeetings = Math.round(
    avgField(lwOrgMetricsArr, 'meetingInstanceCount7d') ||
      avgField(lwOrgMetricsArr, 'meetingCount7d') ||
      lwMeetings
  );
  sixWeekRawAvg.meetings =
    avgField(sixWeekOrgMetricsArr, 'meetingInstanceCount7d') ||
    avgField(sixWeekOrgMetricsArr, 'meetingCount7d') ||
    sixWeekRawAvg.meetings;

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

  // ═══ DATA SANITY LAYER — runs BEFORE any narrative is generated ═══
  const {
    anomalies: dataAnomalies,
    suspectMetrics,
    staleConnectors,
  } = detectDataAnomalies({
    tw,
    sixWeekAvg,
    twMessages,
    sixWeekRawAvg,
    integrationConnections,
    now,
  });

  // Coverage regression: the one thing that got worse should never go unflagged
  const coverageRegressed =
    lastWeekMappedActors.length > 0 && mappedActorCount.length < lastWeekMappedActors.length * 0.8;

  // ─── Grade last week's prediction (self-grading track record) ───
  const gradingCtx = { tw, twMeetings, twMessages };
  let gradedPrediction = null;
  const ungraded = priorPredictions.find(
    (p) => !p.outcome?.evaluated && new Date(p.weekStart) < thisWeekStart
  );
  if (ungraded) {
    const actual = predictionMetricValue(ungraded.metric, gradingCtx);
    if (actual != null && !isNaN(actual)) {
      const held =
        ungraded.comparator === 'gte' ? actual >= ungraded.threshold : actual <= ungraded.threshold;
      try {
        await BriefPrediction.updateOne(
          { _id: ungraded._id },
          {
            $set: {
              'outcome.evaluated': true,
              'outcome.evaluatedAt': now,
              'outcome.actualValue': Math.round(actual * 10) / 10,
              'outcome.held': held,
            },
          }
        );
        gradedPrediction = {
          ...ungraded,
          outcome: { evaluated: true, actualValue: Math.round(actual * 10) / 10, held },
        };
      } catch (err) {
        console.error('[WeeklyBrief] Failed to grade prediction:', err.message);
      }
    }
  }
  const evaluatedPredictions = [
    ...(gradedPrediction ? [gradedPrediction] : []),
    ...priorPredictions.filter((p) => p.outcome?.evaluated),
  ].slice(0, 8);
  const predictionsHeld = evaluatedPredictions.filter((p) => p.outcome.held).length;

  // Cost is shown only when the client supplied a loaded hourly cost. The
  // comparison uses the organization's own baseline, not an invented benchmark.
  const hourlyCost = Number(org.settings?.loadedHourlyCost) || 0;
  const configuredCurrency = String(org.settings?.currency || 'EUR').toUpperCase();
  const currency = /^[A-Z]{3}$/.test(configuredCurrency) ? configuredCurrency : 'EUR';
  let costEstimate = null;
  if (
    dataReadinessStatus === 'Ready' &&
    hourlyCost > 0 &&
    sixWeekAvg.meetingHours > 0 &&
    tw.meetingHours > sixWeekAvg.meetingHours * 1.15 &&
    !suspectMetrics.has('meetings')
  ) {
    const excessHoursPerPerson = tw.meetingHours - sixWeekAvg.meetingHours;
    const peopleWithData = usersWithDataThisWeek.length;
    const weeklyCost = Math.round(excessHoursPerPerson * peopleWithData * hourlyCost);
    costEstimate = {
      weeklyCost,
      excessHoursPerPerson: Math.round(excessHoursPerPerson * 10) / 10,
      peopleWithData,
      hourlyCost,
      currency,
      baselineHours: Math.round(sixWeekAvg.meetingHours * 10) / 10,
      formattedWeeklyCost: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(weeklyCost),
    };
  }

  // ═══ HARD READINESS GATE ═══
  // When mapping coverage is too low to trust team-level conclusions, the report
  // SHRINKS instead of padding: a setup-focused brief with zero scores, zero AI
  // narrative, zero benchmarks. Shipping untrustworthy numbers with a "low
  // confidence" label teaches clients to ignore the product.
  const reportMode = dataReadinessStatus === 'Ready' ? 'full' : 'setup';

  if (reportMode === 'setup') {
    let html = '';
    html += `<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:0 auto;color:#0f172a;background:#ffffff;border:1px solid #d9e2ee;border-radius:14px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,.08);">`;
    html += `<div style="background:#0f172a;padding:30px 34px 24px;color:white;">`;
    html += `<div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.6px;font-weight:800;margin-bottom:8px;">Weekly Brief — Setup Required</div>`;
    html += `<h1 style="margin:0 0 6px 0;font-size:26px;font-weight:750;letter-spacing:-.3px;">${org.name}</h1>`;
    html += `<p style="margin:0;font-size:13px;color:#cbd5e1;">${thisWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>`;
    html += `</div>`;

    // Verdict: honest, short, no scores
    html += `<div style="padding:22px 34px;border-bottom:1px solid #e2e8f0;">`;
    html += `<h2 style="margin:0 0 8px 0;font-size:20px;font-weight:750;">Data setup is incomplete — modeled scores are paused</h2>`;
    html += `<p style="${S.p}">Only <strong>${mappedActorCount.length} of ${totalUsers} users (${mappingCoveragePct}%)</strong> and <strong>${readyTeamCount} of ${eligibleTeamReadiness.length} eligible teams</strong> have enough mapped activity this week. Modeled work-pattern conclusions are paused until both reach 80% coverage.</p>`;
    if (coverageRegressed) {
      html += `<div style="${S.alertBox}"><p style="${S.p} margin:0;"><strong>Coverage went down:</strong> ${lastWeekMappedActors.length} mapped users last week → ${mappedActorCount.length} this week. Something changed in your integrations or user mapping — this is the most important thing to investigate.</p></div>`;
    }
    html += `</div>`;

    // What broke (anomalies + stale connectors)
    if (dataAnomalies.length > 0) {
      html += `<div style="${S.card}">`;
      html += `<h3 style="${S.h3} margin-top:0;">What's broken</h3>`;
      for (const a of dataAnomalies) {
        html += `<div style="${S.alertBox}"><p style="${S.p} margin:0;">${a.text}</p></div>`;
      }
      html += `</div>`;
    }

    // Connector status with staleness
    if (integrationConnections.length > 0) {
      html += `<div style="${S.card}">`;
      html += `<h3 style="${S.h3} margin-top:0;">Connector status</h3>`;
      html += `<table style="${S.table}">`;
      html += `<thead><tr><th style="${S.th}">Source</th><th style="${S.thR}">Status</th><th style="${S.thR}">Coverage</th><th style="${S.thR}">Last sync</th></tr></thead><tbody>`;
      for (const conn of integrationConnections) {
        const isStale = staleConnectors.some((s) => String(s._id) === String(conn._id));
        const coverage =
          conn.coverage?.totalUsers > 0
            ? `${conn.coverage.mappedUsers || 0}/${conn.coverage.totalUsers}`
            : '—';
        const lastSync = conn.sync?.lastSyncAt
          ? new Date(conn.sync.lastSyncAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : '—';
        const statusLabel = isStale ? 'stale' : conn.status;
        const statusColor = isStale
          ? '#dc2626'
          : conn.status === 'connected'
            ? '#16a34a'
            : '#f59e0b';
        html += `<tr><td style="${S.td}">${conn.integrationType}</td><td style="${S.tdR};color:${statusColor};font-weight:700;">${statusLabel}</td><td style="${S.tdR}">${coverage}</td><td style="${S.tdR}">${lastSync}</td></tr>`;
      }
      html += `</tbody></table>`;
      html += `</div>`;
    }

    // Fix steps — the single deliverable of a setup-mode brief
    html += `<div style="${S.card}">`;
    html += `<h3 style="${S.h3} margin-top:0;">How to fix it (3 steps)</h3>`;
    const steps = [];
    if (staleConnectors.length > 0) {
      steps.push(
        `<strong>Re-authenticate stale connectors:</strong> ${staleConnectors.map((c) => c.integrationType).join(', ')} — reconnect in Settings → Integrations, then confirm a fresh sync timestamp.`
      );
    }
    steps.push(
      `<strong>Map users:</strong> ${totalUsers - mappedActorCount.length} user(s) have no mapped activity. In Settings → Employees, re-run the employee sync and match integration accounts to SignalTrue users.`
    );
    steps.push(
      `<strong>Assign teams:</strong> ${eligibleTeamReadiness.length - readyTeamCount} eligible team(s) are not ready${unmappedTeamEvents > 0 ? `, and ${unmappedTeamEvents} event(s) have no team attribution` : ''}. Review directory departments, then use public website suggestions for remaining unassigned people. Every suggested change requires admin approval.`
    );
    steps.slice(0, 3).forEach((step, i) => {
      html += `<div style="${S.recBox}"><p style="${S.p} margin:0;"><strong>${i + 1}.</strong> ${step}</p></div>`;
    });
    html += `<p style="${S.pSmall} margin-top:10px;">Full reporting resumes automatically when mapped-user and eligible-team readiness are both at least 80%.</p>`;
    html += `<div style="text-align:center;margin-top:16px;"><a href="${process.env.FRONTEND_URL || 'https://app.signaltrue.ai'}/app/employees" style="display:inline-block;background:#0f172a;color:white;padding:11px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">Review team setup</a></div>`;
    html += `</div>`;

    // Named team readiness — the mapping to-do list
    if (teamReadiness.length > 0) {
      html += `<div style="${S.card}">`;
      html += `<h3 style="${S.h3} margin-top:0;">Team readiness</h3>`;
      html += `<table style="${S.table}"><thead><tr><th style="${S.th}">Team</th><th style="${S.thR}">Members</th><th style="${S.thR}">Mapped active</th><th style="${S.thR}">Status</th></tr></thead><tbody>`;
      for (const item of teamReadiness) {
        const color =
          item.status === 'Ready for scoring'
            ? '#16a34a'
            : item.status === 'Excluded (catch-all)'
              ? '#9ca3af'
              : '#f59e0b';
        html += `<tr><td style="${S.td}">${item.team.name}</td><td style="${S.tdR}">${item.memberCount}</td><td style="${S.tdR}">${item.activeUsers}</td><td style="${S.tdR};color:${color};font-weight:700;">${item.status}</td></tr>`;
      }
      html += `</tbody></table></div>`;
    }

    // Footer
    html += `<div style="padding:17px 34px;background:#f8fafc;border-top:1px solid #e2e8f0;">`;
    html += `<p style="${S.pSmall}">Mapping coverage: <strong>${mappingCoveragePct}%</strong> of users${lastWeekMappedActors.length > 0 ? ` (last week: ${totalUsers > 0 ? Math.round((lastWeekMappedActors.length / totalUsers) * 100) : 0}%)` : ''} · ${weeksOfHistory} week(s) of data history collected — baselines keep building while you fix mapping.</p>`;
    html += `<p style="${S.pSmall}">This is a shortened setup brief. SignalTrue suppresses modeled scores rather than reporting numbers built on ${mappingCoveragePct}% coverage.</p>`;
    html += `<p style="${S.pSmall}">Generated by <strong>SignalTrue</strong> at ${now.toLocaleString()}</p>`;
    html += `</div></div>`;
    return html;
  }

  // ─── Analyze observations (what changed) + risks + recommendations ───
  const observations = [];
  const risks = [];
  const recommendations = [];

  // Data anomalies come FIRST — a broken pipeline is declared, never interpreted
  for (const anomaly of dataAnomalies) {
    observations.push({ text: `⚠️ Data quality: ${anomaly.text}`, confidence: 'High' });
  }

  // Helper: confidence based on cross-metric reinforcement and persistence
  function obsConfidence(conditions) {
    // conditions: array of booleans representing supporting evidence
    const supporting = conditions.filter(Boolean).length;
    if (supporting >= 3) return 'High';
    if (supporting >= 2) return 'Medium';
    return 'Low';
  }

  // Meeting analysis
  // Track meeting trend so downstream checks can avoid contradictory advice
  let meetDeltaPct = 0;
  if (twMeetings > 0 || lwMeetings > 0) {
    meetDeltaPct = lwMeetings > 0 ? ((twMeetings - lwMeetings) / lwMeetings) * 100 : 0;
    const aboveSixWeek = sixWeekAvg.meetings > 0 && twMeetings > sixWeekAvg.meetings * 1.15;
    if (meetDeltaPct > 15) {
      const conf = obsConfidence([meetDeltaPct > 25, aboveSixWeek, tw.backToBack > lw.backToBack]);
      observations.push({
        text: `Meetings increased ${Math.round(meetDeltaPct)}% this week (${lwMeetings} → ${twMeetings})${aboveSixWeek ? ' and are above the six-week baseline' : ''}. This is a measured change; a planning cycle, launch, or client deadline could explain it.`,
        confidence: conf,
      });
      risks.push(
        'If meeting growth continues without a matching increase in planned coordination work, less calendar time remains available for uninterrupted tasks.'
      );
      recommendations.push(
        "Review this week's calendar with team leads: identify and cancel or shorten the 2–3 lowest-value recurring meetings. Aim to protect at least one 2-hour focus block per person per day."
      );
    } else if (meetDeltaPct < -15) {
      const conf = obsConfidence([meetDeltaPct < -25, tw.messages >= lw.messages]);
      observations.push({
        text: `Meetings dropped ${Math.abs(Math.round(meetDeltaPct))}% this week (${lwMeetings} → ${twMeetings}). Check the focus-time measure before concluding that the released calendar time became productive time.`,
        confidence: conf,
      });
    }
  }

  // Meeting duration + back-to-back
  // Only flag meeting-load issues when meetings are NOT already trending down (avoid contradictory advice)
  const meetingsTrending = meetDeltaPct; // positive = up, negative = down
  if (tw.meetingHours > 0) {
    const hoursPerDay = tw.meetingHours / 5;
    const meetingHoursAboveBaseline =
      sixWeekAvg.meetingHours > 0 && tw.meetingHours > sixWeekAvg.meetingHours * 1.15;
    if (meetingHoursAboveBaseline) {
      const conf = obsConfidence([
        tw.meetingHours > sixWeekAvg.meetingHours * 1.25,
        tw.backToBack > sixWeekAvg.backToBack * 1.15,
        tw.afterHoursRatio > sixWeekAvg.afterHoursRatio * 1.15,
      ]);
      observations.push({
        text: `Meeting participant-hours averaged ${fmtNum(hoursPerDay, 1)} per person per day (${fmtNum(tw.meetingHours, 1)} this week), above the organization's ${fmtNum(sixWeekAvg.meetingHours, 1)}h weekly baseline.`,
        confidence: conf,
      });
      risks.push(
        'The measured increase leaves less scheduled time for non-meeting work. Check whether focus availability or after-hours activity moved in the same direction.'
      );
      // Only recommend reducing meetings if they are NOT already declining
      if (meetingsTrending >= -10) {
        recommendations.push(
          'Consider introducing meeting-free mornings or one meeting-free day per week. Try defaulting meeting lengths to 25 or 50 minutes instead of 30 or 60.'
        );
      }
    } else if (meetingsTrending > 15) {
      observations.push({
        text: `Meeting participant-hours are ${fmtNum(tw.meetingHours, 1)} per person this week and are trending upward, but have not crossed the organization's baseline escalation threshold.`,
        confidence: 'Low',
      });
    }
  }
  if (tw.backToBack > 5) {
    const b2bDelta =
      lw.backToBack > 0 ? ((tw.backToBack - lw.backToBack) / lw.backToBack) * 100 : 100;
    const conf = obsConfidence([tw.backToBack > 8, b2bDelta > 20, tw.afterHoursRatio > 0.2]);
    observations.push({
      text: `${Math.round(tw.backToBack)} instances of back-to-back meetings detected (less than 5 minutes between meetings)${b2bDelta > 20 ? `, up ${Math.round(b2bDelta)}% from last week` : ''}. This leaves no recovery time between sessions.`,
      confidence: conf,
    });
    risks.push(
      'These calendar sequences leave five minutes or less between sessions. Validate whether the affected teams had enough protected focus time elsewhere in the week.'
    );
    // Only suggest fixing back-to-back if meetings are not already declining overall
    if (meetingsTrending >= -10) {
      recommendations.push(
        'Encourage managers to add 10-minute buffers between meetings. If someone has more than 3 back-to-back meetings per day, work with them to reschedule or decline at least one.'
      );
    }
  }

  // Messaging analysis
  if (twMessages > 0 || lwMessages > 0) {
    const msgDelta = lwMessages > 0 ? ((twMessages - lwMessages) / lwMessages) * 100 : 0;
    if (msgDelta > 25) {
      const conf = obsConfidence([msgDelta > 40, twMeetings >= lwMeetings]);
      observations.push({
        text: `Team messaging is up ${Math.round(msgDelta)}% (${lwMessages} → ${twMessages} messages). This may indicate increased coordination needs or an active project phase.`,
        confidence: conf,
      });
    } else if (msgDelta < -25 && lwMessages > 5) {
      const conf = obsConfidence([
        msgDelta < -40,
        twMeetings <= lwMeetings,
        tw.channels < lw.channels,
      ]);
      observations.push({
        text: `Team messaging dropped ${Math.abs(Math.round(msgDelta))}% (${lwMessages} → ${twMessages}). The metadata does not show whether this reflects workload, channel choice, leave, team connection, or a coverage change.`,
        confidence: conf,
      });
      risks.push(
        'Communication volume fell without a matching measured workload decline. Validate channel coverage and ask what changed before interpreting the pattern.'
      );
      recommendations.push(
        'Check in with team leads to understand the drop. If teams are siloing, consider reinstating a brief async standup or weekly sync.'
      );
    }
  }

  // After-hours analysis
  if (tw.afterHoursMsg > 0 || tw.afterHoursEmail > 0.15) {
    const totalAfterHours = tw.afterHoursMsg;
    const afterHoursRatioPct = Math.round((tw.afterHoursRatio || 0) * 100);
    if (afterHoursRatioPct >= 30) {
      const conf = obsConfidence([
        afterHoursRatioPct >= 40,
        tw.afterHoursRatio > lw.afterHoursRatio,
        tw.meetingHours > 15,
      ]);
      observations.push({
        text: `${afterHoursRatioPct}% of team messages were sent outside the configured working schedule. ${totalAfterHours > 0 ? `That's ${Math.round(totalAfterHours)} out-of-hours messages this week.` : ''}`,
        confidence: conf,
      });
      risks.push(
        'Out-of-hours activity is above SignalTrue’s review threshold. This describes schedule spillover, not its cause; confirm deadlines, time zones, and working agreements.'
      );
      recommendations.push(
        'Implement "quiet hours" in Teams/Slack (e.g., schedule send for next morning). Leadership should model boundary-setting by not sending after 6pm.'
      );
    } else if (afterHoursRatioPct >= 15) {
      observations.push({
        text: `Out-of-hours messaging is at ${afterHoursRatioPct}%, below the escalation threshold but available for trend monitoring.`,
        confidence: 'Low',
      });
    }
    if (tw.afterHoursRatio > lw.afterHoursRatio && lw.afterHoursRatio > 0) {
      const afterHoursDrift = Math.round(
        ((tw.afterHoursRatio - lw.afterHoursRatio) / lw.afterHoursRatio) * 100
      );
      if (afterHoursDrift > 20) {
        observations.push({
          text: `After-hours ratio increased ${afterHoursDrift}% compared to last week — this is a negative trend.`,
          confidence: 'Medium',
        });
      }
    }
  }

  // Focus time analysis (new metric)
  if (tw.focusTimeAvailability != null && tw.focusTimeAvailability > 0) {
    const focusPerDay = tw.focusTimeAvailability / 5;
    if (
      sixWeekAvg.focusTimeAvailability > 0 &&
      tw.focusTimeAvailability < sixWeekAvg.focusTimeAvailability * 0.85
    ) {
      const conf = obsConfidence([
        focusPerDay < 1.5,
        tw.calendarFragmentation > 60,
        tw.backToBack > 5,
      ]);
      observations.push({
        text: `Measured uninterrupted time is ${fmtNum(focusPerDay, 1)} hrs/day (${fmtNum(tw.focusTimeAvailability, 1)}h this week), below the organization's ${fmtNum(sixWeekAvg.focusTimeAvailability, 1)}h weekly baseline.`,
        confidence: conf,
      });
      risks.push(
        'Protected uninterrupted time moved below baseline. Check whether meeting load, short gaps, or a planned high-coordination week explains the change.'
      );
    }
  }

  // Calendar fragmentation (new metric)
  if (tw.calendarFragmentation > 60) {
    const conf = obsConfidence([
      tw.calendarFragmentation > 75,
      tw.backToBack > 5,
      tw.focusTimeAvailability < 15,
    ]);
    observations.push({
      text: `Calendar fragmentation score is ${fmtNum(tw.calendarFragmentation, 0)}/100, reflecting more short gaps and meetings spread across the day.`,
      confidence: conf,
    });
  }

  // Signals analysis
  if (twSignals.length > 0) {
    const criticalSignals = twSignals.filter((s) => s.severity === 'Critical');
    const riskSignals = twSignals.filter((s) => s.severity === 'Risk');

    if (criticalSignals.length > 0) {
      const signalNames = criticalSignals.map((s) => {
        const pres = SIGNAL_TYPE_PRESENTATION[s.signalType];
        return pres?.businessTitle || s.title;
      });
      observations.push({
        text: `${criticalSignals.length} strong internal review signal(s) detected: ${signalNames.join('; ')}.`,
        confidence: 'High',
      });

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
      const signalNames = riskSignals.map((s) => {
        const pres = SIGNAL_TYPE_PRESENTATION[s.signalType];
        return pres?.businessTitle || s.title;
      });
      observations.push({
        text: `${riskSignals.length} elevated internal review signal(s) detected: ${signalNames.join('; ')}.`,
        confidence: 'Medium',
      });
    }
  }

  // CK Signals analysis
  const highCK = twCKSignals.filter((s) => s.severity >= 65);
  if (highCK.length > 0) {
    for (const ck of highCK.sort((a, b) => b.severity - a.severity).slice(0, 3)) {
      const label = CK_SIGNAL_LABELS[ck.signalType] || {};
      const conf = ck.severity >= 80 ? 'High' : 'Medium';
      observations.push({
        text: `${label.label || ck.signalType} signal detected (severity ${ck.severity}/100): ${ck.explanation || ''}`,
        confidence: conf,
      });
      if (label.rec) recommendations.push(label.rec);
    }
  }

  // Determine overall health verdict — uses escalation service (5-level)
  const critCount =
    twSignals.filter((s) => s.severity === 'Critical').length +
    twCKSignals.filter((s) => s.severity >= 80).length;
  const riskCount =
    twSignals.filter((s) => s.severity === 'Risk').length +
    twCKSignals.filter((s) => s.severity >= 65 && s.severity < 80).length;
  const driftingTeams = teamBDIData.filter((t) =>
    ['Early Drift', 'Developing Drift', 'Critical Drift'].includes(t.bdi.driftState)
  );

  // ─── Real weekly history (single source: sixWeekOrgMetricsArr, same data as WoW table) ───
  const weekBuckets = new Map();
  for (const rec of sixWeekOrgMetricsArr) {
    const d = new Date(rec.date);
    const weekIdx = Math.floor((thisWeekStart - d) / (7 * 24 * 60 * 60 * 1000));
    if (weekIdx < 0 || weekIdx > 5) continue;
    if (!weekBuckets.has(weekIdx)) weekBuckets.set(weekIdx, []);
    weekBuckets.get(weekIdx).push(rec);
  }
  // Newest-first (escalation service expects this ordering)
  const weeklyHistoryNewestFirst = [...weekBuckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([weekIdx, recs]) => ({
      weeksAgo: weekIdx + 1,
      meetingHours:
        Math.round((avgField(recs, 'meetingDurationTotalHours7d') / connectedUserCount) * 10) / 10,
      backToBack: avgField(recs, 'backToBackMeetingBlocks') / connectedUserCount,
      afterHoursRatio: avgField(recs, 'afterHoursMessageRatio'),
      afterHoursRatioPct: Math.round(avgField(recs, 'afterHoursMessageRatio') * 100),
      focusTimeAvailability:
        Math.round((avgField(recs, 'focusTimeAvailabilityHours') / connectedUserCount) * 10) / 10,
      calendarFragmentation: avgField(recs, 'calendarFragmentationScore'),
    }));

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
    weeklyHistory: [{ ...tw }, ...weeklyHistoryNewestFirst], // current week first, then history
    baseline: {},
    contextTags,
    bdiData:
      driftingTeams.length > 0
        ? driftingTeams.sort((a, b) => b.bdi.driftScore - a.bdi.driftScore)[0].bdi
        : null,
  });

  const verdictText =
    dataReadinessStatus === 'Ready' ? orgStatus.status : 'Data mapping needs attention';
  const verdictConfidence = dataReadinessStatus === 'Ready' ? orgStatus.confidence : 'Low';
  const verdictSummary =
    dataReadinessStatus === 'Ready'
      ? orgStatus.reason
      : `SignalTrue is receiving workplace metadata, but only ${mappedActorCount.length}/${totalUsers} users and ${mappedTeamCount.length}/${teams.length} teams have mapped activity this week. Modeled work-pattern conclusions are unavailable until mapping coverage improves.`;

  // If no observations were generated but we have data, add a neutral one
  if (observations.length === 0 && twTotal > 0) {
    observations.push({
      text: `Overall work activity is stable with ${twTotal} events tracked across ${connectedSources.length} data source(s). No significant changes detected week-over-week.`,
      confidence: 'Low',
    });
    recommendations.push(
      'Continue monitoring. Stable weeks are a good time to invest in process improvement or address small friction points before they grow.'
    );
  }

  // ─── AI Analysis Layer ───
  // Single source of truth: the AI receives EXACTLY the numbers shown in the
  // week-over-week table (raw counts + per-person figures) plus real weekly
  // history — never a separately computed dataset.
  const weeklyHistory = [...weeklyHistoryNewestFirst].reverse(); // oldest first for the prompt

  const employeeCount = totalUsers; // already fetched above for coverage
  const aiAnalysis = await generateWeeklyAIAnalysis({
    orgName: org.name,
    industry: org.industry || 'Other',
    orgSize: org.size || `${employeeCount} employees`,
    teamCount: teams.length,
    employeeCount,
    connectedUserCount, // how many users have calendar data — AI uses this for context
    coveragePct, // % of org with data — AI can flag low coverage
    tw,
    lw,
    sixWeekAvg, // per-person figures (matches "Workload detail" table rows)
    sixWeekRawAvg, // raw event counts (matches "Meetings"/"Messages" table rows)
    weeklyHistory, // real 6-week trend, oldest first
    dataAnomalies: dataAnomalies.map((a) => a.text),
    suspectMetrics: [...suspectMetrics],
    twMeetings,
    lwMeetings,
    twMessages,
    lwMessages,
    twSignals,
    lwSignals,
    twCKSignals,
    lwCKSignals,
    teamBDIData,
    observations: observations.map((o) => (typeof o === 'string' ? o : o.text)),
    risks,
    connectedSources,
    contextTags,
    teamStatus: orgStatus.status,
  });

  // ─── New falsifiable prediction for next week (rule-based, machine-gradable) ───
  // One concrete numeric call per week. Graded automatically in the next brief.
  let newPrediction = null;
  const alreadyPredictedThisWeek = priorPredictions.some(
    (p) => Math.abs(new Date(p.weekStart) - thisWeekStart) < 24 * 60 * 60 * 1000
  );
  if (!alreadyPredictedThisWeek) {
    const mhPerDay = tw.meetingHours / 5;
    const afterHoursPct = Math.round((tw.afterHoursRatio || 0) * 100);
    let candidate = null;
    if (
      sixWeekAvg.meetingHours > 0 &&
      tw.meetingHours > sixWeekAvg.meetingHours * 1.15 &&
      tw.meetingHours >= lw.meetingHours * 0.95
    ) {
      // Sustained heavy meeting load → predict it persists unless someone intervenes
      const threshold = Math.round(tw.meetingHours * 0.9 * 10) / 10;
      candidate = {
        metric: 'meetingHours',
        comparator: 'gte',
        threshold,
        baselineValue: Math.round(tw.meetingHours * 10) / 10,
        statement: `If nothing changes, meeting hours will stay above ${threshold}h per person next week (currently ${fmtNum(tw.meetingHours, 1)}h, ~${fmtNum(mhPerDay, 1)}h/day).`,
      };
    } else if (!suspectMetrics.has('afterHours') && afterHoursPct >= 20) {
      candidate = {
        metric: 'afterHoursRatioPct',
        comparator: 'gte',
        threshold: 15,
        baselineValue: afterHoursPct,
        statement: `Out-of-hours work (${afterHoursPct}%) will remain above 15% next week unless workload structure changes.`,
      };
    } else if (twMeetings > 0 && lwMeetings > 0 && twMeetings < lwMeetings * 0.85) {
      // Downward trend → predict it holds (falsifiable stability call)
      const threshold = Math.round(lwMeetings * 1.0);
      candidate = {
        metric: 'meetings',
        comparator: 'lte',
        threshold,
        baselineValue: twMeetings,
        statement: `The drop in meeting volume will hold: next week's meeting count stays at or below ${threshold} (this week: ${twMeetings}).`,
      };
    } else if (twMeetings > 0) {
      // Stability call — still falsifiable
      const threshold = Math.round(twMeetings * 1.25);
      candidate = {
        metric: 'meetings',
        comparator: 'lte',
        threshold,
        baselineValue: twMeetings,
        statement: `No meeting-load spike expected: next week's meeting count stays below ${threshold} (this week: ${twMeetings}).`,
      };
    }
    if (candidate) {
      try {
        const saved = await BriefPrediction.create({
          orgId: org._id,
          weekStart: thisWeekStart,
          ...candidate,
        });
        newPrediction = saved.toObject();
      } catch (err) {
        console.error('[WeeklyBrief] Failed to save prediction:', err.message);
        newPrediction = candidate; // still render it even if persistence failed
      }
    }
  }

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
  //  11. Data-readiness appendix
  //  12. Footer
  // ════════════════════════════════════════════════════════════

  const confBadgeColor =
    verdictConfidence === 'High'
      ? '#10b981'
      : verdictConfidence === 'Medium'
        ? '#f59e0b'
        : '#9ca3af';

  let html = '';

  // ─── Header ───
  html += `<div style="font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:0 auto;color:#0f172a;background:#ffffff;border:1px solid #d9e2ee;border-radius:14px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,.08);">`;
  html += `<div style="background:#0f172a;padding:30px 34px 24px;color:white;">`;
  html += `<div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.6px;font-weight:800;margin-bottom:8px;">Weekly Intelligence Brief</div>`;
  html += `<h1 style="margin:0 0 6px 0;font-size:26px;font-weight:750;letter-spacing:-.3px;">${org.name}</h1>`;
  html += `<p style="margin:0;font-size:13px;color:#cbd5e1;">${thisWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>`;
  html += `</div>`;

  // ─── 1. Verdict Banner (status + confidence + summary) ───
  html += `<div style="padding:22px 34px;border-bottom:1px solid #e2e8f0;background:#ffffff;">`;
  html += `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:10px;">`;
  html += `<div>`;
  html += `<p style="margin:0 0 6px 0;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.3px;color:#64748b;">Executive readout</p>`;
  html += `<h2 style="margin:0;font-size:20px;color:#0f172a;font-weight:750;">${verdictText}</h2>`;
  html += `</div>`;
  html += `<p style="margin:2px 0 0 0;font-size:12px;color:#6b7280;text-align:right;">`;
  html += `<span style="${S.badge(confBadgeColor + '20', confBadgeColor)}">Evidence grade: ${verdictConfidence}</span>`;
  if (contextTags.length > 0) {
    html += ` <span style="${S.badge('#dbeafe', '#2563eb')}">Context: ${contextTags.map((t) => t.tag.replace(/_/g, ' ')).join(', ')}</span>`;
  }
  html += `</p>`;
  html += `</div>`;
  html += `<p style="${S.p} margin:0;color:#0f172a;font-size:15px;">${verdictSummary}</p>`;
  if (orgStatus.escalationAction && orgStatus.status !== STATUS_LEVELS.STABLE) {
    html += `<p style="${S.pSmall} margin:4px 0 0 0;"><strong>Escalation:</strong> ${orgStatus.escalationAction}</p>`;
  }
  // Baseline tenure — comparisons against your own history get sharper every week
  html += `<p style="${S.pSmall} margin:8px 0 0 0;">Baselines built on <strong>${weeksOfHistory} week${weeksOfHistory === 1 ? '' : 's'}</strong> of your organization's history${weeksOfHistory < 6 ? ' — still calibrating; trend conclusions strengthen after 6 weeks' : ''}.</p>`;
  html += `</div>`;

  // ─── 2. Key Metrics Snapshot (5 metrics) ───
  html += `<div style="padding:18px 26px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">`;
  html += `<div style="display:flex;gap:10px;flex-wrap:wrap;">`;

  const snapshotMetrics = [
    {
      label: 'Meetings',
      value: twMeetings,
      change: pctChangeLabel(twMeetings, lwMeetings),
      color: twMeetings > lwMeetings ? '#ef4444' : '#10b981',
    },
    {
      label: 'Meeting Hours',
      value: `${fmtNum(tw.meetingHours, 1)}h`,
      change: pctChangeLabel(tw.meetingHours, lw.meetingHours),
      color: tw.meetingHours > lw.meetingHours ? '#ef4444' : '#10b981',
    },
    suspectMetrics.has('afterHours')
      ? {
          label: 'Out-of-Hours Work',
          value: '—',
          change: 'data gap',
          color: '#f59e0b',
        }
      : {
          label: 'Out-of-Hours Work',
          value: `${Math.round((tw.afterHoursRatio || 0) * 100)}%`,
          change: pctChangeLabel(tw.afterHoursRatio, lw.afterHoursRatio),
          color: tw.afterHoursRatio > lw.afterHoursRatio ? '#ef4444' : '#10b981',
        },
    suspectMetrics.has('focusTime')
      ? {
          label: 'Uninterrupted Time',
          value: '—',
          change: 'not measured',
          color: '#9ca3af',
        }
      : {
          label: 'Uninterrupted Time',
          value: tw.focusTimeAvailability ? `${fmtNum(tw.focusTimeAvailability, 1)}h` : '—',
          change:
            tw.focusTimeAvailability && lw.focusTimeAvailability
              ? pctChangeLabel(tw.focusTimeAvailability, lw.focusTimeAvailability)
              : '—',
          color: tw.focusTimeAvailability < lw.focusTimeAvailability ? '#ef4444' : '#10b981',
        },
    {
      label: 'Active Alerts',
      value: `${twSignals.length + twCKSignals.length}`,
      change:
        critCount > 0
          ? `${critCount} strong review`
          : riskCount > 0
            ? `${riskCount} elevated review`
            : 'No review rule fired',
      color: critCount > 0 ? '#ef4444' : '#6b7280',
    },
  ];

  for (const m of snapshotMetrics) {
    html += `<div style="flex:1;min-width:105px;text-align:left;padding:14px 15px;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;">
      <div style="font-size:21px;font-weight:750;color:#0f172a;letter-spacing:-.2px;">${m.value}</div>
      <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.7px;font-weight:800;margin-top:6px;">${m.label}</div>
      <div style="font-size:11px;color:${m.color};font-weight:700;margin-top:4px;">${m.change}</div>
    </div>`;
  }
  html += `</div>`;
  html += `</div>`;

  // (Data readiness + team readiness moved to the appendix — the HR reader gets
  //  insight first; setup detail lives at the bottom for the admin.)

  // ─── 2b. Work-pattern model snapshot ───
  html += `<div style="padding:20px 34px;border-bottom:1px solid #e2e8f0;background:#ffffff;">`;
  html += `<h3 style="${S.h3} margin:0 0 12px 0;">Work-pattern deviation model</h3>`;
  if (engagementSnapshot) {
    const engagementColor =
      engagementSnapshot.avgStrainRisk >= 70
        ? '#dc2626'
        : engagementSnapshot.avgStrainRisk >= 50
          ? '#f59e0b'
          : engagementSnapshot.avgStrainRisk >= 30
            ? '#2563eb'
            : '#16a34a';
    html += `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;">`;
    html += `<div style="flex:1;min-width:130px;padding:13px 15px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;"><div style="font-size:21px;font-weight:750;color:${engagementColor};">${engagementSnapshot.avgStrainRisk}/100</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.7px;font-weight:800;margin-top:6px;">Deviation index (model)</div></div>`;
    html += `<div style="flex:1;min-width:130px;padding:13px 15px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;"><div style="font-size:21px;font-weight:750;color:#0f172a;">${engagementSnapshot.avgDataReadiness}/100</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.7px;font-weight:800;margin-top:6px;">Data readiness</div></div>`;
    html += `<div style="flex:1;min-width:130px;padding:13px 15px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;"><div style="font-size:21px;font-weight:750;color:#0f172a;">${engagementSnapshot.strainedTeams}</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.7px;font-weight:800;margin-top:6px;">Teams above review band</div></div>`;
    html += `</div>`;
    const driverText =
      engagementSnapshot.drivers.length > 0
        ? ` Main modeled drivers: ${engagementSnapshot.drivers
            .map((driver) => `${engagementDriverLabel(driver.driver)} (${driver.score}/100)`)
            .join(', ')}.`
        : '';
    html += `<p style="${S.p} margin:0;"><strong>What it means:</strong> This internal index summarizes changes in recovery time, focus availability, responsiveness, collaboration, and coordination metadata.${driverText}</p>`;
    html += `<p style="${S.pSmall} margin-top:8px;"><strong>Review rule:</strong> an 8+ point increase or an elevated/strong band prompts a review of the underlying metrics and team context. This is a product rule, not a validated scientific threshold.</p>`;
    html += `<p style="${S.pSmall} margin-top:8px;">This model does not measure engagement and is not a probability, diagnosis, attrition predictor, or performance score.</p>`;
  } else {
    const blockedTeams = teamReadiness.filter((team) => team.status !== 'Ready for scoring');
    const suppressionReason = recentEngagementSuppressions[0]?.reason;
    html += `<p style="${S.p} margin:0;"><strong>No work-pattern model yet.</strong> The model requires team-level metadata mapped to at least ${minimumTeamSize} active ${minimumTeamSize === 1 ? 'person' : 'people'} per team. It uses calendar and collaboration patterns only; no individual names, message content, or sentiment analysis.</p>`;
    if (blockedTeams.length > 0 || suppressionReason) {
      html += `<div style="${S.warnBox}">`;
      html += `<p style="${S.p} margin:0;"><strong>Why it is blocked:</strong> ${
        suppressionReason
          ? suppressionReason.replace(/_/g, ' ')
          : 'named teams do not yet have enough mapped activity'
      }.</p>`;
      html += `</div>`;
    }
  }
  html += `</div>`;

  // ─── 3. What Changed This Week (top 3 observations) ───
  html += `<div style="${S.card}">`;
  html += `<h3 style="${S.h3} margin-top:0;">What changed</h3>`;
  const topObs = observations.slice(0, 3);
  if (topObs.length > 0) {
    for (const obs of topObs) {
      const isWarning = obs.text.startsWith('⚠️');
      const confColor =
        obs.confidence === 'High' ? '#10b981' : obs.confidence === 'Medium' ? '#f59e0b' : '#9ca3af';
      html += `<div style="padding:12px 14px;margin-bottom:8px;background:${isWarning ? '#fef2f2' : '#f8fafc'};border-radius:10px;border:1px solid ${isWarning ? '#fecaca' : '#e2e8f0'};">`;
      html += `<p style="${S.p} margin:0;">${obs.text}</p>`;
      html += `<p style="margin:4px 0 0 0; font-size:11px;"><span style="${S.badge(confColor + '20', confColor)}">Evidence grade: ${obs.confidence}</span></p>`;
      html += `</div>`;
    }
    if (observations.length > 3) {
      html += `<p style="${S.pSmall}">+ ${observations.length - 3} more observations — see full details on your SignalTrue dashboard.</p>`;
    }
  } else {
    html += `<p style="${S.p}">No significant changes detected this week.</p>`;
  }
  html += `</div>`;

  // ─── 4. Why It Matters (top 2 risks + € impact) ───
  if (risks.length > 0 || costEstimate) {
    html += `<div style="${S.card}">`;
    html += `<h3 style="${S.h3} margin-top:0;">Why it matters</h3>`;
    for (const risk of risks.slice(0, 2)) {
      html += `<div style="${S.warnBox}">`;
      html += `<p style="${S.p} margin:0;">${risk}</p>`;
      html += `</div>`;
    }
    if (costEstimate) {
      html += `<div style="${S.warnBox} border-left:3px solid #f59e0b;">`;
      html += `<p style="${S.p} margin:0 0 4px 0;"><strong>Estimated coordination cost above your baseline: ~${costEstimate.formattedWeeklyCost}</strong></p>`;
      html += `<p style="${S.pSmall} margin:0;">Basis: ${costEstimate.excessHoursPerPerson} participant-hours/person above your ${costEstimate.baselineHours}h six-week baseline × ${costEstimate.peopleWithData} people with data × ${costEstimate.hourlyCost} ${costEstimate.currency}/h. This is a directional estimate using your configured cost input.</p>`;
      html += `</div>`;
    }
    if (risks.length > 2) {
      html += `<p style="${S.pSmall}">+ ${risks.length - 2} more review patterns — see full analysis on dashboard.</p>`;
    }
    html += `</div>`;
  }

  // ─── 5. Recommended Actions — Role-Based ───
  html += `<div style="${S.card}">`;
  html += `<h3 style="${S.h3} margin-top:0;">Recommended actions</h3>`;
  if (dataReadinessStatus !== 'Ready') {
    html += `<h4 style="${S.h4}">For IT / Admin</h4>`;
    html += `<div style="${S.recBox} border-left:3px solid #dc2626;">`;
    html += `<p style="${S.p} margin:0 0 4px 0;"><strong>Fix user and team mapping before acting on health signals.</strong></p>`;
    html += `<p style="${S.pSmall} margin:0;">Microsoft/Teams/Calendar events are present, but only ${mappedActorCount.length}/${totalUsers} users and ${mappedTeamCount.length}/${teams.length} teams have mapped activity this week. Re-sync Microsoft users, confirm every user has a team, and verify event actor/team attribution.</p>`;
    html += `</div>`;
  }

  // If AI returned role-based recommendations, use those
  if (
    dataReadinessStatus === 'Ready' &&
    aiAnalysis &&
    (aiAnalysis.hrActions?.length ||
      aiAnalysis.managerActions?.length ||
      aiAnalysis.leadershipActions?.length)
  ) {
    const primaryAction =
      aiAnalysis.leadershipActions?.[0] ||
      aiAnalysis.hrActions?.[0] ||
      aiAnalysis.managerActions?.[0];
    const owner =
      aiAnalysis.leadershipActions?.[0] === primaryAction
        ? 'Leadership'
        : aiAnalysis.hrActions?.[0] === primaryAction
          ? 'HR'
          : 'Team lead';
    const effortColor =
      primaryAction.effort === 'Low'
        ? '#10b981'
        : primaryAction.effort === 'Medium'
          ? '#f59e0b'
          : '#ef4444';
    html += `<h4 style="${S.h4}">Decision for this week</h4>`;
    html += `<div style="${S.recBox} border-left:3px solid #6366f1;">`;
    html += `<p style="${S.p} margin:0 0 5px 0;"><strong>${primaryAction.action}</strong></p>`;
    html += `<p style="${S.pSmall} margin:0;"><strong>Owner:</strong> ${owner} · <strong>Review:</strong> ${primaryAction.reviewWindow || 'next weekly brief'} · <span style="${S.badge(effortColor + '20', effortColor)}">${primaryAction.effort || 'Medium'} effort</span></p>`;
    if (primaryAction.expectedOutcome) {
      html += `<p style="${S.pSmall} margin:5px 0 0 0;"><strong>Measure:</strong> ${primaryAction.expectedOutcome}</p>`;
    }
    html += `</div>`;
  } else if (recommendations.length > 0) {
    // Fallback: use rule-based recommendations
    html += `<p style="${S.pSmall}">Based on this week's data patterns.</p>`;
    recommendations.slice(0, 1).forEach((rec, i) => {
      html += `<div style="${S.recBox}">`;
      html += `<p style="${S.p} margin:0;"><strong>${i + 1}.</strong> ${rec}</p>`;
      html += `</div>`;
    });
  } else {
    html += `<p style="${S.p}">No specific actions needed this week. Continue monitoring.</p>`;
  }

  // CTA button
  html += `<div style="text-align:center; margin-top:16px;">`;
  html += `<a href="${process.env.FRONTEND_URL || 'https://app.signaltrue.ai'}/dashboard" style="display:inline-block;background:#0f172a;color:white;padding:11px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">Open dashboard</a>`;
  html += `</div>`;
  html += `</div>`;

  // ─── 5b. Action follow-through (decision log + measured impact) ───
  // The closed loop: what you decided → what changed. This is the section that
  // turns suggestions into a track record.
  const measuredInterventions = recentInterventions.filter(
    (iv) => iv.outcomeDelta?.computedAt != null
  );
  const activeInterventions = recentInterventions.filter((iv) =>
    ['planned', 'active', 'pending-recheck'].includes(iv.status)
  );
  if (measuredInterventions.length > 0 || activeInterventions.length > 0) {
    html += `<div style="${S.card} border-left:4px solid #10b981;">`;
    html += `<h3 style="${S.h3} margin-top:0;">Your actions — what changed</h3>`;
    for (const iv of measuredInterventions.slice(0, 3)) {
      const d = iv.outcomeDelta;
      const good = d.improved;
      const arrow = d.percentChange > 0 ? '+' : '';
      html += `<div style="${S.recBox} border-left:3px solid ${good ? '#10b981' : '#f59e0b'};">`;
      html += `<p style="${S.p} margin:0 0 4px 0;"><strong>${iv.title || iv.actionTaken || iv.interventionType || 'Action'}</strong>${iv.teamId?.name ? ` · ${iv.teamId.name}` : ''}</p>`;
      html += `<p style="${S.pSmall} margin:0;">Started ${new Date(iv.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · Measured after 14 days: <strong style="color:${good ? '#16a34a' : '#d97706'};">${arrow}${d.percentChange}%</strong> ${good ? '— improvement confirmed' : '— no improvement yet; consider adjusting or extending'}</p>`;
      if (iv.outcomeSummary)
        html += `<p style="${S.pSmall} margin:4px 0 0 0;">${iv.outcomeSummary}</p>`;
      html += `</div>`;
    }
    for (const iv of activeInterventions.slice(0, 2)) {
      const daysIn = Math.round((now - new Date(iv.startDate)) / (24 * 60 * 60 * 1000));
      html += `<div style="${S.recBox}">`;
      html += `<p style="${S.p} margin:0;"><strong>In progress:</strong> ${iv.title || iv.actionTaken || iv.interventionType}${iv.teamId?.name ? ` · ${iv.teamId.name}` : ''} — day ${daysIn} of 14. Effect measurement ${daysIn >= 14 ? 'is due — check the dashboard' : `runs automatically on day 14`}.</p>`;
      html += `</div>`;
    }
    html += `</div>`;
  } else {
    // Nudge: the loop only works if decisions get logged
    html += `<div style="${S.card} border-left:4px solid #d1d5db;">`;
    html += `<h3 style="${S.h3} margin-top:0; color:#475569;">Close the loop</h3>`;
    html += `<p style="${S.p} margin:0;">When you act on a recommendation, log it as an action on the dashboard. SignalTrue then measures the before/after effect over 14 days and reports it here — so every future brief shows what worked, not just what's wrong.</p>`;
    html += `</div>`;
  }

  // ─── 5c. Experimental forecast rule — graded last week + new call for next week ───
  if (gradedPrediction || evaluatedPredictions.length > 0 || newPrediction) {
    html += `<div style="${S.card} border-left:4px solid #0ea5e9;">`;
    html += `<h3 style="${S.h3} margin-top:0;">Forecast rule check</h3>`;
    html += `<p style="${S.pSmall}">Experimental directional rule, not a probability or validated outcome prediction.</p>`;
    if (gradedPrediction) {
      const o = gradedPrediction.outcome;
      html += `<div style="${o.held ? S.recBox : S.warnBox}">`;
      html += `<p style="${S.p} margin:0 0 4px 0;"><strong>Last week's rule said:</strong> ${gradedPrediction.statement}</p>`;
      html += `<p style="${S.pSmall} margin:0;">Actual ${PREDICTION_METRIC_LABELS[gradedPrediction.metric] || gradedPrediction.metric}: <strong>${o.actualValue}</strong> — rule <strong style="color:${o.held ? '#16a34a' : '#d97706'};">${o.held ? 'matched' : 'did not match'}</strong>.</p>`;
      html += `</div>`;
    }
    if (evaluatedPredictions.length > 0) {
      html += `<p style="${S.pSmall} margin:6px 0;">Rule track record: <strong>${predictionsHeld} of ${evaluatedPredictions.length}</strong> directional calls matched over the last ${evaluatedPredictions.length} graded week(s).</p>`;
    }
    if (newPrediction) {
      html += `<div style="padding:10px 14px;background:#f0f9ff;border-radius:8px;border-left:3px solid #0ea5e9;">`;
      html += `<p style="${S.p} margin:0;"><strong>This week's call:</strong> ${newPrediction.statement}</p>`;
      html += `<p style="${S.pSmall} margin:4px 0 0 0;">The next brief will compare this rule with the observed value.</p>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  // ─── 6. Manager Discussion Prompts ───
  const managerPrompts = generateManagerPrompts({
    tw,
    lw,
    sixWeekAvg,
    orgStatus,
    teamBDIData,
    twSignals,
  });
  if (managerPrompts.length > 0) {
    html += `<div style="${S.card} border-left:4px solid #8b5cf6;">`;
    html += `<h3 style="${S.h3} margin-top:0;">Questions worth raising with team leads</h3>`;
    html += `<p style="${S.pSmall}">Diagnostic questions HR can bring to team leads or leadership check-ins. Based on this week's data — not prescriptive, just conversation starters.</p>`;
    for (const prompt of managerPrompts.slice(0, 2)) {
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
    html += `<h3 style="${S.h3} margin:0;">Evidence and interpretation</h3>`;
    html += `</div>`;
    for (const h of aiAnalysis.hypotheses.slice(0, 1)) {
      const hConf =
        h.confidence === 'High' ? '#10b981' : h.confidence === 'Medium' ? '#f59e0b' : '#9ca3af';
      html += `<div style="padding:12px 14px; margin-bottom:10px; background:#f0f0ff; border-radius:8px;">`;
      html += `<p style="${S.p} margin:0 0 4px 0;"><strong>${h.patternObserved}</strong> <span style="${S.badge(hConf + '20', hConf)}">Evidence grade: ${h.confidence}</span></p>`;
      if (h.evidence?.length > 0) {
        html += `<p style="${S.pSmall} margin:0 0 4px 0;">Evidence: ${h.evidence.join(' · ')}</p>`;
      }
      html += `<p style="${S.p} margin:0 0 4px 0;">${h.whatThisMayMean}</p>`;
      if (h.whatCouldAlsoExplainIt) {
        html += `<p style="${S.pSmall} margin:0; color:#6b7280;"><em>Alternative explanation:</em> ${h.whatCouldAlsoExplainIt}</p>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
  }

  // ─── 8. Week-over-Week Comparison Table (with 6-week avg) ───
  html += `<div style="${S.card}">`;
  html += `<h3 style="${S.h3} margin-top:0;">Week-over-week comparison</h3>`;
  html += `<table style="${S.table}">`;
  html += `<thead><tr>`;
  html += `<th style="${S.th}">Metric</th>`;
  html += `<th style="${S.thR}">6-Wk Avg</th>`;
  html += `<th style="${S.thR}">Last Week</th>`;
  html += `<th style="${S.thR}">This Week</th>`;
  html += `<th style="${S.thR}">Change</th>`;
  html += `</tr></thead><tbody>`;

  const addTableRow = (label, sixWk, lwVal, twVal, higherIsBad = true, fmt = 0, options = {}) => {
    const lowVolume =
      options.lowVolumeThreshold &&
      Math.max(Math.abs(twVal), Math.abs(lwVal)) < options.lowVolumeThreshold;
    const icon = lowVolume ? 'Neutral' : trendIcon(twVal, lwVal, higherIsBad);
    const trendColor = icon === 'Review' ? '#dc2626' : icon === 'Intended' ? '#16a34a' : '#64748b';
    const vs6wk =
      sixWk > 0 && twVal > sixWk * 1.15 && higherIsBad
        ? ' *'
        : sixWk > 0 && twVal < sixWk * 0.85 && !higherIsBad
          ? ' *'
          : '';
    html += `<tr>`;
    html += `<td style="${S.td}">${label}</td>`;
    html += `<td style="${S.tdR}; color:#9ca3af;">${fmtNum(sixWk, fmt)}</td>`;
    html += `<td style="${S.tdR}">${fmtNum(lwVal, fmt)}</td>`;
    html += `<td style="${S.tdBold}">${fmtNum(twVal, fmt)}${vs6wk}</td>`;
    html += `<td style="${S.tdR}; color:${trendColor}; font-weight:700;">${icon} · ${pctChangeLabelSafe(twVal, lwVal, options)}</td>`;
    html += `</tr>`;
  };

  // Core metrics
  addTableRow('Meetings', sixWeekRawAvg.meetings, lwMeetings, twMeetings, true);
  addTableRow('Team messages', sixWeekRawAvg.messages, lwMessages, twMessages, false);
  addTableRow('Total events', sixWeekRawAvg.total, lwTotal, twTotal, false);

  // Per-source if available
  if (twOutlook > 0 || lwOutlook > 0)
    addTableRow(
      '&nbsp;&nbsp;Outlook attendance records',
      sixWeekRawAvg.outlook,
      lwOutlook,
      twOutlook,
      true
    );
  if (twGcal > 0 || lwGcal > 0)
    addTableRow('&nbsp;&nbsp;Google Calendar records', sixWeekRawAvg.gcal, lwGcal, twGcal, true);
  if (twTeamsMsg > 0 || lwTeamsMsg > 0)
    addTableRow('&nbsp;&nbsp;Teams messages', sixWeekRawAvg.teams, lwTeamsMsg, twTeamsMsg, false);
  if (twSlack > 0 || lwSlack > 0)
    addTableRow('&nbsp;&nbsp;Slack messages', sixWeekRawAvg.slack, lwSlack, twSlack, false);
  if (twGchat > 0 || lwGchat > 0)
    addTableRow('&nbsp;&nbsp;Google Chat', sixWeekRawAvg.gchat, lwGchat, twGchat, false);

  // Detailed metrics section
  if (twMetricsArr.length > 0 || lwMetricsArr.length > 0) {
    html += `<tr><td colspan="5" style="padding:10px 10px 4px; font-weight:600; color:#6366f1; border-bottom:2px solid #e5e7eb; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">Workload Detail (rolling 7-day avg, per person)</td></tr>`;
    addTableRow(
      'Meeting participant-hours / person',
      sixWeekAvg.meetingHours,
      lw.meetingHours,
      tw.meetingHours,
      true,
      1
    );
    addTableRow(
      'Consecutive meetings',
      sixWeekAvg.backToBack,
      lw.backToBack,
      tw.backToBack,
      true,
      0
    );
    addTableRow('Messages / day', sixWeekAvg.msgsPerDay, lw.msgsPerDay, tw.msgsPerDay, false, 1, {
      minBase: 0.1,
      minDelta: 0.1,
      lowVolumeThreshold: 0.5,
    });
    addTableRow(
      'Out-of-hours messages',
      sixWeekAvg.afterHoursMsg,
      lw.afterHoursMsg,
      tw.afterHoursMsg,
      true,
      1,
      { minBase: 1, minDelta: 0.5, lowVolumeThreshold: 1 }
    );
    addTableRow(
      'Out-of-hours work %',
      Math.round((sixWeekAvg.afterHoursRatio || 0) * 100),
      Math.round((lw.afterHoursRatio || 0) * 100),
      Math.round((tw.afterHoursRatio || 0) * 100),
      true
    );
    addTableRow(
      'Uninterrupted time (hrs)',
      sixWeekAvg.focusTimeAvailability,
      lw.focusTimeAvailability || 0,
      tw.focusTimeAvailability || 0,
      false,
      1
    );
    addTableRow(
      'Schedule fragmentation',
      sixWeekAvg.calendarFragmentation,
      lw.calendarFragmentation || 0,
      tw.calendarFragmentation || 0,
      true,
      0
    );
    addTableRow(
      'Recurring meeting load %',
      Math.round((sixWeekAvg.recurringBurden || 0) * 100),
      Math.round((lw.recurringBurden || 0) * 100),
      Math.round((tw.recurringBurden || 0) * 100),
      true
    );
    if (tw.channels > 0 || lw.channels > 0)
      addTableRow('Active channels', sixWeekAvg.channels, lw.channels, tw.channels, false, 0);
  }

  html += `</tbody></table>`;
  html += `<p style="font-size:11px; color:#9ca3af; margin:8px 0 0 0;">`;
  html += `<strong>How to read this table:</strong> `;
  html += `"This Week" values are highlighted in bold. `;
  html += `Green = moving in the intended direction &nbsp;·&nbsp; Red = moving away from the intended direction &nbsp;·&nbsp; Warning = notably above or below your 6-week average. `;
  html += `"Uninterrupted Time" and "Team Messages" are better when higher. All other metrics are better when lower.`;
  html += `</p>`;
  html += `</div>`;

  // ─── 9. Active Drift Signals (compact) ───
  if (twSignals.length > 0 || twCKSignals.length > 0) {
    html += `<div style="${S.card}">`;
    html += `<h3 style="${S.h3} margin-top:0;">Active drift signals</h3>`;

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
      const familyColor =
        family === 'Capacity Drift'
          ? '#ef4444'
          : family === 'Coordination Drift'
            ? '#f59e0b'
            : family === 'Culture Drift'
              ? '#8b5cf6'
              : '#3b82f6';
      html += `<h4 style="${S.h4}"><span style="${S.badge(familyColor + '15', familyColor)}">${family}</span></h4>`;

      for (const sig of sigs.slice(0, 3)) {
        const sevColor =
          sig.severity === 'Critical' ? '#ef4444' : sig.severity === 'Risk' ? '#f59e0b' : '#6b7280';
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
    html += `<h3 style="${S.h3} margin-top:0;">Team health status</h3>`;

    for (const { teamName, bdi, prevBDI } of teamBDIData) {
      const stateColor =
        bdi.driftState === 'Critical Drift'
          ? '#ef4444'
          : bdi.driftState === 'Developing Drift'
            ? '#f97316'
            : bdi.driftState === 'Early Drift'
              ? '#eab308'
              : '#10b981';
      const prevScore = prevBDI?.driftScore ?? '—';
      const scoreTrend = prevBDI
        ? bdi.driftScore > prevBDI.driftScore
          ? '↑'
          : bdi.driftScore < prevBDI.driftScore
            ? '↓'
            : '→'
        : '';

      html += `<div style="${S.cardAlert(stateColor)}">`;
      html += `<p style="${S.p} margin:0 0 4px 0;"><strong>${teamName}</strong> <span style="${S.badge(stateColor + '20', stateColor)}">${bdi.driftState}</span></p>`;
      html += `<p style="${S.p}">Drift model: <strong>${prevScore} → ${bdi.driftScore}/100 ${scoreTrend}</strong> | Data readiness: ${bdi.confidence}</p>`;

      if (bdi.drivers?.length > 0) {
        html += `<p style="${S.p}"><strong>Key drivers:</strong> ${bdi.drivers
          .slice(0, 3)
          .map((d) => `${d.signal} (${d.contribution}%)`)
          .join(', ')}</p>`;
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

  // ─── 11. Team-level engagement detail ───
  if (engagementStrainByTeam.length === 0) {
    html += `<div style="${S.card} border-left:4px solid #d1d5db;">`;
    html += `<h3 style="${S.h3} margin-top:0; color:#475569;">Engagement level</h3>`;
    html += `<div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:14px 16px;">`;
    html += `<p style="${S.p} margin:0 0 6px 0; color:#374151;"><strong>No work-pattern model available for this week.</strong></p>`;
    html += `<p style="${S.p} margin:0 0 6px 0; color:#6b7280;">`;
    html += `Work-pattern indices are computed weekly from team-level metadata (calendar patterns, messaging activity, and focus availability). `;
    html += `This section will populate once the first full weekly cycle completes for your teams.`;
    html += `</p>`;
    html += `<p style="${S.pSmall} margin:0; color:#9ca3af;">`;
    html += `Common reasons for missing data: the weekly scoring job hasn't run yet, a team has fewer than the minimum required members, `;
    html += `or the connected integrations haven't produced enough data for the current week.`;
    html += `</p>`;
    html += `</div>`;
    html += `</div>`;
  }

  if (engagementStrainByTeam.length > 0) {
    const DRIVER_LABELS = {
      recovery_debt: 'Outside-schedule activity',
      focus_erosion: 'Focus availability',
      coordination_friction: 'Coordination metadata',
      responsiveness_pressure: 'Response patterns',
      collaboration_withdrawal: 'Collaboration metadata',
      manager_support_gap: 'Recorded 1:1 time',
      workload_volatility: 'Week-to-week activity',
    };

    const riskStateColor = (state) =>
      state === 'critical'
        ? '#ef4444'
        : state === 'strain'
          ? '#f97316'
          : state === 'watch'
            ? '#f59e0b'
            : '#10b981';
    const riskStateLabel = (state) =>
      state === 'critical'
        ? 'Strong deviation'
        : state === 'strain'
          ? 'Elevated deviation'
          : state === 'watch'
            ? 'Moderate deviation'
            : 'Within baseline';
    const trendLbl = (trend) =>
      trend === 'rising' ? 'Deviation rising' : trend === 'improving' ? 'Improving' : 'Stable';

    // Worst-case state across teams
    const stateOrder = ['healthy', 'watch', 'strain', 'critical'];
    const worstState = engagementStrainByTeam.reduce(
      (worst, t) =>
        stateOrder.indexOf(t.riskState) > stateOrder.indexOf(worst) ? t.riskState : worst,
      'healthy'
    );
    const worstColor = riskStateColor(worstState);

    html += `<div style="${S.card} border-left:4px solid ${worstColor};">`;
    html += `<h3 style="${S.h3} margin-top:0; color:#0f172a;">Team condition detail</h3>`;

    // Scope and privacy note.
    html += `<div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:12px 16px; margin-bottom:16px;">`;
    html += `<p style="${S.p} margin:0 0 6px 0;">These are <strong>internal work-pattern indicators</strong> derived from outside-schedule activity, focus availability, response timing, and collaboration metadata. They are not survey, sentiment, performance, burnout, or attrition scores.</p>`;
    html += `<p style="${S.pSmall} margin:0;">No surveillance. No sentiment analysis. No individual names. Metadata-derived team-level patterns only.</p>`;
    html += `</div>`;

    // Score key
    html += `<p style="${S.pSmall} margin-bottom:12px;">`;
    html += `<strong>Deviation index:</strong> internal 0–100 model &nbsp;·&nbsp; `;
    html += `<strong>Data readiness:</strong> coverage and baseline stability &nbsp;·&nbsp; `;
    html += `<strong>Review bands:</strong> internal product rules, not scientific thresholds`;
    html += `</p>`;

    // Per-team blocks — "what this means" is rendered ONCE per risk state below,
    // not cloned under every team (identical boilerplate reads as templated noise).
    const renderedStates = new Set();
    for (const t of engagementStrainByTeam.slice(0, 3)) {
      const tc = riskStateColor(t.riskState);
      html += `<div style="${S.cardAlert(tc)} margin-bottom:12px;">`;
      html += `<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">`;
      html += `<p style="${S.p} margin:0; font-weight:700;">${t.teamName ?? 'Team'} <span style="${S.badge(tc + '20', tc)}">${riskStateLabel(t.riskState)}</span></p>`;
      html += `<p style="${S.pSmall} margin:0;">${trendLbl(t.trend)}</p>`;
      html += `</div>`;

      html += `<div style="display:flex; gap:16px; margin-bottom:8px;">`;
      html += `<div style="text-align:center;"><strong style="font-size:20px; color:${tc};">${t.engagementStrainRisk}</strong><br><span style="${S.pSmall}">Deviation index</span></div>`;
      html += `<div style="text-align:center;"><strong style="font-size:20px; color:#0f766e;">${t.confidenceScore}</strong><br><span style="${S.pSmall}">Data readiness</span></div>`;
      html += `<div style="text-align:center;"><strong style="font-size:20px;">${t.activePeopleCount}</strong><br><span style="${S.pSmall}">Members</span></div>`;
      html += `</div>`;

      // Top drivers
      if (t.topDrivers?.length > 0) {
        html += `<p style="${S.pSmall} margin-bottom:4px;"><strong>Top drivers:</strong></p>`;
        for (const d of t.topDrivers.slice(0, 3)) {
          const dLabel = DRIVER_LABELS[d.driver] ?? d.driver;
          const changeStr = d.changeVsBaseline ? ` (${d.changeVsBaseline} vs baseline)` : '';
          html += `<p style="${S.pSmall} margin:2px 0;">• ${dLabel}${changeStr} — score ${d.score}/100</p>`;
          if (d.explanation) {
            html += `<p style="${S.pSmall} margin:0 0 4px 16px; font-style:italic;">${d.explanation}</p>`;
          }
        }
      }

      // What it means for this risk state — rendered once per distinct state
      const stateKey = `${t.riskState}:${t.riskState === 'watch' ? t.trend : ''}`;
      if (!renderedStates.has(stateKey)) {
        renderedStates.add(stateKey);
        let stateMsg = '';
        if (t.riskState === 'critical') {
          stateMsg =
            'Strong modeled deviation: several work-pattern indicators are materially outside this team’s baseline. Validate the direct metrics and context before choosing an action.';
        } else if (t.riskState === 'strain') {
          stateMsg =
            'Elevated modeled deviation: recovery, focus, or responsiveness metadata moved away from baseline. Review the strongest direct metric before choosing an action.';
        } else if (t.riskState === 'watch' && t.trend === 'rising') {
          stateMsg =
            'A moderate deviation is rising. Verify the underlying direct metric and ask what changed before choosing an action.';
        } else if (t.riskState === 'watch') {
          stateMsg =
            'A moderate deviation met an internal review band. Monitor the direct metric without assigning a cause from metadata alone.';
        } else if (t.trend === 'improving') {
          stateMsg =
            'Measured patterns moved closer to the team baseline. Check whether a recent operating change plausibly contributed.';
        } else {
          stateMsg =
            'Modeled indicators remain within the available team baseline. This does not establish employee health or engagement.';
        }
        html += `<div style="margin-top:8px; padding:8px 10px; background:${tc}10; border-left:3px solid ${tc}; border-radius:4px;">`;
        html += `<p style="${S.p} margin:0;"><strong>What this means:</strong> ${stateMsg}</p>`;
        html += `</div>`;
      }

      html += `</div>`;
    }

    html += `<p style="${S.pSmall}">The work-pattern model is computed weekly. It is descriptive and has not been externally validated as an engagement, burnout, attrition, or performance measure.</p>`;
    html += `</div>`;
  }

  // ─── 11c. Appendix — data readiness (admin detail, demoted to the bottom) ───
  html += `<div style="${S.card} opacity:0.92;">`;
  html += `<h3 style="${S.h3} margin-top:0; font-size:13px; color:#64748b;">Appendix — Data readiness</h3>`;
  html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">`;
  html += `<span style="${S.badge(dataReadinessColor + '20', dataReadinessColor)}">${dataReadinessStatus}</span>`;
  html += `<span style="${S.pSmall}">Mapped users: <strong>${mappedActorCount.length}/${totalUsers}</strong> · Mapped teams: <strong>${mappedTeamCount.length}/${teams.length}</strong> · Unmapped events: <strong>${unmappedActorEvents}</strong></span>`;
  html += `</div>`;
  if (coverageRegressed) {
    html += `<div style="${S.alertBox}"><p style="${S.p} margin:0;"><strong>Coverage regression:</strong> mapped users dropped from ${lastWeekMappedActors.length} last week to ${mappedActorCount.length} this week. Check integrations and user mapping — declining coverage quietly degrades every score in this report.</p></div>`;
  }
  if (dataReadinessStatus !== 'Ready') {
    html += `<p style="${S.pSmall}">${mappingCoveragePct}% of users and ${teamCoveragePct}% of teams have mapped activity. Named-team insights below full strength until Microsoft/Google/Slack events are attributed to users and teams.${unmappedTeamEvents > 0 ? ` ${unmappedTeamEvents} event(s) have no team mapping.` : ''}</p>`;
  }
  if (integrationConnections.length > 0) {
    html += `<table style="${S.table}; margin-top:8px;">`;
    html += `<thead><tr><th style="${S.th}">Source</th><th style="${S.thR}">Status</th><th style="${S.thR}">Coverage</th><th style="${S.thR}">Last sync</th></tr></thead><tbody>`;
    for (const conn of integrationConnections) {
      const isStale = staleConnectors.some((s) => String(s._id) === String(conn._id));
      const coverage =
        conn.coverage?.totalUsers > 0
          ? `${conn.coverage.mappedUsers || 0}/${conn.coverage.totalUsers}`
          : '—';
      const lastSync = conn.sync?.lastSyncAt
        ? new Date(conn.sync.lastSyncAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
        : '—';
      const statusLabel = isStale ? 'stale' : conn.status;
      const statusColor = isStale ? '#dc2626' : conn.status === 'connected' ? '#16a34a' : '#f59e0b';
      html += `<tr><td style="${S.td}">${conn.integrationType}</td><td style="${S.tdR};color:${statusColor};font-weight:700;">${statusLabel}</td><td style="${S.tdR}">${coverage}</td><td style="${S.tdR}">${lastSync}</td></tr>`;
    }
    html += `</tbody></table>`;
  }
  if (teamReadiness.length > 0) {
    html += `<table style="${S.table}; margin-top:12px;">`;
    html += `<thead><tr><th style="${S.th}">Team</th><th style="${S.thR}">Members</th><th style="${S.thR}">Mapped active</th><th style="${S.thR}">Mapped events</th><th style="${S.thR}">Status</th></tr></thead><tbody>`;
    for (const item of teamReadiness) {
      const color =
        item.status === 'Ready for scoring'
          ? '#16a34a'
          : item.status === 'Suppressed'
            ? '#dc2626'
            : item.status === 'Excluded (catch-all)'
              ? '#9ca3af'
              : '#f59e0b';
      html += `<tr><td style="${S.td}">${item.team.name}</td><td style="${S.tdR}">${item.memberCount}</td><td style="${S.tdR}">${item.activeUsers}</td><td style="${S.tdR}">${item.events}</td><td style="${S.tdR}; color:${color}; font-weight:700;">${item.status}</td></tr>`;
    }
    html += `</tbody></table>`;
  }
  html += `</div>`;

  // ─── 11d. Annotation loop — teach SignalTrue about unusual weeks ───
  html += `<div style="${S.card} border-left:4px solid #2563eb;">`;
  html += `<p style="${S.p} margin:0;"><strong>Was this week unusual?</strong> A launch, offsite, vacation period, or client crunch changes how these numbers should be read. Tag the week on the dashboard and future briefs will interpret your data with that context.</p>`;
  html += `<p style="${S.pSmall} margin:6px 0 0 0;"><a href="${process.env.FRONTEND_URL || 'https://app.signaltrue.ai'}/dashboard" style="color:#2563eb;font-weight:700;text-decoration:none;">Tag this week →</a></p>`;
  html += `</div>`;

  // ─── 12. Footer ───
  html += `<div style="padding:17px 34px;background:#f8fafc;border-top:1px solid #e2e8f0;">`;
  // Data coverage banner
  const coverageColor = coveragePct >= 80 ? '#16a34a' : coveragePct >= 40 ? '#d97706' : '#dc2626';
  html += `<p style="${S.pSmall}"><strong>Data coverage:</strong> <span style="color:${coverageColor}; font-weight:700;">${usersWithDataThisWeek.length} of ${totalUsers} employees (${coveragePct}%)</span> have calendar data this week. Per-person figures are based on connected accounts only.</p>`;
  html += `<p style="${S.pSmall}">Data sources: ${connectedSources.length > 0 ? connectedSources.join(' · ') : 'None connected'}</p>`;
  html += `<p style="${S.pSmall}">Report period: ${thisWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} compared with ${lastWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(thisWeekStart.getTime() - 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>`;
  html += `<p style="${S.pSmall}"><strong>Measurement note:</strong> Counts and durations are observed metadata. Derived ratios and internal 0–100 models are descriptive, not probabilities, diagnoses, or causal findings. Evidence grades are rule-based, not statistical confidence intervals. <a href="${process.env.FRONTEND_URL || 'https://app.signaltrue.ai'}/app/methodology" style="color:#2563eb;">Methods and limits</a>.</p>`;
  html += `<p style="${S.pSmall}">Generated by <strong>SignalTrue</strong> at ${now.toLocaleString()} · Status: ${verdictText} (${verdictConfidence} rule-based evidence grade)</p>`;
  html += `</div>`;

  html += `</div>`;

  return html;
}

export async function sendWeeklyBrief(orgId) {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error(`Organization ${orgId} not found`);

  const weekLabel = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const subject = `Weekly Intelligence Brief — ${org.name} — ${weekLabel}`;

  // Always generate the brief first — we need it for the superadmin copy regardless
  const html = await generateWeeklyBrief(orgId);

  // Build recipient list:
  //  1. Users with HR/admin/executive roles
  const orgUsers = await User.find({
    orgId,
    role: { $in: ['master_admin', 'hr_admin', 'admin', 'executive'] },
  });
  const userEmails = orgUsers.map((u) => u.email);
  //  2. Org-level override list (external C-level / CEO emails without a SignalTrue login)
  const overrides = org.settings?.weeklyBriefRecipients || [];
  const recipients = [...new Set([...userEmails, ...overrides])];

  if (recipients.length > 0) {
    console.log(`[WeeklyBrief] Sending brief for ${org.name} to: ${recipients.join(', ')}`);

    // Send to client recipients
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
  } else {
    console.warn(
      `[WeeklyBrief] No client recipients configured for org ${org.name} — skipping client send but still copying superadmin`
    );
  }

  // Always CC superadmin (sten.kreisberg@gmail.com) — even when no client recipients exist,
  // so the report can be reviewed and any delivery issues caught early.
  await ccSuperadmin({
    subject,
    html,
    originalRecipient:
      recipients.length > 0 ? recipients.join(', ') : '(none — no client recipients configured)',
    reportType: 'Weekly Intelligence Brief',
    orgName: org.name,
  });
}

export default { sendWeeklyBrief, generateWeeklyBrief };
