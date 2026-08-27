type AnalyticsValue = string | number | boolean | undefined;
export type AnalyticsParams = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config',
      eventName: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

export const GA_MEASUREMENT_ID = 'G-32VLC15W5G';
export const COMMERCIAL_HOSTNAME = 'www.signaltrue.ai';
export const FUNNEL_EVENT_NAMES = [
  'commercial_page_view',
  'sample_report_view',
  'primary_cta_click',
  'lead_form_start',
  'lead_form_error',
  'lead_form_submit',
  'lead_confirmed',
  'booking_link_click',
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
const SENSITIVE_KEY_PATTERN =
  /(^|_)(name|email|mail|message|challenge|company|organisation|organization|phone|title|role|problem|free_text)(_|$)/i;
const SENSITIVE_VALUE_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+|\+?\d[\d\s().-]{7,}\d/i;
const AUTHENTICATED_PATH_PREFIXES = [
  '/app',
  '/dashboard',
  '/login',
  '/register',
  '/onboarding',
  '/admin',
  '/superadmin',
  '/settings',
  '/notifications',
  '/integrations',
  '/team-analytics',
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
  if (!referrer) return { source: 'direct', medium: '(none)' };
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
      return JSON.parse(stored) as OriginalAttribution;
    } catch {
      storage?.removeItem(ATTRIBUTION_KEY);
    }
  }

  const url = new URL(window.location.href);
  const inferred = inferSource(document.referrer || '');
  const attribution: OriginalAttribution = {
    originalLandingPage: safeAnalyticsPath(`${url.pathname}${url.search}`),
    referrer: safeReferrer(document.referrer || ''),
    source: url.searchParams.get('utm_source') || inferred.source,
    medium: url.searchParams.get('utm_medium') || inferred.medium,
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
  return process.env.NODE_ENV !== 'production' || isCommercialProductionHost(hostname);
}

export function sanitizeAnalyticsParams(params: AnalyticsParams = {}) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([key, value]) => !SENSITIVE_KEY_PATTERN.test(key) && value !== undefined)
      .map(([key, value]) => [
        key,
        typeof value === 'string' && SENSITIVE_VALUE_PATTERN.test(value)
          ? '[redacted]'
          : typeof value === 'string'
            ? value.slice(0, 300)
            : value,
      ])
  ) as AnalyticsParams;
}

function contextParams(): AnalyticsParams {
  const attribution = getOriginalAttribution();
  return {
    page_path: safeAnalyticsPath(`${window.location.pathname}${window.location.search}`),
    original_landing_page: attribution.originalLandingPage,
    referrer: attribution.referrer || undefined,
    source: attribution.source || undefined,
    medium: attribution.medium || undefined,
    campaign: attribution.campaign || undefined,
    content: attribution.content || undefined,
    term: attribution.term || undefined,
    anonymous_session_id: attribution.anonymousSessionId,
    event_timestamp: new Date().toISOString(),
  };
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
  window.gtag?.('event', eventName, safeParams);
  sendInternalEvent(eventName, safeParams);
};

export const trackFunnelEvent = (eventName: FunnelEventName, params: AnalyticsParams = {}) => {
  if (
    typeof window === 'undefined' ||
    !isCommercialPath(window.location.pathname) ||
    !shouldTrackCommercialHost(window.location.hostname)
  )
    return;
  const safeParams = sanitizeAnalyticsParams({ ...contextParams(), ...params });
  window.gtag?.('event', eventName, safeParams);
  sendInternalEvent(eventName, safeParams);
};

export const trackPageView = (path: string, title = document.title) => {
  if (typeof window === 'undefined') return;

  const safePath = safeAnalyticsPath(path);

  window.gtag?.('event', 'page_view', {
    page_path: safePath,
    page_title: title,
    page_location: `${window.location.origin}${safePath}`,
    page_referrer: safeReferrer(document.referrer || ''),
  });

  sendInternalEvent('page_view', {
    page_path: safePath,
    page_title: title,
  });
};

export const trackCommercialPageView = (path: string, title = document.title) => {
  if (typeof window === 'undefined' || !isCommercialPath(window.location.pathname)) return;
  trackFunnelEvent('commercial_page_view', {
    page_path: safeAnalyticsPath(path),
    page_title: title,
  });
};
