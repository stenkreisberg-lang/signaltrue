import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const ADDITIONAL_MARKETING_PATTERNS = [/risk level/i, /manager load/i];

function backendForbiddenPatterns() {
  const serviceSource = readFileSync(
    'backend/services/controlReview/hsInterpretationService.js',
    'utf8'
  );
  const patternBlock = serviceSource.match(
    /export const FORBIDDEN_PATTERNS = \[([\s\S]*?)\];/
  )?.[1];

  if (!patternBlock) throw new Error('Could not read the backend forbidden-language rules.');

  return patternBlock
    .split('\n')
    .map((line) => line.match(/^\s*\/(.+)\/([a-z]*),?\s*$/i))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => new RegExp(match[1], match[2]));
}

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
    const patterns = [...backendForbiddenPatterns(), ...ADDITIONAL_MARKETING_PATTERNS];

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
