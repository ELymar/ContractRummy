const GameServer = require('../../src/server/GameServer');
const TestBotClient = require('../helpers/TestBotClient');

async function startServerOnRandomPort(options = {}) {
  const port = 13000 + Math.floor(Math.random() * 1000);
  const server = new GameServer({port, enableLogging: false, autoJoinReady: false, ...options});
  await server.start();
  return {server, port};
}

describe('startGame broadcasts READY events', () => {
  test('clients receive GAME_STARTED / TURN_STARTED when startGame is called', async () => {
    const {server, port} = await startServerOnRandomPort();
    const url = `ws://localhost:${port}`;

    const p1 = new TestBotClient(url);
    const p2 = new TestBotClient(url);
    await Promise.all([p1.connect(), p2.connect()]);

    // start game (should emit GAME_STARTED and TURN_STARTED)
    server.startGame();

    // wait briefly for events to be delivered
    await new Promise((r) => setTimeout(r, 200));

    const allEvents = [...p1.events, ...p2.events];
    const types = allEvents.map((e) => e.type);
    expect(types).toEqual(expect.arrayContaining(['GAME_STARTED', 'TURN_STARTED']));

    await Promise.all([p1.close(), p2.close()]);
    await server.stop();
  });
});
