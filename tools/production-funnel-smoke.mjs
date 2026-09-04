import { chromium } from 'playwright';

const siteUrl = process.env.SMOKE_SITE_URL || 'https://www.signaltrue.ai';
const apiUrl = process.env.SMOKE_API_URL || 'https://signaltrue-backend.onrender.com';
const smokeEmail = process.env.SMOKE_EMAIL;
const runId =
  process.env.SMOKE_RUN_ID || new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);

if (!smokeEmail) {
  throw new Error('SMOKE_EMAIL is required');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const analyticsRequests = [];
let leadRequest;

page.on('request', (request) => {
  const url = request.url();
  if (
    url.includes('googletagmanager.com') ||
    url.includes('google-analytics.com') ||
    url.includes('/api/analytics/track')
  ) {
    analyticsRequests.push(url);
  }
  if (url.includes('/api/leads') && request.method() === 'POST') leadRequest = request;
});

try {
  await page.goto(`${siteUrl}/?utm_source=production_smoke&utm_medium=qa`, {
    waitUntil: 'networkidle',
  });

  const primaryCta = page.locator('[data-primary-cta="true"]:visible').first();
  assert(
    (await primaryCta.getAttribute('href')) === '/contact?intent=demo',
    'CTA URL is malformed'
  );
  await primaryCta.click();
  await page.waitForURL(/\/contact\?intent=demo$/);

  await page.locator('#commercial-lead-form').waitFor({ state: 'visible', timeout: 10000 });
  assert((await page.getByLabel('Role').count()) === 0, 'Role is still present in the first step');
  assert(
    (await page.getByLabel('Message').count()) === 0,
    'Message is still present in the first step'
  );

  const submit = page.getByRole('button', { name: /Book a 20-minute visibility review/i });
  await submit.click();
  assert(await page.getByText('Enter your work email.').isVisible(), 'Validation state is absent');

  await page.getByLabel('Work email').fill(smokeEmail);
  await page.getByLabel('Company').fill(`SignalTrue Production QA ${runId}`);
  await page.getByLabel('Name').fill(`SignalTrue Production Smoke ${runId}`);

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/leads') && response.request().method() === 'POST'
  );
  await submit.click();
  const response = await responsePromise;
  const result = await response.json();

  assert(response.ok(), `Lead API returned HTTP ${response.status()}`);
  assert(result.success === true, 'Lead API did not return success');
  assert(result.confirmed === true, 'Lead API did not confirm persistence');
  assert(Boolean(result.leadId), 'Lead API did not return a lead ID');
  assert(
    result.internalNotificationSent === true,
    'Internal notification provider did not accept the email'
  );
  assert(await page.getByTestId('lead-confirmation').isVisible(), 'Confirmation state is absent');
  assert(
    await page.getByRole('link', { name: 'Choose a meeting time' }).isVisible(),
    'Booking option is absent'
  );
  assert(analyticsRequests.length === 0, 'Tagged production smoke traffic reached analytics');
  assert(Boolean(leadRequest), 'No lead request was observed');

  const payload = leadRequest.postDataJSON();
  const duplicateResponse = await fetch(`${apiUrl}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const duplicate = await duplicateResponse.json();
  assert(duplicateResponse.ok, `Idempotency check returned HTTP ${duplicateResponse.status}`);
  assert(
    duplicate.confirmed === true && duplicate.duplicate === true,
    'Persisted lead was not recovered'
  );
  assert(
    String(duplicate.leadId) === String(result.leadId),
    'Idempotency check returned a different lead'
  );

  console.log(
    JSON.stringify({
      runId,
      frontend: page.url(),
      leadId: String(result.leadId),
      databasePersistence: true,
      internalNotificationAccepted: true,
      confirmationVisible: true,
      bookingVisible: true,
      analyticsRequests: analyticsRequests.length,
      duplicateRecovered: true,
    })
  );
} finally {
  await browser.close();
}
