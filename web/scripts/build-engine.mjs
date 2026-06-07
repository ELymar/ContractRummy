// Prebundle the authoritative engine + AI into a browser ESM module.
// CommonJS + a few Node-only deps (chalk, crypto) are handled here so the rest
// of the web app imports a single clean ESM file (src/engine/bundle.js).
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.join(here, '..');

await build({
  entryPoints: [path.join(web, 'src/engine/entry.js')],
  outfile: path.join(web, 'src/engine/bundle.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  logLevel: 'info',
  // The engine lives in ../server, so also let esbuild resolve from web's
  // node_modules (where the `events` browser polyfill is installed).
  nodePaths: [path.join(web, 'node_modules')],
  alias: {
    chalk: path.join(web, 'src/engine/stubs/chalk.cjs'),
    crypto: path.join(web, 'src/engine/stubs/crypto.cjs'),
  },
});

console.log('engine bundle written to src/engine/bundle.js');
