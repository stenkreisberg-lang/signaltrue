import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import EstonianSnapshot from './HRDecisionSnapshot';
import EnglishSnapshot from './HRDecisionSnapshotEnglish';

const brief = {
  periodStart: '2026-11-15T22:00:00Z',
  periodEnd: '2026-11-22T22:00:00Z',
  reportTimeZone: 'Europe/Tallinn',
  metrics: [
    {
      key: 'meeting_hours',
      unit: 'hours',
      current: 9,
      previous: 350,
      available: true,
      comparisonReason: 'Coverage changed',
      changePct: null,
    },
  ],
};

describe('HR reporting periods and withheld comparisons', () => {
  it('shows the inclusive dates in the organisation time zone and withholds an unusable baseline', () => {
    render(
      <MemoryRouter>
        <EnglishSnapshot brief={brief} />
      </MemoryRouter>
    );
    expect(screen.getByText(/16 Nov 2026 to 22 Nov 2026/)).toBeTruthy();
    expect(screen.queryByText(/Previous period: 350/)).toBeNull();
    expect(screen.getByText(/Coverage changed/)).toBeTruthy();
  });

  it('distinguishes missing comparisons and unknown coverage from measured inactivity', () => {
    render(
      <MemoryRouter>
        <EstonianSnapshot brief={brief} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Muutust ei saa hinnata/)).toBeTruthy();
    expect(screen.getByText('teadmata')).toBeTruthy();
  });
});
