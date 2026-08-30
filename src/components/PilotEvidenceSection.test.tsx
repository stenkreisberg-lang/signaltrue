import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import PilotEvidenceSection from './PilotEvidenceSection';

test('states both the pilot evidence and its limits', () => {
  render(
    <MemoryRouter>
      <PilotEvidenceSection />
    </MemoryRouter>
  );

  expect(screen.getByText(/1,090 connected work events/i)).toBeInTheDocument();
  expect(screen.getByText(/incomplete attribution and outcome labels/i)).toBeInTheDocument();
  expect(screen.getByText(/causal, predictive, ROI/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /review the evidence boundaries/i })).toHaveAttribute(
    'href',
    '/trust'
  );
});
