/**
 * UI language is an explicit preference, never inferred from reporting time zone.
 * All organisations start in English. Estonian is opt-in for the translated
 * overview/report routes; other pages retain English until translation complete.
 */
export const REPORTING_LOCALE_KEY = 'signaltrue.uiLocale';

export function getReportingLocale() {
  if (typeof window === 'undefined') return 'en';
  try {
    return window.localStorage.getItem(REPORTING_LOCALE_KEY) === 'et' ? 'et' : 'en';
  } catch {
    return 'en';
  }
}
