/**
 * Copy static assets into the standalone output.
 *
 * `output: standalone` produces a server that expects `.next/static` and
 * `public` beside it, but does not copy them itself. Without this step the app
 * serves HTML with every stylesheet and font missing, which looks like a broken
 * design system rather than a missing copy step.
 *
 * Running it as part of the build means the local server and the container run
 * the exact same artifact, so a layout that works locally cannot break on
 * Cloud Run for reasons nobody saw.
 */

import { cp, access } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const standalone = join(root, '.next', 'standalone');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

await cp(join(root, '.next', 'static'), join(standalone, '.next', 'static'), {
  recursive: true,
});

if (await exists(join(root, 'public'))) {
  await cp(join(root, 'public'), join(standalone, 'public'), { recursive: true });
}

console.log('standalone assets copied');
