/* eslint-env jest */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LatestBrief from './LatestBrief';

const installMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ children }) => children,
    NavLink: ({ children }) => children,
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/app/latest-brief' }),
  }),
  { virtual: true }
);

jest.mock('../../utils/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('../../utils/authContext', () => ({
  getAuthenticatedContext: jest.fn(),
}));

const brief = {
  id: 'brief-1',
  orgName: 'Example Org',
  reportMode: 'full',
  generatedAt: '2026-08-03T08:00:00.000Z',
  periodStart: '2026-07-27T00:00:00.000Z',
  periodEnd: '2026-08-03T00:00:00.000Z',
  status: {
    label: 'Review meeting load',
    evidenceGrade: 'Medium',
    summary: 'Meeting participant-hours moved above the organization baseline.',
    baselineWeeks: 6,
  },
  coverage: {
    mappingCoveragePct: 90,
    teamCoveragePct: 100,
    mappedUsers: 90,
    totalUsers: 100,
    readyTeams: 8,
    eligibleTeams: 8,
  },
  freshness: {
    userCountChanged: true,
    snapshotTotalUsers: 95,
    currentTotalUsers: 59,
    directoryDelta: -36,
  },
  metrics: [
    {
      key: 'meeting_hours',
      label: 'Meeting participant-hours per person',
      current: 12,
      previous: 10,
      baseline: 9,
      unit: 'hours',
      available: true,
      direction: 'review',
      changePct: 20,
      measurementType: 'derived',
    },
  ],
  trend: [],
  observations: [{ text: 'Meeting hours increased.', evidenceGrade: 'Medium' }],
  risks: ['Less time remains for uninterrupted work.'],
  actions: {
    primary: {
      action: 'Review recurring meetings.',
      owner: 'Team lead',
      measure: 'Meeting hours',
      reviewWindow: '14 days',
    },
    roleBased: {},
  },
  questions: ['What should we verify before acting?'],
  signals: [],
  actionOutcomes: [],
  integrations: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  installMatchMedia();
  getAuthenticatedContext.mockResolvedValue({
    user: { name: 'Admin', role: 'hr_admin' },
    orgId: 'org-1',
  });
  api.get.mockImplementation((url) => {
    if (url === '/weekly-brief/latest') return Promise.resolve({ data: brief });
    if (url === '/week-context') return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
});

test('shows the saved email brief with deeper evidence and report-grounded questions', async () => {
  render(<LatestBrief />);

  expect(await screen.findByText('Review meeting load')).toBeInTheDocument();
  expect(screen.getByText('Metric evidence table')).toBeInTheDocument();
  expect(screen.getByText('Ask about this brief')).toBeInTheDocument();
  expect(screen.getByText('Meeting hours increased.')).toBeInTheDocument();
  expect(screen.getByText('Review recurring meetings.')).toBeInTheDocument();
  expect(screen.getByText(/This snapshot was based on 95 active users/)).toBeInTheDocument();
});

test('submits a follow-up question to the weekly brief assistant', async () => {
  api.post.mockResolvedValue({
    data: {
      source: 'ai',
      answer: 'Meeting hours are above both the prior week and baseline.',
      evidence: [],
      suggestions: [],
      caveats: ['This does not establish cause.'],
    },
  });
  render(<LatestBrief />);

  const prompt = await screen.findByText('What should we verify before acting?');
  fireEvent.click(prompt);
  fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/weekly-brief/ask', {
      question: 'What should we verify before acting?',
    });
  });
  expect(await screen.findByText(/Meeting hours are above both/)).toBeInTheDocument();
});
