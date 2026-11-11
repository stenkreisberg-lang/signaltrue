import { describe, expect, test } from '@jest/globals';
import { assessTehnopolParityRepair } from '../services/tehnopolSnapshotParityRepair.js';

const calendarFailures = [
  { field: 'meetingInstanceCount7d', status: 'FAIL', discrepancy: -3 },
  { field: 'meetingDurationTotalHours7d', status: 'FAIL', discrepancy: -3.5 },
  { field: 'focusTimeAvailabilityHours', status: 'FAIL', discrepancy: -0.5 },
  { field: 'messageCount7d', status: 'PASS', discrepancy: 0 },
  { field: 'afterHoursMessageRatio', status: 'PASS', discrepancy: 0 },
];

describe('one-time canonical tenant parity correction guard', () => {
  test('allows only the known calendar mismatches when messaging matches', () => {
    expect(assessTehnopolParityRepair({
      status: 'FAIL', checks: calendarFailures,
    })).toEqual({ eligible: true, reason: 'calendar_snapshot_mismatch' });
  });

  test('does not recalculate a passing period', () => {
    expect(assessTehnopolParityRepair({ status: 'PASS', checks: [] }))
      .toEqual({ eligible: false, reason: 'already_consistent' });
  });

  test('does not overwrite missing or unverified source measurements', () => {
    expect(assessTehnopolParityRepair({ status: 'INCOMPLETE', checks: [] }).eligible)
      .toBe(false);
    expect(assessTehnopolParityRepair({
      status: 'FAIL', checks: [
        { ...calendarFailures[0], status: 'UNVERIFIED' },
        ...calendarFailures.slice(1),
      ],
    }).eligible).toBe(false);
  });

  test('does not hide a messaging failure with a calendar-only repair', () => {
    expect(assessTehnopolParityRepair({
      status: 'FAIL', checks: [
        ...calendarFailures.slice(0, 3),
        { field: 'messageCount7d', status: 'FAIL', discrepancy: 200 },
        calendarFailures[4],
      ],
    })).toEqual({ eligible: false, reason: 'unexpected_measurement_failure' });
  });
});
