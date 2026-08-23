import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute';
import { clearStoredSession, getAuthenticatedContext } from '../utils/authContext';

vi.mock('react-router-dom', () => ({ Navigate: ({ to }) => <div>Navigate to {to}</div> }));

vi.mock('../utils/authContext', () => ({
  SESSION_INVALIDATED_EVENT: 'signaltrue:session-invalidated',
  clearStoredSession: vi.fn(() => {
    ['token', 'user', 'orgId', 'teamId'].forEach((key) => globalThis.localStorage.removeItem(key));
  }),
  getAuthenticatedContext: vi.fn(),
}));

function renderProtected() {
  return render(
    <ProtectedRoute>
      <div>Protected content</div>
    </ProtectedRoute>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

test('redirects to login when no token exists', () => {
  renderProtected();
  expect(screen.getByText('Navigate to /login')).toBeInTheDocument();
  expect(getAuthenticatedContext).not.toHaveBeenCalled();
});

test('renders protected content only after the server validates the session', async () => {
  localStorage.setItem('token', 'valid-token');
  getAuthenticatedContext.mockResolvedValue({ user: { role: 'admin' }, orgId: 'org-1' });

  renderProtected();

  expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
  expect(await screen.findByText('Protected content')).toBeInTheDocument();
});

test('clears an invalid stored session and redirects to login', async () => {
  localStorage.setItem('token', 'expired-token');
  localStorage.setItem('user', '{"role":"admin"}');
  localStorage.setItem('orgId', 'org-1');
  getAuthenticatedContext.mockRejectedValue(new Error('Unauthorized'));

  renderProtected();

  expect(await screen.findByText('Navigate to /login')).toBeInTheDocument();
  await waitFor(() => expect(clearStoredSession).toHaveBeenCalledTimes(1));
});
