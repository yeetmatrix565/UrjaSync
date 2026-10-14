import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

// `next dev` and `next build` share the .next directory, so running the dev
// server wipes the production build and `next start` then fails with
// "Could not find a production build". BUILD_ID is the same marker Next checks.
if (existsSync('.next/BUILD_ID')) {
  process.exit(0);
}

console.log(
  '\n[urja-sync] No production build in .next - running `next build` first...\n',
);
execSync('next build', { stdio: 'inherit' });
