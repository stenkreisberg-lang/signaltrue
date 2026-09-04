import { beforeEach, describe, expect, test } from 'vitest';
import {
  captureOriginalAttribution,
  isAutomatedAnalyticsTraffic,
  isCommercialPath,
  normalizeAcquisition,
  safeAnalyticsPath,
  sanitizeAnalyticsParams,
  shouldCollectAnalytics,
} from './analytics';

describe('commercial analytics boundaries', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(
      {},
      '',
      '/?utm_source=partner&utm_medium=email&utm_campaign=review'
    );
  });

  test('preserves the original session attribution across navigation', () => {
    const first = captureOriginalAttribution();
    window.history.pushState({}, '', '/contact?utm_source=overwriter&utm_campaign=other');
    const second = captureOriginalAttribution();

    expect(first.source).toBe('partner');
    expect(second).toEqual(first);
    expect(second.originalLandingPage).toContain('utm_campaign=review');
  });

  test('normalises acquisition values already stored by an older release', () => {
    window.sessionStorage.setItem(
      'signaltrue:commercial-attribution:v1',
      JSON.stringify({
        originalLandingPage: '/',
        referrer: '',
        source: 'direct',
        medium: '(not set)',
        campaign: '',
        content: '',
        term: '',
        anonymousSessionId: 'legacy-session',
      })
    );

    expect(captureOriginalAttribution()).toMatchObject({
      source: '(direct)',
      medium: '(none)',
    });
  });

  test.each([
    '/app',
    '/app/overview',
    '/login',
    '/dashboard',
    '/integrations/callback',
    '/superadmin',
  ])('excludes authenticated application route %s', (path) => {
    expect(isCommercialPath(path)).toBe(false);
  });

  test('keeps public routes in the commercial scope', () => {
    expect(isCommercialPath('/')).toBe(true);
    expect(isCommercialPath('/product')).toBe(true);
    expect(isCommercialPath('/psychosocial-risk-visibility-review')).toBe(true);
  });

  test('allows collection only on the exact public production host', () => {
    expect(shouldCollectAnalytics('www.signaltrue.ai', '/product', '', 'Chrome', false)).toBe(true);
    expect(shouldCollectAnalytics('signaltrue.ai', '/product', '', 'Chrome', false)).toBe(false);
    expect(shouldCollectAnalytics('preview.signaltrue.ai', '/product', '', 'Chrome', false)).toBe(
      false
    );
    expect(shouldCollectAnalytics('www.signaltrue.ai', '/login', '', 'Chrome', false)).toBe(false);
  });

  test('excludes automated QA, smoke and debug traffic', () => {
    expect(
      isAutomatedAnalyticsTraffic('?utm_source=production_smoke&utm_medium=qa', 'Chrome', false)
    ).toBe(true);
    expect(isAutomatedAnalyticsTraffic('?debug_mode=1', 'Chrome', false)).toBe(true);
    expect(isAutomatedAnalyticsTraffic('', 'HeadlessChrome', false)).toBe(true);
    expect(isAutomatedAnalyticsTraffic('', 'Chrome', true)).toBe(true);
  });

  test('normalises direct and acquisition aliases', () => {
    expect(normalizeAcquisition('direct', '(not set)')).toEqual({
      source: '(direct)',
      medium: '(none)',
    });
    expect(normalizeAcquisition('(not set)', '(not set)')).toEqual({
      source: '(direct)',
      medium: '(none)',
    });
    expect(normalizeAcquisition('WWW.Google.COM', 'Organic Search')).toEqual({
      source: 'google',
      medium: 'organic',
    });
  });

  test('removes personal and free-text fields from analytics payloads', () => {
    expect(
      sanitizeAnalyticsParams({
        page_path: '/contact',
        page_title: 'Contact SignalTrue',
        cta_location: 'hero',
        full_name: 'Jane Smith',
        work_email: 'jane@example.com',
        organization: 'Example Ltd',
        message: 'Private context',
        role: 'Manager',
      })
    ).toEqual({
      page_path: '/contact',
      page_title: 'Contact SignalTrue',
      cta_location: 'hero',
    });
  });

  test('strips unknown query parameters from analytics paths', () => {
    expect(
      safeAnalyticsPath('/contact?utm_source=partner&email=jane@example.com&token=secret')
    ).toBe('/contact?utm_source=partner');
  });

  test('redacts contact details from otherwise allowed analytics values', () => {
    expect(sanitizeAnalyticsParams({ source: 'jane@example.com' })).toEqual({
      source: '[redacted]',
    });
  });
});
