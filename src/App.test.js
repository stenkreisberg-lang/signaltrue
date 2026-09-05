import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => children,
  Routes: ({ children }) => children[0],
  Route: ({ element }) => element,
  Navigate: () => null,
  Link: ({ children }) => children,
  NavLink: ({ children }) => children,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { current: null, access: { features: [] } } })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    create: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve({ data: { current: null, access: { features: [] } } })),
      post: vi.fn(() => Promise.resolve({ data: {} })),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}));

vi.mock('./contexts/SubscriptionContext', () => ({
  SubscriptionProvider: ({ children }) => children,
}));

test('renders the SignalTrue homepage with the approved moving customer band', async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      observe() {}

      disconnect() {}
    }
  );
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  render(<App />);
  expect((await screen.findAllByText(/SignalTrue/i)).length).toBeGreaterThan(0);
  expect(await screen.findByText('Measuring work health at')).toBeInTheDocument();
  expect(document.querySelector('.customer-track')).toBeInTheDocument();
});
