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

test('standalone Google commands retain the native Arguments format', async () => {
  const { runInNewContext } = await import('node:vm');
  const script = readFileSync('public/drift/drift.js', 'utf8');
  const prefix = script.slice(0, script.indexOf('  function safePath'));
  const browser = { dataLayer: [], gtag: undefined };
  const context = {
    window: browser,
    location: { hostname: 'www.signaltrue.ai', search: '' },
    navigator: { webdriver: false, userAgent: 'Mozilla/5.0 Chrome' },
    URLSearchParams,
    document: {
      querySelector: () => ({ textContent: '' }),
      getElementById: () => null,
      createElement: () => ({}),
      head: { appendChild: () => {} },
    },
  };
  runInNewContext(`${prefix}\n initializeAnalytics(); })();`, context);
  expect(browser.dataLayer).toHaveLength(2);
  expect(Object.prototype.toString.call(browser.dataLayer[1])).toBe('[object Arguments]');
  expect(Array.from(browser.dataLayer[1])).toEqual([
    'config',
    'G-32VLC15W5G',
    { send_page_view: false, allow_google_signals: false },
  ]);
});
