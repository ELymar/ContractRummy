// Browser stub for Node's `crypto` — the engine only uses randomUUID().
module.exports = {
  randomUUID: () => globalThis.crypto.randomUUID(),
};
