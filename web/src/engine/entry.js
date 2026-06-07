// Bundle entry: pulls the authoritative engine + AI brain (CommonJS, in
// ../../../server/src) and re-exports them as ESM for the browser. esbuild
// (scripts/build-engine.mjs) bundles this into engine/bundle.js with the
// chalk/crypto stubs and the events polyfill.
import GameEngine from '../../../server/src/core/engine/GameEngine';
import { decideAction } from '../../../server/src/ai/decideAction';

export { GameEngine, decideAction };
