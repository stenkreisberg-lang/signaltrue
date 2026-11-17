import { describe, expect, test } from '@jest/globals';
import { assessNetworkPeriodComparability } from '../services/workNetworkService.js';

function period({
  sources = ['microsoft-outlook', 'microsoft-teams'],
  events = 100,
  mapped = 95,
  people = 12,
} = {}) {
  return {
    sources: new Set(sources),
    interactionEventCount: events,
    mappedEventCount: mapped,
    observedActors: new Set(Array.from({ length: people }, (_, i) => `user-${i}`)),
  };
}

describe('source-comparable cross-team trend reporting', () => {
  test('allows the same well-mapped sources and represented population', () => {
    expect(assessNetworkPeriodComparability(period(), period()))
      .toEqual({ comparable: true, reason: null });
  });
  test('does not report percentages after a Teams connector appears', () => {
    expect(assessNetworkPeriodComparability(period(), period({ sources: ['microsoft-outlook'] })))
      .toMatchObject({ comparable: false, reason: 'period_sources_changed' });
  });
  test('suppresses previously unmapped work patterns', () => {
    expect(assessNetworkPeriodComparability(period(), period({ mapped: 50 })))
      .toMatchObject({ comparable: false, reason: 'period_mapping_coverage_changed' });
  });
  test('suppresses comparisons where the observed population changes sharply', () => {
    expect(assessNetworkPeriodComparability(period(), period({ people: 4 })))
      .toMatchObject({ comparable: false, reason: 'represented_people_changed' });
  });
  test('insufficient events are not interpreted as a fall in workload', () => {
    expect(assessNetworkPeriodComparability(period({ events: 5 }), period()))
      .toMatchObject({ comparable: false, reason: 'insufficient_period_events' });
  });
});
