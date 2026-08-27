import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  captureOriginalAttribution,
  isCommercialPath,
  trackCommercialPageView,
  trackPageView,
} from '../lib/analytics';

export default function AnalyticsPageTracker() {
  const location = useLocation();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const path = `${location.pathname}${location.search}`;
      captureOriginalAttribution();
      trackPageView(path, document.title);
      if (isCommercialPath(location.pathname)) {
        trackCommercialPageView(path, document.title);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [location.pathname, location.search]);

  return null;
}
