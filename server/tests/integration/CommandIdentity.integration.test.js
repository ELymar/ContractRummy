const GameServer = require('../../src/server/GameServer');
const TestBotClient = require('../helpers/TestBotClient');

async function startServerOnRandomPort(options = {}) {
  const port = 14000 + Math.floor(Math.random() * 1000);
  const server = new GameServer({port, enableLogging: false, autoJoinReady: false, ...options});
  await server.start();
  return {server, port};
}

/**
 * Regression: the server must attribute commands to the connection they
 * arrive on. A client sending someone else's playerId in the command payload
 * must not be able to act as that player.
 */
describe('WS integration: command identity', () => {
  test('a spoofed playerId is ignored — the connection identity wins', async () => {
    const {server, port} = await startServerOnRandomPort();
    const url = `ws://localhost:${port}`;

    const p1 = new TestBotClient(url);
    const p2 = new TestBotClient(url);
    await p1.connect();
    await p2.connect();
    server.startGame();
    await p1.waitForUpdate(1000);

    // Whoever holds the turn is the victim; the other client attacks.
    const engine = server.engine;
    const current = engine.state.players[engine.state.currentPlayerIndex];
    const attacker = [p1, p2].find((c) => c.playerId !== current.id);
    const victimHandBefore = current.hand.cards.length;

    // Attacker claims the victim's identity and tries to discard their card.
    attacker.ws.send(
      JSON.stringify({
        kind: 'command',
        command: {
          type: 'DISCARD',
          playerId: current.id, // spoofed
          payload: {cardUuid: current.hand.cards[0].uuid},
        },
      })
    );
    await attacker.waitForUpdate(1000);

    // The command ran as the attacker (not their turn) and was rejected;
    // the victim's hand is untouched.
    expect(current.hand.cards.length).toBe(victimHandBefore);
    const error = attacker.events.find((e) => e.type === 'ERROR');
    expect(error).toBeDefined();

    await Promise.all([p1.close(), p2.close()]);
    await server.stop();
  });
});
