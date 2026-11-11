/**
 * A large change is not meaningful when the prior source, contributor cohort,
 * or observation volume is different. Keep the absolute counts visible, but
 * withhold directional percentages until the periods are genuinely comparable.
 */
const asSourceSet = (items = []) => [...new Set(items.filter(Boolean).map(String))].sort();
const finite = (value) => typeof value === 'number' && Number.isFinite(value);

export function evaluateCountComparability({
  current,
  previous,
  currentSources = [],
  previousSources = [],
  currentContributors = null,
  previousContributors = null,
  minimumPrevious = 30,
  minimumContributorOverlap = 0.7,
  maximumRatio = 5,
} = {}) {
  if (!finite(current) || !finite(previous) || current < 0 || previous < 0) {
    return { comparable: false, reason: 'Previous or current period has no verified count.' };
  }
  const currentSet = asSourceSet(currentSources);
  const previousSet = asSourceSet(previousSources);
  if (!currentSet.length || !previousSet.length ||
      currentSet.join('|') !== previousSet.join('|')) {
    return { comparable: false, reason: 'Source coverage changed between periods.' };
  }
  if (previous < minimumPrevious) {
    return { comparable: false,
      reason: `Only ${previous} prior events were observed. The baseline is too small for a meaningful percentage.` };
  }
  if (finite(currentContributors) && finite(previousContributors) &&
    (previousContributors === 0 ||
      Math.min(currentContributors, previousContributors) /
      Math.max(currentContributors, previousContributors) < minimumContributorOverlap)) {
    return { comparable: false, reason: 'The represented employee population changed substantially.' };
  }
  if (previous > 0 && Math.max(current / previous, previous / Math.max(current, 0.001)) > maximumRatio) {
    return { comparable: false,
      reason: 'Extreme change requires source, backfill and denominator reconciliation.' };
  }
  return { comparable: true, reason: null };
}
