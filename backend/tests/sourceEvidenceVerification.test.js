import mongoose from 'mongoose';
import { describe, expect, test } from '@jest/globals';
import { buildMicrosoftSourceEvidencePipeline } from '../services/sourceEventEvidence.js';
import { deriveSourceMeasurementStatus } from '../services/sourceMeasurementStatus.js';

const orgId = '507f191e810c19729de860ea';
const now = new Date('2026-11-11T14:30:00Z');
const source = { status: 'connected', lastSync: '2026-11-11T14:00:00Z',
  coverage: { total: 42, mapped: 41 } };

describe('Microsoft source verification uses stored event evidence', () => {
  test('casts JWT organization strings to Mongo ObjectId before aggregation', () => {
    const pipeline = buildMicrosoftSourceEvidencePipeline(orgId, now);
    expect(pipeline[0].$match.orgId).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(String(pipeline[0].$match.orgId)).toBe(orgId);
    expect(pipeline[0].$match.source.$in).toEqual([
      'microsoft-outlook', 'microsoft-teams',
    ]);
    expect(pipeline[0].$match.timestamp.$gte)
      .toEqual(new Date('2026-11-04T14:30:00Z'));
    expect(pipeline[1].$group.storedEvents7d).toEqual({ $sum: 1 });
  });

  test('rejects invalid organization IDs rather than fetching another tenant', () => {
    expect(() => buildMicrosoftSourceEvidencePipeline('invalid', now))
      .toThrow('Invalid organisation ID');
  });

  test('a zero-event incremental sync does not override positive persisted source evidence', () => {
    const diagnostic = {
      status: 'connected',
      lastSuccessfulSync: '2026-11-11T14:00:00Z',
      lastSyncStatus: 'success',
      latestEventReceived: '2026-11-10T10:00:00Z',
      fetched: 0,
      accepted: 1150,
      storedEvents7d: 1150,
      attributedEvents7d: 1100,
      totalUsers: 42,
      mappedUsers: 41,
      missingPermissions: [],
    };
    expect(deriveSourceMeasurementStatus(source, diagnostic, now))
      .toMatchObject({ state: 'measuring', verified: true });
  });

  test('failed source evidence lookup never implies absent activity', () => {
    expect(deriveSourceMeasurementStatus(source, {
      status: 'connected', evidenceQueryFailed: true,
    }, now)).toMatchObject({ state: 'verification_error', verified: false });
  });

  test('real but unattributed events cannot be called verified team measurement', () => {
    expect(deriveSourceMeasurementStatus(source, {
      status: 'connected',
      lastSuccessfulSync: '2026-11-11T14:00:00Z',
      latestEventReceived: '2026-11-10T10:00:00Z',
      storedEvents7d: 100,
      attributedEvents7d: 0,
      totalUsers: 42,
      mappedUsers: 41,
    }, now)).toMatchObject({ state: 'unattributed_events', verified: false });
  });
});
