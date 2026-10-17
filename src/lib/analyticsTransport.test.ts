// @vitest-environment-options {"url":"https://www.signaltrue.ai/"}
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { initializeAnalytics, trackFunnelEvent, trackPageView } from './analytics';

beforeEach(() => {
  sessionStorage.clear();
  history.replaceState({}, '', '/');
  delete window.gtag;
  delete window.dataLayer;
  document.getElementById('signaltrue-ga4')?.remove();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
  document.getElementById('signaltrue-ga4')?.remove();
  delete window.gtag;
  delete window.dataLayer;
  sessionStorage.clear();
  vi.unstubAllGlobals();
});

test('queues Google-compatible config, page and completion commands without duplicate tags', () => {
  expect(initializeAnalytics()).toBe(true);
  expect(initializeAnalytics()).toBe(true);
  trackPageView('/did-the-control-work', 'Control review');
  trackFunnelEvent('did_control_work_completed', { answer_count: 5 });
  expect(document.querySelectorAll('#signaltrue-ga4')).toHaveLength(1);
  const commands = window.dataLayer!;
  expect(commands).toHaveLength(4);
  for (const command of commands) {
    expect(Object.prototype.toString.call(command)).toBe('[object Arguments]');
  }
  expect(Array.from(commands[1])).toEqual([
    'config',
    'G-32VLC15W5G',
    { send_page_view: false, allow_google_signals: false },
  ]);
  expect(Array.from(commands[2])).toEqual([
    'event',
    'page_view',
    expect.objectContaining({ page_path: '/did-the-control-work' }),
  ]);
  expect(Array.from(commands[3])).toEqual([
    'event',
    'did_control_work_completed',
    expect.objectContaining({ answer_count: 5 }),
  ]);
});

test('keeps QA traffic suppressed after navigating to a clean URL', () => {
  history.replaceState({}, '', '/?qa=true');
  expect(initializeAnalytics()).toBe(false);
  history.replaceState({}, '', '/did-the-control-work');
  trackFunnelEvent('did_control_work_completed');
  expect(window.dataLayer).toBeUndefined();
  expect(fetch).not.toHaveBeenCalled();
  expect(document.getElementById('signaltrue-ga4')).toBeNull();
});

test('respects an existing tag implementation', () => {
  const existing = vi.fn();
  window.gtag = existing;
  initializeAnalytics();
  expect(window.gtag).toBe(existing);
  expect(existing).toHaveBeenCalledWith('config', 'G-32VLC15W5G', expect.any(Object));
});
