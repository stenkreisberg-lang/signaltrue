import { beforeEach, describe, expect, test } from 'vitest';
import {
  captureOriginalAttribution,
  isCommercialPath,
  safeAnalyticsPath,
  sanitizeAnalyticsParams,
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

  test('removes personal and free-text fields from analytics payloads', () => {
    expect(
      sanitizeAnalyticsParams({
        page_path: '/contact',
        cta_location: 'hero',
        full_name: 'Jane Smith',
        work_email: 'jane@example.com',
        organization: 'Example Ltd',
        message: 'Private context',
        role: 'Manager',
      })
    ).toEqual({ page_path: '/contact', cta_location: 'hero' });
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
