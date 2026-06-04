import { google } from 'googleapis';

const ANALYTICS_READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';
const CONVERSION_EVENT_NAMES = new Set([
  'demo_requested',
  'pricing_cta_clicked',
  'form_start',
  'contact_form_submit',
  'early_signal_preview_requested',
  'sample_report_click',
  'sample_report_request',
  'sample_report_view',
  'demo_cta_click',
  'pricing_contact_sales_click',
]);

function parseServiceAccountJson() {
  const rawJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
  const rawBase64 = process.env.GA4_SERVICE_ACCOUNT_JSON_BASE64;

  if (!rawJson && !rawBase64) return null;

  const jsonText = rawBase64 ? Buffer.from(rawBase64, 'base64').toString('utf8') : rawJson;
  const credentials = JSON.parse(jsonText);

  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  return credentials;
}

function getMetric(row, metricHeaders, metricName) {
  const index = metricHeaders.findIndex((header) => header.name === metricName);
  if (index === -1) return 0;
  return Number(row.metricValues?.[index]?.value || 0);
}

function getDimension(row, dimensionHeaders, dimensionName) {
  const index = dimensionHeaders.findIndex((header) => header.name === dimensionName);
  if (index === -1) return '';
  return row.dimensionValues?.[index]?.value || '';
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 1000) / 10;
}

function formatSeconds(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

async function getAnalyticsClient() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const credentials = parseServiceAccountJson();

  if (!propertyId || !credentials) {
    return {
      configured: false,
      reason: 'GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON are required.',
    };
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [ANALYTICS_READONLY_SCOPE],
  });

  return {
    configured: true,
    propertyId,
    client: await auth.getClient(),
  };
}

async function runReport(authClient, propertyId, request) {
  const response = await authClient.request({
    url: `${DATA_API_BASE}/properties/${propertyId}:runReport`,
    method: 'POST',
    data: request,
  });

  return response.data;
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
    {
      startDate: options.startDate || '30daysAgo',
      endDate: options.endDate || 'today',
    },
  ];
  const previousDateRanges = [
    {
      startDate: options.previousStartDate || '60daysAgo',
      endDate: options.previousEndDate || '31daysAgo',
    },
  ];

  const [summary, previousSummary, topPages, trafficSources, daily, keyEvents] = await Promise.all([
    runReport(client, propertyId, {
      dateRanges,
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
        { name: 'averageSessionDuration' },
        { name: 'keyEvents' },
      ],
    }),
    runReport(client, propertyId, {
      dateRanges: previousDateRanges,
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
        { name: 'averageSessionDuration' },
        { name: 'keyEvents' },
      ],
    }),
    runReport(client, propertyId, {
      dateRanges,
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'engagementRate' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    }),
    runReport(client, propertyId, {
      dateRanges,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    }),
    runReport(client, propertyId, {
      dateRanges,
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'keyEvents' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 31,
    }),
    runReport(client, propertyId, {
      dateRanges,
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'keyEvents' }, { name: 'eventCount' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 25,
    }),
  ]);

  const summaryHeaders = summary.metricHeaders || [];
  const summaryRow = summary.rows?.[0] || {};
  const previousHeaders = previousSummary.metricHeaders || [];
  const previousRow = previousSummary.rows?.[0] || {};

  const currentMetrics = {
    activeUsers: getMetric(summaryRow, summaryHeaders, 'activeUsers'),
    sessions: getMetric(summaryRow, summaryHeaders, 'sessions'),
    views: getMetric(summaryRow, summaryHeaders, 'screenPageViews'),
    engagementRate: formatPercent(getMetric(summaryRow, summaryHeaders, 'engagementRate')),
    averageSessionDuration: formatSeconds(
      getMetric(summaryRow, summaryHeaders, 'averageSessionDuration')
    ),
    keyEvents: getMetric(summaryRow, summaryHeaders, 'keyEvents'),
  };

  const previousMetrics = {
    activeUsers: getMetric(previousRow, previousHeaders, 'activeUsers'),
    sessions: getMetric(previousRow, previousHeaders, 'sessions'),
    views: getMetric(previousRow, previousHeaders, 'screenPageViews'),
    engagementRate: formatPercent(getMetric(previousRow, previousHeaders, 'engagementRate')),
    averageSessionDuration: formatSeconds(
      getMetric(previousRow, previousHeaders, 'averageSessionDuration')
    ),
    keyEvents: getMetric(previousRow, previousHeaders, 'keyEvents'),
  };

  const eventRows = (keyEvents.rows || [])
    .map((row) => ({
      eventName: getDimension(row, keyEvents.dimensionHeaders || [], 'eventName'),
      keyEvents: getMetric(row, keyEvents.metricHeaders || [], 'keyEvents'),
      eventCount: getMetric(row, keyEvents.metricHeaders || [], 'eventCount'),
    }))
    .filter((event) => event.keyEvents > 0 || event.eventCount > 0);

  const conversionEvents = eventRows
    .filter((event) => CONVERSION_EVENT_NAMES.has(event.eventName))
    .map((event) => ({
      ...event,
      label: event.eventName.replace(/_/g, ' '),
    }));

  return {
    connected: true,
    propertyId,
    dateRange: {
      label: options.label || 'Last 30 days',
      startDate: dateRanges[0].startDate,
      endDate: dateRanges[0].endDate,
    },
    summary: currentMetrics,
    previousSummary: previousMetrics,
    topPages: (topPages.rows || []).map((row) => ({
      path: getDimension(row, topPages.dimensionHeaders || [], 'pagePath'),
      title: getDimension(row, topPages.dimensionHeaders || [], 'pageTitle'),
      views: getMetric(row, topPages.metricHeaders || [], 'screenPageViews'),
      activeUsers: getMetric(row, topPages.metricHeaders || [], 'activeUsers'),
      engagementRate: formatPercent(getMetric(row, topPages.metricHeaders || [], 'engagementRate')),
    })),
    trafficSources: (trafficSources.rows || []).map((row) => ({
      channel: getDimension(
        row,
        trafficSources.dimensionHeaders || [],
        'sessionDefaultChannelGroup'
      ),
      sessions: getMetric(row, trafficSources.metricHeaders || [], 'sessions'),
      activeUsers: getMetric(row, trafficSources.metricHeaders || [], 'activeUsers'),
    })),
    daily: (daily.rows || []).map((row) => ({
      date: getDimension(row, daily.dimensionHeaders || [], 'date'),
      activeUsers: getMetric(row, daily.metricHeaders || [], 'activeUsers'),
      sessions: getMetric(row, daily.metricHeaders || [], 'sessions'),
      views: getMetric(row, daily.metricHeaders || [], 'screenPageViews'),
      keyEvents: getMetric(row, daily.metricHeaders || [], 'keyEvents'),
    })),
    keyEvents: eventRows,
    conversionEvents,
    conversionEventCount: conversionEvents.reduce((sum, event) => sum + event.eventCount, 0),
  };
}
