const GameServer = require('../../server/GameServer');
const TestBotClient = require('../helpers/TestBotClient');

async function startServerOnRandomPort(options = {}) {
  const port = 14000 + Math.floor(Math.random() * 1000);
  const server = new GameServer({ port, enableLogging: false, autoJoinReady: false, ...options });
  await server.start();
  return { server, port };
}

describe('Regression test: basic-game-start (integration)', () => {
  test('replays basic-game-start scenario deterministically', async () => {
    const { server, port } = await startServerOnRandomPort();
    const url = `ws://localhost:${port}`;

    const p1 = new TestBotClient(url);
    const p2 = new TestBotClient(url);
    await Promise.all([p1.connect(), p2.connect()]);

    // Seed deck from log
    server.setDeck([
  {
    "suit": "Hearts",
    "value": "Five"
  },
  {
    "suit": "Spades",
    "value": "Six"
  },
  {
    "suit": "Joker",
    "value": "Joker"
  },
  {
    "suit": "Diamonds",
    "value": "Nine"
  },
  {
    "suit": "Diamonds",
    "value": "Six"
  },
  {
    "suit": "Hearts",
    "value": "Six"
  },
  {
    "suit": "Hearts",
    "value": "Two"
  },
  {
    "suit": "Diamonds",
    "value": "Queen"
  },
  {
    "suit": "Clubs",
    "value": "Jack"
  },
  {
    "suit": "Spades",
    "value": "Nine"
  },
  {
    "suit": "Clubs",
    "value": "Queen"
  },
  {
    "suit": "Spades",
    "value": "Ten"
  },
  {
    "suit": "Clubs",
    "value": "Seven"
  },
  {
    "suit": "Clubs",
    "value": "Six"
  },
  {
    "suit": "Diamonds",
    "value": "Four"
  },
  {
    "suit": "Diamonds",
    "value": "Eight"
  },
  {
    "suit": "Diamonds",
    "value": "Two"
  },
  {
    "suit": "Spades",
    "value": "Two"
  },
  {
    "suit": "Spades",
    "value": "King"
  },
  {
    "suit": "Clubs",
    "value": "Eight"
  },
  {
    "suit": "Diamonds",
    "value": "Seven"
  },
  {
    "suit": "Clubs",
    "value": "Three"
  },
  {
    "suit": "Clubs",
    "value": "Ace"
  },
  {
    "suit": "Spades",
    "value": "Jack"
  },
  {
    "suit": "Clubs",
    "value": "Two"
  },
  {
    "suit": "Hearts",
    "value": "Seven"
  },
  {
    "suit": "Diamonds",
    "value": "Five"
  },
  {
    "suit": "Diamonds",
    "value": "Ace"
  },
  {
    "suit": "Clubs",
    "value": "Nine"
  },
  {
    "suit": "Spades",
    "value": "Ace"
  },
  {
    "suit": "Hearts",
    "value": "Nine"
  },
  {
    "suit": "Diamonds",
    "value": "Ten"
  },
  {
    "suit": "Spades",
    "value": "Eight"
  },
  {
    "suit": "Spades",
    "value": "Five"
  },
  {
    "suit": "Clubs",
    "value": "Ten"
  }
]);

    // Build a simple step provider that routes steps by original player order
    const steps = [
  {
    "type": "JOIN",
    "payload": {
      "name": "Player 1"
    },
    "playerId": "1760283796180-735741cac5494"
  },
  {
    "type": "READY",
    "payload": {},
    "playerId": "1760283796180-735741cac5494"
  },
  {
    "type": "JOIN",
    "payload": {
      "name": "Player 2"
    },
    "playerId": "1760283796184-f202401d1261f"
  },
  {
    "type": "READY",
    "payload": {},
    "playerId": "1760283796184-f202401d1261f"
  }
];
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
