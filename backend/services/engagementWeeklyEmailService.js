/**
 * Engagement Weekly Email Service
 *
 * Generates and sends the weekly Engagement Strain Risk report email
 * to team managers and org admins.
 *
 * Transport: nodemailer via SMTP (uses existing SMTP_HOST / SMTP_USER / SMTP_PASS env vars).
 * If SMTP is not configured, the service logs the would-be email and no-ops cleanly.
 *
 * Template: inline HTML — no external CSS framework dependency, wide email-client compatible.
 *
 * PRIVACY:
 *   - All content is team-aggregate only.
 *   - No individual names, IDs, or scores appear in the email.
 *   - The organization-configured minimum is enforced upstream.
 */

import nodemailer from 'nodemailer';
import EngagementStrainWeekly from '../models/engagementStrainWeekly.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import { MIN_METRIC_CONTRIBUTORS, resolveMinimumTeamSize } from '../utils/privacyGate.js';

// ── Transport ──────────────────────────────────────────────────────────────────

function getTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM_ADDRESS =
  process.env.SMTP_FROM ?? `SignalTrue <noreply@${process.env.SMTP_HOST ?? 'signaltrue.com'}>`;

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Send the weekly Engagement Strain digest to all admins of an org.
 *
 * @param {string} orgId
 * @param {string} weekStart — ISO date string (Monday)
 * @returns {Promise<{ sent: number, skipped: number }>}
 */
export async function sendWeeklyEngagementReport(orgId, weekStart) {
  const transport = getTransport();

  // Fetch all weekly records for this org + week
  const teams = await Team.find({ orgId }).select('_id name managerId').lean();
  const teamIds = teams.map((t) => t._id);

  const records = await EngagementStrainWeekly.find(
    { teamId: { $in: teamIds }, weekStart },
    {
      teamId: 1,
      weekStart: 1,
      engagementStrainRisk: 1,
      engagementConditionsScore: 1,
      riskState: 1,
      trend: 1,
      confidenceLabel: 1,
      confidenceScore: 1,
      subscores: 1,
      topDrivers: 1,
      patterns: 1,
      recommendedActions: 1,
      activePeopleCount: 1,
    }
  ).lean();

  if (!records.length) {
    console.log(`[EngagementEmail] No records found for org ${orgId} week ${weekStart} — skipping`);
    return { sent: 0, skipped: 1 };
  }

  // Build a teamId → name lookup
  const teamMap = Object.fromEntries(teams.map((t) => [String(t._id), t.name ?? 'Unnamed team']));

  // Sort records: critical → strain → watch → healthy
  const BAND = { critical: 0, strain: 1, watch: 2, healthy: 3 };
  const sorted = [...records].sort(
    (a, b) =>
      (BAND[a.riskState] ?? 4) - (BAND[b.riskState] ?? 4) ||
      (b.engagementStrainRisk ?? 0) - (a.engagementStrainRisk ?? 0)
  );

  const minimumTeamSize = await resolveMinimumTeamSize(orgId);
  const html = buildEmailHtml(orgId, weekStart, sorted, teamMap, minimumTeamSize);
  const subject = buildSubject(sorted, weekStart);

  // Find all admin-level users for this org
  const admins = await User.find(
    { orgId, role: { $in: ['admin', 'superadmin'] }, email: { $exists: true } },
    { email: 1, name: 1 }
  ).lean();

  if (!admins.length) {
    console.log(`[EngagementEmail] No admins found for org ${orgId} — skipping`);
    return { sent: 0, skipped: 1 };
  }

  if (!transport) {
    console.log(
      `[EngagementEmail] SMTP not configured — would send to ${admins.map((a) => a.email).join(', ')}`
    );
    console.log(`[EngagementEmail] Subject: ${subject}`);
    return { sent: 0, skipped: admins.length };
  }

  let sent = 0;
  for (const admin of admins) {
    try {
      await transport.sendMail({
        from: FROM_ADDRESS,
        to: admin.email,
        subject,
        html,
      });
      sent++;
      console.log(`[EngagementEmail] Sent to ${admin.email}`);
    } catch (err) {
      console.error(`[EngagementEmail] Failed to send to ${admin.email}:`, err.message);
    }
  }

  return { sent, skipped: admins.length - sent };
}

// ── Subject line ────────────────────────────────────────────────────────────────

function buildSubject(sorted, weekStart) {
  const critical = sorted.filter((r) => r.riskState === 'critical').length;
  const strain = sorted.filter((r) => r.riskState === 'strain').length;
  const date = formatDateShort(weekStart);

  if (critical > 0) {
    return `⚠️ SignalTrue Engagement Report — ${critical} team${critical > 1 ? 's' : ''} in critical range (${date})`;
  }
  if (strain > 0) {
    return `SignalTrue Engagement Report — ${strain} team${strain > 1 ? 's' : ''} showing strain (${date})`;
  }
  return `SignalTrue Engagement Report — ${date}`;
}

// ── HTML Template ──────────────────────────────────────────────────────────────

function buildEmailHtml(orgId, weekStart, records, teamMap, minimumTeamSize) {
  const date = formatDateFull(weekStart);

  const critical = records.filter((r) => r.riskState === 'critical').length;
  const strain = records.filter((r) => r.riskState === 'strain').length;
  const watch = records.filter((r) => r.riskState === 'watch').length;
  const healthy = records.filter((r) => r.riskState === 'healthy').length;

  const teamRows = records.map((r) => buildTeamRow(r, teamMap)).join('');

  const urgentActions = records
    .flatMap((r) =>
      (r.recommendedActions ?? [])
        .filter((a) => a.priority === 'urgent')
        .map((a) => ({
          ...a,
          teamName: teamMap[String(r.teamId)] ?? 'Unknown team',
        }))
    )
    .slice(0, 5);

  const appUrl = process.env.FRONTEND_URL ?? 'https://app.signaltrue.com';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Engagement Strain Report</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr><td>
      <table width="600" align="center" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">SignalTrue</p>
            <h1 style="margin:8px 0 4px;font-size:22px;font-weight:700;color:#f1f5f9;">
              Weekly Engagement Strain Report
            </h1>
            <p style="margin:0;font-size:14px;color:#94a3b8;">Week of ${date}</p>
          </td>
        </tr>

        <!-- Summary bar -->
        <tr>
          <td style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 12px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">
              ${records.length} team${records.length !== 1 ? 's' : ''} scored this week
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${critical > 0 ? `<td style="padding-right:16px;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;margin-right:6px;vertical-align:middle;"></span><span style="font-size:14px;font-weight:600;color:#ef4444;">${critical} Critical</span></td>` : ''}
                ${strain > 0 ? `<td style="padding-right:16px;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f97316;margin-right:6px;vertical-align:middle;"></span><span style="font-size:14px;font-weight:600;color:#f97316;">${strain} Strain</span></td>` : ''}
                ${watch > 0 ? `<td style="padding-right:16px;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f59e0b;margin-right:6px;vertical-align:middle;"></span><span style="font-size:14px;color:#f59e0b;">${watch} Watch</span></td>` : ''}
                ${healthy > 0 ? `<td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#22c55e;margin-right:6px;vertical-align:middle;"></span><span style="font-size:14px;color:#22c55e;">${healthy} Healthy</span></td>` : ''}
              </tr>
            </table>
          </td>
        </tr>

        <tr><td style="height:24px;"></td></tr>

        <!-- Urgent actions (if any) -->
        ${
          urgentActions.length > 0
            ? `
        <tr>
          <td style="background:#450a0a;border:1px solid #7f1d1d;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#f87171;text-transform:uppercase;letter-spacing:0.06em;">
              ⚠️ Urgent Actions Required
            </p>
            ${urgentActions
              .map(
                (a) => `
            <div style="margin-bottom:12px;">
              <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#fca5a5;">${a.title}</p>
              <p style="margin:0 0 2px;font-size:13px;color:#fecaca;">${a.description}</p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">Team: ${a.teamName}</p>
            </div>`
              )
              .join('<hr style="border:none;border-top:1px solid #7f1d1d;margin:12px 0;">')}
          </td>
        </tr>
        <tr><td style="height:24px;"></td></tr>
        `
            : ''
        }

        <!-- Team breakdown -->
        <tr>
          <td>
            <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#f1f5f9;">Team Breakdown</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${teamRows}
            </table>
          </td>
        </tr>

        <tr><td style="height:32px;"></td></tr>

        <!-- CTA -->
        <tr>
          <td style="text-align:center;">
            <a href="${appUrl}/app/engagement-strain"
               style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;font-size:14px;font-weight:600;border-radius:8px;text-decoration:none;">
              View Full Dashboard →
            </a>
          </td>
        </tr>

        <tr><td style="height:40px;"></td></tr>

        <!-- Privacy footer -->
        <tr>
          <td style="border-top:1px solid #1e293b;padding-top:20px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;color:#475569;">
              All insights are derived from team-aggregate metadata only.
              No individual is identified, scored, or monitored.
            </p>
            <p style="margin:0;font-size:11px;color:#334155;">
              Minimum team size: ${minimumTeamSize} · Per-metric minimum contributors: ${MIN_METRIC_CONTRIBUTORS} · SignalTrue Engagement Strain v2.0
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildTeamRow(record, teamMap) {
  const teamName = teamMap[String(record.teamId)] ?? 'Unknown team';
  const score = record.engagementStrainRisk ?? 0;
  const riskState = record.riskState ?? 'watch';
  const trend = record.trend ?? 'stable';

  const stateColor =
    {
      critical: '#ef4444',
      strain: '#f97316',
      watch: '#f59e0b',
      healthy: '#22c55e',
    }[riskState] ?? '#f59e0b';

  const stateLabel =
    {
      critical: 'Critical',
      strain: 'Strain',
      watch: 'Watch',
      healthy: 'Healthy',
    }[riskState] ?? 'Watch';

  const trendSymbol = trend === 'rising' ? '↑' : trend === 'improving' ? '↓' : '→';
  const trendColor = trend === 'rising' ? '#ef4444' : trend === 'improving' ? '#22c55e' : '#94a3b8';

  const topDriver = record.topDrivers?.[0] ? formatDriverName(record.topDrivers[0].driver) : null;

  const barWidth = Math.min(score, 100);

  return `
  <tr>
    <td style="background:#1e293b;border-radius:10px;padding:14px 16px;margin-bottom:8px;display:block;margin-bottom:8px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <span style="font-size:14px;font-weight:600;color:#f1f5f9;">${teamName}</span>
            <span style="margin-left:8px;font-size:11px;font-weight:700;color:${stateColor};background:${stateColor}18;border:1px solid ${stateColor}40;border-radius:99px;padding:2px 8px;">${stateLabel}</span>
          </td>
          <td style="text-align:right;white-space:nowrap;">
            <span style="font-size:18px;font-weight:700;color:${stateColor};">${score}</span>
            <span style="font-size:11px;color:#64748b;">/100</span>
            <span style="margin-left:8px;font-size:14px;color:${trendColor};">${trendSymbol}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top:8px;">
            <div style="height:4px;background:#0f172a;border-radius:99px;overflow:hidden;">
              <div style="height:4px;width:${barWidth}%;background:${stateColor};border-radius:99px;"></div>
            </div>
          </td>
        </tr>
        ${
          topDriver
            ? `
        <tr>
          <td colspan="2" style="padding-top:6px;">
            <span style="font-size:11px;color:#64748b;">Top driver: ${topDriver}</span>
          </td>
        </tr>`
            : ''
        }
      </table>
    </td>
  </tr>
  <tr><td style="height:8px;"></td></tr>`;
}

// ── Utility ────────────────────────────────────────────────────────────────────

function formatDateShort(iso) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDateFull(iso) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDriverName(key) {
  const labels = {
    recoveryDebt: 'Recovery Debt',
    focusErosion: 'Focus Erosion',
    coordinationFriction: 'Coordination Friction',
    responsivenessPressure: 'Responsiveness Pressure',
    collaborationWithdrawal: 'Collaboration Withdrawal',
    managerSupportGap: 'Manager Support Gap',
    workloadVolatility: 'Workload Volatility',
  };
  return labels[key] ?? key;
}
