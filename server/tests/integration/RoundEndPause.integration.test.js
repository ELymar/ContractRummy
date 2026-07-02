const GameServer = require('../../src/server/GameServer');
const TestBotClient = require('../helpers/TestBotClient');
const Card = require('../../src/core/domain/Card');

async function startServerOnRandomPort(options = {}) {
  const port = 13000 + Math.floor(Math.random() * 1000);
  const server = new GameServer({port, enableLogging: false, autoJoinReady: false, ...options});
  await server.start();
  return {server, port};
}

/**
 * pauseAtRoundEnd: the server must NOT deal the next round on ROUND_ENDED;
 * it waits for a {kind:'next_round'} message from any player, then deals.
 */
describe('WS integration: round-end pause and next_round', () => {
  test('pauses at round end, includes scoreboard, resumes on next_round', async () => {
    const {server, port} = await startServerOnRandomPort({pauseAtRoundEnd: true});
    const url = `ws://localhost:${port}`;

    const p1 = new TestBotClient(url);
    const p2 = new TestBotClient(url);
    await p1.connect();
    await p2.connect();
    server.startGame();
    await p1.waitForUpdate(1000);

    // Rig the current player to one card, ready to discard and go out.
    const engine = server.engine;
    const current = engine.state.players[engine.state.currentPlayerIndex];
    current.hand.cards = [new Card('Hearts', 'Five')];
    current.tookCard = true;
    engine.state.firstTurn = false;

    const winnerClient = [p1, p2].find((c) => c.playerId === current.id);
    winnerClient.sendCommand('DISCARD', {cardUuid: current.hand.cards[0].uuid});
    await p1.waitForUpdate(1000);
    await new Promise((r) => setTimeout(r, 200));

    // Both clients saw ROUND_ENDED with a structured scoreboard.
    for (const client of [p1, p2]) {
      const ended = client.events.find((e) => e.type === 'ROUND_ENDED');
      expect(ended).toBeDefined();
      expect(ended.payload.scoreboard).toBeDefined();
      expect(ended.payload.scoreboard.totalRounds).toBe(7);
      expect(ended.payload.scoreboard.players).toHaveLength(2);
      const row = ended.payload.scoreboard.players[0];
      expect(row.rounds[0]).not.toBeNull(); // round 1 recorded
      expect(row.rounds[1]).toBeNull(); // round 2 not played
      expect(typeof row.total).toBe('number');
    }

    // Paused: still round 1, no new hands dealt.
    expect(server.roundPending).toBe(true);
    expect(engine.state.currentRound).toBe(1);

    // Any player advances play.
    p2.ws.send(JSON.stringify({kind: 'next_round'}));
    await p1.waitForUpdate(1000);
    await new Promise((r) => setTimeout(r, 200));

    expect(server.roundPending).toBe(false);
    expect(engine.state.currentRound).toBe(2);
    expect(p1.view.round).toBe(2);
    expect(p2.view.round).toBe(2);
    expect(p1.view.yourHand.length).toBeGreaterThan(0);

    // Duplicate next_round is ignored (no double-deal).
    p1.ws.send(JSON.stringify({kind: 'next_round'}));
    await new Promise((r) => setTimeout(r, 200));
    expect(engine.state.currentRound).toBe(2);

    await Promise.all([p1.close(), p2.close()]);
    await server.stop();
  });

  test('default server still auto-starts the next round', async () => {
    const {server, port} = await startServerOnRandomPort(); // no pause option
    const url = `ws://localhost:${port}`;

    const p1 = new TestBotClient(url);
    const p2 = new TestBotClient(url);
    await p1.connect();
    await p2.connect();
    server.startGame();
    await p1.waitForUpdate(1000);

    const engine = server.engine;
    const current = engine.state.players[engine.state.currentPlayerIndex];
    current.hand.cards = [new Card('Spades', 'Nine')];
    current.tookCard = true;
    engine.state.firstTurn = false;

    const winnerClient = [p1, p2].find((c) => c.playerId === current.id);
    winnerClient.sendCommand('DISCARD', {cardUuid: current.hand.cards[0].uuid});
    await p1.waitForUpdate(1000);
    await new Promise((r) => setTimeout(r, 300));

    expect(engine.state.currentRound).toBe(2); // auto-advanced

    await Promise.all([p1.close(), p2.close()]);
    await server.stop();
  });
});
