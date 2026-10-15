import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import SampleReport from './SampleReport';
import { trackFunnelEvent } from '../lib/analytics';

vi.mock('../lib/analytics', () => ({ trackFunnelEvent: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

test('tracks a successful sample report open once', () => {
  render(
    <MemoryRouter>
      <SampleReport />
    </MemoryRouter>
  );
  expect(trackFunnelEvent).toHaveBeenCalledTimes(1);
  expect(trackFunnelEvent).toHaveBeenCalledWith('sample_report_view', {
    cta_location: 'sample_report_page',
  });
});

test('tracks printing and offers a closing commercial action', () => {
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  render(
    <MemoryRouter>
      <SampleReport />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: /Print sample/i }));
  expect(trackFunnelEvent).toHaveBeenCalledWith('sample_report_print', {
    cta_location: 'sample_report_hero',
  });
  expect(print).toHaveBeenCalledTimes(1);
  const closingSection = screen
    .getByText(/Have one real control you need to review/i)
    .closest('section')!;
  const closingCta = within(closingSection).getByRole('link', {
    name: /Get a free preview/i,
  });
  expect(closingCta).toHaveAttribute('href', '/contact?intent=free-preview');
  expect(closingCta).toHaveAttribute('data-cta-location', 'sample_report_final');
  print.mockRestore();
});
