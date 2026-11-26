import { expect, test } from '@playwright/test';

test('manager can act on a measured change and switch teams without carrying drafts', async ({ page }) => {
  const user = { name: 'QA manager', role: 'manager', orgId: 'example-org', id: 'manager-1' };
  await page.addInitScript((profile) => {
    localStorage.setItem('token', 'local-test-session');
    localStorage.setItem('user', JSON.stringify(profile));
  }, user);

  const metric = 'meetingHoursPerRepresentedPerson';
  const series = {
    key: metric, label: 'Meeting hours', unit: 'h', baselineAvailable: true,
    summary: { baseline: 4 }, points: [
      { weekStart: '2026-11-09', value: 4 }, { weekStart: '2026-11-16', value: 6 },
    ],
  };
  const teams = [
    { teamId: 'alpha', name: 'Example Alpha', weeklyEmailEnabled: false },
    { teamId: 'beta', name: 'Example Beta', weeklyEmailEnabled: false },
  ];
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: user });
    if (path.endsWith('/me/teams')) return route.fulfill({ json: { teams, locale: 'en' } });
    if (path.endsWith('/me/deliveries')) return route.fulfill({ json: { deliveries: [] } });
    if (path.endsWith('/trends')) {
      const label = path.includes('/alpha/') ? 'Alpha planning meetings' : 'Beta planning meetings';
      return route.fulfill({ json: {
        eligible: true, trendSeries: [series], actions: [], contexts: [],
        findings: [{ key: metric, label, unit: 'h', baseline: 4, current: 6, periods: 4, delta: 2,
          changePct: 50, sampledOn: '2026-11-22', question: 'Which meetings changed?' }],
      } });
    }
    if (path.endsWith('/actions') && route.request().method() === 'POST') {
      return route.fulfill({ status: 201, json: {} });
    }
    return route.fulfill({ status: 404, json: {} });
  });

  await page.goto('/app/manager');
  await expect(page.getByRole('heading', { name: 'Alpha planning meetings' })).toBeVisible();
  const sizes = await page.evaluate(() => [document.documentElement.clientWidth, document.documentElement.scrollWidth]);
  expect(sizes[1]).toBeLessThanOrEqual(sizes[0]);
  const sixMonths = page.getByRole('button', { name: '6 months' });
  await sixMonths.click();
  await expect(sixMonths).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Record a decision about this change' }).click();
  const title = page.getByRole('textbox').first();
  await expect(title).toBeFocused();
  await title.fill('Shorten the weekly planning meeting');
  const saved = page.waitForRequest(req => req.method() === 'POST' && req.url().endsWith('/teams/alpha/actions'));
  await page.getByRole('button', { name: 'Save decision and schedule reviews' }).click();
  expect((await saved).postDataJSON()).toMatchObject({ title: 'Shorten the weekly planning meeting', metric });
  await expect(page.getByText(/Decision saved. Reviews are scheduled/)).toBeVisible();

  await title.fill('Draft for Alpha only');
  await page.getByLabel('Team', { exact: true }).selectOption('beta');
  await expect(page.getByRole('heading', { name: 'Beta planning meetings' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Alpha planning meetings' })).toHaveCount(0);
  await expect(title).toHaveValue('');
});
