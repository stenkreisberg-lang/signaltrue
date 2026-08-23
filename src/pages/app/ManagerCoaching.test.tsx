import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ManagerCoaching from './ManagerCoaching';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

vi.mock('../../utils/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('../../utils/authContext', () => ({ getAuthenticatedContext: vi.fn() }));

const mockedApi = vi.mocked(api);
const mockedContext = vi.mocked(getAuthenticatedContext);

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  mockedContext.mockResolvedValue({
    user: { name: 'Manager', email: 'manager@example.com', role: 'manager' },
    orgId: 'org-1',
    teamId: 'team-1',
  });
  mockedApi.post.mockResolvedValue({ data: {} });
});

describe('Manager Coaching', () => {
  it('renders an evidence-building state without sample numbers', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('experiments')) return Promise.resolve({ data: { experiments: [] } });
      return Promise.resolve({
        data: {
          status: 'insufficient_data',
          reason: 'baseline_insufficient',
          requirements: {
            reportingStructure: { available: true, source: 'directory', directReports: 9 },
            privacy: { passed: true, activeReports: 9, minimumRequired: 8 },
            calendar: { available: true, coverage: 0.8, coveredDays: 12 },
            baseline: { available: false, weeks: 2, preferredWeeks: 6 },
          },
          data: null,
        },
      });
    });

    renderPage();
    expect(await screen.findByText('Building your evidence baseline')).toBeInTheDocument();
    expect(screen.getByText(/2 of 6 preferred weeks/i)).toBeInTheDocument();
    expect(screen.queryByText(/manager effectiveness score/i)).not.toBeInTheDocument();
  });

  it('shows one deterministic insight, limitation and experiment', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url.includes('experiments')) return Promise.resolve({ data: { experiments: [] } });
      return Promise.resolve({ data: readyResponse });
    });

    renderPage();
    expect(await screen.findByText('Your coordination load is unusually high')).toBeInTheDocument();
    expect(screen.getByText(/cannot determine why/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start experiment' })).toBeInTheDocument();
    expect(screen.getAllByText(/delegate one recurring approval/i).length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/manager-coaching/v2/events',
        expect.objectContaining({ eventType: 'opened', insightId: 'insight-1' })
      )
    );
  });

  it('shows a retryable error and never falls back to mock coaching', async () => {
    mockedApi.get.mockRejectedValue(new Error('Network unavailable'));
    renderPage();
    expect(await screen.findByText("We couldn't load Manager Coaching")).toBeInTheDocument();
    expect(screen.getByText('Network unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/top 25%/i)).not.toBeInTheDocument();
  });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ManagerCoaching />
    </MemoryRouter>
  );
}

const trigger = {
  key: 'coordinationLoadHours',
  label: 'Coordination load',
  unit: 'hours/week',
  value: 18.6,
  baseline: 14.2,
  deltaPercent: 31,
  status: 'available',
  reason: null,
  coverage: 0.82,
  confidence: 'high',
  sources: ['microsoft-outlook'],
};

const readyResponse = {
  status: 'ready',
  data: {
    period: { weekStart: '2026-08-17', weekEnd: '2026-08-23' },
    readiness: {
      confidence: 'high',
      coverage: 0.82,
      requirements: {
        privacy: { passed: true, activeReports: 9, minimumRequired: 8 },
      },
    },
    primaryInsight: {
      insightId: 'insight-1',
      signal: 'coordination_load',
      title: 'Your coordination load is unusually high',
      statement: 'Coordination load changed from 14.2 hours/week to 18.6 hours/week.',
      confidence: 'high',
      persistenceWeeks: 3,
      trigger,
      question: 'Which decisions still require you?',
      experiment: {
        title: 'Delegate one recurring approval for two weeks.',
        durationDays: 14,
        targetMetrics: [{ metric: 'coordinationLoadHours', direction: 'down', unit: 'hours/week' }],
      },
    },
    supportingObservations: [],
    managerConditions: [trigger],
    managerTeamInteraction: [],
    teamContext: [],
    limitation: 'SignalTrue can measure this change but cannot determine why it happened.',
  },
};
