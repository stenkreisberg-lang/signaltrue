import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HRDecisionSnapshotEnglish from './HRDecisionSnapshotEnglish';

vi.mock('react-router-dom', () => ({
  Link: ({ children }) => children,
}));

it('uses the inclusive end of the saved report period even in Tallinn time zone', () => {
  render(
    <HRDecisionSnapshotEnglish
      brief={{
        reportTimeZone: 'Europe/Tallinn',
        periodStart: '2026-11-09T00:00:00Z',
        periodEnd: '2026-11-16T00:00:00Z',
        metrics: [],
        coverage: {},
        actions: {},
      }}
    />
  );

  expect(screen.getByText(/Nov 9, 2026 to Nov 15, 2026/)).toBeInTheDocument();
  expect(screen.getByText('Open a documented control review')).toBeInTheDocument();
});
