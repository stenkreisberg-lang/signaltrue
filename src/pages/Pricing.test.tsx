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
  const link = screen.getByRole('link', { name: 'Discuss Team Signals' });

  expect(link).toHaveAttribute('href', '/contact?intent=pricing&plan=visibility');
  expect(screen.queryByRole('link', { name: /create account/i })).not.toBeInTheDocument();

  fireEvent.click(link);
  expect(trackFunnelEvent).toHaveBeenCalledWith('pricing_plan_click', {
    cta_location: 'pricing_visibility',
    plan: 'visibility',
  });
  expect(trackFunnelEvent).toHaveBeenCalledWith(
    'primary_cta_click',
    expect.objectContaining({ cta_location: 'pricing_visibility', plan: 'visibility' })
  );
});

test('publishes the entry price and includes the onboarding scan in Team Signals', () => {
  renderPricing();
  expect(screen.getByText('€299')).toBeInTheDocument();
  expect(screen.getByText('First-month onboarding scan')).toBeInTheDocument();
  expect(screen.queryByText('Custom pilot price')).not.toBeInTheDocument();
});
