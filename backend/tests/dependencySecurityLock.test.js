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

  test('frontend locks patched Zod', () => {
    const version = frontend.packages?.['node_modules/zod']?.version;
    expect(semver.valid(version)).not.toBeNull();
    expect(semver.gte(version, '4.6.6')).toBe(true);
  });
});
