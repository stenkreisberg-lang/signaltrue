import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Button } from './button';

test('keeps the hero button text colour when a large size is applied', () => {
  render(
    <Button variant="hero" size="xl">
      Talk to us
    </Button>
  );

  const button = screen.getByRole('button', { name: 'Talk to us' });
  expect(button).toHaveClass('bg-brand', 'text-white', '[font-size:16px]');
});

test('keeps the outlined hero button text colour when a large size is applied', () => {
  render(
    <Button variant="hero-outline" size="xl">
      See how it works
    </Button>
  );

  const button = screen.getByRole('button', { name: 'See how it works' });
  expect(button).toHaveClass('bg-white', 'text-brand-hover', '[font-size:16px]');
});
