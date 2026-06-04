import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/analytics';

export default function AnalyticsPageTracker() {
  const location = useLocation();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      trackPageView(`${location.pathname}${location.search}`, document.title);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [location.pathname, location.search]);

  return null;
}
