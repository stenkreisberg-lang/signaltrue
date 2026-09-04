import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('the standalone diagnostic uses the shared analytics endpoint without sending answers', () => {
  const script = readFileSync('public/drift/drift.js', 'utf8');
  const page = readFileSync('public/drift/run.html', 'utf8');

  expect(script).toContain("fetch(API_BASE + '/api/analytics/track'");
  expect(script).toContain("track('diagnostic_started'");
  expect(script).toContain("await track('diagnostic_lead_confirmed'");
  expect(script).not.toMatch(/track\([^\n]+answers/);
  expect(script).toContain('send_page_view: false');
  expect(page).not.toContain('googletagmanager.com');
  expect(page).toContain('href="/privacy"');
  expect(page).not.toContain('consent-error');
});
