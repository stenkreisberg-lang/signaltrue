/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock(
  'react-router-dom',
  () => ({
    BrowserRouter: ({ children }) => children,
    Routes: ({ children }) => children[0],
    Route: ({ element }) => element,
    Navigate: () => null,
    Link: ({ children }) => children,
    NavLink: ({ children }) => children,
    useNavigate: () => jest.fn(),
    useLocation: () => ({ pathname: '/' }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
  }),
  { virtual: true }
);

jest.mock(
  'axios',
  () => ({
    get: jest.fn(() => Promise.resolve({ data: { current: null, access: { features: [] } } })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    create: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ data: { current: null, access: { features: [] } } })),
      post: jest.fn(() => Promise.resolve({ data: {} })),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })),
  }),
  { virtual: true }
);

jest.mock('./contexts/SubscriptionContext', () => ({
  SubscriptionProvider: ({ children }) => children,
}));

test('renders the SignalTrue homepage', () => {
  window.matchMedia = jest.fn().mockImplementation(() => ({
    matches: false,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
  render(<App />);
  expect(screen.getAllByText(/SignalTrue/i).length).toBeGreaterThan(0);
});
