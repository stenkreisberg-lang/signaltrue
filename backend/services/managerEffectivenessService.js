/**
 * Manager-effectiveness scoring is intentionally unavailable.
 *
 * The previous implementation mixed placeholder calendar, chat, retention,
 * and engagement values into a plausible-looking score. Returning no score is
 * safer than presenting invented evidence in a workplace-risk product. This
 * service can be re-enabled only after every component is measured from an
 * approved source and independently validated.
 */

export const MANAGER_EFFECTIVENESS_UNAVAILABLE = Object.freeze({
  available: false,
  score: null,
  reason: 'Manager effectiveness scoring is unavailable pending validated measured inputs.',
});

export async function calculateManagerEffectiveness() {
  return null;
}

export async function getOrgManagerEffectiveness() {
  return [];
}

export async function getManagersNeedingCoaching() {
  return [];
}

export default {
  calculateManagerEffectiveness,
  getOrgManagerEffectiveness,
  getManagersNeedingCoaching,
};
