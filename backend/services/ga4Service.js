import { google } from 'googleapis';

const ANALYTICS_READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';
const SITE_HOSTNAME = process.env.GA4_SITE_HOSTNAME || 'www.signaltrue.ai';
export const COMMERCIAL_PAGE_EVENT = 'commercial_page_view';
export const FUNNEL_EVENT_NAMES = [
  'commercial_page_view',
  'sample_report_view',
  'primary_cta_click',
  'lead_form_start',
  'lead_form_error',
  'lead_form_submit',
  'lead_confirmed',
  'booking_link_click',
];
const QUALIFIED_LANDING_PATHS = new Set([
  '/psychosocial-risk-visibility-review',
  '/product',
  '/contact',
  '/sample-report',
]);
const EXCLUDED_PATH_PREFIXES = [
  '/app',
  '/login',
  '/dashboard',
  '/register',
  '/onboarding',
  '/admin',
  '/superadmin',
  '/settings',
  '/notifications',
  '/integrations',
  '/team-analytics',
];

function exactFilter(fieldName, value) {
  return {
    filter: {
      fieldName,
      stringFilter: { matchType: 'EXACT', value, caseSensitive: false },
    },
  };
}

function inListFilter(fieldName, values) {
  return {
    filter: {
      fieldName,
      inListFilter: { values, caseSensitive: true },
    },
  };
}

export function buildCommercialReportFilter(eventExpression) {
  const expressions = [exactFilter('hostName', SITE_HOSTNAME)];
  if (eventExpression) expressions.push(eventExpression);
  return { andGroup: { expressions } };
}

function commercialPageFilter() {
  return buildCommercialReportFilter(exactFilter('eventName', COMMERCIAL_PAGE_EVENT));
}

function funnelFilter(eventName) {
  return buildCommercialReportFilter(
    eventName ? exactFilter('eventName', eventName) : inListFilter('eventName', FUNNEL_EVENT_NAMES)
  );
}

export function isCommercialReportPath(path = '') {
  const pathname = String(path).split('?')[0].replace(/\/+$/, '') || '/';
  return !EXCLUDED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function parseServiceAccountJson() {
  const rawJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
  const rawBase64 = process.env.GA4_SERVICE_ACCOUNT_JSON_BASE64;
  if (!rawJson && !rawBase64) return null;

  const jsonText = rawBase64 ? Buffer.from(rawBase64, 'base64').toString('utf8') : rawJson;
  const credentials = JSON.parse(jsonText);
  if (credentials.private_key)
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  return credentials;
}

function getMetric(row, headers, name) {
  const index = headers.findIndex((header) => header.name === name);
  return index === -1 ? 0 : Number(row.metricValues?.[index]?.value || 0);
}

function getDimension(row, headers, name) {
  const index = headers.findIndex((header) => header.name === name);
  return index === -1 ? '' : row.dimensionValues?.[index]?.value || '';
}

function oneDecimalPercent(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 10 : 0;
}

function rounded(value) {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function rate(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

async function getAnalyticsClient() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const credentials = parseServiceAccountJson();
  if (!propertyId || !credentials) {
    return {
      configured: false,
      reason:
        'GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON (or GA4_SERVICE_ACCOUNT_JSON_BASE64) are required.',
    };
  }

  const auth = new google.auth.GoogleAuth({ credentials, scopes: [ANALYTICS_READONLY_SCOPE] });
  return { configured: true, propertyId, client: await auth.getClient() };
}

async function runReport(authClient, propertyId, request) {
  const response = await authClient.request({
    url: `${DATA_API_BASE}/properties/${propertyId}:runReport`,
    method: 'POST',
    data: request,
  });
  return response.data;
}

async function runOptionalReport(authClient, propertyId, request, diagnosticKey, diagnostics) {
  try {
    return await runReport(authClient, propertyId, request);
  } catch (error) {
    diagnostics.push({
      type: diagnosticKey,
      message:
        error?.response?.data?.error?.message || error.message || 'Optional GA4 report failed.',
    });
    return { rows: [], metricHeaders: [], dimensionHeaders: [] };
  }
}

function metricsFromSummary(report) {
  const row = report.rows?.[0] || {};
  const headers = report.metricHeaders || [];
  const sessions = getMetric(row, headers, 'sessions');
  const engagementDuration = getMetric(row, headers, 'userEngagementDuration');
  return {
    activeUsers: getMetric(row, headers, 'activeUsers'),
    sessions,
    views: getMetric(row, headers, 'eventCount'),
    engagementRate: oneDecimalPercent(getMetric(row, headers, 'engagementRate')),
    averageEngagementTime: rounded(sessions ? engagementDuration / sessions : 0),
  };
}

function mapEvents(report) {
  const dimensionHeaders = report.dimensionHeaders || [];
  const metricHeaders = report.metricHeaders || [];
  const counts = new Map(
    (report.rows || []).map((row) => [
      getDimension(row, dimensionHeaders, 'eventName'),
      getMetric(row, metricHeaders, 'eventCount'),
    ])
  );
  return FUNNEL_EVENT_NAMES.map((eventName) => ({
    eventName,
    eventCount: counts.get(eventName) || 0,
  }));
}

export async function getGa4Overview(options = {}) {
  const analytics = await getAnalyticsClient();
  if (!analytics.configured) {
    return {
      connected: false,
      propertyId: process.env.GA4_PROPERTY_ID || null,
      reason: analytics.reason,
    };
  }

  const { client, propertyId } = analytics;
  const dateRanges = [
    { startDate: options.startDate || '29daysAgo', endDate: options.endDate || 'today' },
  ];
  const previousDateRanges = [
    {
      startDate: options.previousStartDate || '59daysAgo',
      endDate: options.previousEndDate || '30daysAgo',
    },
  ];
  const diagnostics = [];
  const summaryRequest = (ranges) => ({
    dateRanges: ranges,
    dimensions: [{ name: 'hostName' }],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'eventCount' },
      { name: 'engagementRate' },
      { name: 'userEngagementDuration' },
    ],
    dimensionFilter: commercialPageFilter(),
  });

  const [
    summary,
    previousSummary,
    topPages,
    sourceMedium,
    campaigns,
    landingPages,
    daily,
    funnel,
    ctaLocations,
    formErrors,
  ] = await Promise.all([
    runReport(client, propertyId, summaryRequest(dateRanges)),
    runReport(client, propertyId, summaryRequest(previousDateRanges)),
    runReport(client, propertyId, {
      dateRanges,
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }, { name: 'engagementRate' }],
      dimensionFilter: commercialPageFilter(),
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 50,
    }),
    runReport(client, propertyId, {
      dateRanges,
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      dimensionFilter: commercialPageFilter(),
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 50,
    }),
    runReport(client, propertyId, {
      dateRanges,
      dimensions: [{ name: 'sessionCampaignName' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      dimensionFilter: commercialPageFilter(),
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 50,
    }),
    runReport(client, propertyId, {
      dateRanges,
      dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      dimensionFilter: commercialPageFilter(),
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 50,
    }),
    runReport(client, propertyId, {
      dateRanges,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'eventCount' }],
      dimensionFilter: commercialPageFilter(),
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 31,
    }),
    runReport(client, propertyId, {
      dateRanges,
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: funnelFilter(),
      limit: 50,
    }),
    runOptionalReport(
      client,
      propertyId,
      {
        dateRanges,
        dimensions: [{ name: 'customEvent:cta_location' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: funnelFilter('primary_cta_click'),
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 25,
      },
      'cta_location_dimension',
      diagnostics
    ),
    runOptionalReport(
      client,
      propertyId,
      {
        dateRanges,
        dimensions: [{ name: 'customEvent:error_type' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: funnelFilter('lead_form_error'),
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 25,
      },
      'error_type_dimension',
      diagnostics
    ),
  ]);

  const summaryMetrics = metricsFromSummary(summary);
  const previousMetrics = metricsFromSummary(previousSummary);
  const funnelEvents = mapEvents(funnel);
  const eventCount = (name) =>
    funnelEvents.find((event) => event.eventName === name)?.eventCount || 0;
  const sourceMediumRows = (sourceMedium.rows || []).map((row) => ({
    source: getDimension(row, sourceMedium.dimensionHeaders || [], 'sessionSource') || '(not set)',
    medium: getDimension(row, sourceMedium.dimensionHeaders || [], 'sessionMedium') || '(not set)',
    sessions: getMetric(row, sourceMedium.metricHeaders || [], 'sessions'),
    activeUsers: getMetric(row, sourceMedium.metricHeaders || [], 'activeUsers'),
  }));
  const directSessions = sourceMediumRows
    .filter(
      (row) =>
        row.source === '(direct)' ||
        row.source === '(not set)' ||
        row.medium === '(none)' ||
        row.medium === '(not set)'
    )
    .reduce((sum, row) => sum + row.sessions, 0);
  const organicSessions = sourceMediumRows
    .filter((row) => row.medium.toLowerCase() === 'organic')
    .reduce((sum, row) => sum + row.sessions, 0);
  const landingRows = (landingPages.rows || [])
    .map((row) => ({
      path: getDimension(row, landingPages.dimensionHeaders || [], 'landingPagePlusQueryString'),
      sessions: getMetric(row, landingPages.metricHeaders || [], 'sessions'),
      activeUsers: getMetric(row, landingPages.metricHeaders || [], 'activeUsers'),
    }))
    .filter((row) => isCommercialReportPath(row.path));
  const qualifiedLandingPageSessions = landingRows
    .filter((row) => QUALIFIED_LANDING_PATHS.has(row.path.split('?')[0].replace(/\/+$/, '')))
    .reduce((sum, row) => sum + row.sessions, 0);

  return {
    connected: true,
    propertyId,
    hostname: SITE_HOSTNAME,
    scope: {
      eventName: COMMERCIAL_PAGE_EVENT,
      excludedRoutes: EXCLUDED_PATH_PREFIXES,
      previewAndDevelopmentHostsExcluded: true,
      internalTrafficRuleDetected: false,
    },
    dateRange: {
      label: options.label || 'Last 30 days',
      startDate: dateRanges[0].startDate,
      endDate: dateRanges[0].endDate,
    },
    summary: {
      ...summaryMetrics,
      organicSessions,
      qualifiedLandingPageSessions,
      sampleReportViews: eventCount('sample_report_view'),
    },
    previousSummary: previousMetrics,
    sourceMedium: sourceMediumRows,
    campaigns: (campaigns.rows || []).map((row) => ({
      campaign:
        getDimension(row, campaigns.dimensionHeaders || [], 'sessionCampaignName') || '(not set)',
      sessions: getMetric(row, campaigns.metricHeaders || [], 'sessions'),
      activeUsers: getMetric(row, campaigns.metricHeaders || [], 'activeUsers'),
    })),
    topLandingPages: landingRows.slice(0, 10),
    topPages: (topPages.rows || [])
      .map((row) => ({
        path: getDimension(row, topPages.dimensionHeaders || [], 'pagePath'),
        views: getMetric(row, topPages.metricHeaders || [], 'eventCount'),
        activeUsers: getMetric(row, topPages.metricHeaders || [], 'activeUsers'),
        engagementRate: oneDecimalPercent(
          getMetric(row, topPages.metricHeaders || [], 'engagementRate')
        ),
      }))
      .filter((row) => isCommercialReportPath(row.path))
      .slice(0, 10),
    daily: (daily.rows || []).map((row) => ({
      date: getDimension(row, daily.dimensionHeaders || [], 'date'),
      activeUsers: getMetric(row, daily.metricHeaders || [], 'activeUsers'),
      sessions: getMetric(row, daily.metricHeaders || [], 'sessions'),
      views: getMetric(row, daily.metricHeaders || [], 'eventCount'),
    })),
    funnelEvents,
    funnel: {
      primaryCtaClicks: eventCount('primary_cta_click'),
      formStarts: eventCount('lead_form_start'),
      formErrors: eventCount('lead_form_error'),
      validSubmissions: eventCount('lead_form_submit'),
      confirmedLeads: eventCount('lead_confirmed'),
      bookingLinkClicks: eventCount('booking_link_click'),
      rates: {
        pageToCta: rate(eventCount('primary_cta_click'), summaryMetrics.sessions),
        ctaToFormStart: rate(eventCount('lead_form_start'), eventCount('primary_cta_click')),
        formStartToSubmit: rate(eventCount('lead_form_submit'), eventCount('lead_form_start')),
        submitToConfirmed: rate(eventCount('lead_confirmed'), eventCount('lead_form_submit')),
        confirmedToBooking: rate(eventCount('booking_link_click'), eventCount('lead_confirmed')),
      },
    },
    topCtaLocations: (ctaLocations.rows || []).map((row) => ({
      location:
        getDimension(row, ctaLocations.dimensionHeaders || [], 'customEvent:cta_location') ||
        '(not set)',
      clicks: getMetric(row, ctaLocations.metricHeaders || [], 'eventCount'),
    })),
    formErrorsByType: (formErrors.rows || []).map((row) => ({
      type:
        getDimension(row, formErrors.dimensionHeaders || [], 'customEvent:error_type') ||
        '(not set)',
      count: getMetric(row, formErrors.metricHeaders || [], 'eventCount'),
    })),
    unattributedDirectPercentage: rate(directSessions, summaryMetrics.sessions),
    diagnostics,
    conversionEvents: [{ eventName: 'lead_confirmed', eventCount: eventCount('lead_confirmed') }],
    conversionEventCount: eventCount('lead_confirmed'),
  };
}
