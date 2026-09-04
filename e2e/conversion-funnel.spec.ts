import { expect, test } from '@playwright/test';

type CapturedEvent = { eventName: string; params: Record<string, unknown> };

const routesWithPrimaryCtas = [
  '/',
  '/product',
  '/pricing',
  '/how-it-works',
  '/about',
  '/trust',
  '/sample-report',
  '/psychosocial-risk-visibility-review',
  '/client-success',
  '/au/8-week-pilot',
  '/employee-engagement-leading-indicators',
  '/solutions',
  '/resources',
  '/signals/meeting-overload',
  '/privacy',
  '/terms',
  '/drift-diagnostic',
  '/blog',
  '/contact',
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__signaltrueAnalyticsTestEvents = [];
  });
});

test('every rendered primary CTA builds one canonical contact query', async ({ page }) => {
  for (const route of routesWithPrimaryCtas) {
    await page.goto(route);
    const primaryCtas = page.locator('[data-primary-cta="true"]');
    await expect(primaryCtas.first(), `${route} must expose a primary CTA`).toBeAttached();
    const hrefs = await primaryCtas.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href') || '')
    );
    expect(hrefs.length, `${route} must expose a primary CTA`).toBeGreaterThan(0);
    for (const href of hrefs) {
      const destination = new URL(href, 'https://www.signaltrue.ai');
      expect(destination.pathname, `${route}: ${href}`).toBe('/contact');
      expect(destination.searchParams.getAll('intent'), `${route}: ${href}`).toHaveLength(1);
      expect(destination.searchParams.get('intent'), `${route}: ${href}`).toBeTruthy();
      expect(destination.searchParams.get('intent'), `${route}: ${href}`).not.toContain('?');
      expect((href.match(/\?/g) || []).length, `${route}: ${href}`).toBe(1);
    }
  }
});

test('primary CTA completes the accepted-lead funnel exactly once', async ({ page }) => {
  let leadRequests = 0;
  let acceptedLeadPayload: Record<string, unknown> | undefined;

  await page.route('**/api/leads', async (route) => {
    leadRequests += 1;
    acceptedLeadPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        confirmed: true,
        leadId: 'production-like-e2e-lead',
        internalNotificationSent: true,
        calendarLink: 'https://calendar.example/production-like-e2e',
      }),
    });
  });
  await page.route('https://calendar.example/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<title>Calendar fixture</title>',
    })
  );

  await page.goto('/');
  const primaryCta = page.locator('[data-primary-cta="true"]:visible').first();
  await expect(primaryCta).toHaveAttribute('href', '/contact?intent=demo');
  await primaryCta.click();

  await expect(page).toHaveURL(/\/contact\?intent=demo$/);
  await expect(page.locator('#commercial-lead-form')).toBeVisible();
  await expect(page.getByLabel('Work email')).toBeVisible();
  await expect(page.getByLabel('Company')).toBeVisible();
  await expect(page.getByLabel('Name')).toBeVisible();
  await expect(page.getByLabel('Role')).toHaveCount(0);
  await expect(page.getByLabel('Message')).toHaveCount(0);

  await page.getByRole('button', { name: /Book a 20-minute visibility review/i }).click();
  await expect(page.getByText('Enter your work email.')).toBeVisible();

  await page.getByLabel('Work email').fill('synthetic@test.example');
  await page.getByLabel('Company').fill('Synthetic Test Organisation');
  await page.getByLabel('Name').fill('Synthetic Test User');
  await page.getByRole('button', { name: /Book a 20-minute visibility review/i }).click();

  await expect(page.getByTestId('lead-confirmation')).toBeVisible();
  const booking = page.getByRole('link', { name: 'Choose a meeting time' });
  await expect(booking).toBeVisible();
  await booking.click();

  expect(leadRequests).toBe(1);
  expect(acceptedLeadPayload).toMatchObject({
    name: 'Synthetic Test User',
    email: 'synthetic@test.example',
    organization: 'Synthetic Test Organisation',
    title: '',
    challenge: '',
  });

  const events = await page.evaluate(() => window.__signaltrueAnalyticsTestEvents || []);
  const count = (eventName: string) =>
    (events as CapturedEvent[]).filter((event) => event.eventName === eventName).length;
  expect(count('primary_cta_click')).toBe(1);
  expect(count('lead_form_start')).toBe(1);
  expect(count('lead_form_error')).toBe(1);
  expect(count('lead_submit_success')).toBe(1);
  expect(count('lead_confirmed')).toBe(1);
  expect(count('booking_link_click')).toBe(1);
  expect(count('lead_form_submit')).toBe(0);
  expect(count('page_view')).toBe(2);

  const pageViews = (events as CapturedEvent[]).filter((event) => event.eventName === 'page_view');
  expect(pageViews.map((event) => event.params.page_path)).toEqual(['/', '/contact?intent=demo']);
  for (const event of pageViews) {
    expect(event.params.page_title).toEqual(expect.any(String));
    expect(String(event.params.page_title).length).toBeGreaterThan(0);
    expect(event.params.page_location).toBe(
      `${new URL(page.url()).origin}${event.params.page_path}`
    );
  }

  for (const event of events as CapturedEvent[]) {
    expect(JSON.stringify(event.params)).not.toContain('Synthetic Test User');
    expect(JSON.stringify(event.params)).not.toContain('synthetic@test.example');
    expect(JSON.stringify(event.params)).not.toContain('Synthetic Test Organisation');
  }
});

test('the event landing-page CTA starts its short confirmed form once', async ({ page }) => {
  await page.goto('/ehrs-summit-2026');
  await page.getByRole('button', { name: /Broneeri 15-min strateegiline ülevaade/i }).click();
  await expect(page.locator('#commercial-lead-form')).toBeInViewport();

  const events = await page.evaluate(() => window.__signaltrueAnalyticsTestEvents || []);
  expect(
    (events as CapturedEvent[]).filter((event) => event.eventName === 'primary_cta_click')
  ).toHaveLength(1);
});

test('legacy malformed intent is canonicalized without losing the form', async ({ page }) => {
  await page.goto('/contact?intent=demo?intent=demo');
  await expect(page).toHaveURL(/\/contact\?intent=demo$/);
  await expect(page.locator('#commercial-lead-form')).toBeVisible();
});

test('legacy static CTAs are normalized to the same canonical contact URL', async ({ page }) => {
  for (const route of [
    '/marketing/index.html',
    '/marketing/product.html',
    '/marketing/sample-report.html',
    '/sample-report.html',
  ]) {
    await page.goto(route);
    const contactLinks = page.locator('a[href^="/contact"]');
    const hrefs = await contactLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href') || '')
    );
    expect(hrefs.length, `${route} must expose a contact CTA`).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href, route).toBe('/contact?intent=demo');
    }
  }
});

test('legacy static short form also confirms exactly once', async ({ page }) => {
  let leadRequests = 0;
  let payload: Record<string, unknown> | undefined;

  await page.route('**/api/leads', async (route) => {
    leadRequests += 1;
    payload = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        confirmed: true,
        leadId: 'legacy-static-e2e-lead',
        internalNotificationSent: true,
        calendarLink: 'https://calendar.example/legacy-static-e2e',
      }),
    });
  });

  await page.goto('/marketing/contact.html?intent=demo');
  await page.evaluate(() => {
    const testWindow = window as typeof window & {
      __staticAnalyticsEvents: CapturedEvent[];
      signaltrueTrack: (eventName: string, params: Record<string, unknown>) => void;
    };
    testWindow.__staticAnalyticsEvents = [];
    testWindow.signaltrueTrack = (eventName, params) => {
      testWindow.__staticAnalyticsEvents.push({ eventName, params });
    };
  });

  await page.getByRole('button', { name: 'Book my review' }).click();
  await page.getByLabel('Work email').fill('synthetic-static@test.example');
  await page.getByLabel('Company').fill('Static Synthetic Organisation');
  await page.getByLabel('Name').fill('Static Synthetic User');
  await page.getByRole('button', { name: 'Book my review' }).click();

  await expect(page.getByText('Thanks. Your request was sent successfully.')).toBeVisible();
  const booking = page.getByRole('link', { name: 'Choose a time now' });
  await expect(booking).toBeVisible();
  await booking.evaluate((link) => link.setAttribute('target', '_blank'));
  await booking.click();

  expect(leadRequests).toBe(1);
  expect(payload).toMatchObject({
    email: 'synthetic-static@test.example',
    organization: 'Static Synthetic Organisation',
    name: 'Static Synthetic User',
    title: '',
    challenge: '',
  });

  const events = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __staticAnalyticsEvents: CapturedEvent[];
        }
      ).__staticAnalyticsEvents
  );
  const count = (eventName: string) =>
    events.filter((event) => event.eventName === eventName).length;
  expect(count('lead_form_start')).toBe(1);
  expect(count('lead_form_error')).toBe(1);
  expect(count('lead_submit_success')).toBe(1);
  expect(count('lead_confirmed')).toBe(1);
  expect(count('booking_link_click')).toBe(1);
  expect(JSON.stringify(events)).not.toContain('synthetic-static@test.example');
  expect(JSON.stringify(events)).not.toContain('Static Synthetic Organisation');
  expect(JSON.stringify(events)).not.toContain('Static Synthetic User');
});
