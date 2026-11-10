import { describe, expect, test } from '@jest/globals';
import { deriveSourceMeasurementStatus } from '../services/sourceMeasurementStatus.js';

const now = new Date('2026-11-10T16:00:00Z');
const source = { status: 'connected', lastSync: '2026-11-10T15:00:00Z',
  coverage: { total: 15, mapped: 14 } };
const diagnostic = { status: 'connected', lastSyncStatus: 'success',
  lastSuccessfulSync: '2026-11-10T15:00:00Z',
  latestEventReceived: '2026-11-10T14:00:00Z',
  fetched: 40, accepted: 30, totalUsers: 15, mappedUsers: 14,
  missingPermissions: [] };

describe('source evidence status never confuses absence with zero activity', () => {
  test('only confirmed source events count as verified', () => {
    expect(deriveSourceMeasurementStatus(source, diagnostic, now)).toMatchObject({
      state: 'measuring', verified: true,
    });
  });
  test('connected integrations without event provenance remain unverified', () => {
    expect(deriveSourceMeasurementStatus(source, null, now)).toMatchObject({
      state: 'coverage_unverified', verified: false,
    });
  });
  test('missing Microsoft admin permissions suppress measurement claims', () => {
    expect(deriveSourceMeasurementStatus(source, {
      ...diagnostic, missingPermissions: ['Chat.Read.All'],
    }, now)).toMatchObject({ state: 'needs_admin', verified: false });
  });
  test('missing events do not become an observed zero', () => {
    expect(deriveSourceMeasurementStatus(source, {
      ...diagnostic, accepted: 0, latestEventReceived: null,
    }, now)).toMatchObject({ state: 'no_observed_events', verified: false });
  });
  test('stale and failed sources cannot be reported as measuring', () => {
    expect(deriveSourceMeasurementStatus(source, {
      ...diagnostic, lastSuccessfulSync: '2026-10-20T16:00:00Z',
    }, now)).toMatchObject({ state: 'stale', verified: false });
    expect(deriveSourceMeasurementStatus(source, {
      ...diagnostic, lastSyncStatus: 'failed',
    }, now)).toMatchObject({ state: 'sync_error', verified: false });
  });
  test('unmapped employees do not produce verified coverage', () => {
    expect(deriveSourceMeasurementStatus(source, {
      ...diagnostic, mappedUsers: 0,
    }, now)).toMatchObject({ state: 'unmapped', verified: false });
  });
});
