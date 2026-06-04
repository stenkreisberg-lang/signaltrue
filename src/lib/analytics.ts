type AnalyticsParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (command: 'event' | 'config', eventName: string, params?: AnalyticsParams) => void;
  }
}

export const GA_MEASUREMENT_ID = 'G-32VLC15W5G';

const API_BASE =
  process.env.NODE_ENV === 'production'
    ? process.env.REACT_APP_API_URL || 'https://signaltrue-backend.onrender.com'
    : '';

const sendInternalEvent = (eventName: string, params?: AnalyticsParams) => {
  if (typeof window === 'undefined') return;

  try {
    fetch(`${API_BASE}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        data: {
          ...params,
          path: window.location.pathname,
          referrer: document.referrer || undefined,
        },
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {});
  } catch {
    /* Analytics should never interrupt the user flow. */
  }
};

export const trackEvent = (eventName: string, params?: AnalyticsParams) => {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('event', eventName, params);
  }

  sendInternalEvent(eventName, params);
};

export const trackPageView = (path: string, title = document.title) => {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: path,
      page_title: title,
    });
  }

  sendInternalEvent('page_view', {
    page_path: path,
    page_title: title,
  });
};
