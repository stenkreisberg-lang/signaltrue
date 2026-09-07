import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ADMIN_API_BASE = 'https://analyticsadmin.googleapis.com/v1beta';
const ADMIN_ALPHA_API_BASE = 'https://analyticsadmin.googleapis.com/v1alpha';
const EDIT_SCOPE = 'https://www.googleapis.com/auth/analytics.edit';
const READ_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const SITE_HOSTNAME = process.env.GA4_SITE_HOSTNAME || 'www.signaltrue.ai';
const MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID || 'G-32VLC15W5G';
export const REQUIRED_DIMENSIONS = [
  ['cta_location', 'CTA location', 'Where the public conversion action appeared.'],
  ['error_type', 'Lead form error type', 'PII-free validation, HTTP or network error class.'],
  ['intent', 'Lead intent', 'Validated commercial intent such as demo, pilot or pricing.'],
  ['form_version', 'Lead form version', 'Stable version of the public lead form.'],
];
export const NON_AUTHORITATIVE_FUNNEL_EVENTS = new Set([
  'primary_cta_click',
  'sample_report_view',
  'lead_form_start',
  'lead_form_error',
  'lead_submit_success',
  'booking_link_click',
]);

function parseServiceAccountJson() {
  const rawJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
  const rawBase64 = process.env.GA4_SERVICE_ACCOUNT_JSON_BASE64;
  if (!rawJson && !rawBase64) return null;
  const credentials = JSON.parse(
    rawBase64 ? Buffer.from(rawBase64, 'base64').toString('utf8') : rawJson
  );
  if (credentials.private_key)
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  return credentials;
}

export async function listAll(authClient, url, collectionName) {
  const values = [];
  let pageToken = '';
  do {
    const response = await authClient.request({
      url: `${url}${url.includes('?') ? '&' : '?'}pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`,
      method: 'GET',
    });
    values.push(...(response.data?.[collectionName] || []));
    pageToken = response.data?.nextPageToken || '';
  } while (pageToken);
  return values;
}

function reason(error) {
  return error?.response?.data?.error?.message || error?.message || String(error);
}

function blankChecks(state = 'unknown') {
  return {
    property: state,
    production_stream: state,
    measurement_id: state,
    cta_location: state,
    error_type: state,
    intent: state,
    form_version: state,
    lead_confirmed: state,
    conflicting_funnel_key_events: state,
    spa_page_view_mode: state,
    developer_filter: state,
    internal_filter: state,
    service_account_inspection: state,
  };
}

function overallStatus(checks) {
  const required = [
    'property',
    'production_stream',
    'measurement_id',
    'cta_location',
    'error_type',
    'intent',
    'form_version',
    'lead_confirmed',
    'conflicting_funnel_key_events',
    'spa_page_view_mode',
  ];
  if (required.some((key) => checks[key] === 'inactive')) return 'fail';
  if (
    required.some((key) => checks[key] === 'unknown') ||
    checks.service_account_inspection === 'unknown'
  ) {
    return 'unknown';
  }
  return 'pass';
}

/** Read-only and idempotent. Failed inspections remain unknown rather than absent. */
export async function verifyCommercialConfiguration({
  client,
  propertyId,
  hostname = SITE_HOSTNAME,
  measurementId = MEASUREMENT_ID,
}) {
  const parent = `properties/${propertyId}`;
  const checks = blankChecks();
  const errors = [];
  let property = null;
  let stream = null;

  try {
    const response = await client.request({ url: `${ADMIN_API_BASE}/${parent}`, method: 'GET' });
    property = response.data || null;
    checks.property = property?.name === parent ? 'active' : 'inactive';
  } catch (error) {
    errors.push({ check: 'property', reason: reason(error) });
  }

  try {
    const streams = await listAll(client, `${ADMIN_API_BASE}/${parent}/dataStreams`, 'dataStreams');
    stream = streams.find((candidate) => {
      if (candidate.type !== 'WEB_DATA_STREAM') return false;
      try {
        return new URL(candidate.webStreamData?.defaultUri || '').hostname === hostname;
      } catch {
        return false;
      }
    });
    checks.production_stream = stream ? 'active' : 'inactive';
    checks.measurement_id = stream
      ? stream.webStreamData?.measurementId === measurementId
        ? 'active'
        : 'inactive'
      : 'inactive';
    if (stream) {
      try {
        const settings = await client.request({
          url: `${ADMIN_ALPHA_API_BASE}/${stream.name}/enhancedMeasurementSettings`,
          method: 'GET',
        });
        checks.spa_page_view_mode = settings.data?.pageChangesEnabled ? 'inactive' : 'active';
      } catch (error) {
        errors.push({ check: 'spa_page_view_mode', reason: reason(error) });
      }
    } else {
      checks.spa_page_view_mode = 'inactive';
    }
  } catch (error) {
    errors.push({ check: 'production_stream', reason: reason(error) });
  }

  try {
    const dimensions = await listAll(
      client,
      `${ADMIN_API_BASE}/${parent}/customDimensions`,
      'customDimensions'
    );
    for (const [parameterName] of REQUIRED_DIMENSIONS) {
      checks[parameterName] = dimensions.some(
        (dimension) => dimension.parameterName === parameterName && dimension.scope === 'EVENT'
      )
        ? 'active'
        : 'inactive';
    }
  } catch (error) {
    errors.push({ check: 'custom_dimensions', reason: reason(error) });
  }

  try {
    const keyEvents = await listAll(client, `${ADMIN_API_BASE}/${parent}/keyEvents`, 'keyEvents');
    checks.lead_confirmed = keyEvents.some((event) => event.eventName === 'lead_confirmed')
      ? 'active'
      : 'inactive';
    checks.conflicting_funnel_key_events = keyEvents.some((event) =>
      NON_AUTHORITATIVE_FUNNEL_EVENTS.has(event.eventName)
    )
      ? 'inactive'
      : 'active';
  } catch (error) {
    errors.push({ check: 'key_events', reason: reason(error) });
  }

  try {
    const filters = await listAll(client, `${ADMIN_API_BASE}/${parent}/dataFilters`, 'dataFilters');
    const filterState = (type) =>
      filters.some((filter) => filter.filterType === type && filter.state === 'ACTIVE')
        ? 'active'
        : 'inactive';
    checks.developer_filter = filterState('DEVELOPER_TRAFFIC');
    checks.internal_filter = filterState('INTERNAL_TRAFFIC');
  } catch (error) {
    errors.push({ check: 'data_filters', reason: reason(error) });
  }

  checks.service_account_inspection = errors.length ? 'unknown' : 'active';
  return {
    status: overallStatus(checks),
    property: property?.name || parent,
    stream: stream?.name || null,
    expectedHostname: hostname,
    expectedMeasurementId: measurementId,
    checks,
    errors,
  };
}

export async function configureCommercialConfiguration({ client, propertyId, dryRun = false }) {
  const parent = `properties/${propertyId}`;
  const changes = [];
  const streams = await listAll(client, `${ADMIN_API_BASE}/${parent}/dataStreams`, 'dataStreams');
  const webStream = streams.find((stream) => {
    if (stream.type !== 'WEB_DATA_STREAM') return false;
    if (stream.webStreamData?.measurementId === MEASUREMENT_ID) return true;
    try {
      return new URL(stream.webStreamData?.defaultUri || '').hostname === SITE_HOSTNAME;
    } catch {
      return false;
    }
  });
  if (!webStream) {
    throw new Error(
      `No ${SITE_HOSTNAME} web data stream with measurement ID ${MEASUREMENT_ID} was found.`
    );
  }

  const enhancedSettingsName = `${webStream.name}/enhancedMeasurementSettings`;
  const enhancedSettings = await client.request({
    url: `${ADMIN_ALPHA_API_BASE}/${enhancedSettingsName}`,
    method: 'GET',
  });
  if (enhancedSettings.data?.pageChangesEnabled) {
    changes.push('disable enhanced-measurement browser-history page views');
    if (!dryRun) {
      await client.request({
        url: `${ADMIN_ALPHA_API_BASE}/${enhancedSettingsName}?updateMask=page_changes_enabled`,
        method: 'PATCH',
        data: { name: enhancedSettingsName, pageChangesEnabled: false },
      });
    }
  }

  const dimensions = await listAll(
    client,
    `${ADMIN_API_BASE}/${parent}/customDimensions`,
    'customDimensions'
  );
  for (const [parameterName, displayName, description] of REQUIRED_DIMENSIONS) {
    const existing = dimensions.some(
      (dimension) => dimension.parameterName === parameterName && dimension.scope === 'EVENT'
    );
    if (existing) continue;
    changes.push(`create dimension: ${parameterName}`);
    if (!dryRun) {
      await client.request({
        url: `${ADMIN_API_BASE}/${parent}/customDimensions`,
        method: 'POST',
        data: { parameterName, displayName, description, scope: 'EVENT' },
      });
    }
  }

  const keyEvents = await listAll(client, `${ADMIN_API_BASE}/${parent}/keyEvents`, 'keyEvents');
  if (!keyEvents.some((event) => event.eventName === 'lead_confirmed')) {
    changes.push('create key event: lead_confirmed');
    if (!dryRun) {
      await client.request({
        url: `${ADMIN_API_BASE}/${parent}/keyEvents`,
        method: 'POST',
        data: { eventName: 'lead_confirmed', countingMethod: 'ONCE_PER_EVENT' },
      });
    }
  }

  const conflictingKeyEvents = keyEvents
    .map((event) => event.eventName)
    .filter((eventName) => NON_AUTHORITATIVE_FUNNEL_EVENTS.has(eventName));
  const dataFilters = await listAll(
    client,
    `${ADMIN_API_BASE}/${parent}/dataFilters`,
    'dataFilters'
  );
  const activeDataFilters = dataFilters
    .filter((filter) => filter.state === 'ACTIVE')
    .map((filter) => filter.filterType);
  return { dryRun, changes, conflictingKeyEvents, activeDataFilters };
}

async function main() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const credentials = parseServiceAccountJson();
  const verify = process.argv.includes('--verify');
  const dryRun = process.argv.includes('--dry-run');
  if (!propertyId || !credentials) {
    if (verify) {
      console.log(
        JSON.stringify({
          status: 'unknown',
          property: propertyId || null,
          stream: null,
          checks: blankChecks(),
          errors: [
            {
              check: 'credentials',
              reason:
                'GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON (or GA4_SERVICE_ACCOUNT_JSON_BASE64) are required.',
            },
          ],
        })
      );
      return;
    }
    throw new Error(
      'GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON (or GA4_SERVICE_ACCOUNT_JSON_BASE64) are required.'
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [verify ? READ_SCOPE : EDIT_SCOPE],
  });
  const client = await auth.getClient();
  if (verify) {
    const result = await verifyCommercialConfiguration({ client, propertyId });
    console.log(JSON.stringify(result));
    if (result.status === 'fail') process.exitCode = 1;
    return;
  }

  const result = await configureCommercialConfiguration({ client, propertyId, dryRun });
  result.changes.forEach((change) => console.log(`${dryRun ? 'would ' : ''}${change}`));
  if (!result.changes.length) console.log('commercial GA4 configuration already matches');
  if (result.conflictingKeyEvents.length) {
    console.warn(
      `warning: non-authoritative funnel key events still enabled: ${result.conflictingKeyEvents.join(', ')}`
    );
  }
  console.log(
    `active data filters: ${result.activeDataFilters.length ? result.activeDataFilters.join(', ') : 'none detected'}`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(reason(error));
    process.exitCode = 1;
  });
}
