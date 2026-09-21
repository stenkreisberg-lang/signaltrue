import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  captureOriginalAttribution,
  disableAnalyticsCollection,
  isCommercialPath,
  trackCommercialEngagedVisit,
  trackPageView,
} from '../lib/analytics';

export default function AnalyticsPageTracker() {
  const location = useLocation();
  const lastTrackedRoute = useRef('');
  const seenCommercialRoutes = useRef(new Set<string>());

  useEffect(() => {
    if (!isCommercialPath(location.pathname)) {
      disableAnalyticsCollection();
      return;
    }

    let interacted = false;
    const markInteraction = () => {
      interacted = true;
    };
    const interactionOptions: AddEventListenerOptions = { passive: true };
    window.addEventListener('pointerdown', markInteraction, interactionOptions);
    window.addEventListener('touchstart', markInteraction, interactionOptions);
    window.addEventListener('scroll', markInteraction, interactionOptions);
    window.addEventListener('keydown', markInteraction);

    const timeout = window.setTimeout(() => {
      const path = `${location.pathname}${location.search}`;
      if (lastTrackedRoute.current === path) return;
      lastTrackedRoute.current = path;
      captureOriginalAttribution();
      trackPageView(path, document.title);

      seenCommercialRoutes.current.add(location.pathname);
      if (seenCommercialRoutes.current.size >= 2) {
        trackCommercialEngagedVisit('multi_page');
      }
    }, 0);

    const engagementTimeout = window.setTimeout(() => {
      if (document.visibilityState === 'visible' && interacted) {
        trackCommercialEngagedVisit('active_time');
      }
    }, 20000);

    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(engagementTimeout);
      window.removeEventListener('pointerdown', markInteraction);
      window.removeEventListener('touchstart', markInteraction);
      window.removeEventListener('scroll', markInteraction);
      window.removeEventListener('keydown', markInteraction);
    };
  }, [location.pathname, location.search]);

  return null;
}
