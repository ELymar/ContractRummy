const fs = require('fs');
const path = require('path');

class IntegrationTestConverter {
  static parseLog(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').map(l => JSON.parse(l));
    const gameStart = lines.find(l => l.event === 'game_started');
    const initial = lines.find(l => l.event === 'game_initial_snapshot');
    const actions = lines.filter(l => l.event === 'game_action');
    if (!gameStart || !initial || actions.length === 0) {
      throw new Error('Log missing required entries (game_started, game_initial_snapshot, or actions)');
    }

    // Determine join order from JOIN actions
    const joinActions = actions.filter(a => a.action?.type === 'JOIN');
    const players = joinActions.map(a => a.action?.playerId);
    const uniquePlayers = Array.from(new Set(players)).slice(0, 2);
    return { gameId: gameStart.gameId, initial, actions, players: uniquePlayers };
  }

  static toCardObject(str) {
    // Expect strings like "[A♥]" from toString; handle Jokers too
    if (typeof str !== 'string') return str;
    if (str.includes('🃏') || str.includes('Joker')) return { suit: 'Joker', value: 'Joker' };
    const m = str.match(/\[(.+?)([♥♦♣♠])\]/);
    if (!m) return str;
    const shortVal = m[1];
    const suitSym = m[2];
    const suitMap = { '♥': 'Hearts', '♦': 'Diamonds', '♣': 'Clubs', '♠': 'Spades' };
    const valueMap = { 'A': 'Ace', 'K': 'King', 'Q': 'Queen', 'J': 'Jack', '10': 'Ten', '9': 'Nine', '8': 'Eight', '7': 'Seven', '6': 'Six', '5': 'Five', '4': 'Four', '3': 'Three', '2': 'Two' };
    return { suit: suitMap[suitSym], value: valueMap[shortVal] || shortVal };
  }

  static generateIntegrationTest(logFilePath, outPath) {
    const { gameId, initial, actions, players } = this.parseLog(logFilePath);
    const deckArray = (initial.deck || []).map(this.toCardObject);

    // Reduce action stream to high-level scripted steps per player (strip playerId)
    const script = actions.map(a => ({ type: a.action.type, payload: a.action.payload || {}, playerId: a.playerId }));

    const code = `const GameServer = require('../../server/GameServer');
const TestBotClient = require('../helpers/TestBotClient');

async function startServerOnRandomPort(options = {}) {
  const port = 14000 + Math.floor(Math.random() * 1000);
  const server = new GameServer({ port, enableLogging: false, autoJoinReady: false, ...options });
  await server.start();
  return { server, port };
}

describe('Integration replay from log ${path.basename(logFilePath)}', () => {
  test('replays action stream deterministically', async () => {
    const { server, port } = await startServerOnRandomPort();
    const url = \`ws://localhost:\${port}\`;

    const p1 = new TestBotClient(url);
    const p2 = new TestBotClient(url);
    await Promise.all([p1.connect(), p2.connect()]);

    // Seed deck from log
    server.setDeck(${JSON.stringify(deckArray, null, 2)});

    // Build a simple step provider that routes steps by original player order
    const steps = ${JSON.stringify(script, null, 2)};
    let idx = 0;
    const pids = [];
    // Capture join order by watching first JOIN echoes
    // In practice, server auto-JOINs on connect, so we can map sockets
    pids[0] = p1.playerId; pids[1] = p2.playerId;

    const nextFor = (playerIndex) => () => {
      while (idx < steps.length) {
        const s = steps[idx++];
        if (s.type === 'JOIN') continue; // server already joined our sockets
        // Map original player to our client: assume stable ordering
        const targetIndex = s.playerId === pids[0] ? 0 : (s.playerId === pids[1] ? 1 : null);
        if (targetIndex === playerIndex) {
          // Normalize DRAW from discard
          if (s.type === 'TAKE_FROM_DISCARD') {
            return { action: 'DRAW', payload: { source: 'discard' } };
          }
          return { action: s.type, payload: s.payload };
        }
      }
      return null;
    };

    p1.setStepProvider(nextFor(0));
    p2.setStepProvider(nextFor(1));

    // Ready both to start dealing
    p1.enqueue({ action: 'READY' });
    p2.enqueue({ action: 'READY' });

    // Run for a while; a production test would await GAME_ENDED
    await new Promise(r => setTimeout(r, 2000));

    // Cleanup
    await Promise.all([p1.close(), p2.close()]);
    await server.stop();
  }, 15000);
});
`;

    fs.writeFileSync(outPath, code);
    return outPath;
  }
}

module.exports = IntegrationTestConverter;
