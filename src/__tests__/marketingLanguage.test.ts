import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { FORBIDDEN_PATTERNS } from '../../backend/services/controlReview/hsInterpretationService.js';

const ADDITIONAL_MARKETING_PATTERNS = [/risk level/i, /manager load/i];

function trackedMarketingFiles() {
  return execFileSync(
    'git',
    ['ls-files', 'src/pages/**', 'src/pages/*', 'src/components/**', 'src/components/*'],
    { cwd: process.cwd(), encoding: 'utf8' }
  )
    .split('\n')
    .filter((file) => /\.(js|jsx|ts|tsx)$/.test(file))
    .filter((file) => !/\.(test|spec)\./.test(file));
}

describe('marketing language guardrail', () => {
  test('tracked page and component copy respects the backend language rules', () => {
    const violations: string[] = [];
    const patterns = [...FORBIDDEN_PATTERNS, ...ADDITIONAL_MARKETING_PATTERNS];

    for (const file of trackedMarketingFiles()) {
      const source = readFileSync(file, 'utf8');
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        if (pattern.test(source)) violations.push(`${file}: /${pattern.source}/i`);
      }
    }

    expect(violations).toEqual([]);
  });
});
