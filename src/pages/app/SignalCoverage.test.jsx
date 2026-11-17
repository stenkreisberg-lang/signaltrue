import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import SignalCoverage from './SignalCoverage';
import api from '../../utils/api';
import { getAuthenticatedContext } from '../../utils/authContext';

vi.mock('../../components/app/AppShell', () => ({
  default: ({ children }) => children,
  PageHeader: ({ title }) => title,
}));
vi.mock('../../utils/api', () => ({
  default: { get: vi.fn() },
}));
vi.mock('../../utils/authContext', () => ({
  getAuthenticatedContext: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getAuthenticatedContext.mockResolvedValue({
    user: { role: 'hr_admin', name: 'Reviewer' },
    orgId: 'org-1',
  });
});

it('shows measured evidence and the backend minimum independently of connection state', async () => {
  api.get.mockImplementation((url) =>
    url === '/integration-dashboard/status'
      ? Promise.resolve({
          data: {
            reportingPolicy: { minimumContributors: 2 },
            integrations: [
              {
                type: 'microsoft-outlook',
                name: 'Microsoft Outlook',
                status: 'partial',
                coverage: { mapped: 41, total: 42 },
                measurementStatus: { verified: true, label: 'Recent stored events' },
              },
              {
                type: 'microsoft-teams',
                name: 'Microsoft Teams',
                status: 'disconnected',
                coverage: { mapped: 39, total: 42 },
                measurementStatus: { verified: true, label: 'Recent stored events' },
              },
            ],
          },
        })
      : Promise.resolve({ data: {} })
  );

  render(<SignalCoverage />);

  expect(await screen.findByText('2 contributors')).toBeInTheDocument();
  expect(screen.getByText('Connected or partially connected sources')).toBeInTheDocument();
  expect(screen.getByText('Sources with verified events')).toBeInTheDocument();
  expect(screen.getByText('Connection: disconnected')).toBeInTheDocument();
  expect(screen.queryByText('8 contributors')).not.toBeInTheDocument();
});

it('does not misrepresent a failed status request as no connected sources', async () => {
  api.get.mockRejectedValue(new Error('Network error'));

  render(<SignalCoverage />);

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Source status could not be loaded'
    );
  });
  expect(screen.getByText('Not verified')).toBeInTheDocument();
});
