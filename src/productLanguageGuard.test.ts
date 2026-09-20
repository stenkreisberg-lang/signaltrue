import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// These are active customer/search surfaces where legacy positioning must not return.
const protectedSurfaces = [
  './components/Hero.tsx',
  './components/CTASection.tsx',
  './components/app/AppShell.js',
  './pages/About.tsx',
  './pages/Product.tsx',
  './pages/Blog.tsx',
  './seo/routeMeta.js',
];

const forbiddenClaims = [
  /detect(?:s|ed|ing)?\s+burnout/i,
  /burnout\s+risk\s+score/i,
  /critical\s+burnout/i,
  /early[- ]warning\s+system/i,
  /early\s+warning\s+signals?\s+(?:for|about)\s+burnout/i,
  /team\s+health\s+scores?/i,
  /predict(?:s|ed|ing)?\s+(?:employee\s+)?(?:burnout|psychological\s+state)/i,
];

describe('SignalTrue product-language guard', () => {
  it.each(protectedSurfaces)(
    '%s avoids prohibited predictive or diagnostic claims',
    (relativePath) => {
      const path = fileURLToPath(new URL(relativePath, import.meta.url));
      const source = readFileSync(path, 'utf8');

      for (const claim of forbiddenClaims) {
        expect(source).not.toMatch(claim);
      }
    }
  );

  it('keeps the passive-monitoring boundaries visible on the homepage and product page', () => {
    const hero = readFileSync(
      fileURLToPath(new URL('./components/Hero.tsx', import.meta.url)),
      'utf8'
    );
    const product = readFileSync(
      fileURLToPath(new URL('./pages/Product.tsx', import.meta.url)),
      'utf8'
    );

    expect(hero).toContain('No surveys required');
    expect(hero).toContain('No message content');
    expect(product).toContain('No individual productivity scores');
    expect(product).toContain('No surveys');
  });
});
