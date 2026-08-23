import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import Pricing from './Pricing';
import { clearStoredSession } from '../utils/authContext';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useNavigate: () => mockNavigate,
}));

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../components/Footer', () => ({ default: () => null }));
vi.mock('../components/PageMeta', () => ({ default: () => null }));
vi.mock('../utils/authContext', () => ({
  clearStoredSession: vi.fn(() => {
    ['token', 'user', 'orgId', 'teamId'].forEach((key) => globalThis.localStorage.removeItem(key));
  }),
}));

const originalFetch = global.fetch;

const mockResponse = (status: number, body: Record<string, unknown>) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response);

function renderPricing() {
  return render(<Pricing />);
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  global.fetch = vi.fn((url: RequestInfo | URL) => {
    if (String(url).includes('/api/analytics/track')) {
      return mockResponse(200, {});
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  }) as typeof global.fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('sends an unauthenticated paid-plan visitor to registration', async () => {
  renderPricing();
  fireEvent.click(screen.getAllByRole('button', { name: 'Request a risk review' })[0]);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/register?plan=visibility'));
});

test('recovers from an expired checkout token by clearing it and opening registration', async () => {
  localStorage.setItem('token', 'expired-token');
  localStorage.setItem('user', '{"role":"admin"}');
  global.fetch = vi.fn((url: RequestInfo | URL) => {
    if (String(url).includes('/api/analytics/track')) {
      return mockResponse(200, {});
    }
    return mockResponse(401, { message: 'Unauthorized: Invalid token' });
  }) as typeof global.fetch;

  renderPricing();
  fireEvent.click(screen.getAllByRole('button', { name: 'Request a risk review' })[0]);

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/register?plan=visibility'));
  expect(clearStoredSession).toHaveBeenCalledTimes(1);
});

test('the workload scan CTA opens the contact flow', async () => {
  renderPricing();
  fireEvent.click(screen.getByRole('button', { name: 'Request scan' }));
  expect(mockNavigate).toHaveBeenCalledWith('/contact');
});
