import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import AnalyticsPageTracker from './AnalyticsPageTracker';
import * as analytics from '../lib/analytics';

vi.mock('../lib/analytics', async () => {
  const actual = await vi.importActual<typeof import('../lib/analytics')>('../lib/analytics');
  return {
    ...actual,
    captureOriginalAttribution: vi.fn(),
    disableAnalyticsCollection: vi.fn(),
    trackPageView: vi.fn(),
  };
});

function NavigationHarness() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/product')}>Product</button>;
}

beforeEach(() => vi.clearAllMocks());

test('tracks the initial commercial load and an SPA route change', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <AnalyticsPageTracker />
      <Routes>
        <Route path="*" element={<NavigationHarness />} />
      </Routes>
    </MemoryRouter>
  );

  await vi.waitFor(() =>
    expect(analytics.trackPageView).toHaveBeenCalledWith('/', expect.any(String))
  );
  fireEvent.click(screen.getByRole('button', { name: 'Product' }));
  await vi.waitFor(() =>
    expect(analytics.trackPageView).toHaveBeenCalledWith('/product', expect.any(String))
  );
  expect(analytics.trackPageView).toHaveBeenCalledTimes(2);
});

test('does not put authenticated navigation in the commercial scope', async () => {
  render(
    <MemoryRouter initialEntries={['/app/overview']}>
      <AnalyticsPageTracker />
    </MemoryRouter>
  );
  await vi.waitFor(() => expect(analytics.disableAnalyticsCollection).toHaveBeenCalledOnce());
  expect(analytics.trackPageView).not.toHaveBeenCalled();
});
