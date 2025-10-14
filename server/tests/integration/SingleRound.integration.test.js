const GameServer = require('../../src/server/GameServer');
const TestBotClient = require('../helpers/TestBotClient');

// Note: This is a harness skeleton. It uses a trivial deck and tiny script to validate the pipeline.

async function startServerOnRandomPort(options = {}) {
  const port = 12000 + Math.floor(Math.random() * 1000);
  const server = new GameServer({port, enableLogging: false, autoJoinReady: false, ...options});
  await server.start();
  return {server, port};
}

describe('WS integration: two bots single-round skeleton', () => {
  test('boots server, connects 2 bots, seeds deck, and runs a couple turns', async () => {
    const {server, port} = await startServerOnRandomPort();
    const url = `ws://localhost:${port}`;

    const p1 = new TestBotClient(url);
    const p2 = new TestBotClient(url);
    await Promise.all([p1.connect(), p2.connect()]);

    // Set a tiny deterministic deck (we only need enough to deal + a draw or two)
    // We’ll just reuse current deck order but this demonstrates API; real tests will set explicit cards
    const existingDeck = server.engine.state.deck.cards.slice();
    server.setDeck(existingDeck);

    // Start game (READY both)
    server.startGame();

    // Queue simple scripted steps: force a discard from each after first turn draw where required
    // Let non-dealer discard immediately on first turn
    p1.enqueue({action: 'DISCARD', payload: {card: p1.view?.yourHand?.[0] || '[2♣]'}});
    p1.enqueue({action: 'END_TURN'});

    // Next player draws then discards
    p2.enqueue({action: 'DRAW', payload: {source: 'deck'}});
    p2.enqueue({action: 'DISCARD', payload: {card: p2.view?.yourHand?.[0] || '[3♣]'}});
    p2.enqueue({action: 'END_TURN'});

    // Wait a bit for turns to process
    await new Promise((r) => setTimeout(r, 500));

    // Basic sanity: both clients received TURN_STARTED at least once
    const p1TurnEvents = p1.events.filter((e) => e.type === 'TURN_STARTED');
    const p2TurnEvents = p2.events.filter((e) => e.type === 'TURN_STARTED');
    expect(p1TurnEvents.length + p2TurnEvents.length).toBeGreaterThan(0);

    // Cleanup
    await Promise.all([p1.close(), p2.close()]);
    await server.stop();
  });
});
