import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import OrganisationWorkspace from './OrganisationWorkspace';
import IntegrationDashboard from '../../components/IntegrationDashboard';
import api from '../../utils/api';

vi.mock('../../utils/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../../components/ITAdminInvitationManager', () => ({ default: () => null }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test.each([true, false])(
  'Estonian HR recipient disclosure follows copy configuration %s',
  async (enabled) => {
    api.get.mockResolvedValue({
      data: {
        teams: [],
        people: [],
        summary: { employees: 0, teams: 0, pendingAccounts: 0, unverifiedTeams: 0 },
        organisation: {
          minimum: 2,
          approvedReportRecipients: [],
          weeklyQualityCopyEnabled: enabled,
        },
      },
    });
    render(
      <MemoryRouter>
        <OrganisationWorkspace locale="et" />
      </MemoryRouter>
    );
    const recipients = await screen.findByRole('region', {
      name: 'Personaliosakonna nädalaaruande saajad',
    });
    expect(Boolean(within(recipients).queryByText(/kvaliteedikontrolliks/))).toBe(enabled);
  }
);

test('a disconnected source and an unverified connection do not count as verified events', async () => {
  const sources = [
    { type: 'slack', status: 'connected', measurementStatus: { verified: false } },
    { type: 'microsoft-outlook', status: 'connected', measurementStatus: { verified: true } },
    { type: 'google-calendar', status: 'disconnected', measurementStatus: { verified: false } },
  ];
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ integrations: sources }) })
      .mockResolvedValueOnce({ ok: false })
  );
  render(<IntegrationDashboard locale="et" />);
  const label = await screen.findByText('Kontrollitud sündmustega allikaid');
  expect(label.parentElement).toHaveTextContent('1');
  expect(screen.getByText('Lubatud allikaid').parentElement).toHaveTextContent('2');
  expect(screen.getAllByText('Andmed puuduvad').length).toBeGreaterThan(0);
});

test('a failed source status request offers a retry without showing zero counts', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  render(<IntegrationDashboard locale="et" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Allikate seisu ei saanud laadida');
  expect(screen.queryByText('Lubatud allikaid')).toBeNull();
});
