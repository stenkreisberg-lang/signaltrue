import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { PrimaryCommercialCTA, SampleReportCTA } from './CommercialCTA';
import { trackFunnelEvent } from '../lib/analytics';

vi.mock('../lib/analytics', () => ({ trackFunnelEvent: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

test('records the CTA location on the primary commercial action', () => {
  render(
    <MemoryRouter>
      <PrimaryCommercialCTA ctaLocation="homepage_problem" />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('link'));
  expect(trackFunnelEvent).toHaveBeenCalledWith('primary_cta_click', {
    cta_location: 'homepage_problem',
    cta_destination: '/contact?intent=demo',
    intent: 'demo',
  });
});

test('records discovery of the fictional sample report separately', () => {
  render(
    <MemoryRouter>
      <SampleReportCTA ctaLocation="homepage_hero" />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole('link'));
  expect(trackFunnelEvent).toHaveBeenCalledWith('sample_report_click', {
    cta_location: 'homepage_hero',
    cta_destination: '/sample-report',
  });
});

test('carries a selected plan into the review journey and event', () => {
  render(
    <MemoryRouter>
      <PrimaryCommercialCTA
        ctaLocation="pricing_visibility"
        queryParams={{ plan: 'visibility', intent: 'pricing' }}
      />
    </MemoryRouter>
  );
  const link = screen.getByRole('link');
  expect(link).toHaveAttribute('href', '/contact?intent=pricing&plan=visibility');
  fireEvent.click(link);
  expect(trackFunnelEvent).toHaveBeenCalledWith('primary_cta_click', {
    cta_location: 'pricing_visibility',
    cta_destination: '/contact?intent=pricing&plan=visibility',
    plan: 'visibility',
    intent: 'pricing',
  });
});
