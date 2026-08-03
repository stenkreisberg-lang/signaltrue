import { describe, expect, test } from '@jest/globals';
import {
  calculateCoverageSummary,
  calculateOutcomeSummary,
  mergeStudyProgress,
  METRIC_REGISTRY,
  VALIDATION_STUDIES,
} from '../services/validationProgramService.js';
import { isPublicHttpUrl } from '../routes/validationProgram.js';

describe('validation program registry', () => {
  test('requires a genuinely public HTTP location for external evidence', () => {
    expect(isPublicHttpUrl('https://reviewer.example/report.pdf')).toBe(true);
    expect(isPublicHttpUrl('file:///tmp/review.pdf')).toBe(false);
    expect(isPublicHttpUrl('http://localhost/report')).toBe(false);
    expect(isPublicHttpUrl('http://192.168.1.20/report')).toBe(false);
  });

  test('defines the eight studies without marking any complete by default', () => {
    expect(VALIDATION_STUDIES).toHaveLength(8);
    expect(new Set(VALIDATION_STUDIES.map((study) => study.key)).size).toBe(8);

    const progress = mergeStudyProgress([], []);
    expect(progress.every((study) => study.status === 'planned')).toBe(true);
    expect(progress.every((study) => study.verifiedEvidenceCount === 0)).toBe(true);
  });

  test('keeps model indices and AI interpretations explicitly unvalidated', () => {
    expect(METRIC_REGISTRY.find((metric) => metric.key === 'signaltrue_model_index')).toMatchObject(
      {
        measurementClass: 'internal_model',
        validationStatus: 'not_externally_validated',
      }
    );
    expect(METRIC_REGISTRY.find((metric) => metric.key === 'ai_interpretation')).toMatchObject({
      measurementClass: 'ai_hypothesis',
      validationStatus: 'requires_human_review',
    });
  });
});

describe('client validation summary calculations', () => {
  test('reports connector mapping coverage without calling it accuracy', () => {
    const result = calculateCoverageSummary([
      {
        integrationType: 'microsoft-outlook',
        status: 'connected',
        coverage: { mappedUsers: 41, totalUsers: 93 },
        sync: { lastSuccessfulSyncAt: new Date('2026-08-03T10:00:00Z') },
      },
      {
        integrationType: 'microsoft-teams',
        status: 'error',
        coverage: { mappedUsers: 20, totalUsers: 93 },
      },
    ]);

    expect(result.connectedSources).toBe(1);
    expect(result.sourcesWithMeasuredCoverage).toBe(1);
    expect(result.sources[0]).toMatchObject({
      mappingCoveragePct: 44,
      reconciliationStatus: 'not_run',
    });
    expect(result.accuracyClaimAvailable).toBe(false);
  });

  test('counts an action outcome only when before, after, and computation time exist', () => {
    const result = calculateOutcomeSummary([
      {
        status: 'completed',
        acknowledgedAt: new Date(),
        outcomeDelta: {
          metricBefore: 100,
          metricAfter: 80,
          improved: true,
          computedAt: new Date(),
        },
      },
      {
        status: 'completed',
        outcomeDelta: { metricBefore: 100, improved: true },
      },
      { status: 'abandoned', outcomeDelta: {} },
    ]);

    expect(result).toMatchObject({
      totalActions: 2,
      measuredActions: 1,
      acknowledgedMeasuredActions: 1,
      improvedActions: 1,
      notImprovedActions: 0,
      measurementRatePct: 50,
    });
  });

  test('separates organization evidence from product-wide evidence', () => {
    const progress = mergeStudyProgress(
      [{ studyKey: 'connector_accuracy', status: 'collecting', protocolVersion: '1.0' }],
      [
        { studyKey: 'connector_accuracy', orgId: 'client-org' },
        { studyKey: 'connector_accuracy', orgId: null },
      ]
    );
    const connectorStudy = progress.find((study) => study.key === 'connector_accuracy');

    expect(connectorStudy).toMatchObject({
      status: 'collecting',
      protocolVersion: '1.0',
      verifiedEvidenceCount: 2,
      organizationEvidenceCount: 1,
      productEvidenceCount: 1,
    });
  });
});
