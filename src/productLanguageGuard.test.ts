import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
      const path = resolve(process.cwd(), 'src', relativePath.replace(/^\.\//, ''));
      const source = readFileSync(path, 'utf8');

      for (const claim of forbiddenClaims) {
        expect(source).not.toMatch(claim);
      }
    }
  );

  it('keeps the passive-monitoring boundaries visible on the homepage and product page', () => {
    const hero = readFileSync(resolve(process.cwd(), 'src/components/Hero.tsx'), 'utf8');
    const product = readFileSync(resolve(process.cwd(), 'src/pages/Product.tsx'), 'utf8');

    expect(hero).toContain('No recurring survey required for work-pattern evidence');
    expect(hero).toContain('No message content');
    expect(product).toContain('No individual productivity scores');
    expect(product).toMatch(/No\s+surveys\s+required/);
  });
});
