import { describe, expect, it } from '@jest/globals';
import { buildBaseline } from '../services/controlReview/baselineDeviationService.js';
import { isAdverse } from '../services/controlReview/patternDetectionService.js';
import { pilotOrganizationFilter } from '../services/controlReview/automaticWorkPatternAnalysisService.js';

const week = (n) => new Date(Date.UTC(2026, 0, 5 + n * 7));

describe('automatic work-pattern insight gates', () => {
  it('excludes low-quality weeks from a baseline', () => {
    const baseline = buildBaseline([
      { periodStart: week(0), periodEnd: week(1), value: 10, dataQuality: 'GOOD' },
      { periodStart: week(1), periodEnd: week(2), value: 10, dataQuality: 'LOW' },
      { periodStart: week(2), periodEnd: week(3), value: 11, dataQuality: 'ACCEPTABLE' },
      { periodStart: week(3), periodEnd: week(4), value: 9, dataQuality: 'GOOD' },
    ]);

    expect(baseline.available).toBe(false);
    expect(baseline.sampleSize).toBe(3);
  });

  it('only treats adverse metric directions as reportable', () => {
    expect(isAdverse({ status: 'DEVIATION_OBSERVED', metric: 'MEETING_LOAD', direction: 'UP' })).toBe(true);
    expect(isAdverse({ status: 'DEVIATION_OBSERVED', metric: 'MEETING_LOAD', direction: 'DOWN' })).toBe(false);
    expect(
      isAdverse({
        status: 'DEVIATION_OBSERVED',
        metric: 'UNINTERRUPTED_CALENDAR_AVAILABILITY',
        direction: 'DOWN',
      })
    ).toBe(true);
    expect(
      isAdverse({
        status: 'DEVIATION_OBSERVED',
        metric: 'UNINTERRUPTED_CALENDAR_AVAILABILITY',
        direction: 'UP',
      })
    ).toBe(false);
  });

  it('supports a tenant-scoped pilot instead of enabling every organization', () => {
    const previous = process.env.AUTOMATED_WORK_PATTERN_INSIGHTS_ORG_SLUG;
    process.env.AUTOMATED_WORK_PATTERN_INSIGHTS_ORG_SLUG = 'tehnopol';
    expect(pilotOrganizationFilter()).toEqual({ slug: 'tehnopol' });
    if (previous === undefined) delete process.env.AUTOMATED_WORK_PATTERN_INSIGHTS_ORG_SLUG;
    else process.env.AUTOMATED_WORK_PATTERN_INSIGHTS_ORG_SLUG = previous;
  });
});
