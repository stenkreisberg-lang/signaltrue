// Lightweight Tingu integration shim.
// Assumptions:
// - A real 'Tingu' analytics object may be injected at runtime as `window.Tingu`.
// - If not present, this shim falls back to console logging so events are still visible
//   during development and tests.

import api from "./api";

export function trackEvent(eventName, payload = {}) {
  try {
    if (typeof window !== "undefined" && window.Tingu && typeof window.Tingu.track === "function") {
      // If an external Tingu SDK is present, delegate to it.
      window.Tingu.track(eventName, payload);
      return;
    }

    // Fallback: try to persist the event to the backend analytics API.
    // Fire-and-forget; don't block or throw if network fails.
    (async () => {
      try {
        await api.post("/api/analytics", { eventName, payload, projectId: payload.projectId });
      } catch (e) {
        // If network call fails, log locally for development visibility.
        console.log(`[Tingu] Event (local fallback): ${eventName}`, payload);
      }
    })();
  } catch (err) {
    // Never let analytics break the app UI
    console.error("Tingu tracking error:", err);
  }
}

export default { trackEvent };
