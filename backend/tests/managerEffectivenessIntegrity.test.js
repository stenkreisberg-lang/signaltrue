import { describe, expect, test } from '@jest/globals';
import {
  calculateManagerEffectiveness,
  getManagersNeedingCoaching,
  getOrgManagerEffectiveness,
  MANAGER_EFFECTIVENESS_UNAVAILABLE,
} from '../services/managerEffectivenessService.js';

describe('manager effectiveness evidence integrity', () => {
  test('never manufactures a score when validated inputs are unavailable', async () => {
    await expect(calculateManagerEffectiveness('manager-id', 'team-id')).resolves.toBeNull();
    expect(MANAGER_EFFECTIVENESS_UNAVAILABLE).toEqual({
      available: false,
      score: null,
      reason: expect.stringContaining('validated measured inputs'),
    });
  });

  test('does not expose historical placeholder rankings or coaching lists', async () => {
    await expect(getOrgManagerEffectiveness('org-id')).resolves.toEqual([]);
    await expect(getManagersNeedingCoaching('org-id')).resolves.toEqual([]);
  });
});
