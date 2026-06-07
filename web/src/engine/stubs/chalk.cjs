// Browser stub for `chalk` (terminal colors). The GUI never shows ANSI colors,
// so every chalk.<color>(s) just returns the string unchanged.
const passthrough = (s) => s;
module.exports = new Proxy({}, { get: () => passthrough });
