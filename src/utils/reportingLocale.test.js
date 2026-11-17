import { beforeEach, describe, expect, it } from 'vitest';
import { getReportingLocale, REPORTING_LOCALE_KEY } from './reportingLocale';

describe('reporting UI locale', () => {
  beforeEach(() => window.localStorage.removeItem(REPORTING_LOCALE_KEY));

  it('defaults to English even for an Estonian reporting time zone', () => {
    expect(getReportingLocale()).toBe('en');
  });

  it('uses Estonian only after explicit preference', () => {
    window.localStorage.setItem(REPORTING_LOCALE_KEY, 'et');
    expect(getReportingLocale()).toBe('et');
  });

  it('falls back to English for an unsupported value', () => {
    window.localStorage.setItem(REPORTING_LOCALE_KEY, 'xx');
    expect(getReportingLocale()).toBe('en');
  });
});
