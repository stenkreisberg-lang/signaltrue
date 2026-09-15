import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi, type Mock } from 'vitest';
import api from '../utils/api';
import ITAdminInvitationManager from './ITAdminInvitationManager';

vi.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: Mock;
  post: Mock;
  delete: Mock;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({
    data: [
      {
        _id: 'expired-invitation',
        name: 'Mark Example',
        email: 'mark@example.com',
        expiresAt: '2020-01-01T00:00:00.000Z',
      },
    ],
  });
  mockedApi.post.mockResolvedValue({ data: { renewed: true, emailSent: true } });
  mockedApi.delete.mockResolvedValue({ data: {} });
});

test('shows expired invitations on the data-source page and renews them', async () => {
  render(<ITAdminInvitationManager role="hr_admin" />);

  expect(await screen.findByText(/Mark Example/)).toBeTruthy();
  expect(screen.getByText('Link expired — send a new link')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Send new link' }));

  await waitFor(() =>
    expect(mockedApi.post).toHaveBeenCalledWith('/onboarding/invitations/expired-invitation/resend')
  );
  expect(await screen.findByText('A new invitation link was sent.')).toBeTruthy();
});

test('lets an HR administrator enter a new IT administrator email', async () => {
  mockedApi.get.mockResolvedValue({ data: [] });
  render(<ITAdminInvitationManager role="hr_admin" />);

  fireEvent.change(screen.getByPlaceholderText('Name (optional)'), {
    target: { value: 'Mark Example' },
  });
  fireEvent.change(screen.getByPlaceholderText('it-admin@company.com'), {
    target: { value: 'mark@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

  await waitFor(() =>
    expect(mockedApi.post).toHaveBeenCalledWith('/onboarding/invitations', {
      email: 'mark@example.com',
      name: 'Mark Example',
      role: 'it_admin',
    })
  );
});

test('does not expose invitation management to an IT administrator', () => {
  render(<ITAdminInvitationManager role="it_admin" />);

  expect(screen.queryByText('IT administrator access')).toBeNull();
  expect(mockedApi.get).not.toHaveBeenCalled();
});
