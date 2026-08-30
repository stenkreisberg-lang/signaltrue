import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, test } from 'vitest';
import Footer from './Footer';

test('only links to the verified company social profile', () => {
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );

  expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
    'href',
    'https://linkedin.com/company/signaltrue'
  );
  expect(document.querySelector('a[href*="twitter.com"], a[href*="x.com"]')).toBeNull();
});
