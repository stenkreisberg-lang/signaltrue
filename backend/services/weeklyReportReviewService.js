import { TEAM_TREND_DIMENSIONS } from './reportTrendService.js';

const defs = new Map(TEAM_TREND_DIMENSIONS.map(item => [item.key, item]));
const calendarMetrics = new Set([
  'meetingsPerRepresentedPerson', 'meetingHoursPerRepresentedPerson',
  'focusHoursPerRepresentedPerson', 'recurringLoadPct', 'calendarFragmentation',
]);

export function pickTeamMeasurement(team, metricKey) {
  const definition = defs.get(metricKey);
  if (!definition || !team) return null;
  const point = (team.points || []).at(-1);
  const value = point?.[metricKey];
  const contributors = calendarMetrics.has(metricKey) ? point?.calendarActors : point?.messagingActors;
  if (!point?.measured || !point?.complete || !Number.isFinite(value) ||
      !Number.isFinite(contributors) || contributors < 2) return null;
  const date = point.sampledOn || point.sourceDate;
  if (!date || !Number.isFinite(new Date(date).getTime())) return null;
  return {
    metricKey, value, unit: definition.unit, description: definition.label,
    contributors, source: calendarMetrics.has(metricKey) ? 'calendar' : 'messaging',
    date: new Date(date),
  };
}

export function evaluateFollowUpMeasurement(review, team) {
  const observed = pickTeamMeasurement(team, review.metricKey);
  if (!observed) {
    return { comparability: 'missing_data', reason: 'Uut kontrollitud mõõtmist ei ole.', currentValue: null, currentContributors: null, measuredPeriod: null };
  }
  if (observed.date <= new Date(review.baselinePeriod)) {
    return { comparability: 'missing_data', reason: 'Pärast tegevuse algmõõtmist ei ole uut mõõtmisperioodi.', currentValue: null, currentContributors: observed.contributors, measuredPeriod: observed.date };
  }
  // Cohort size is an observable guardrail, but equal size alone does not
  // prove identical employees. Hence measured, not a claim of causal impact.
  if (observed.contributors !== review.baselineContributors) {
    return { comparability: 'not_comparable', reason: 'Allikas katab varasemast erinevat arvu töötajaid. Võrdlust tuleb kontrollida.', currentValue: observed.value, currentContributors: observed.contributors, measuredPeriod: observed.date };
  }
  return {
    comparability: 'measured',
    reason: 'Sama mõõdik ja sama arv allikaga seotud töötajaid. Töötajate identiteet ja muutuse põhjus vajavad eraldi kontrolli.',
    currentValue: observed.value,
    currentContributors: observed.contributors,
    measuredPeriod: observed.date,
  };
}
