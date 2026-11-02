import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const crisisFind = jest.fn();
const teamFindById = jest.fn();
const teamStateFind = jest.fn();
const resolveMinimumTeamSize = jest.fn();

jest.unstable_mockModule('../models/team.js', () => ({
  default: { findById: teamFindById },
}));
jest.unstable_mockModule('../models/teamState.js', () => ({
  default: { find: teamStateFind },
}));
jest.unstable_mockModule('../models/crisisEvent.js', () => ({
  default: { find: crisisFind },
}));
jest.unstable_mockModule('../utils/privacyGate.js', () => ({
  resolveMinimumTeamSize,
}));
jest.unstable_mockModule('../services/aiRecommendationContext.js', () => ({
  generateWeeklyRecommendations: jest.fn(),
}));

const { generateWeeklyReportForTeam } = await import('../services/weeklyReportService.js');

beforeEach(() => {
  jest.clearAllMocks();
  teamFindById.mockReturnValue({
    select: async () => ({ orgId: 'org-1', metadata: { actualSize: 12 } }),
  });
  resolveMinimumTeamSize.mockResolvedValue(8);
});

describe('legacy weekly team report integrity', () => {
  test('does not manufacture a zero BDI or query CrisisEvent with Invalid Date', async () => {
    teamStateFind.mockReturnValue({
      sort: () => ({
        limit: () => ({
          populate: async () => [
            { weekStart: new Date('2026-10-26T00:00:00Z'), state: 'healthy' },
          ],
        }),
      }),
    });
    await expect(generateWeeklyReportForTeam('team-1')).resolves.toBeNull();
    expect(crisisFind).not.toHaveBeenCalled();
  });
});
