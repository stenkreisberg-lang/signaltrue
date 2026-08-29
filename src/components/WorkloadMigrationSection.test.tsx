import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import WorkloadMigrationSection from './WorkloadMigrationSection';

test('shows the seeded migration evidence without making a causal claim', () => {
  render(<WorkloadMigrationSection />);

  expect(
    screen.getByRole('img', {
      name: /meeting load falls by 31 percent.*chat coordination rises.*22 percent/i,
    })
  ).toBeInTheDocument();
  expect(screen.getByText('↓ 31% meetings')).toBeInTheDocument();
  expect(screen.getByText('↑ 22% chat')).toBeInTheDocument();
  expect(
    screen.getByText(
      'Meeting load fell. Coordination did not. Whether one caused the other is a question for the team, not for the data.'
    )
  ).toBeInTheDocument();
});
