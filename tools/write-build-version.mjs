import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

function readGitCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || readGitCommit();

mkdirSync('build', { recursive: true });
writeFileSync('build/build-version.json', `${JSON.stringify({ commit })}\n`, 'utf8');
console.log(`Wrote build/build-version.json for ${commit}`);
