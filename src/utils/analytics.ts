/**
 * Analytics Tracking Utility
 * 
 * Tracks user events for the SignalTrue website.
 * Events are sent to the backend for internal tracking.
 * 
 * Required Events:
 * - assessment_started: User opens the assessment form
 * - assessment_completed: User finishes the assessment calculation
 * - email_submitted: User submits email to see full breakdown
 * - cost_viewed: User views the detailed cost breakdown
 * - chat_used: User uses AI chat after completing assessment
 * - cta_clicked: User clicks a conversion CTA (demo/pilot)
 */

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://signaltrue-backend.onrender.com' 
  : '';

type EventName = 
  | 'assessment_started'
  | 'assessment_completed'
  | 'email_submitted'
  | 'cost_viewed'
  | 'chat_used'
  | 'cta_clicked'
  | 'page_view'
  | 'self_check_started'
  | 'self_check_completed';

interface TrackEventData {
  // Assessment events
  sessionId?: string;
  riskLevel?: 'low' | 'emerging' | 'high';
  riskScore?: number;
  teamSize?: number;
  costRange?: string;
  
  // CTA events
  type?: 'demo' | 'pilot' | 'pricing';
  location?: string;
  
  // Generic
  [key: string]: unknown;
}

/**
 * Track an analytics event
 */
export function trackEvent(eventName: EventName, data?: TrackEventData): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${eventName}`, data);
  }
  
  // Send to backend for internal tracking
  try {
    fetch(`${API_BASE}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        event: eventName, 
        data, 
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }),
    }).catch(() => {}); // Silent fail for tracking
  } catch {
    // Silent fail for tracking
  }
  
  // TODO: Connect to external analytics providers
  // Example integrations:
  // - Segment: window.analytics?.track(eventName, data);
  // - Mixpanel: window.mixpanel?.track(eventName, data);
  // - Google Analytics: window.gtag?.('event', eventName, data);
}

/**
 * Track page view
 */
export function trackPageView(pageName: string): void {
  trackEvent('page_view', { page: pageName, url: window.location.href });
}

/**
 * Create a tracking function bound to a specific context
 */
export function createTracker(context: string): (event: string, data?: Record<string, unknown>) => void {
  return (event: string, data?: Record<string, unknown>) => {
    trackEvent(event as EventName, { ...data, context });
  };
}

export default trackEvent;
