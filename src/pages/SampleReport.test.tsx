import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import SampleReport from './SampleReport';
import { trackFunnelEvent } from '../lib/analytics';

vi.mock('../lib/analytics', () => ({ trackFunnelEvent: vi.fn() }));

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
