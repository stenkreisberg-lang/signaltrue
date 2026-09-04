import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ADMIN_API_BASE = 'https://analyticsadmin.googleapis.com/v1beta';
const ADMIN_ALPHA_API_BASE = 'https://analyticsadmin.googleapis.com/v1alpha';
const EDIT_SCOPE = 'https://www.googleapis.com/auth/analytics.edit';
const SITE_HOSTNAME = process.env.GA4_SITE_HOSTNAME || 'www.signaltrue.ai';
const MEASUREMENT_ID = 'G-32VLC15W5G';
const REQUIRED_DIMENSIONS = [
  ['cta_location', 'CTA location', 'Where the public conversion action appeared.'],
  ['error_type', 'Lead form error type', 'PII-free validation, HTTP or network error class.'],
  ['intent', 'Lead intent', 'Validated commercial intent such as demo, pilot or pricing.'],
  ['form_version', 'Lead form version', 'Stable version of the public lead form.'],
];
const NON_AUTHORITATIVE_FUNNEL_EVENTS = new Set([
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
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
  return credentials;
}

async function listAll(authClient, url, collectionName) {
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

async function main() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const credentials = parseServiceAccountJson();
  const dryRun = process.argv.includes('--dry-run');
  if (!propertyId || !credentials) {
    throw new Error(
      'GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON (or GA4_SERVICE_ACCOUNT_JSON_BASE64) are required.'
    );
  }

  const auth = new google.auth.GoogleAuth({ credentials, scopes: [EDIT_SCOPE] });
  const client = await auth.getClient();
  const parent = `properties/${propertyId}`;
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
    if (dryRun) {
      console.log('would disable enhanced-measurement browser-history page views');
    } else {
      await client.request({
        url: `${ADMIN_ALPHA_API_BASE}/${enhancedSettingsName}?updateMask=page_changes_enabled`,
        method: 'PATCH',
        data: { name: enhancedSettingsName, pageChangesEnabled: false },
      });
      console.log('disabled enhanced-measurement browser-history page views');
    }
  } else {
    console.log('browser-history page views already disabled');
  }

  const dimensions = await listAll(
    client,
    `${ADMIN_API_BASE}/${parent}/customDimensions`,
    'customDimensions'
  );

  for (const [parameterName, displayName, description] of REQUIRED_DIMENSIONS) {
    const existing = dimensions.find(
      (dimension) => dimension.parameterName === parameterName && dimension.scope === 'EVENT'
    );
    if (existing) {
      console.log(`existing dimension: ${parameterName}`);
      continue;
    }
    if (dryRun) {
      console.log(`would create dimension: ${parameterName}`);
      continue;
    }
    await client.request({
      url: `${ADMIN_API_BASE}/${parent}/customDimensions`,
      method: 'POST',
      data: { parameterName, displayName, description, scope: 'EVENT' },
    });
    console.log(`created dimension: ${parameterName}`);
  }

  const keyEvents = await listAll(client, `${ADMIN_API_BASE}/${parent}/keyEvents`, 'keyEvents');
  if (!keyEvents.some((event) => event.eventName === 'lead_confirmed')) {
    if (dryRun) {
      console.log('would create key event: lead_confirmed');
    } else {
      await client.request({
        url: `${ADMIN_API_BASE}/${parent}/keyEvents`,
        method: 'POST',
        data: { eventName: 'lead_confirmed', countingMethod: 'ONCE_PER_EVENT' },
      });
      console.log('created key event: lead_confirmed');
    }
  } else {
    console.log('existing key event: lead_confirmed');
  }

  const conflictingKeyEvents = keyEvents
    .map((event) => event.eventName)
    .filter((eventName) => NON_AUTHORITATIVE_FUNNEL_EVENTS.has(eventName));
  if (conflictingKeyEvents.length) {
    console.warn(
      `warning: non-authoritative funnel key events still enabled: ${conflictingKeyEvents.join(', ')}`
    );
  }

  const dataFilters = await listAll(
    client,
    `${ADMIN_API_BASE}/${parent}/dataFilters`,
    'dataFilters'
  );
  const activeTypes = dataFilters
    .filter((filter) => filter.state === 'ACTIVE')
    .map((filter) => filter.filterType);
  console.log(
    `active data filters: ${activeTypes.length ? activeTypes.join(', ') : 'none detected'}`
  );
}

main().catch((error) => {
  console.error(error?.response?.data?.error?.message || error.message || error);
  process.exitCode = 1;
});
