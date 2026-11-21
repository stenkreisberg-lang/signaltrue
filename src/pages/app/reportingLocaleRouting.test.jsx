import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Overview from './Overview';
import LatestBrief from './LatestBrief';

vi.mock('./OverviewEnglish', () => ({
  default: () => <div>English overview selected</div>,
}));
vi.mock('./LatestBriefEnglish', () => ({
  default: () => <div>English report selected</div>,
}));

beforeEach(() => {
  window.localStorage.removeItem('signaltrue.uiLocale');
});

it('defaults to the English overview without looking at report time zone', () => {
  render(<Overview />);
  expect(screen.getByText('English overview selected')).toBeInTheDocument();
});

it('defaults to the English report without looking at report time zone', () => {
  render(<LatestBrief />);
  expect(screen.getByText('English report selected')).toBeInTheDocument();
});
