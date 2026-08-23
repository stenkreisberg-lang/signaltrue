/**
 * Legacy individual behavioral notifications are intentionally disabled.
 *
 * The underlying attrition, manager-effectiveness, crisis, succession, equity,
 * and network scores are not validated production measurements. Returning a
 * fabricated notification object made downstream callers believe an alert was
 * delivered when it was only logged. These functions keep the old interface
 * stable while making the unavailable state explicit and side-effect free.
 */

export const INTELLIGENCE_NOTIFICATIONS_UNAVAILABLE = Object.freeze({
  available: false,
  delivered: false,
  reason: 'Legacy individual behavioral intelligence is disabled.',
});

function unavailable() {
  return INTELLIGENCE_NOTIFICATIONS_UNAVAILABLE;
}

export async function notifyAttritionRisk() {
  return unavailable();
}

export async function notifyManagerCoaching() {
  return unavailable();
}

export async function notifyCrisisEvent() {
  return unavailable();
}

export async function notifySuccessionRisk() {
  return unavailable();
}

export async function notifyEquityIssue() {
  return unavailable();
}

export async function notifyNetworkHealth() {
  return unavailable();
}

export default {
  notifyAttritionRisk,
  notifyManagerCoaching,
  notifyCrisisEvent,
  notifySuccessionRisk,
  notifyEquityIssue,
  notifyNetworkHealth,
};
