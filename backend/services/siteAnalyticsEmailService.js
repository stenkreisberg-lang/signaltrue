import { Resend } from 'resend';
import { getGa4Overview } from './ga4Service.js';

const DEFAULT_RECIPIENT = 'sten.kreisberg@gmail.com';
const FROM_EMAIL = process.env.SITE_ANALYTICS_FROM_EMAIL || 'SignalTrue <reports@signaltrue.ai>';

function number(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function percent(value) {
  return `${Number(value || 0)
    .toFixed(1)
    .replace('.0', '')}%`;
}

function comparison(current = 0, previous = 0, suffix = '') {
  if (!previous) return current ? `new activity; previous 0${suffix}` : `unchanged at 0${suffix}`;
  const change = ((Number(current) - Number(previous)) / Number(previous)) * 100;
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs ${number(previous)}${suffix}`;
}

function rows(items, renderer, colspan = 3) {
  return items.length
    ? items.map(renderer).join('')
    : `<tr><td colspan="${colspan}" style="padding:12px;color:#64748b;">No data yet</td></tr>`;
}

export function inferCommercialRecommendations(overview) {
  const recommendations = [];
  const summary = overview.summary || {};
  const funnel = overview.funnel || {};
  const sessions = summary.sessions || 0;
  const views = summary.views || 0;
  const smallSample = sessions < 50;

  // 1. Confirmed technical failure or measurement/configuration failure.
  if (overview.diagnostics?.length) {
    recommendations.push({
      priority: 'Confirmed reporting configuration failure',
      evidence: overview.diagnostics.map((item) => item.type).join(', '),
      action:
        'Register the missing GA4 event-scoped custom dimensions and verify the service account can query them.',
    });
  }
  if (sessions > 0 && views < sessions) {
    recommendations.push({
      priority: 'Investigate missing commercial page-view events',
      evidence: `${number(views)} commercial page views were recorded across ${number(sessions)} commercial sessions.`,
      action:
        'Run a production DebugView check for initial load and SPA navigation on www.signaltrue.ai before interpreting engagement.',
    });
  }

  // 2. Measurable funnel abandonment.
  if (funnel.formStarts > 0 && funnel.validSubmissions === 0) {
    recommendations.push({
      priority: 'Review form abandonment and errors',
      evidence: `${number(funnel.formStarts)} form starts produced no valid server submissions; ${number(funnel.formErrors)} errors were recorded.`,
      action:
        'Inspect errors by type and replay the highest-volume failure against the production API.',
    });
  } else if (funnel.validSubmissions > funnel.confirmedLeads) {
    recommendations.push({
      priority: 'Repair the submission-to-confirmation gap',
      evidence: `${number(funnel.validSubmissions)} valid submissions produced ${number(funnel.confirmedLeads)} confirmed leads.`,
      action:
        'Check lead persistence failures, API responses and notification diagnostics immediately.',
    });
  } else if (funnel.primaryCtaClicks > 0 && funnel.formStarts < funnel.primaryCtaClicks * 0.5) {
    recommendations.push({
      priority: 'Reduce CTA-to-form abandonment',
      evidence: `${number(funnel.primaryCtaClicks)} primary CTA clicks produced ${number(funnel.formStarts)} form starts.`,
      action:
        'Check landing-page/form continuity and mobile scroll position before changing acquisition.',
    });
  }

  // 3. Weak qualified acquisition.
  if (sessions >= 20 && (summary.qualifiedLandingPageSessions || 0) < sessions * 0.2) {
    recommendations.push({
      priority: 'Increase qualified landing-page acquisition',
      evidence: `${number(summary.qualifiedLandingPageSessions)} of ${number(sessions)} sessions landed on Product, Contact, Sample Report or the visibility-review page.`,
      action:
        'Improve campaign links and partner/referral destinations to send intent-bearing traffic to the focused review page.',
    });
  }

  // 4. Page engagement.
  if (sessions >= 20 && (summary.engagementRate || 0) < 40) {
    recommendations.push({
      priority: 'Review commercial-page engagement',
      evidence: `Engaged-session rate was ${percent(summary.engagementRate)} with ${number(summary.averageEngagementTime)} seconds average engagement time.`,
      action:
        'Compare the highest-volume landing pages and CTA locations before changing page copy.',
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      priority: smallSample ? 'Collect more qualified observations' : 'Protect the working funnel',
      evidence: smallSample
        ? `Only ${number(sessions)} commercial sessions were observed; weekly rates are too noisy for a confident content recommendation.`
        : 'No confirmed technical failure or material funnel break is visible in this period.',
      action: smallSample
        ? 'Keep the funnel stable and review again after a larger equivalent period.'
        : 'Monitor the same event definitions and investigate only when a stage changes materially.',
    });
  }

  return recommendations.slice(0, 5);
}

export function generateSiteAnalyticsEmailHtml(overview, recommendations) {
  const summary = overview.summary || {};
  const previous = overview.previousSummary || {};
  const funnel = overview.funnel || { rates: {} };
  const smallSample = (summary.sessions || 0) < 50;
  const metricCard = (label, value, note) => `
    <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:15px;">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700;">${label}</div>
      <div style="font-size:26px;font-weight:800;margin-top:5px;">${value}</div>
      <div style="font-size:12px;color:#475569;margin-top:4px;">${note}</div>
    </div>`;

  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
  <div style="max-width:820px;margin:0 auto;padding:28px 16px;">
    <header style="background:#0f172a;color:white;border-radius:18px;padding:28px;">
      <p style="margin:0 0 8px;color:#93c5fd;font-size:12px;font-weight:700;text-transform:uppercase;">Weekly commercial analytics</p>
      <h1 style="margin:0;font-size:30px;">Acquisition, engagement and confirmed conversion</h1>
      <p style="margin:12px 0 0;color:#cbd5e1;">${overview.dateRange?.label || 'Last 7 days'} · ${overview.hostname || 'www.signaltrue.ai'} only · authenticated routes excluded</p>
    </header>

    <div style="margin:16px 0;padding:14px;border-radius:12px;background:${smallSample ? '#fffbeb' : '#ecfdf5'};color:${smallSample ? '#92400e' : '#065f46'};font-size:13px;line-height:1.5;">
      ${smallSample ? `Small sample: ${number(summary.sessions)} sessions are insufficient for confident weekly conclusions. Treat movements as directional.` : 'The sample is large enough for stage-level comparison, though it does not establish causation.'}
    </div>

    <h2 style="font-size:21px;margin:24px 0 10px;">Acquisition</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
      ${metricCard('External users', number(summary.activeUsers), comparison(summary.activeUsers, previous.activeUsers))}
      ${metricCard('External sessions', number(summary.sessions), comparison(summary.sessions, previous.sessions))}
      ${metricCard('Organic sessions', number(summary.organicSessions), 'source / medium = organic')}
      ${metricCard('Qualified landings', number(summary.qualifiedLandingPageSessions), 'focused commercial pages')}
      ${metricCard('Direct / unattributed', percent(overview.unattributedDirectPercentage), 'share of commercial sessions')}
      ${metricCard('Production scope', overview.hostname || 'www.signaltrue.ai', 'preview and app traffic excluded')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;">
      <section style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
        <h3 style="margin:0 0 10px;">Sessions by source / medium</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;"><tbody>${rows(
          (overview.sourceMedium || []).slice(0, 8),
          (item) =>
            `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:8px;">${item.source} / ${item.medium}</td><td style="padding:8px;text-align:right;font-weight:700;">${number(item.sessions)}</td></tr>`,
          2
        )}</tbody></table>
      </section>
      <section style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
        <h3 style="margin:0 0 10px;">Sessions by campaign</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;"><tbody>${rows(
          (overview.campaigns || []).slice(0, 8),
          (item) =>
            `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:8px;">${item.campaign}</td><td style="padding:8px;text-align:right;font-weight:700;">${number(item.sessions)}</td></tr>`,
          2
        )}</tbody></table>
      </section>
    </div>

    <h2 style="font-size:21px;margin:24px 0 10px;">Engagement</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
      ${metricCard('Commercial page views', number(summary.views), comparison(summary.views, previous.views))}
      ${metricCard('Engaged-session rate', percent(summary.engagementRate), `${Number(summary.engagementRate || 0) - Number(previous.engagementRate || 0) >= 0 ? '+' : ''}${(Number(summary.engagementRate || 0) - Number(previous.engagementRate || 0)).toFixed(1)} pp`)}
      ${metricCard('Avg engagement time', `${number(summary.averageEngagementTime)}s`, comparison(summary.averageEngagementTime, previous.averageEngagementTime, 's'))}
      ${metricCard('Sample-report views', number(summary.sampleReportViews), 'successful page opens')}
    </div>

    <h2 style="font-size:21px;margin:24px 0 10px;">Funnel</h2>
    <table style="width:100%;border-collapse:collapse;background:white;border:1px solid #e2e8f0;font-size:13px;">
      <thead><tr style="background:#f1f5f9;text-align:left;"><th style="padding:10px;">Stage</th><th style="padding:10px;">Count</th><th style="padding:10px;">Rate from prior stage</th></tr></thead>
      <tbody>
        ${[
          ['Primary CTA clicks', funnel.primaryCtaClicks, funnel.rates?.pageToCta],
          ['Lead-form starts', funnel.formStarts, funnel.rates?.ctaToFormStart],
          ['Form errors', funnel.formErrors, null],
          ['Valid submissions', funnel.validSubmissions, funnel.rates?.formStartToSubmit],
          ['Confirmed leads', funnel.confirmedLeads, funnel.rates?.submitToConfirmed],
          ['Booking-link clicks', funnel.bookingLinkClicks, funnel.rates?.confirmedToBooking],
        ]
          .map(
            ([label, count, stageRate]) =>
              `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:10px;">${label}</td><td style="padding:10px;font-weight:700;">${number(count)}</td><td style="padding:10px;">${stageRate === null ? 'diagnostic' : percent(stageRate)}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>

    <h2 style="font-size:21px;margin:24px 0 10px;">Diagnostic information</h2>
    <section style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:12px;">
      <h3 style="margin:0 0 10px;">Top public landing pages</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;"><tbody>${rows(
        overview.topLandingPages || [],
        (item) =>
          `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:8px;">${item.path}</td><td style="padding:8px;text-align:right;">${number(item.sessions)} sessions</td></tr>`,
        2
      )}</tbody></table>
    </section>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <section style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
        <h3 style="margin:0 0 10px;">Top CTA locations</h3>
        <table style="width:100%;font-size:13px;"><tbody>${rows(overview.topCtaLocations || [], (item) => `<tr><td style="padding:7px;">${item.location}</td><td style="text-align:right;">${number(item.clicks)}</td></tr>`, 2)}</tbody></table>
      </section>
      <section style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
        <h3 style="margin:0 0 10px;">Form errors by type</h3>
        <table style="width:100%;font-size:13px;"><tbody>${rows(overview.formErrorsByType || [], (item) => `<tr><td style="padding:7px;">${item.type}</td><td style="text-align:right;">${number(item.count)}</td></tr>`, 2)}</tbody></table>
      </section>
    </div>

    <section style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin-top:14px;">
      <h3 style="margin:0 0 10px;">Top commercial pages</h3>
      <table style="width:100%;font-size:13px;"><tbody>${rows(overview.topPages || [], (item) => `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:8px;">${item.path}</td><td style="text-align:right;">${number(item.views)} views</td></tr>`, 2)}</tbody></table>
      <p style="font-size:12px;color:#64748b;">/app, /login, /dashboard and authenticated routes are excluded by event scope and a defensive path filter.</p>
    </section>

    <h2 style="font-size:21px;margin:24px 0 10px;">Prioritised recommendations</h2>
    <section style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
      ${recommendations.map((item, index) => `<div style="padding:${index ? '14px 0 0' : '0'};margin-top:${index ? '14px' : '0'};border-top:${index ? '1px solid #e2e8f0' : '0'};"><strong>${index + 1}. ${item.priority}</strong><p style="margin:6px 0;color:#475569;">${item.evidence}</p><p style="margin:0;">${item.action}</p></div>`).join('')}
    </section>

    <p style="font-size:12px;color:#64748b;line-height:1.6;margin-top:18px;">Confirmed leads are counted only from lead_confirmed after a successful server response. Names, email addresses, organisations, roles and messages are not included in analytics events.</p>
  </div></body></html>`;
}

export async function sendWeeklySiteAnalyticsReport(trigger = 'manual') {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required to send the weekly site analytics report.');
  }
  const recipientEmail = process.env.SITE_ANALYTICS_REPORT_EMAIL || DEFAULT_RECIPIENT;
  const overview = await getGa4Overview({
    label: 'Last 7 days compared with the previous equivalent 7 days',
    startDate: '6daysAgo',
    endDate: 'today',
    previousStartDate: '13daysAgo',
    previousEndDate: '7daysAgo',
  });
  if (!overview.connected) throw new Error(overview.reason || 'GA4 is not connected.');

  const recommendations = inferCommercialRecommendations(overview);
  const subject = `SignalTrue commercial report: ${number(overview.summary?.sessions)} sessions, ${number(overview.funnel?.confirmedLeads)} confirmed leads`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: recipientEmail,
    subject,
    html: generateSiteAnalyticsEmailHtml(overview, recommendations),
    tags: [
      { name: 'category', value: 'commercial-analytics' },
      { name: 'trigger', value: trigger },
    ],
  });
  if (result.error) throw new Error(result.error.message || 'Resend failed to send report.');

  return {
    success: true,
    id: result.data?.id || result.id || null,
    recipientEmail,
    subject,
    sessions: overview.summary?.sessions || 0,
    conversions: overview.funnel?.confirmedLeads || 0,
    recommendations: recommendations.map((item) => item.priority),
  };
}
