import { Resend } from 'resend';
import { getGa4Overview, isCommercialReportPath, normalizeAcquisition } from './ga4Service.js';
import { getSearchConsoleOverview } from './searchConsoleService.js';

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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function comparison(current = 0, previous = 0, suffix = '', comparisonAvailable = false) {
  if (!comparisonAvailable) return 'No valid prior clean comparison';
  if (!previous) return current ? `new activity; previous 0${suffix}` : `unchanged at 0${suffix}`;
  const change = ((Number(current) - Number(previous)) / Number(previous)) * 100;
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}% vs ${number(previous)}${suffix}`;
}

export const GA4_DIAGNOSTIC_ACTIONS = Object.freeze({
  ga4_duplicate_page_view_risk: {
    rank: 1,
    title: 'Remove duplicate browser-history page views',
    action:
      'Disable GA4 enhanced-measurement browser-history page views while SignalTrue sends manual SPA page views.',
  },
  ga4_internal_traffic_filter_inactive: {
    rank: 1,
    title: 'Complete internal traffic configuration',
    action:
      'Verify office/VPN CIDRs and activate the internal traffic exclusion only after testing.',
  },
  ga4_internal_traffic_filter_unknown: {
    rank: 1,
    title: 'Verify internal traffic inspection access',
    action:
      'Repair GA4 Admin read access, then verify the internal traffic filter without assuming it is absent.',
  },
  ga4_admin_permission_error: {
    rank: 1,
    title: 'Repair GA4 Admin API permissions',
    action:
      'Give the configured service account sufficient GA4 Admin read access, then rerun verification.',
  },
  ga4_page_view_automation_unknown: {
    rank: 1,
    title: 'Verify browser-history page-view configuration',
    action:
      'Restore GA4 Admin inspection access and confirm enhanced-measurement browser-history page views are disabled.',
  },
  cta_location_dimension: {
    rank: 2,
    title: 'Register CTA location custom dimension',
    action: 'Create the event-scoped cta_location custom dimension in GA4.',
  },
  lead_cta_location_dimension: {
    rank: 2,
    title: 'Restore confirmed-lead CTA attribution',
    action: 'Verify the event-scoped cta_location dimension is queryable for lead_confirmed.',
  },
  error_type_dimension: {
    rank: 2,
    title: 'Register form error custom dimension',
    action: 'Create the event-scoped error_type custom dimension in GA4.',
  },
  intent_dimension: {
    rank: 2,
    title: 'Register lead intent custom dimension',
    action: 'Create the event-scoped intent custom dimension in GA4.',
  },
  form_version_dimension: {
    rank: 2,
    title: 'Register form version custom dimension',
    action: 'Create the event-scoped form_version custom dimension in GA4.',
  },
  ga4_developer_traffic_filter_inactive: {
    rank: 3,
    title: 'Complete developer traffic filtering',
    action: 'Activate the tested GA4 developer-traffic filter for debug traffic.',
  },
  ga4_developer_traffic_filter_unknown: {
    rank: 3,
    title: 'Verify developer traffic inspection access',
    action:
      'Repair GA4 Admin read access, then verify the developer traffic filter without assuming it is absent.',
  },
});

function isQaMarker(value = '') {
  return /^(?:production[_ -]?smoke|qa|quality[_ -]?assurance|automated[_ -]?qa|e2e|playwright|puppeteer|test|conversion[_ -]?e2e)$/i.test(
    String(value).trim()
  );
}

export function validateCommercialAnalyticsOverview(overview = {}) {
  const issues = [];
  const add = (code, message, affectedMetrics = []) => {
    if (!issues.some((issue) => issue.code === code))
      issues.push({ code, message, affectedMetrics });
  };
  const summary = overview.summary || {};
  const funnel = overview.funnel || {};
  const percentages = [
    ['engagement_rate_out_of_bounds', summary.engagementRate],
    ['high_intent_share_out_of_bounds', summary.highIntentSessionShare],
    ['direct_share_out_of_bounds', overview.unattributedDirectPercentage],
    ...Object.entries(funnel.rates || {}).map(([key, value]) => [`${key}_out_of_bounds`, value]),
  ];
  percentages.forEach(([code, value]) => {
    if (value !== undefined && value !== null && (Number(value) < 0 || Number(value) > 100)) {
      add(code, `Percentage metric ${code.replace('_out_of_bounds', '')} was outside 0–100%.`, [
        'rates',
      ]);
    }
  });

  const directSessions = (overview.sourceMedium || [])
    .filter((row) => {
      const normalized = normalizeAcquisition(row.source, row.medium);
      return normalized.source === '(direct)' && normalized.medium === '(none)';
    })
    .reduce((sum, row) => sum + Number(row.sessions || 0), 0);
  if (directSessions > Number(summary.sessions || 0)) {
    add(
      'direct_sessions_exceed_total',
      `Direct sessions (${directSessions}) exceed total commercial sessions (${Number(summary.sessions || 0)}).`,
      ['acquisition']
    );
  }
  if (Number(summary.highIntentSessions || 0) > Number(summary.sessions || 0)) {
    add(
      'high_intent_sessions_exceed_total',
      `High-intent sessions (${Number(summary.highIntentSessions || 0)}) exceed total commercial sessions (${Number(summary.sessions || 0)}).`,
      ['acquisition', 'funnel']
    );
  }

  if (Number(summary.sessions || 0) > 0 && Number(summary.views || 0) < Number(summary.sessions)) {
    add(
      'commercial_views_below_sessions',
      `Commercial page views (${Number(summary.views || 0)}) are below commercial sessions (${Number(summary.sessions || 0)}).`,
      ['engagement', 'funnel']
    );
  }

  const normalizedPairs = new Set();
  for (const row of overview.sourceMedium || []) {
    const normalized = normalizeAcquisition(row.source, row.medium);
    const key = `${normalized.source}\u0000${normalized.medium}`;
    if (normalizedPairs.has(key)) {
      add(
        'duplicate_normalized_source_medium',
        `Duplicate normalized source/medium row detected for ${normalized.source} / ${normalized.medium}.`,
        ['acquisition']
      );
    }
    normalizedPairs.add(key);
    if (isQaMarker(row.source) || isQaMarker(row.medium)) {
      add(
        'qa_traffic_in_commercial_acquisition',
        `QA source/medium appeared in commercial acquisition: ${row.source} / ${row.medium}.`,
        ['acquisition', 'funnel']
      );
    }
  }

  for (const row of overview.campaigns || []) {
    if (isQaMarker(row.campaign)) {
      add(
        'qa_campaign_in_commercial_acquisition',
        `QA campaign appeared in commercial acquisition: ${row.campaign}.`,
        ['acquisition', 'funnel']
      );
    }
  }

  for (const row of [...(overview.topLandingPages || []), ...(overview.topPages || [])]) {
    const path = String(row.path || '');
    if ((path.match(/[?&]intent=/g) || []).length > 1 || /\?intent=[^#]*\?intent=/i.test(path)) {
      add('malformed_landing_url', `Malformed repeated intent parameter detected: ${path}.`, [
        'acquisition',
      ]);
    }
    if (!isCommercialReportPath(path)) {
      add(
        'private_route_in_commercial_pages',
        `Private route appeared in commercial pages: ${path}.`,
        ['acquisition', 'engagement']
      );
    }
  }

  return { valid: issues.length === 0, issues };
}

function configurationRecommendations(diagnostics = []) {
  return diagnostics
    .map((diagnostic, index) => {
      const mapped = GA4_DIAGNOSTIC_ACTIONS[diagnostic.type];
      if (!mapped) return null;
      return {
        priority: mapped.title,
        evidence: diagnostic.message || diagnostic.type,
        action: mapped.action,
        rank: mapped.rank,
        index,
        configurationIssue: true,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, 3);
}

function rows(items, renderer, colspan = 3) {
  return items.length
    ? items.map(renderer).join('')
    : `<tr><td colspan="${colspan}" style="padding:12px;color:#64748b;">No data yet</td></tr>`;
}

export function inferCommercialRecommendations(overview) {
  const integrity = overview.integrity || validateCommercialAnalyticsOverview(overview);
  const recommendations = configurationRecommendations(overview.diagnostics);
  const summary = overview.summary || {};
  const funnel = overview.funnel || {};
  const sessions = summary.sessions || 0;
  const views = summary.views || 0;
  const smallSample = sessions < 50;

  if (!integrity.valid) {
    return [
      {
        priority: 'Fix measurement integrity before changing the website',
        evidence: integrity.issues.map((issue) => issue.message).join(' '),
        action:
          'Repair the affected measurement path, rerun validation, and only then interpret commercial performance.',
      },
      ...recommendations,
    ].slice(0, 4);
  }
  if (recommendations.length) return recommendations;

  const search = overview.searchDiscovery;
  if (!search?.connected) {
    return [
      {
        priority: 'Restore Search Console discovery visibility',
        evidence: search?.reason || 'Search Console discovery data is unavailable.',
        action:
          'Configure read-only Search Console access and verify the configured domain or URL-prefix property before making acquisition recommendations.',
      },
    ];
  }
  if (Number(search.summary?.impressions || 0) < 10) {
    return [
      {
        priority: 'Build search discovery before rewriting conversion pages',
        evidence: `Google Search produced ${number(search.summary?.impressions)} impressions and ${number(search.summary?.clicks)} clicks in the completed Search Console period.`,
        action:
          'Inspect indexing and strengthen one high-intent search journey; do not diagnose on-site conversion from near-zero discovery.',
      },
    ];
  }
  if (Number(search.summary?.impressions || 0) >= 50 && Number(search.summary?.ctr || 0) < 2) {
    return [
      {
        priority: 'Improve search-title and query intent alignment',
        evidence: `${number(search.summary.impressions)} Google impressions produced ${number(search.summary.clicks)} clicks (${percent(search.summary.ctr)} CTR).`,
        action:
          'Review high-impression, weak-CTR non-brand queries and align one page title and description with the demonstrated search intent.',
      },
    ];
  }
  if (
    Number(search.summary?.clicks || 0) > 0 &&
    Number(summary.qualifiedLandingPageSessions || 0) === 0
  ) {
    return [
      {
        priority: 'Repair qualified landing-page targeting',
        evidence: `Search Console recorded ${number(search.summary.clicks)} Google clicks, while GA4 recorded no qualified landing sessions in its separate clean period.`,
        action:
          'Inspect the top Google landing pages and route high-intent queries to the focused Product, Sample Report, Contact, or visibility-review journey.',
      },
    ];
  }
  if (
    Number(summary.qualifiedLandingPageSessions || 0) > 0 &&
    Number(funnel.primaryCtaClicks || 0) < Number(summary.qualifiedLandingPageSessions) * 0.05
  ) {
    return [
      {
        priority: 'Clarify the qualified-page proposition and primary CTA',
        evidence: `${number(summary.qualifiedLandingPageSessions)} qualified landing sessions produced ${number(funnel.primaryCtaClicks)} primary CTA clicks.`,
        action:
          'Review proposition-to-CTA continuity on the highest-volume qualified landing page before increasing acquisition.',
      },
    ];
  }
  if (
    Number(funnel.primaryCtaClicks || 0) > 0 &&
    Number(funnel.formStarts || 0) < Number(funnel.primaryCtaClicks) * 0.5
  ) {
    return [
      {
        priority: 'Reduce CTA-to-form journey friction',
        evidence: `${number(funnel.primaryCtaClicks)} primary CTA clicks produced ${number(funnel.formStarts)} form starts.`,
        action:
          'Inspect the CTA destination, mobile scroll position, and form visibility before changing acquisition or page positioning.',
      },
    ];
  }
  if (
    Number(funnel.formStarts || 0) > 0 &&
    Number(funnel.validSubmissions || 0) < Number(funnel.formStarts) * 0.5
  ) {
    return [
      {
        priority: 'Diagnose lead-form completion',
        evidence: `${number(funnel.formStarts)} form starts produced ${number(funnel.validSubmissions)} valid submissions; ${number(funnel.formErrors)} classified errors were recorded.`,
        action:
          'Inspect fixed error types and replay the highest-volume failure against the production API without logging form values.',
      },
    ];
  }
  if (Number(funnel.validSubmissions || 0) > Number(funnel.confirmedLeads || 0)) {
    return [
      {
        priority: 'Repair the submission-to-confirmation gap',
        evidence: `${number(funnel.validSubmissions)} valid submissions produced ${number(funnel.confirmedLeads)} confirmed persisted leads.`,
        action:
          'Check lead persistence responses and notification diagnostics before interpreting downstream conversion.',
      },
    ];
  }
  if (
    Number(funnel.confirmedLeads || 0) > 0 &&
    Number(funnel.bookingLinkClicks || 0) < Number(funnel.confirmedLeads) * 0.5
  ) {
    return [
      {
        priority: 'Improve post-submit sales continuation',
        evidence: `${number(funnel.confirmedLeads)} confirmed leads produced ${number(funnel.bookingLinkClicks)} booking-link clicks.`,
        action:
          'Verify the confirmation state and booking option, then test one clearer scheduling prompt.',
      },
    ];
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

  return recommendations.slice(0, 1);
}

export function generateSiteAnalyticsEmailHtml(overview, recommendations) {
  const summary = overview.summary || {};
  const previous = overview.previousSummary || {};
  const funnel = overview.funnel || { rates: {} };
  const smallSample = (summary.sessions || 0) < 50;
  const integrity = overview.integrity || validateCommercialAnalyticsOverview(overview);
  const search = overview.searchDiscovery || {};
  const interpretedPercent = (value) => (integrity.valid ? percent(value) : 'withheld');
  const comparisonAvailable = Boolean(
    integrity.valid &&
    (overview.dateRange?.comparisonAvailable ?? overview.scope?.historicalComparisonAvailable)
  );
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

    <h2 style="font-size:21px;margin:24px 0 10px;">Measurement integrity</h2>
    <div style="padding:14px;border-radius:12px;background:${integrity.valid ? '#ecfdf5' : '#fef2f2'};color:${integrity.valid ? '#065f46' : '#991b1b'};font-size:13px;line-height:1.5;">
      <strong>${integrity.valid ? 'Measurement checks passed' : 'Measurement integrity warning'}</strong><br>
      ${integrity.valid ? overview.dateRange?.comparisonReason || 'Commercial metrics passed self-consistency checks.' : `Affected metrics are not interpreted in this report. ${integrity.issues.map((issue) => issue.message).join(' ')}`}
    </div>

    <h2 style="font-size:21px;margin:24px 0 10px;">Search discovery</h2>
    ${
      search.connected
        ? `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
      ${metricCard('Google impressions', number(search.summary?.impressions), 'Search Console completed data')}
      ${metricCard('Google clicks', number(search.summary?.clicks), 'Search Console completed data')}
      ${metricCard('Google CTR', percent(search.summary?.ctr), 'clicks divided by impressions in GSC')}
      ${metricCard('Average position', Number(search.summary?.averagePosition || 0).toFixed(1), 'Search Console average')}
      ${metricCard('Non-brand impressions', number(search.nonBrandSummary?.impressions), 'queries excluding signaltrue')}
      ${metricCard('Non-brand clicks', number(search.nonBrandSummary?.clicks), 'queries excluding signaltrue')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;">
      <section style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
        <h3 style="margin:0 0 10px;">Top non-brand queries</h3>
        <table style="width:100%;font-size:13px;"><tbody>${rows(
          (search.nonBrandQueries || []).slice(0, 8),
          (item) =>
            `<tr><td style="padding:7px;">${escapeHtml(item.query)}</td><td style="text-align:right;">${number(item.impressions)} impressions · ${number(item.clicks)} clicks</td></tr>`,
          2
        )}</tbody></table>
      </section>
      <section style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
        <h3 style="margin:0 0 10px;">Top landing pages by impressions</h3>
        <table style="width:100%;font-size:13px;"><tbody>${rows(
          (search.topLandingPages || []).slice(0, 8),
          (item) =>
            `<tr><td style="padding:7px;">${escapeHtml(item.page)}</td><td style="text-align:right;">${number(item.impressions)} impressions · ${number(item.clicks)} clicks</td></tr>`,
          2
        )}</tbody></table>
      </section>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;">
      <section style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
        <h3 style="margin:0 0 10px;">Top gaining and losing non-brand queries</h3>
        <table style="width:100%;font-size:13px;"><tbody>${rows(
          [
            ...(search.topGainingQueries || [])
              .slice(0, 4)
              .map((item) => ({ ...item, movement: 'gain' })),
            ...(search.topLosingQueries || [])
              .slice(0, 4)
              .map((item) => ({ ...item, movement: 'loss' })),
          ],
          (item) =>
            `<tr><td style="padding:7px;">${escapeHtml(item.query)}</td><td style="text-align:right;">${item.movement === 'gain' ? '+' : ''}${number(item.impressionChange)} impressions · ${item.movement}</td></tr>`,
          2
        )}</tbody></table>
      </section>
      <section style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
        <h3 style="margin:0 0 10px;">Search opportunities</h3>
        <table style="width:100%;font-size:13px;"><tbody>${rows(
          [
            ...(search.pagesWithImpressionsZeroClicks || []).slice(0, 4).map((item) => ({
              label: item.page,
              detail: `${number(item.impressions)} impressions · zero clicks`,
            })),
            ...(search.highImpressionWeakCtrQueries || []).slice(0, 4).map((item) => ({
              label: item.query,
              detail: `${number(item.impressions)} impressions · ${percent(item.ctr)} CTR`,
            })),
          ],
          (item) =>
            `<tr><td style="padding:7px;">${escapeHtml(item.label)}</td><td style="text-align:right;">${item.detail}</td></tr>`,
          2
        )}</tbody></table>
      </section>
    </div>
    <p style="font-size:12px;color:#64748b;">Search Console answers whether SignalTrue appeared in Google. GA4 answers what happened after arrival. Their denominators are reported separately.</p>`
        : `<div style="padding:14px;border-radius:12px;background:#fffbeb;color:#92400e;font-size:13px;"><strong>Search discovery: UNKNOWN</strong><br>${escapeHtml(search.reason || 'Search Console is not configured.')}</div>`
    }

    <div style="margin:16px 0;padding:14px;border-radius:12px;background:${smallSample ? '#fffbeb' : '#ecfdf5'};color:${smallSample ? '#92400e' : '#065f46'};font-size:13px;line-height:1.5;">
      ${smallSample ? `Small sample: ${number(summary.sessions)} sessions are insufficient for confident weekly conclusions. Treat movements as directional.` : 'The sample is large enough for stage-level comparison, though it does not establish causation.'}
    </div>

    <h2 style="font-size:21px;margin:24px 0 10px;">Traffic quality</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
      ${metricCard('External sessions', number(summary.sessions), comparison(summary.sessions, previous.sessions, '', comparisonAvailable))}
      ${metricCard('Engaged sessions', number(summary.engagedSessions), 'GA4 engaged-session definition')}
      ${metricCard('High-intent sessions', number(summary.highIntentSessions), integrity.valid ? `${interpretedPercent(summary.highIntentSessionShare)} of commercial sessions` : 'withheld after integrity failure')}
      ${metricCard('Qualified landings', number(summary.qualifiedLandingPageSessions), 'Product, Contact, Sample Report or visibility review')}
      ${metricCard('Organic sessions', number(summary.organicSessions), 'source / medium = organic')}
      ${metricCard('Direct / unattributed', interpretedPercent(overview.unattributedDirectPercentage), integrity.valid ? 'share of commercial sessions' : 'withheld after integrity failure')}
    </div>
    <p style="font-size:12px;color:#64748b;line-height:1.6;">A high-intent session is not a page load. It requires an explicit commercial action such as viewing the sample report, clicking a primary or pricing CTA, starting a lead form, completing a diagnostic, booking, checkout or subscription activity. This makes raw traffic and plausible buyer behaviour visible separately.</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;">
      <section style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;">
        <h3 style="margin:0 0 10px;">Traffic quality by source / medium</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="text-align:left;color:#64748b;"><th style="padding:8px;">Source</th><th style="padding:8px;text-align:right;">Sessions</th><th style="padding:8px;text-align:right;">Engaged</th><th style="padding:8px;text-align:right;">High intent</th></tr></thead>
          <tbody>${rows(
            (overview.sourceMedium || []).slice(0, 8),
            (item) =>
              `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:8px;">${escapeHtml(item.source)} / ${escapeHtml(item.medium)}</td><td style="padding:8px;text-align:right;font-weight:700;">${number(item.sessions)}</td><td style="padding:8px;text-align:right;">${number(item.engagedSessions)} · ${interpretedPercent(item.engagementRate)}</td><td style="padding:8px;text-align:right;">${number(item.highIntentSessions)} · ${interpretedPercent(item.highIntentRate)}</td></tr>`,
            4
          )}</tbody>
        </table>
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

    <p style="font-size:12px;color:#64748b;margin-top:14px;"><strong>Qualified acquisition</strong> is now shown inside Traffic quality so acquisition volume is not confused with buyer behaviour.</p>

    <h2 style="font-size:21px;margin:24px 0 10px;">On-site engagement</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
      ${metricCard('Commercial page views', number(summary.views), comparison(summary.views, previous.views, '', comparisonAvailable))}
      ${metricCard('Engaged-session rate', interpretedPercent(summary.engagementRate), integrity.valid ? (comparisonAvailable ? `${Number(summary.engagementRate || 0) - Number(previous.engagementRate || 0) >= 0 ? '+' : ''}${(Number(summary.engagementRate || 0) - Number(previous.engagementRate || 0)).toFixed(1)} pp` : 'No valid prior clean comparison') : 'withheld after integrity failure')}
      ${metricCard('Avg engagement time', `${number(summary.averageEngagementTime)}s`, comparison(summary.averageEngagementTime, previous.averageEngagementTime, 's', comparisonAvailable))}
      ${metricCard('Sample-report views', number(summary.sampleReportViews), 'successful page opens')}
    </div>

    <h2 style="font-size:21px;margin:24px 0 10px;">Commercial funnel</h2>
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
              `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:10px;">${label}</td><td style="padding:10px;font-weight:700;">${number(count)}</td><td style="padding:10px;">${stageRate === null ? 'diagnostic' : interpretedPercent(stageRate)}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>

    <h3 style="font-size:17px;margin:24px 0 10px;">Supporting on-site diagnostics</h3>
    <section style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:12px;">
      <h3 style="margin:0 0 10px;">Top public landing pages</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;"><tbody>${rows(
        overview.topLandingPages || [],
        (item) =>
          `<tr style="border-top:1px solid #e2e8f0;"><td style="padding:8px;">${escapeHtml(item.path)}</td><td style="padding:8px;text-align:right;">${number(item.sessions)} sessions · ${number(item.engagedSessions)} engaged (${interpretedPercent(item.engagementRate)})</td></tr>`,
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

    <h2 style="font-size:21px;margin:24px 0 10px;">Prioritized action</h2>
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
  const referenceDate = new Date();
  const [overview, searchDiscovery] = await Promise.all([
    getGa4Overview({ referenceDate }),
    getSearchConsoleOverview({ referenceDate }),
  ]);
  if (!overview.connected) throw new Error(overview.reason || 'GA4 is not connected.');

  overview.searchDiscovery = searchDiscovery;
  overview.integrity = validateCommercialAnalyticsOverview(overview);
  if (!overview.integrity.valid) {
    console.error(
      '[CommercialAnalytics] Measurement integrity warning',
      JSON.stringify(overview.integrity.issues)
    );
  }
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
