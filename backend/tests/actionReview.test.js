import { describe, expect, jest, test } from '@jest/globals';
import Intervention from '../models/intervention.js';
import {
  getGovernanceSnapshot,
  getSignalMeasurementTarget,
} from '../config/measurementGovernance.js';
import { resolveOrganizationTier } from '../middleware/checkTier.js';
import { canAccessOrg, referenceId } from '../middleware/auth.js';
import { summarizeOutcomeEvidence } from '../services/outcomeAnalysisService.js';

const objectIds = {
  org: '507f1f77bcf86cd799439001',
  team: '507f1f77bcf86cd799439002',
  user: '507f1f77bcf86cd799439003',
};

describe('measurement governance', () => {
  test('maps connector-neutral signals to reproducible metrics', () => {
    expect(getSignalMeasurementTarget('meeting_load_drift')).toEqual({
      metricKey: 'meetingLoadIndex',
      metricLabel: 'Meeting load index',
      direction: 'decrease',
    });
    expect(getSignalMeasurementTarget('focus_integrity')).toMatchObject({
      metricKey: 'focusTimeRatio',
      direction: 'increase',
    });
    expect(getSignalMeasurementTarget('engagement_asymmetry')).toBeNull();
    expect(getGovernanceSnapshot()).toMatchObject({
      measurementVersion: expect.stringContaining('@'),
      privacyPolicyVersion: expect.stringContaining('@'),
      reviewProtocolVersion: expect.stringContaining('@'),
    });
  });

  test('recognizes pilots and current plan names as action-enabled tiers', () => {
    expect(resolveOrganizationTier({ pilot: { isActive: true } })).toBe('impact_proof');
    expect(
      resolveOrganizationTier({
        subscription: { plan: 'free' },
        subscriptionPlanId: 'team',
      })
    ).toBe('detection');
    expect(
      resolveOrganizationTier({
        subscription: { plan: 'free' },
        subscriptionPlanId: 'leadership',
      })
    ).toBe('impact_proof');
  });

  test('accepts populated organization references from existing login tokens', () => {
    const populatedOrg = { _id: objectIds.org, name: 'Example organization' };

    expect(referenceId(populatedOrg)).toBe(objectIds.org);
    expect(canAccessOrg({ orgId: populatedOrg }, objectIds.org)).toBe(true);
    expect(canAccessOrg({ orgId: populatedOrg }, objectIds.team)).toBe(false);
  });
});

describe('intervention reviews', () => {
  test('records direction-aware observed change without making a causal claim', async () => {
    const intervention = new Intervention({
      orgId: objectIds.org,
      teamId: objectIds.team,
      createdBy: objectIds.user,
      signalType: 'meeting_load_drift',
      title: 'Shorten recurring status meetings',
      targetMetric: 'meetingLoadIndex',
      targetDirection: 'decrease',
      startDate: new Date('2026-07-01T00:00:00Z'),
      recheckDate: new Date('2026-07-15T00:00:00Z'),
      followUpReviewDate: new Date('2026-07-29T00:00:00Z'),
      outcomeDelta: { metricBefore: 40 },
    });
    intervention.save = jest.fn().mockResolvedValue(intervention);

    await intervention.computeOutcome(32);

    expect(intervention.outcomeDelta).toMatchObject({
      metricBefore: 40,
      metricAfter: 32,
      percentChange: -20,
      improved: true,
      autoComputed: true,
    });
    expect(intervention.reviews[0].interpretation).toBe('improved');
    expect(intervention.save).toHaveBeenCalled();
  });
});

describe('outcome evidence summaries', () => {
  test('uses only recorded outcomes and measured action changes', () => {
    const outcomes = [
      {
        teamId: { _id: objectIds.team, name: 'Operations' },
        family: 'delivery',
        weekStart: '2026-07-06',
        cycleTimeMedianHours: 20,
        throughput: 10,
      },
      {
        teamId: { _id: objectIds.team, name: 'Operations' },
        family: 'delivery',
        weekStart: '2026-07-20',
        cycleTimeMedianHours: 16,
        throughput: 12,
      },
      {
        teamId: objectIds.team,
        family: 'people',
        voluntaryExits: 1,
        absenceDays: 2,
      },
    ];
    const interventions = [
      {
        _id: 'review-1',
        teamId: { _id: objectIds.team, name: 'Operations' },
        title: 'Protect focus blocks',
        targetMetricLabel: 'Focus-time ratio',
        outcomeDelta: { metricBefore: 30, metricAfter: 36, percentChange: 20, improved: true },
        reviews: [{ interpretation: 'improved' }],
      },
    ];

    const summary = summarizeOutcomeEvidence(outcomes, interventions);

    expect(summary.evidenceStatus).toBe('measured');
    expect(summary.counts).toMatchObject({
      outcomeRecords: 3,
      teamsWithDeliveryComparisons: 1,
      measuredActions: 1,
      improved: 1,
    });
    expect(summary.deliveryComparisons[0]).toMatchObject({
      cycleTimeChangePct: -20,
      throughputChangePct: 20,
    });
    expect(summary.recordedPeopleOutcomes).toEqual({ voluntaryExits: 1, absenceDays: 2 });
    expect(summary.interpretation).toContain('do not establish');
  });
});
