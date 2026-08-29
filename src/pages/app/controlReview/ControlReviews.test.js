import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import ControlReviewFindings from './ControlReviewFindings';
import ControlReviews from './ControlReviews';
import controlReviewApi from '../../../utils/controlReviewApi';

const finding = {
  findingId: 'finding-1',
  team: 'Data Ops',
  periodStart: '2026-08-01T00:00:00.000Z',
  persistencePeriods: 4,
  dataQuality: 'GOOD',
  basis: 'PERSISTENT_CHANGE',
  signals: [{ metric: 'meetingLoad', direction: 'UP', relativeChange: 0.27 }],
  summary: 'Meeting demand remained above this team’s baseline.',
};

const dashboard = {
  reviewRecommendations: [finding],
  modules: {
    needsAttention: { question: 'What needs attention now?', items: [] },
    controlsBeingImplemented: { question: 'What controls are being implemented?', items: [] },
    monitoring: { question: 'What are we monitoring?', items: [] },
    reviewsDue: { question: 'What reviews are due?', items: [] },
    exceptions: { question: 'What exceptions need a decision?', items: [] },
  },
  disclaimer: 'Team-level evidence only.',
};

vi.mock('../../../components/app/AppShell', () => ({
  default: ({ children }) => <div>{children}</div>,
  PageHeader: ({ title }) => <h1>{title}</h1>,
}));

vi.mock('../../../utils/authContext', () => ({
  getAuthenticatedContext: vi.fn().mockResolvedValue({ user: { name: 'Admin' } }),
}));

vi.mock('../../../utils/controlReviewApi', () => ({
  default: {
    dashboard: vi.fn(),
    dismissFinding: vi.fn(),
  },
  CASE_STATUS_LABELS: {},
  TRIGGER_LABELS: {},
  formatDate: (value) => value.slice(0, 10),
  formatPercent: (value) => `${Math.round(value * 100)}%`,
  metricLabel: () => 'Meeting demand',
}));

beforeEach(() => {
  vi.clearAllMocks();
  controlReviewApi.dashboard.mockResolvedValue(dashboard);
});

test('leads with the five operational modules and links to the findings view', async () => {
  render(
    <MemoryRouter>
      <ControlReviews />
    </MemoryRouter>
  );

  expect(await screen.findByText('What needs attention now?')).toBeInTheDocument();
  const summary = screen.getByRole('link', {
    name: /1 team shows a persistent work-pattern change review/i,
  });
  expect(summary).toHaveAttribute('href', '/app/control-reviews/findings');
  expect(screen.queryByText('Data Ops')).not.toBeInTheDocument();
});

test('keeps the full finding reachable on the dedicated route', async () => {
  render(
    <MemoryRouter>
      <ControlReviewFindings />
    </MemoryRouter>
  );

  expect(await screen.findByText('Data Ops')).toBeInTheDocument();
  expect(screen.getByText('Meeting demand')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Open review' })).toBeInTheDocument();
});
