import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import Navbar from './Navbar';

test('announces the mobile menu state and identifies the controlled menu', () => {
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

  const toggle = screen.getByRole('button', { name: 'Toggle menu' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(toggle).toHaveAttribute('aria-controls', 'mobile-menu');

  fireEvent.click(toggle);

  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(document.getElementById('mobile-menu')).toBeInTheDocument();
});
