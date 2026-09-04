import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  captureOriginalAttribution,
  disableAnalyticsCollection,
  isCommercialPath,
  trackPageView,
} from '../lib/analytics';

export default function AnalyticsPageTracker() {
  const location = useLocation();
  const lastTrackedRoute = useRef('');

  useEffect(() => {
    if (!isCommercialPath(location.pathname)) {
      disableAnalyticsCollection();
      return;
    }

    const timeout = window.setTimeout(() => {
      const path = `${location.pathname}${location.search}`;
      if (lastTrackedRoute.current === path) return;
      lastTrackedRoute.current = path;
      captureOriginalAttribution();
      trackPageView(path, document.title);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [location.pathname, location.search]);

  return null;
}
