import { expect, test } from '@playwright/test';

const publicRoutes = [
  '/',
  '/product',
  '/how-it-works',
  '/pricing',
  '/about',
  '/trust',
  '/sample-report',
  '/client-success',
  '/blog',
  '/contact',
  '/self-check',
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
  await page.getByRole('link', { name: /View sample report/i }).first().click();
  await expect(page).toHaveURL(/\/sample-report$/);
});

test('protected routes send signed-out users to login', async ({ page }) => {
  for (const route of ['/dashboard', '/app/overview', '/integrations', '/superadmin']) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`/login(?:\\?|$)`));
  }
});

test('legacy public aliases resolve to canonical pages', async ({ page }) => {
  await page.goto('/demo');
  await expect(page).toHaveURL(/\/contact$/);

  await page.goto('/privacy');
  await expect(page).toHaveURL(/\/trust$/);
});
