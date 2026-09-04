type AnalyticsValue = string | number | boolean | undefined;
export type AnalyticsParams = Record<string, AnalyticsValue>;

export interface AnalyticsTestEvent {
  eventName: string;
  params: AnalyticsParams;
}

declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    __signaltrueAnalyticsTestEvents?: AnalyticsTestEvent[];
  }
}

export const GA_MEASUREMENT_ID = 'G-32VLC15W5G';
export const COMMERCIAL_HOSTNAME = 'www.signaltrue.ai';
export const FUNNEL_EVENT_NAMES = [
  'commercial_page_view',
  'sample_report_click',
  'sample_report_view',
  'sample_report_print',
  'trust_overview_download',
  'primary_cta_click',
  'pricing_plan_click',
  'lead_form_start',
  'lead_form_error',
  'lead_submit_success',
  // Kept in the reporting allow-list so historical pre-P0 data remains queryable.
  'lead_form_submit',
  'lead_confirmed',
  'booking_link_click',
  'self_check_viewed',
  'self_check_started',
  'self_check_completed',
  'self_check_lead_confirmed',
  'diagnostic_started',
  'diagnostic_step_view',
  'diagnostic_completed',
  'diagnostic_unlock_view',
  'diagnostic_unlock_submit',
  'diagnostic_lead_confirmed',
  'drift_report_view',
  'drift_report_cta_click',
  'checkout_started',
  'subscription_started',
] as const;

export type FunnelEventName = (typeof FUNNEL_EVENT_NAMES)[number];

export interface OriginalAttribution {
  originalLandingPage: string;
  referrer: string;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
  anonymousSessionId: string;
}

const ATTRIBUTION_KEY = 'signaltrue:commercial-attribution:v1';
const ANALYTICS_SUPPRESSED_KEY = 'signaltrue:analytics-suppressed:v1';
const ANALYTICS_SCRIPT_ID = 'signaltrue-ga4';
const AUTOMATION_MARKER_PATTERN =
  /^(?:production[_ -]?smoke|qa|quality[_ -]?assurance|automated[_ -]?qa|e2e|playwright|puppeteer|test)$/i;
const SENSITIVE_KEY_PATTERN =
  /(^|_)(name|email|mail|message|challenge|company|organisation|organization|phone|title|role|problem|free_text)(_|$)/i;
const EMAIL_VALUE_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/i;
const PHONE_VALUE_PATTERN = /^\s*\+?\d[\d\s().-]{7,}\d\s*$/;
const AUTHENTICATED_PATH_PREFIXES = [
  '/app',
  '/dashboard',
  '/login',
  '/forgot-password',
  '/register',
  '/onboarding',
  '/admin',
  '/superadmin',
  '/settings',
  '/notifications',
  '/integrations',
  '/team-analytics',
  '/ceo-summary',
  '/drift-report',
];

const API_BASE =
  process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_API_URL || 'https://signaltrue-backend.onrender.com'
    : '';

function safeSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `st-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function inferSource(referrer: string) {
  if (!referrer) return { source: '(direct)', medium: '(none)' };
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (/google\.|bing\.|duckduckgo\.|yahoo\./i.test(host)) {
      return { source: host, medium: 'organic' };
    }
    return { source: host || 'referral', medium: 'referral' };
  } catch {
    return { source: 'referral', medium: 'referral' };
  }
}

function normalizeAcquisitionToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/[\s_-]+/g, ' ');
}

export function normalizeAcquisition(source = '', medium = '') {
  let normalizedSource = normalizeAcquisitionToken(source);
  let normalizedMedium = normalizeAcquisitionToken(medium);

  if (['', '(not set)', 'not set', 'direct', '(direct)'].includes(normalizedSource)) {
    normalizedSource = '(direct)';
  }
  if (['', '(not set)', 'not set', 'none', '(none)', 'direct'].includes(normalizedMedium)) {
    normalizedMedium = '(none)';
  }

  if (/^(?:google\.[a-z.]+|google)$/.test(normalizedSource)) normalizedSource = 'google';
  if (/^(?:bing\.[a-z.]+|bing)$/.test(normalizedSource)) normalizedSource = 'bing';
  if (/^(?:duckduckgo\.[a-z.]+|duckduckgo)$/.test(normalizedSource)) {
    normalizedSource = 'duckduckgo';
  }
  if (['organic search', 'organic-search', 'seo'].includes(normalizedMedium)) {
    normalizedMedium = 'organic';
  }
  if (['paid search', 'paid-search', 'ppc'].includes(normalizedMedium)) normalizedMedium = 'cpc';
  if (['e mail', 'e-mail'].includes(normalizedMedium)) normalizedMedium = 'email';
  if (
    ['social media', 'social network', 'social-media', 'social-network'].includes(normalizedMedium)
  ) {
    normalizedMedium = 'social';
  }

  if (normalizedSource === '(direct)' || normalizedMedium === '(none)') {
    return { source: '(direct)', medium: '(none)' };
  }

  return { source: normalizedSource, medium: normalizedMedium };
}

export function isAutomatedAnalyticsTraffic(
  search: string,
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  webdriver = typeof navigator === 'undefined' ? false : navigator.webdriver
) {
  if (
    webdriver ||
    /(?:bot|crawler|spider|headlesschrome|lighthouse|playwright|puppeteer)/i.test(userAgent)
  ) {
    return true;
  }

  const params = new URLSearchParams(search);
  if (['1', 'true', 'yes'].includes((params.get('debug_mode') || '').toLowerCase())) return true;
  if (['1', 'true', 'yes'].includes((params.get('qa') || '').toLowerCase())) return true;

  return ['utm_source', 'utm_medium', 'utm_campaign'].some((key) =>
    AUTOMATION_MARKER_PATTERN.test(params.get(key) || '')
  );
}

function safeReferrer(referrer: string) {
  if (!referrer) return '';
  try {
    const url = new URL(referrer);
    return `${url.origin}${url.pathname}`;
  } catch {
    return '';
  }
}

export function safeAnalyticsPath(path: string) {
  try {
    const url = new URL(path, 'https://www.signaltrue.ai');
    const safeSearch = new URLSearchParams();
    for (const key of [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'cta',
      'intent',
    ]) {
      const value = url.searchParams.get(key);
      if (value) safeSearch.set(key, value);
    }
    const query = safeSearch.toString();
    return `${url.pathname}${query ? `?${query}` : ''}`;
  } catch {
    return '/';
  }
}

export function captureOriginalAttribution(): OriginalAttribution {
  const storage = safeSessionStorage();
  const stored = storage?.getItem(ATTRIBUTION_KEY);
  if (stored) {
    try {
      const attribution = JSON.parse(stored) as OriginalAttribution;
      const normalized = normalizeAcquisition(attribution.source, attribution.medium);
      const normalizedAttribution = {
        ...attribution,
        source: normalized.source,
        medium: normalized.medium,
      };
      storage?.setItem(ATTRIBUTION_KEY, JSON.stringify(normalizedAttribution));
      return normalizedAttribution;
    } catch {
      storage?.removeItem(ATTRIBUTION_KEY);
    }
  }

  const url = new URL(window.location.href);
  const inferred = inferSource(document.referrer || '');
  const normalized = normalizeAcquisition(
    url.searchParams.get('utm_source') || inferred.source,
    url.searchParams.get('utm_medium') || inferred.medium
  );
  const attribution: OriginalAttribution = {
    originalLandingPage: safeAnalyticsPath(`${url.pathname}${url.search}`),
    referrer: safeReferrer(document.referrer || ''),
    source: normalized.source,
    medium: normalized.medium,
    campaign: url.searchParams.get('utm_campaign') || '',
    content: url.searchParams.get('utm_content') || '',
    term: url.searchParams.get('utm_term') || '',
    anonymousSessionId: createSessionId(),
  };

  storage?.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  return attribution;
}

export function getOriginalAttribution(): OriginalAttribution {
  if (typeof window === 'undefined') {
    return {
      originalLandingPage: '',
      referrer: '',
      source: '',
      medium: '',
      campaign: '',
      content: '',
      term: '',
      anonymousSessionId: '',
    };
  }
  return captureOriginalAttribution();
}

export function isCommercialPath(path: string) {
  const normalized = path === '/' ? '/' : path.replace(/\/+$/, '');
  return !AUTHENTICATED_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

export function isCommercialProductionHost(hostname: string) {
  return hostname.toLowerCase() === COMMERCIAL_HOSTNAME;
}

export function shouldTrackCommercialHost(hostname: string) {
  return isCommercialProductionHost(hostname);
}

export function shouldCollectAnalytics(
  hostname: string,
  pathname: string,
  search = '',
  userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  webdriver = typeof navigator === 'undefined' ? false : navigator.webdriver
) {
  return (
    shouldTrackCommercialHost(hostname) &&
    isCommercialPath(pathname) &&
    !isAutomatedAnalyticsTraffic(search, userAgent, webdriver)
  );
}

export function sanitizeAnalyticsParams(params: AnalyticsParams = {}) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(
        ([key, value]) =>
          (key === 'page_title' || !SENSITIVE_KEY_PATTERN.test(key)) && value !== undefined
      )
      .map(([key, value]) => [
        key,
        typeof value === 'string' &&
        (EMAIL_VALUE_PATTERN.test(value) || PHONE_VALUE_PATTERN.test(value))
          ? '[redacted]'
          : typeof value === 'string'
            ? value.slice(0, 300)
            : value,
      ])
  ) as AnalyticsParams;
}

function contextParams(): AnalyticsParams {
  return {
    page_path: safeAnalyticsPath(`${window.location.pathname}${window.location.search}`),
  };
}

function setGaDisabled(disabled: boolean) {
  (window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = disabled;
}

function suppressAnalyticsSession() {
  try {
    safeSessionStorage()?.setItem(ANALYTICS_SUPPRESSED_KEY, 'true');
  } catch {
    /* Collection remains disabled for the current URL even if storage is unavailable. */
  }
}

function isAnalyticsSessionSuppressed() {
  try {
    return safeSessionStorage()?.getItem(ANALYTICS_SUPPRESSED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function initializeAnalytics() {
  if (typeof window === 'undefined') return false;

  if (isAutomatedAnalyticsTraffic(window.location.search)) {
    suppressAnalyticsSession();
  }
  if (
    isAnalyticsSessionSuppressed() ||
    !shouldCollectAnalytics(
      window.location.hostname,
      window.location.pathname,
      window.location.search
    )
  ) {
    setGaDisabled(true);
    return false;
  }

  setGaDisabled(false);
  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    ((...args: unknown[]) => {
      window.dataLayer?.push(args);
    });

  if (!document.getElementById(ANALYTICS_SCRIPT_ID)) {
    const script = document.createElement('script');
    script.id = ANALYTICS_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
    });
  }

  return true;
}

export function disableAnalyticsCollection() {
  if (typeof window !== 'undefined') setGaDisabled(true);
}

function recordTestEvent(eventName: string, params: AnalyticsParams) {
  if (process.env.NODE_ENV !== 'production' && window.__signaltrueAnalyticsTestEvents) {
    window.__signaltrueAnalyticsTestEvents.push({ eventName, params });
  }
}

const sendInternalEvent = (eventName: string, params: AnalyticsParams) => {
  if (typeof window === 'undefined') return;

  try {
    fetch(`${API_BASE}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        data: params,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  } catch {
    /* Measurement must never interrupt the visitor flow. */
  }
};

export const trackEvent = (eventName: string, params: AnalyticsParams = {}) => {
  if (typeof window === 'undefined') return;
  const safeParams = sanitizeAnalyticsParams(params);
  recordTestEvent(eventName, safeParams);
  if (!initializeAnalytics()) return;
  window.gtag?.('event', eventName, safeParams);
  sendInternalEvent(eventName, safeParams);
};

export const trackFunnelEvent = (eventName: FunnelEventName, params: AnalyticsParams = {}) => {
  if (typeof window === 'undefined') return;
  const safeParams = sanitizeAnalyticsParams({ ...contextParams(), ...params });
  recordTestEvent(eventName, safeParams);
  if (!initializeAnalytics()) return;
  window.gtag?.('event', eventName, safeParams);
  sendInternalEvent(eventName, safeParams);
};

export const trackPageView = (path: string, title = document.title) => {
  if (typeof window === 'undefined') return;

  const safePath = safeAnalyticsPath(path);
  const params = sanitizeAnalyticsParams({
    page_path: safePath,
    page_title: title,
    page_location: `${window.location.origin}${safePath}`,
  });

  recordTestEvent('page_view', params);
  if (!initializeAnalytics()) return;
  window.gtag?.('event', 'page_view', params);

  sendInternalEvent('page_view', params);
};
