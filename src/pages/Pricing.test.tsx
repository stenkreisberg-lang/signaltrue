import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import Pricing from './Pricing';
import { trackFunnelEvent } from '../lib/analytics';

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../components/Footer', () => ({ default: () => null }));
vi.mock('../components/PageMeta', () => ({ default: () => null }));
vi.mock('../lib/analytics', () => ({ trackFunnelEvent: vi.fn() }));

function renderPricing() {
  return render(
    <MemoryRouter>
      <Pricing />
    </MemoryRouter>
  );
}

beforeEach(() => vi.clearAllMocks());

test('routes paid-plan interest through the review form with plan context', () => {
  renderPricing();
  const link = screen.getAllByRole('link', { name: 'Get the free preview' })[0];

  expect(link).toHaveAttribute('href', '/contact?intent=free-preview');
  expect(screen.queryByRole('link', { name: /create account/i })).not.toBeInTheDocument();

  fireEvent.click(link);
  expect(trackFunnelEvent).not.toHaveBeenCalled();
});

test('publishes the entry price and includes the onboarding scan in Team Signals', () => {
  renderPricing();
  expect(screen.getByText('$0 to start')).toBeInTheDocument();
  expect(
    screen.getByText('No employee data, integrations, payment or commitment')
  ).toBeInTheDocument();
  expect(screen.queryByText('Custom pilot price')).not.toBeInTheDocument();
});
