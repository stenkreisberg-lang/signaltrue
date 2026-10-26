import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import semver from 'semver';

function readLock(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

describe('dependency security lockfile regression', () => {
  const frontend = readLock('../../package-lock.json');
  const backend = readLock('../package-lock.json');

  test.each([
    ['frontend', frontend],
    ['backend', backend],
  ])('%s locks a patched follow-redirects', (_name, lock) => {
    const version = lock.packages?.['node_modules/follow-redirects']?.version;
    expect(semver.valid(version)).not.toBeNull();
    expect(semver.gte(version, '1.16.1')).toBe(true);
  });

  test.each([
    ['body-parser', '2.4.0'],
    ['multer', '2.5.0'],
    ['undici', '7.30.1'],
    ['ip-address', '10.7.4'],
    ['nodemailer', '10.1.4'],
  ])('backend locks a patched %s', (name, minimum) => {
    const version = backend.packages?.[`node_modules/${name}`]?.version;
    expect(semver.valid(version)).not.toBeNull();
    expect(semver.gte(version, minimum)).toBe(true);
  });

  test('frontend locks patched Zod', () => {
    const version = frontend.packages?.['node_modules/zod']?.version;
    expect(semver.valid(version)).not.toBeNull();
    expect(semver.gte(version, '4.6.6')).toBe(true);
  });
});
