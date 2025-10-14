const GameLogger = require('../../src/server/GameLogger');

// Fake card objects with toString
function makeCard(s) {
  return {toString: () => s};
}

describe('GameLogger serializeCard', () => {
  test('serializes Card objects and raw strings consistently', () => {
    const g = new GameLogger('test-game-1');
    const c1 = makeCard('[A♥]');
    const c2 = '[A♥]';
    expect(g.serializeCard(c1)).toBe('[A♥]');
    expect(g.serializeCard(c2)).toBe('[A♥]');
  });
});
