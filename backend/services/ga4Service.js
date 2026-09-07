import { google } from 'googleapis';

const ANALYTICS_READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';
const ADMIN_API_BASE = 'https://analyticsadmin.googleapis.com/v1beta';
const ADMIN_ALPHA_API_BASE = 'https://analyticsadmin.googleapis.com/v1alpha';
const SITE_HOSTNAME = process.env.GA4_SITE_HOSTNAME || 'www.signaltrue.ai';
export const CLEAN_REPORTING_START_DATE =
  process.env.GA4_CLEAN_REPORTING_START_DATE || '2026-09-04';
export const CONFIGURATION_STATES = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  UNKNOWN: 'unknown',
});
export const COMMERCIAL_PAGE_EVENT = 'page_view';
export const FUNNEL_EVENT_NAMES = [
  'commercial_page_view',
  'sample_report_click',
  'sample_report_view',
  'sample_report_print',
  'trust_overview_download',
  'primary_cta_click',
  'pricing_plan_click',
  'lead_form_start',
  'lead_form_error',
  'lead_submit_success',
  'lead_form_submit',
  'lead_confirmed',
  'booking_link_click',
  'self_check_viewed',
  'self_check_started',
  'self_check_completed',
  'self_check_lead_confirmed',
  'diagnostic_started',
  'diagnostic_step_view',
  'diagnostic_completed',
  'diagnostic_unlock_view',
  'diagnostic_unlock_submit',
  'diagnostic_lead_confirmed',
  'drift_report_view',
  'drift_report_cta_click',
  'checkout_started',
  'subscription_started',
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
  '/forgot-password',
  '/dashboard',
  '/register',
  '/onboarding',
  '/admin',
  '/superadmin',
  '/settings',
  '/notifications',
  '/integrations',
  '/team-analytics',
  '/ceo-summary',
  '/drift-report',
];
const EXCLUDED_PATH_REGEXP = `^(?:${EXCLUDED_PATH_PREFIXES.map((path) => path.replace('/', '\\/')).join('|')})(?:/|$)`;
const AUTOMATION_MARKER_REGEXP =
  '^(?:production[_ -]?smoke|qa|quality[_ -]?assurance|automated[_ -]?qa|conversion[_ -]?e2e|e2e|playwright|puppeteer|test)$';

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

function regexpFilter(fieldName, value) {
  return {
    filter: {
      fieldName,
      stringFilter: { matchType: 'FULL_REGEXP', value, caseSensitive: false },
    },
  };
}

function excludeFilter(expression) {
  return { notExpression: expression };
}

export function buildCommercialReportFilter(eventExpression) {
  const expressions = [
    exactFilter('hostName', SITE_HOSTNAME),
    excludeFilter(regexpFilter('pagePath', EXCLUDED_PATH_REGEXP)),
    excludeFilter(regexpFilter('sessionSource', AUTOMATION_MARKER_REGEXP)),
    excludeFilter(regexpFilter('sessionMedium', AUTOMATION_MARKER_REGEXP)),
    excludeFilter(regexpFilter('sessionCampaignName', AUTOMATION_MARKER_REGEXP)),
  ];
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

export function boundedShare(numerator, denominator) {
  if (!denominator) return 0;
  return Math.min(100, Math.max(0, rate(numerator, denominator)));
}

function normalizeAcquisitionToken(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/[\s_-]+/g, ' ');
}

export function normalizeAcquisition(source = '', medium = '') {
  let normalizedSource = normalizeAcquisitionToken(source);
  let normalizedMedium = normalizeAcquisitionToken(medium);

  if (['', '(not set)', 'not set', 'direct', '(direct)'].includes(normalizedSource)) {
    normalizedSource = '(direct)';
  }
  if (['', '(not set)', 'not set', 'none', '(none)', 'direct'].includes(normalizedMedium)) {
    normalizedMedium = '(none)';
  }
  if (/^(?:google\.[a-z.]+|google)$/.test(normalizedSource)) normalizedSource = 'google';
  if (/^(?:bing\.[a-z.]+|bing)$/.test(normalizedSource)) normalizedSource = 'bing';
  if (/^(?:duckduckgo\.[a-z.]+|duckduckgo)$/.test(normalizedSource)) {
    normalizedSource = 'duckduckgo';
  }
  if (['organic search', 'seo'].includes(normalizedMedium)) normalizedMedium = 'organic';
  if (['paid search', 'ppc'].includes(normalizedMedium)) normalizedMedium = 'cpc';
  if (['e mail', 'e-mail'].includes(normalizedMedium)) normalizedMedium = 'email';
  if (['social media', 'social network'].includes(normalizedMedium)) normalizedMedium = 'social';

  if (normalizedSource === '(direct)' || normalizedMedium === '(none)') {
    return { source: '(direct)', medium: '(none)' };
  }
  return { source: normalizedSource, medium: normalizedMedium };
}

export function normalizeAcquisitionRows(rows = []) {
  const grouped = new Map();
  for (const row of rows) {
    const pair = normalizeAcquisition(row.source, row.medium);
    const key = `${pair.source}\u0000${pair.medium}`;
    const current = grouped.get(key) || { ...pair, sessions: 0, activeUsers: 0 };
    current.sessions += Number(row.sessions || 0);
    current.activeUsers += Number(row.activeUsers || 0);
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((left, right) => right.sessions - left.sessions);
}

function isoDate(value, fallback = new Date()) {
  if (!value || value === 'today') return fallback.toISOString().slice(0, 10);
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new TypeError(`Expected an ISO calendar date, received "${text}".`);
  }
  return text;
}

function shiftDate(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function inclusiveDays(startDate, endDate) {
  return (
    Math.floor(
      (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000
    ) + 1
  );
}

function humanDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${day} ${months[month - 1]} ${year}`;
}

/**
 * Product reporting guardrail, not a GA4 retention rule. A partial clean period may be
 * reported, but comparison is withheld until two adjacent complete seven-day periods exist.
 */
export function getCleanComparisonDateRanges(
  referenceDate = new Date(),
  cleanReportingStartDate = process.env.GA4_CLEAN_REPORTING_START_DATE || CLEAN_REPORTING_START_DATE
) {
  const cleanStartDate = isoDate(cleanReportingStartDate);
  const endDate = isoDate(referenceDate);
  if (endDate < cleanStartDate) {
    return {
      current: null,
      previous: null,
      comparisonAvailable: false,
      cleanStartDate,
      reason: `No clean production data is available before ${humanDate(cleanStartDate)}.`,
    };
  }

  const cleanDays = inclusiveDays(cleanStartDate, endDate);
  if (cleanDays < 14) {
    return {
      current: { startDate: cleanStartDate, endDate },
      previous: null,
      comparisonAvailable: false,
      cleanStartDate,
      reason: `Clean production data since ${humanDate(cleanStartDate)}. No valid prior clean comparison is available yet.`,
    };
  }

  return {
    current: { startDate: shiftDate(endDate, -6), endDate },
    previous: { startDate: shiftDate(endDate, -13), endDate: shiftDate(endDate, -7) },
    comparisonAvailable: true,
    cleanStartDate,
    reason: null,
  };
}

export function getCommercialDateRanges(options = {}) {
  const cleanStartDate = isoDate(
    options.cleanReportingStartDate ||
      process.env.GA4_CLEAN_REPORTING_START_DATE ||
      CLEAN_REPORTING_START_DATE
  );
  const explicitCurrent = options.startDate || options.endDate;
  if (!explicitCurrent) {
    const ranges = getCleanComparisonDateRanges(
      options.referenceDate || new Date(),
      cleanStartDate
    );
    return {
      ...ranges,
      current: ranges.current ? [ranges.current] : null,
      previous: ranges.previous ? [ranges.previous] : null,
    };
  }

  const requestedStart = isoDate(options.startDate || cleanStartDate);
  const requestedEnd = isoDate(options.endDate || options.referenceDate || new Date());
  const currentWasClipped = requestedStart < cleanStartDate;
  const currentStart = currentWasClipped ? cleanStartDate : requestedStart;
  if (requestedEnd < cleanStartDate || requestedEnd < currentStart) {
    return {
      current: null,
      previous: null,
      comparisonAvailable: false,
      cleanStartDate,
      reason: `No clean production data is available in the requested range.`,
    };
  }

  const current = { startDate: currentStart, endDate: requestedEnd };
  let previous = null;
  if (options.previousStartDate && options.previousEndDate && !currentWasClipped) {
    const candidate = {
      startDate: isoDate(options.previousStartDate),
      endDate: isoDate(options.previousEndDate),
    };
    const bothClean = candidate.startDate >= cleanStartDate && candidate.endDate >= cleanStartDate;
    const currentDays = inclusiveDays(current.startDate, current.endDate);
    const previousDays = inclusiveDays(candidate.startDate, candidate.endDate);
    const equivalent =
      shiftDate(candidate.endDate, 1) === current.startDate && previousDays === currentDays;
    if (bothClean && equivalent && currentDays === 7 && previousDays === 7) previous = candidate;
  }

  return {
    current: [current],
    previous: previous ? [previous] : null,
    comparisonAvailable: Boolean(previous),
    cleanStartDate,
    reason: previous
      ? null
      : `Clean production data since ${humanDate(cleanStartDate)}. No valid prior clean comparison is available yet.`,
  };
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

function configurationState(state, reason = null) {
  return { state, reason };
}

function errorMessage(error, fallback) {
  return error?.response?.data?.error?.message || error?.message || fallback;
}

function isAdminPermissionError(error) {
  const status = Number(error?.response?.status || error?.response?.data?.error?.code || 0);
  return status === 401 || status === 403;
}

export async function getDataFilterStatus(authClient, propertyId, diagnostics = []) {
  try {
    const response = await authClient.request({
      url: `${ADMIN_API_BASE}/properties/${propertyId}/dataFilters?pageSize=200`,
      method: 'GET',
    });
    const filters = response.data?.dataFilters || [];
    const stateFor = (type) =>
      configurationState(
        filters.some((filter) => filter.filterType === type && filter.state === 'ACTIVE')
          ? CONFIGURATION_STATES.ACTIVE
          : CONFIGURATION_STATES.INACTIVE
      );
    return {
      internalTraffic: stateFor('INTERNAL_TRAFFIC'),
      developerTraffic: stateFor('DEVELOPER_TRAFFIC'),
    };
  } catch (error) {
    const message = errorMessage(error, 'Could not inspect GA4 data filters.');
    diagnostics.push({
      type: 'ga4_admin_permission_error',
      message: isAdminPermissionError(error)
        ? `Could not inspect GA4 data filters because GA4 Admin access failed: ${message}`
        : `Could not inspect GA4 data filters: ${message}`,
    });
    return {
      internalTraffic: configurationState(CONFIGURATION_STATES.UNKNOWN, message),
      developerTraffic: configurationState(CONFIGURATION_STATES.UNKNOWN, message),
    };
  }
}

export async function getPageViewAutomationStatus(authClient, propertyId, diagnostics = []) {
  try {
    const streamsResponse = await authClient.request({
      url: `${ADMIN_API_BASE}/properties/${propertyId}/dataStreams?pageSize=200`,
      method: 'GET',
    });
    const stream = (streamsResponse.data?.dataStreams || []).find((candidate) => {
      if (candidate.type !== 'WEB_DATA_STREAM') return false;
      try {
        return new URL(candidate.webStreamData?.defaultUri || '').hostname === SITE_HOSTNAME;
      } catch {
        return false;
      }
    });
    if (!stream) throw new Error(`No ${SITE_HOSTNAME} web data stream was found.`);

    const settingsResponse = await authClient.request({
      url: `${ADMIN_ALPHA_API_BASE}/${stream.name}/enhancedMeasurementSettings`,
      method: 'GET',
    });
    const enabled = Boolean(settingsResponse.data?.pageChangesEnabled);
    return configurationState(
      enabled ? CONFIGURATION_STATES.ACTIVE : CONFIGURATION_STATES.INACTIVE,
      null
    );
  } catch (error) {
    const message = errorMessage(
      error,
      'Could not inspect enhanced-measurement page-view settings.'
    );
    diagnostics.push({
      type: isAdminPermissionError(error)
        ? 'ga4_admin_permission_error'
        : 'ga4_page_view_automation_unknown',
      message: isAdminPermissionError(error)
        ? `Could not inspect browser-history page-view automation because GA4 Admin access failed: ${message}`
        : message,
    });
    return configurationState(CONFIGURATION_STATES.UNKNOWN, message);
  }
}

async function runOptionalReport(authClient, propertyId, request, diagnosticKey, diagnostics) {
  try {
    return {
      report: await runReport(authClient, propertyId, request),
      availability: configurationState(CONFIGURATION_STATES.ACTIVE),
    };
  } catch (error) {
    const message = errorMessage(error, 'Optional GA4 report failed.');
    const status = Number(error?.response?.status || error?.response?.data?.error?.code || 0);
    const confirmedMissing =
      status === 400 &&
      /(?:custom dimension|not a valid dimension|invalid.*dimension)/i.test(message);
    diagnostics.push({
      type: diagnosticKey,
      state: confirmedMissing ? CONFIGURATION_STATES.INACTIVE : CONFIGURATION_STATES.UNKNOWN,
      message,
    });
    return {
      report: { rows: [], metricHeaders: [], dimensionHeaders: [] },
      availability: configurationState(
        confirmedMissing ? CONFIGURATION_STATES.INACTIVE : CONFIGURATION_STATES.UNKNOWN,
        message
      ),
    };
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
  const rangeSelection = getCommercialDateRanges(options);
  const { current: dateRanges, previous: previousDateRanges } = rangeSelection;
  if (!dateRanges) {
    return {
      connected: true,
      propertyId,
      hostname: SITE_HOSTNAME,
      unavailable: true,
      reason: rangeSelection.reason,
      diagnostics: [
        { type: 'ga4_clean_reporting_range_unavailable', message: rangeSelection.reason },
      ],
    };
  }
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
    ctaLocationResult,
    leadCtaLocationResult,
    formErrorResult,
    intentDimensionResult,
    formVersionDimensionResult,
    dataFilterStatus,
    pageViewAutomationStatus,
  ] = await Promise.all([
    runReport(client, propertyId, summaryRequest(dateRanges)),
    previousDateRanges
      ? runReport(client, propertyId, summaryRequest(previousDateRanges))
      : Promise.resolve({ rows: [], metricHeaders: [], dimensionHeaders: [] }),
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
      limit: 1000,
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
        dimensions: [{ name: 'customEvent:cta_location' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: funnelFilter('lead_confirmed'),
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 25,
      },
      'lead_cta_location_dimension',
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
    runOptionalReport(
      client,
      propertyId,
      {
        dateRanges,
        dimensions: [{ name: 'customEvent:intent' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: funnelFilter('lead_form_start'),
        limit: 25,
      },
      'intent_dimension',
      diagnostics
    ),
    runOptionalReport(
      client,
      propertyId,
      {
        dateRanges,
        dimensions: [{ name: 'customEvent:form_version' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: funnelFilter('lead_form_start'),
        limit: 25,
      },
      'form_version_dimension',
      diagnostics
    ),
    getDataFilterStatus(client, propertyId, diagnostics),
    getPageViewAutomationStatus(client, propertyId, diagnostics),
  ]);

  // The optional reports above are intentionally queried to surface missing GA4 registrations.
  const ctaLocations = ctaLocationResult.report;
  const leadCtaLocations = leadCtaLocationResult.report;
  const formErrors = formErrorResult.report;
  if (dataFilterStatus.internalTraffic.state === CONFIGURATION_STATES.INACTIVE) {
    diagnostics.push({
      type: 'ga4_internal_traffic_filter_inactive',
      message: 'No active GA4 internal-traffic data filter was detected.',
    });
  } else if (dataFilterStatus.internalTraffic.state === CONFIGURATION_STATES.UNKNOWN) {
    diagnostics.push({
      type: 'ga4_internal_traffic_filter_unknown',
      message: `Could not determine internal-traffic filter state: ${dataFilterStatus.internalTraffic.reason}`,
    });
  }
  if (dataFilterStatus.developerTraffic.state === CONFIGURATION_STATES.INACTIVE) {
    diagnostics.push({
      type: 'ga4_developer_traffic_filter_inactive',
      message: 'No active GA4 developer-traffic data filter was detected.',
    });
  } else if (dataFilterStatus.developerTraffic.state === CONFIGURATION_STATES.UNKNOWN) {
    diagnostics.push({
      type: 'ga4_developer_traffic_filter_unknown',
      message: `Could not determine developer-traffic filter state: ${dataFilterStatus.developerTraffic.reason}`,
    });
  }
  if (pageViewAutomationStatus.state === CONFIGURATION_STATES.ACTIVE) {
    diagnostics.push({
      type: 'ga4_duplicate_page_view_risk',
      message:
        'Enhanced-measurement browser-history page views are enabled while the site sends manual SPA page views.',
    });
  } else if (pageViewAutomationStatus.state === CONFIGURATION_STATES.UNKNOWN) {
    diagnostics.push({
      type: 'ga4_page_view_automation_unknown',
      message: `Could not determine browser-history page-view automation state: ${pageViewAutomationStatus.reason}`,
    });
  }

  const summaryMetrics = metricsFromSummary(summary);
  const previousMetrics = metricsFromSummary(previousSummary);
  const funnelEvents = mapEvents(funnel);
  const eventCount = (name) =>
    funnelEvents.find((event) => event.eventName === name)?.eventCount || 0;
  const mapCtaLocationRows = (report) =>
    (report.rows || []).map((row) => ({
      location:
        getDimension(row, report.dimensionHeaders || [], 'customEvent:cta_location') || '(not set)',
      count: getMetric(row, report.metricHeaders || [], 'eventCount'),
    }));
  const primaryCtaLocationRows = mapCtaLocationRows(ctaLocations);
  const leadCtaLocationRows = mapCtaLocationRows(leadCtaLocations);
  const fromSampleReport = (row) => row.location.startsWith('sample_report_');
  const sampleReportPrimaryCtaClicks = primaryCtaLocationRows
    .filter(fromSampleReport)
    .reduce((sum, row) => sum + row.count, 0);
  const sampleReportConfirmedLeads = leadCtaLocationRows
    .filter(fromSampleReport)
    .reduce((sum, row) => sum + row.count, 0);
  const sourceMediumRows = normalizeAcquisitionRows(
    (sourceMedium.rows || []).map((row) => ({
      source: getDimension(row, sourceMedium.dimensionHeaders || [], 'sessionSource'),
      medium: getDimension(row, sourceMedium.dimensionHeaders || [], 'sessionMedium'),
      sessions: getMetric(row, sourceMedium.metricHeaders || [], 'sessions'),
      activeUsers: getMetric(row, sourceMedium.metricHeaders || [], 'activeUsers'),
    }))
  );
  const directSessions = sourceMediumRows
    .filter((row) => row.source === '(direct)' && row.medium === '(none)')
    .reduce((sum, row) => sum + row.sessions, 0);
  const attributedDistributionSessions = sourceMediumRows.reduce(
    (sum, row) => sum + row.sessions,
    0
  );
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
      internalTrafficFilter: dataFilterStatus.internalTraffic,
      developerTrafficFilter: dataFilterStatus.developerTraffic,
      browserHistoryPageViewAutomation: pageViewAutomationStatus,
      customDimensions: {
        cta_location: ctaLocationResult.availability,
        error_type: formErrorResult.availability,
        intent: intentDimensionResult.availability,
        form_version: formVersionDimensionResult.availability,
      },
      // Boolean aliases are retained for existing API consumers.
      internalTrafficRuleDetected:
        dataFilterStatus.internalTraffic.state === CONFIGURATION_STATES.ACTIVE,
      developerTrafficFilterDetected:
        dataFilterStatus.developerTraffic.state === CONFIGURATION_STATES.ACTIVE,
      browserHistoryPageViewsEnabled:
        pageViewAutomationStatus.state === CONFIGURATION_STATES.UNKNOWN
          ? null
          : pageViewAutomationStatus.state === CONFIGURATION_STATES.ACTIVE,
      cleanReportingStartDate: rangeSelection.cleanStartDate,
      historicalComparisonAvailable: rangeSelection.comparisonAvailable,
      comparisonReason: rangeSelection.reason,
      singlePageViewModeVerified: pageViewAutomationStatus.state === CONFIGURATION_STATES.INACTIVE,
    },
    dateRange: {
      label:
        options.label ||
        (rangeSelection.comparisonAvailable
          ? `${dateRanges[0].startDate} to ${dateRanges[0].endDate} compared with the preceding clean seven days`
          : rangeSelection.reason),
      startDate: dateRanges[0].startDate,
      endDate: dateRanges[0].endDate,
      previousStartDate: previousDateRanges?.[0]?.startDate || null,
      previousEndDate: previousDateRanges?.[0]?.endDate || null,
      comparisonAvailable: rangeSelection.comparisonAvailable,
      comparisonReason: rangeSelection.reason,
    },
    summary: {
      ...summaryMetrics,
      organicSessions,
      qualifiedLandingPageSessions,
      sampleReportClicks: eventCount('sample_report_click'),
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
      validSubmissions: eventCount('lead_submit_success'),
      confirmedLeads: eventCount('lead_confirmed'),
      bookingLinkClicks: eventCount('booking_link_click'),
      rates: {
        pageToCta: boundedShare(eventCount('primary_cta_click'), summaryMetrics.sessions),
        ctaToFormStart: boundedShare(
          eventCount('lead_form_start'),
          eventCount('primary_cta_click')
        ),
        formStartToSubmit: boundedShare(
          eventCount('lead_submit_success'),
          eventCount('lead_form_start')
        ),
        submitToConfirmed: boundedShare(
          eventCount('lead_confirmed'),
          eventCount('lead_submit_success')
        ),
        confirmedToBooking: boundedShare(
          eventCount('booking_link_click'),
          eventCount('lead_confirmed')
        ),
      },
    },
    sampleReport: {
      linkClicks: eventCount('sample_report_click'),
      views: eventCount('sample_report_view'),
      primaryCtaClicks: sampleReportPrimaryCtaClicks,
      confirmedLeads: sampleReportConfirmedLeads,
      rates: {
        viewToPrimaryCta: boundedShare(
          sampleReportPrimaryCtaClicks,
          eventCount('sample_report_view')
        ),
        viewToConfirmedLead: boundedShare(
          sampleReportConfirmedLeads,
          eventCount('sample_report_view')
        ),
      },
    },
    topCtaLocations: primaryCtaLocationRows.map((row) => ({
      location: row.location,
      clicks: row.count,
    })),
    confirmedLeadsByCtaLocation: leadCtaLocationRows.map((row) => ({
      location: row.location,
      leads: row.count,
    })),
    formErrorsByType: (formErrors.rows || []).map((row) => ({
      type:
        getDimension(row, formErrors.dimensionHeaders || [], 'customEvent:error_type') ||
        '(not set)',
      count: getMetric(row, formErrors.metricHeaders || [], 'eventCount'),
    })),
    unattributedDirectPercentage: boundedShare(directSessions, attributedDistributionSessions),
    diagnostics,
    conversionEvents: [{ eventName: 'lead_confirmed', eventCount: eventCount('lead_confirmed') }],
    conversionEventCount: eventCount('lead_confirmed'),
  };
}
