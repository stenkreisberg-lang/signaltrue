import { beforeEach, expect, jest as mockJest, test } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Mock } from 'jest-mock';
import api from '../utils/api';
import EmployeeDirectory from './EmployeeDirectory';

mockJest.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    get: mockJest.fn(),
    post: mockJest.fn(),
    put: mockJest.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: Mock<unknown, [string, ...unknown[]]>;
  post: Mock<unknown, [string, ...unknown[]]>;
  put: Mock<unknown, [string, ...unknown[]]>;
};

let completeScan: (() => void) | undefined;

const enrichmentStatus = {
  websiteUrl: 'https://company.example',
  linkedinUrl: '',
  unassignedCount: 1,
  enrichment: { status: 'not_started' },
  suggestions: [],
  reportSettings: {
    timezone: 'UTC',
    workdayStart: '09:00',
    workdayEnd: '17:00',
    loadedHourlyCost: null,
    currency: 'EUR',
  },
};

beforeEach(() => {
  mockJest.clearAllMocks();
  completeScan = undefined;
  mockedApi.get.mockImplementation((url: string) => {
    if (url === '/team-members') {
      return Promise.resolve({
        data: [
          {
            _id: 'employee-1',
            name: 'Ada Example',
            email: 'ada@company.example',
            accountStatus: 'active',
            source: 'microsoft',
            role: 'viewer',
            teamId: 'unassigned-team',
            profile: { title: 'Engineering Lead' },
            createdAt: '2026-08-01T00:00:00.000Z',
          },
        ],
      });
    }
    if (url === '/team-management/organization') {
      return Promise.resolve({ data: [{ _id: 'unassigned-team', name: 'Unassigned' }] });
    }
    if (url === '/team-enrichment') return Promise.resolve({ data: enrichmentStatus });
    if (url === '/employee-sync/status') {
      return Promise.resolve({
        data: {
          totalUsers: 1,
          pendingUsers: 0,
          activeUsers: 1,
          unassignedUsers: 1,
          slackConnected: false,
          googleConnected: false,
          microsoftConnected: true,
        },
      });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
  mockedApi.post.mockImplementation(async () => {
    await new Promise<void>((resolve) => {
      completeScan = resolve;
    });
    return {
      data: {
        message: 'Scan complete',
        summary: {
          pagesScanned: 4,
          peopleFound: 18,
          employeesConsidered: 1,
          suggestionsCreated: 1,
          autoApplied: 1,
          skipped: 0,
          pendingReview: 0,
          unmatched: 0,
        },
        suggestions: [],
      },
    };
  });
});

test('scans the inferred website, applies strong matches, and reports the result in the card', async () => {
  render(<EmployeeDirectory />);

  const scanButton = await screen.findByRole('button', {
    name: 'Scan website and assign high-confidence matches',
  });
  expect(screen.getByDisplayValue('https://company.example')).toBeTruthy();

  fireEvent.click(scanButton);

  expect(await screen.findByText(/Scanning public Team, People, About/)).toBeTruthy();
  completeScan?.();
  await waitFor(() =>
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/team-enrichment/analyze',
      { websiteUrl: 'https://company.example', linkedinUrl: undefined },
      { timeout: 120000 }
    )
  );
  expect(
    await screen.findByText(
      /Scan complete: 4 pages and 18 public profiles checked. 1 automatically assigned/
    )
  ).toBeTruthy();
});
