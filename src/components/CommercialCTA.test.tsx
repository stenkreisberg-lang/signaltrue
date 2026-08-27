import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { PrimaryCommercialCTA } from './CommercialCTA';
import { trackFunnelEvent } from '../lib/analytics';

vi.mock('../lib/analytics', () => ({ trackFunnelEvent: vi.fn() }));

test('records the CTA location on the primary commercial action', () => {
  render(
    <MemoryRouter>
      <PrimaryCommercialCTA ctaLocation="homepage_problem" />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('link'));
  expect(trackFunnelEvent).toHaveBeenCalledWith('primary_cta_click', {
    cta_location: 'homepage_problem',
    cta_destination: '/psychosocial-risk-visibility-review#request-review',
  });
});
