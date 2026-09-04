import { expect, test } from '@playwright/test';

const publicRoutes = [
  '/',
  '/product',
  '/how-it-works',
  '/pricing',
  '/about',
  '/trust',
  '/sample-report',
  '/psychosocial-risk-visibility-review',
  '/client-success',
  '/blog',
  '/contact',
  '/self-check',
  '/au',
  '/au/8-week-pilot',
  '/au/monitoring-gap-audit',
  '/au/privacy',
  '/au/worker-transparency',
  '/au/security',
  '/au/data-residency',
  '/au/trust',
  '/au/ai-governance',
  '/privacy',
  '/terms',
] as const;

for (const path of publicRoutes) {
  test(`${path} renders without client errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    const response = await page.goto(path);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
    await expect(page.getByText(/Page not found/i)).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('primary homepage navigation and CTA paths work', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Product', exact: true }).first().click();
  await expect(page).toHaveURL(/\/product$/);

  await page.getByRole('link', { name: 'Pricing', exact: true }).first().click();
  await expect(page).toHaveURL(/\/pricing$/);

  await page.goto('/');
  await page
    .getByRole('link', { name: /View the fictional sample review/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/sample-report$/);
});

test('verification-led homepage keeps its primary action above the mobile fold', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  const heading = page.getByRole('heading', {
    name: 'You removed the meetings. Did the workload actually go away?',
  });
  await expect(heading).toBeVisible();
  await expect(page.getByText(/migration when the demand simply moved/i)).toBeVisible();
  await expect(page.getByText(/improvement was sustained/i)).toBeVisible();

  const lineCount = await heading.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return element.getBoundingClientRect().height / Number.parseFloat(styles.lineHeight);
  });
  expect(lineCount).toBeLessThanOrEqual(3.1);

  const primaryAction = page
    .getByRole('link', { name: /Book a 20-minute visibility review/i })
    .first();
  const actionBox = await primaryAction.boundingBox();
  expect(actionBox).not.toBeNull();
  expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(812);
});

test('protected routes send signed-out users to login', async ({ page }) => {
  for (const route of ['/dashboard', '/app/overview', '/integrations', '/superadmin']) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`/login(?:\\?|$)`));
  }
});

test('legacy public aliases resolve to canonical pages', async ({ page }) => {
  await page.goto('/demo');
  await expect(page).toHaveURL(/\/contact\?intent=demo$/);

  await page.goto('/australia-psychosocial-risk');
  await expect(page).toHaveURL(/\/au$/);

  await page.goto('/burnout-early-warning-system');
  await expect(page).toHaveURL(/\/au\/psychosocial-risk-monitoring$/);
});

test('privacy and terms are standalone public records', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { name: 'Privacy Policy', exact: true })).toBeVisible();

  await page.goto('/terms');
  await expect(page).toHaveURL(/\/terms$/);
  await expect(
    page.getByRole('heading', { name: 'Responsible Use Terms', exact: true })
  ).toBeVisible();
});

test('visibility-review form confirms only after a successful API response', async ({ page }) => {
  await page.route('**/api/analytics/track', (route) =>
    route.fulfill({ status: 201, contentType: 'application/json', body: '{"success":true}' })
  );
  await page.route('**/api/leads', async (route) => {
    const payload = route.request().postDataJSON();
    expect(payload.attribution).toMatchObject({
      utmSource: 'partner',
      utmMedium: 'email',
      utmCampaign: 'visibility-review',
    });
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        confirmed: true,
        leadId: 'e2e-lead',
        internalNotificationSent: true,
        calendarLink: 'https://calendar.example/test',
      }),
    });
  });

  await page.goto(
    '/psychosocial-risk-visibility-review?utm_source=partner&utm_medium=email&utm_campaign=visibility-review'
  );
  await page.getByLabel('Name').fill('Synthetic Test User');
  await page.getByLabel('Work email').fill('synthetic@test.example');
  await page.getByLabel('Company').fill('Synthetic Test Organisation');
  await page.getByRole('button', { name: /Book a 20-minute visibility review/i }).click();
  await expect(page.getByTestId('lead-confirmation')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Choose a meeting time' })).toBeVisible();
});

test('visibility-review form preserves values and exposes a server failure', async ({ page }) => {
  await page.route('**/api/analytics/track', (route) =>
    route.fulfill({ status: 201, contentType: 'application/json', body: '{"success":true}' })
  );
  await page.route('**/api/leads', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Synthetic server failure' }),
    })
  );
  await page.goto('/psychosocial-risk-visibility-review');
  await page.getByLabel('Name').fill('Synthetic Failure User');
  await page.getByLabel('Work email').fill('synthetic@test.example');
  await page.getByLabel('Company').fill('Synthetic Test Organisation');
  await page.getByRole('button', { name: /Book a 20-minute visibility review/i }).click();

  await expect(page.getByRole('alert')).toContainText('Synthetic server failure');
  await expect(page.getByLabel('Name')).toHaveValue('Synthetic Failure User');
});
