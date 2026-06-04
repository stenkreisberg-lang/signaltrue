import { Resend } from 'resend';
import { getGa4Overview } from './ga4Service.js';

const DEFAULT_RECIPIENT = 'sten.kreisberg@gmail.com';
const FROM_EMAIL = process.env.SITE_ANALYTICS_FROM_EMAIL || 'SignalTrue <reports@signaltrue.ai>';

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US');
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return '0%';
  return `${Number(value).toFixed(1).replace('.0', '')}%`;
}

function changePercent(current = 0, previous = 0) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function changeLabel(current = 0, previous = 0) {
  if (!previous) return current > 0 ? 'new activity' : 'no baseline';
  const change = changePercent(current, previous);
  return `${change >= 0 ? '+' : ''}${change}%`;
}

function eventLabel(name) {
  return String(name || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferRecommendations(overview) {
  const recs = [];
  const summary = overview.summary || {};
  const topPages = overview.topPages || [];
  const trafficSources = overview.trafficSources || [];
  const conversions = overview.conversionEvents || [];
  const totalConversions = overview.conversionEventCount || 0;
  const sessions = summary.sessions || 0;
  const views = summary.views || 0;
  const engagementRate = summary.engagementRate || 0;
  const conversionRate = sessions ? (totalConversions / sessions) * 100 : 0;
  const organicSessions =
    trafficSources.find((source) => source.channel === 'Organic Search')?.sessions || 0;
  const directSessions =
    trafficSources.find((source) => source.channel === 'Direct')?.sessions || 0;
  const pricing = topPages.find((page) => page.path === '/pricing');
  const product = topPages.find((page) => page.path === '/product');
  const contact = topPages.find((page) => page.path === '/contact');
  const sampleReportEvent = conversions.find((event) =>
    ['sample_report_click', 'sample_report_view', 'sample_report_request'].includes(event.eventName)
  );

  if (sessions && conversionRate < 8) {
    recs.push({
      title: 'Make the primary CTA more specific on high-traffic pages',
      why: `${formatNumber(sessions)} sessions produced ${formatNumber(totalConversions)} measured conversion actions (${formatPercent(conversionRate)}).`,
      action:
        'On the homepage and product page, keep one main CTA: "See early team risk signals", with "View sample report" as the secondary option.',
    });
  }

  if (pricing && pricing.engagementRate >= 70) {
    recs.push({
      title: 'Use Pricing as a confidence-building page',
      why: `/pricing has ${formatPercent(pricing.engagementRate)} engagement, so visitors are interested when they get there.`,
      action:
        'Add or keep concrete proof near pricing: first-30-days process, privacy note, sample report link, and a short FAQ above the final CTA.',
    });
  }

  if (product && (!contact || product.views > contact.views * 1.5)) {
    recs.push({
      title: 'Move Product visitors toward Contact and Sample Report',
      why: `/product gets ${formatNumber(product.views)} views while /contact gets ${formatNumber(contact?.views || 0)}.`,
      action:
        'Add mid-page and bottom-page CTAs from Product to Contact and Sample Report, especially after signal explanations.',
    });
  }

  if (organicSessions < Math.max(10, sessions * 0.12)) {
    recs.push({
      title: 'Grow organic search traffic with specific signal pages',
      why: `Organic Search produced only ${formatNumber(organicSessions)} sessions, while Direct produced ${formatNumber(directSessions)}.`,
      action:
        'Publish or improve pages for manager load, meeting overload, burnout early warning, and employee engagement leading indicators; link them from Product and footer.',
    });
  }

  if (!sampleReportEvent || sampleReportEvent.eventCount < 3) {
    recs.push({
      title: 'Promote the sample report more clearly',
      why: `Sample-report activity is ${formatNumber(sampleReportEvent?.eventCount || 0)} events this period.`,
      action:
        'Place "View sample report" beside demo CTAs on Homepage, Pricing, Product, and Contact so lower-intent visitors still convert.',
    });
  }

  if (engagementRate < 50 || (sessions && views / sessions < 2)) {
    recs.push({
      title: 'Improve page-to-page movement',
      why: `Engagement is ${formatPercent(engagementRate)} and visitors view about ${sessions ? (views / sessions).toFixed(1) : '0'} pages per session.`,
      action:
        'At the end of every public page, add a clear next page: Product -> Pricing, Pricing -> Contact, Trust -> Contact, Blog/Resources -> Sample Report.',
    });
  }

  if (recs.length === 0) {
    recs.push({
      title: 'Double down on the pages already converting',
      why: 'Traffic and conversion signals look healthy this period.',
      action:
        'Review the top two converting pages, then add one stronger CTA block and one proof point to each.',
    });
  }

  return recs.slice(0, 5);
}

function tableRows(rows, renderRow) {
  if (!rows.length) {
    return '<tr><td style="padding:12px;color:#64748b;">No data yet</td></tr>';
  }
  return rows.map(renderRow).join('');
}

function sectionRows(rows, renderRow) {
  if (!rows.length) {
    return '<div style="border-top:1px solid #e2e8f0;padding:10px 0;color:#64748b;">No data yet</div>';
  }
  return rows.map(renderRow).join('');
}

function generateSiteAnalyticsEmailHtml(overview, recommendations) {
  const summary = overview.summary || {};
  const previous = overview.previousSummary || {};
  const topPages = overview.topPages || [];
  const trafficSources = overview.trafficSources || [];
  const conversions = overview.conversionEvents || [];
  const sessions = summary.sessions || 0;
  const conversionRate = sessions ? ((overview.conversionEventCount || 0) / sessions) * 100 : 0;

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <div style="max-width:760px;margin:0 auto;padding:28px 16px;">
      <div style="background:#0f172a;color:white;border-radius:18px;padding:28px;">
        <p style="margin:0 0 8px;color:#93c5fd;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">Weekly site analytics</p>
        <h1 style="margin:0;font-size:30px;line-height:1.1;">What visitors did, and what to improve next</h1>
        <p style="margin:12px 0 0;color:#cbd5e1;">${overview.dateRange?.label || 'Last 7 days'} for SignalTrue.ai. Recipient: admin only.</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:16px 0;">
        ${[
          [
            'Users',
            formatNumber(summary.activeUsers),
            changeLabel(summary.activeUsers, previous.activeUsers),
          ],
          [
            'Sessions',
            formatNumber(summary.sessions),
            changeLabel(summary.sessions, previous.sessions),
          ],
          ['Views', formatNumber(summary.views), changeLabel(summary.views, previous.views)],
          [
            'Conversions',
            formatNumber(overview.conversionEventCount),
            `${formatPercent(conversionRate)} of sessions`,
          ],
          [
            'Engagement',
            formatPercent(summary.engagementRate),
            changeLabel(summary.engagementRate, previous.engagementRate),
          ],
          [
            'Avg duration',
            `${formatNumber(summary.averageSessionDuration)}s`,
            changeLabel(summary.averageSessionDuration, previous.averageSessionDuration),
          ],
        ]
          .map(
            ([label, value, note]) => `
          <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:16px;">
            <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">${label}</div>
            <div style="font-size:28px;font-weight:800;margin-top:6px;">${value}</div>
            <div style="font-size:13px;color:#475569;margin-top:4px;">${note}</div>
          </div>`
          )
          .join('')}
      </div>

      <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:22px;margin-bottom:16px;">
        <h2 style="margin:0 0 12px;font-size:20px;">This week's improvement priorities</h2>
        ${recommendations
          .map(
            (rec, index) => `
          <div style="border-top:${index === 0 ? '0' : '1px solid #e2e8f0'};padding:${index === 0 ? '0 0 14px' : '14px 0'};">
            <div style="font-weight:800;">${index + 1}. ${rec.title}</div>
            <div style="color:#475569;margin-top:5px;"><strong>Why:</strong> ${rec.why}</div>
            <div style="color:#0f172a;margin-top:5px;"><strong>Do this:</strong> ${rec.action}</div>
          </div>`
          )
          .join('')}
      </div>

      <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:22px;margin-bottom:16px;">
        <h2 style="margin:0 0 12px;font-size:20px;">Top pages</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr style="color:#64748b;text-align:left;"><th style="padding:8px;">Page</th><th style="padding:8px;">Views</th><th style="padding:8px;">Users</th><th style="padding:8px;">Engagement</th></tr></thead>
          <tbody>
            ${tableRows(
              topPages.slice(0, 8),
              (page) => `
              <tr style="border-top:1px solid #e2e8f0;">
                <td style="padding:10px 8px;"><strong>${page.path || '/'}</strong><br><span style="color:#64748b;">${page.title || ''}</span></td>
                <td style="padding:10px 8px;">${formatNumber(page.views)}</td>
                <td style="padding:10px 8px;">${formatNumber(page.activeUsers)}</td>
                <td style="padding:10px 8px;">${formatPercent(page.engagementRate)}</td>
              </tr>`
            )}
          </tbody>
        </table>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:22px;">
          <h2 style="margin:0 0 12px;font-size:20px;">Traffic sources</h2>
          ${sectionRows(
            trafficSources,
            (source) => `
            <div style="display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding:10px 0;">
              <span>${source.channel}</span><strong>${formatNumber(source.sessions)}</strong>
            </div>`
          )}
        </div>
        <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:22px;">
          <h2 style="margin:0 0 12px;font-size:20px;">Visitor actions</h2>
          ${sectionRows(
            conversions,
            (event) => `
            <div style="display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding:10px 0;">
              <span>${eventLabel(event.eventName)}</span><strong>${formatNumber(event.eventCount)}</strong>
            </div>`
          )}
        </div>
      </div>

      <p style="color:#64748b;font-size:12px;line-height:1.6;margin:20px 4px 0;">
        This report is generated automatically from GA4 and SignalTrue conversion-event definitions.
        It is sent only to the configured admin recipient.
      </p>
    </div>
  </body>
</html>`;
}

export async function sendWeeklySiteAnalyticsReport(trigger = 'manual') {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is required to send the weekly site analytics report.');
  }

  const recipientEmail = process.env.SITE_ANALYTICS_REPORT_EMAIL || DEFAULT_RECIPIENT;
  const overview = await getGa4Overview({
    label: 'Last 7 days',
    startDate: '7daysAgo',
    endDate: 'today',
    previousStartDate: '14daysAgo',
    previousEndDate: '8daysAgo',
  });

  if (!overview.connected) {
    throw new Error(overview.reason || 'GA4 is not connected.');
  }

  const recommendations = inferRecommendations(overview);
  const sessions = overview.summary?.sessions || 0;
  const conversions = overview.conversionEventCount || 0;
  const subject = `SignalTrue weekly site report: ${formatNumber(sessions)} sessions, ${formatNumber(conversions)} actions`;
  const resend = new Resend(process.env.RESEND_API_KEY);

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: recipientEmail,
    subject,
    html: generateSiteAnalyticsEmailHtml(overview, recommendations),
    tags: [
      { name: 'category', value: 'site-analytics' },
      { name: 'trigger', value: trigger },
    ],
  });

  if (result.error) {
    throw new Error(result.error.message || 'Resend failed to send site analytics report.');
  }

  return {
    success: true,
    id: result.data?.id || result.id || null,
    recipientEmail,
    subject,
    sessions,
    conversions,
    recommendations: recommendations.map((rec) => rec.title),
  };
}
