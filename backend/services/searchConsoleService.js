import { google } from 'googleapis';

const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const SEARCH_ANALYTICS_BASE = 'https://www.googleapis.com/webmasters/v3/sites';
const BRAND_PATTERN = /signaltrue/i;
export const SEARCH_CONSOLE_DATA_LAG_DAYS = 3;

function isoDate(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new TypeError('referenceDate must be a valid date');
  return date.toISOString().slice(0, 10);
}

function shiftDate(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getSearchConsoleDateRanges(referenceDate = new Date()) {
  const reference = isoDate(referenceDate);
  const endDate = shiftDate(reference, -SEARCH_CONSOLE_DATA_LAG_DAYS);
  return {
    current: { startDate: shiftDate(endDate, -6), endDate },
    previous: { startDate: shiftDate(endDate, -13), endDate: shiftDate(endDate, -7) },
    dataLagDays: SEARCH_CONSOLE_DATA_LAG_DAYS,
  };
}

function parseCredentials() {
  const rawJson =
    process.env.SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON || process.env.GA4_SERVICE_ACCOUNT_JSON;
  const rawBase64 =
    process.env.SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON_BASE64 ||
    process.env.GA4_SERVICE_ACCOUNT_JSON_BASE64;
  if (!rawJson && !rawBase64) return null;
  const credentials = JSON.parse(
    rawBase64 ? Buffer.from(rawBase64, 'base64').toString('utf8') : rawJson
  );
  if (credentials.private_key)
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  return credentials;
}

async function getClient() {
  const credentials = parseCredentials();
  if (!credentials) return null;
  const auth = new google.auth.GoogleAuth({ credentials, scopes: [SEARCH_CONSOLE_SCOPE] });
  return auth.getClient();
}

async function query(client, siteUrl, range, dimensions = [], dimensionFilterGroups = undefined) {
  const response = await client.request({
    url: `${SEARCH_ANALYTICS_BASE}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    method: 'POST',
    data: {
      ...range,
      type: 'web',
      dataState: 'final',
      dimensions,
      rowLimit: dimensions.length ? 25000 : 1,
      ...(dimensionFilterGroups ? { dimensionFilterGroups } : {}),
    },
  });
  return response.data || {};
}

function summary(response) {
  const row = response.rows?.[0] || {};
  return {
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Math.round(Number(row.ctr || 0) * 1000) / 10,
    averagePosition: Math.round(Number(row.position || 0) * 10) / 10,
  };
}

function mapRows(response, keyName) {
  return (response.rows || []).map((row) => ({
    [keyName]: row.keys?.[0] || '',
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Math.round(Number(row.ctr || 0) * 1000) / 10,
    averagePosition: Math.round(Number(row.position || 0) * 10) / 10,
  }));
}

export function compareSearchQueries(currentRows = [], previousRows = []) {
  const currentByQuery = new Map(currentRows.map((row) => [row.query, row]));
  const previousByQuery = new Map(previousRows.map((row) => [row.query, row]));
  const queryNames = new Set([...currentByQuery.keys(), ...previousByQuery.keys()]);
  const compared = [...queryNames].map((queryName) => {
    const row = currentByQuery.get(queryName) || {
      query: queryName,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      averagePosition: 0,
    };
    const previous = previousByQuery.get(queryName) || {};
    return {
      ...row,
      previousClicks: Number(previous.clicks || 0),
      previousImpressions: Number(previous.impressions || 0),
      clickChange: row.clicks - Number(previous.clicks || 0),
      impressionChange: row.impressions - Number(previous.impressions || 0),
    };
  });
  return {
    gaining: [...compared]
      .filter((row) => row.clickChange > 0 || row.impressionChange > 0)
      .sort(
        (left, right) =>
          right.clickChange - left.clickChange || right.impressionChange - left.impressionChange
      )
      .slice(0, 10),
    losing: [...compared]
      .filter((row) => row.clickChange < 0 || row.impressionChange < 0)
      .sort(
        (left, right) =>
          left.clickChange - right.clickChange || left.impressionChange - right.impressionChange
      )
      .slice(0, 10),
  };
}

export async function getSearchConsoleOverview(options = {}) {
  const siteUrl = options.siteUrl || process.env.SEARCH_CONSOLE_SITE_URL;
  if (!siteUrl) {
    return {
      connected: false,
      status: 'unknown',
      reason: 'SEARCH_CONSOLE_SITE_URL is not configured.',
    };
  }
  let client;
  try {
    client = options.client || (await getClient());
  } catch (error) {
    return {
      connected: false,
      status: 'unknown',
      siteUrl,
      reason: error?.message || 'Search Console credentials could not be loaded.',
    };
  }
  if (!client) {
    return {
      connected: false,
      status: 'unknown',
      siteUrl,
      reason: 'Search Console read-only service-account credentials are not configured.',
    };
  }

  const ranges = getSearchConsoleDateRanges(options.referenceDate || new Date());
  const nonBrandFilter = [
    {
      groupType: 'and',
      filters: [{ dimension: 'query', operator: 'notContains', expression: 'signaltrue' }],
    },
  ];
  try {
    const [total, previousTotal, nonBrand, queryRows, previousQueryRows, pageRows] =
      await Promise.all([
        query(client, siteUrl, ranges.current),
        query(client, siteUrl, ranges.previous),
        query(client, siteUrl, ranges.current, [], nonBrandFilter),
        query(client, siteUrl, ranges.current, ['query']),
        query(client, siteUrl, ranges.previous, ['query']),
        query(client, siteUrl, ranges.current, ['page']),
      ]);
    const queries = mapRows(queryRows, 'query');
    const previousQueries = mapRows(previousQueryRows, 'query');
    const pages = mapRows(pageRows, 'page');
    const movements = compareSearchQueries(
      queries.filter((row) => !BRAND_PATTERN.test(row.query)),
      previousQueries.filter((row) => !BRAND_PATTERN.test(row.query))
    );
    return {
      connected: true,
      status: 'pass',
      siteUrl,
      dateRange: ranges.current,
      previousDateRange: ranges.previous,
      dataLagDays: ranges.dataLagDays,
      summary: summary(total),
      previousSummary: summary(previousTotal),
      nonBrandSummary: summary(nonBrand),
      brandedQueries: queries.filter((row) => BRAND_PATTERN.test(row.query)).slice(0, 20),
      nonBrandQueries: queries.filter((row) => !BRAND_PATTERN.test(row.query)).slice(0, 100),
      topGainingQueries: movements.gaining,
      topLosingQueries: movements.losing,
      topLandingPages: [...pages]
        .sort((left, right) => right.impressions - left.impressions)
        .slice(0, 20),
      pagesWithImpressionsZeroClicks: pages
        .filter((row) => row.impressions > 0 && row.clicks === 0)
        .sort((left, right) => right.impressions - left.impressions)
        .slice(0, 20),
      highImpressionWeakCtrQueries: queries
        .filter((row) => !BRAND_PATTERN.test(row.query) && row.impressions >= 20 && row.ctr < 2)
        .sort((left, right) => right.impressions - left.impressions)
        .slice(0, 20),
      limitations: [
        'Search Console reports Google Search discovery; GA4 reports behavior after arrival. Their denominators are not combined.',
        'Query and page tables contain top rows returned by Search Console and may not include every row.',
      ],
    };
  } catch (error) {
    return {
      connected: false,
      status: 'unknown',
      siteUrl,
      dateRange: ranges.current,
      reason:
        error?.response?.data?.error?.message ||
        error?.message ||
        'Could not query Search Console.',
    };
  }
}

export default { getSearchConsoleOverview, getSearchConsoleDateRanges };
