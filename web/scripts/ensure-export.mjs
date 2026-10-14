import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

// `next dev` and `next build` share .next, and the static export lives in out/.
// Rebuild when the export is missing so `npm run preview` always has something to
// serve. Goes through npm so the postbuild packaging step always runs too.
if (existsSync('out/index.html')) {
  process.exit(0);
}

console.log(
  '\n[urja-sync] No static export in out/ - running `npm run build` first...\n',
);
execSync('npm run build', { stdio: 'inherit' });
