/**
 * Manager-overload pipeline — pure-function unit tests.
 * Covers the deterministic math that the SOI + ONA engine depend on.
 */

import { describe, expect, test } from '@jest/globals';
import { weightedComposite, riskState, trendFrom, buildMetricBaseline } from '../utils/robustMath.js';
import { __pure } from '../services/communicationGraphService.js';

describe('robustMath', () => {
  test('weightedComposite renormalizes over present components', () => {
    // (80*.35 + 40*.2) / (.35+.2) = 65.45 -> 65
    expect(
      weightedComposite([
        { value: 80, weight: 0.35 },
        { value: null, weight: 0.25 },
        { value: 40, weight: 0.2 },
        { value: null, weight: 0.2 },
      ])
    ).toBe(65);
  });

  test('weightedComposite returns null when all components null', () => {
    expect(weightedComposite([{ value: null, weight: 1 }])).toBeNull();
  });

  test('riskState thresholds', () => {
    expect(riskState(82)).toBe('critical');
    expect(riskState(65)).toBe('strain');
    expect(riskState(45)).toBe('watch');
    expect(riskState(10)).toBe('healthy');
  });

  test('trendFrom direction', () => {
    expect(trendFrom(70, 60)).toBe('accelerating');
    expect(trendFrom(66, 60)).toBe('worsening');
    expect(trendFrom(61, 60)).toBe('stable');
    expect(trendFrom(50, 60)).toBe('improving');
  });

  test('buildMetricBaseline is outlier-resistant (MAD)', () => {
    const b = buildMetricBaseline([10, 12, 11, 13, 12, 40]);
    expect(b.median).toBe(12); // outlier 40 does not move the median
    expect(b.scaledMad).toBeGreaterThan(0);
    expect(b.scaledMad).toBeLessThan(5);
  });
});

describe('ONA graph', () => {
  test('Brandes betweenness on a path A-B-C puts all flow through B', () => {
    const nodes = ['A', 'B', 'C'];
    const undirected = new Map([
      ['A|B', 1],
      ['B|C', 1],
    ]);
    const adj = __pure.buildAdjacency(nodes, undirected);
    const cb = __pure.brandesBetweenness(nodes, adj);
    expect(Math.round(cb.B)).toBe(1);
    expect(Math.round(cb.A)).toBe(0);
    expect(Math.round(cb.C)).toBe(0);
  });

  test('articulation point identifies the cut vertex B', () => {
    const nodes = ['A', 'B', 'C'];
    const undirected = new Map([
      ['A|B', 1],
      ['B|C', 1],
    ]);
    const adj = __pure.buildAdjacency(nodes, undirected);
    const ap = __pure.articulationPoints(nodes, adj);
    expect(ap.has('B')).toBe(true);
    expect(ap.has('A')).toBe(false);
  });

  test('reciprocity computed from directed edges', () => {
    const nodes = ['A', 'B'];
    const directed = new Map([
      ['A->B', 3],
      ['B->A', 1],
    ]);
    const { reciprocity } = __pure.computeDirected(nodes, directed);
    expect(reciprocity.A).toBe(1);
    expect(reciprocity.B).toBe(1);
  });
});
