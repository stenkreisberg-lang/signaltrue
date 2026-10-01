import { describe, expect, test } from '@jest/globals';
import { determineSeverity } from '../config/signalTemplates.js';

describe('signal threshold evaluation', () => {
  test('evaluates OR conditions and sustained weeks', () => {
    expect(
      determineSeverity(
        'recovery_gap_index',
        { RGI_mean: 20, decrease_pct: 22, robust_z: -0.4 },
        3
      )
    ).toBe('CRITICAL');
  });

  test('evaluates AND conditions without executing arbitrary expressions', () => {
    expect(
      determineSeverity(
        'responsiveness_pressure',
        {
          median_response_minutes: 20,
          decrease: 20,
          'IQR decrease': 12,
        },
        1
      )
    ).toBe('INFO');
  });

  test('does not classify a signal when the sustained period is too short', () => {
    expect(
      determineSeverity('recovery_gap_index', { RGI_mean: 20, decrease_pct: 22 }, 1)
    ).toBe('INFO');
  });
});
