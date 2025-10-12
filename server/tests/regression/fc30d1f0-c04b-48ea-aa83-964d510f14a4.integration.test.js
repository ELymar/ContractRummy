const GameServer = require('../../server/GameServer');
const TestBotClient = require('../helpers/TestBotClient');

async function startServerOnRandomPort(options = {}) {
  const port = 14000 + Math.floor(Math.random() * 1000);
  const server = new GameServer({ port, enableLogging: false, autoJoinReady: false, ...options });
  await server.start();
  return { server, port };
}

describe('Integration replay from log fc30d1f0-c04b-48ea-aa83-964d510f14a4.json', () => {
  test('replays action stream deterministically', async () => {
    const { server, port } = await startServerOnRandomPort();
    const url = `ws://localhost:${port}`;

    const p1 = new TestBotClient(url);
    const p2 = new TestBotClient(url);
    await Promise.all([p1.connect(), p2.connect()]);

    // Seed deck from log
    server.setDeck([
  {
    "suit": "Hearts",
    "value": "Eight"
  },
  {
    "suit": "Hearts",
    "value": "Four"
  },
  {
    "suit": "Clubs",
    "value": "Queen"
  },
  {
    "suit": "Hearts",
    "value": "Jack"
  },
  {
    "suit": "Spades",
    "value": "Five"
  },
  {
    "suit": "Clubs",
    "value": "Three"
  },
  {
    "suit": "Spades",
    "value": "Two"
  },
  {
    "suit": "Clubs",
    "value": "Ace"
  },
  {
    "suit": "Spades",
    "value": "Seven"
  },
  {
    "suit": "Diamonds",
    "value": "Six"
  },
  {
    "suit": "Spades",
    "value": "Ten"
  },
  {
    "suit": "Spades",
    "value": "Nine"
  },
  {
    "suit": "Hearts",
    "value": "Ace"
  },
  {
    "suit": "Hearts",
    "value": "Five"
  },
  {
    "suit": "Diamonds",
    "value": "Five"
  },
  {
    "suit": "Hearts",
    "value": "King"
  },
  {
    "suit": "Spades",
    "value": "Three"
  },
  {
    "suit": "Joker",
    "value": "Joker"
  },
  {
    "suit": "Diamonds",
    "value": "Four"
  },
  {
    "suit": "Clubs",
    "value": "Ten"
  },
  {
    "suit": "Hearts",
    "value": "Six"
  },
  {
    "suit": "Diamonds",
    "value": "Ten"
  },
  {
    "suit": "Clubs",
    "value": "Four"
  },
  {
    "suit": "Clubs",
    "value": "Two"
  },
  {
    "suit": "Clubs",
    "value": "Jack"
  },
  {
    "suit": "Spades",
    "value": "Eight"
  },
  {
    "suit": "Hearts",
    "value": "Queen"
  },
  {
    "suit": "Diamonds",
    "value": "Seven"
  },
  {
    "suit": "Diamonds",
    "value": "Eight"
  },
  {
    "suit": "Diamonds",
    "value": "King"
  },
  {
    "suit": "Spades",
    "value": "Queen"
  },
  {
    "suit": "Spades",
    "value": "King"
  },
  {
    "suit": "Clubs",
    "value": "Seven"
  },
  {
    "suit": "Clubs",
    "value": "Eight"
  },
  {
    "suit": "Hearts",
    "value": "Three"
  }
]);

    // Build a simple step provider that routes steps by original player order
    const steps = [
  {
    "type": "JOIN",
    "payload": {
      "name": "Player 1"
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "READY",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "JOIN",
    "payload": {
      "name": "Player 2"
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "READY",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 8,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Two"
        },
        {
          "suit": "Diamonds",
          "value": "Three"
        },
        {
          "suit": "Clubs",
          "value": "Six"
        },
        {
          "suit": "Clubs",
          "value": "Nine"
        },
        {
          "suit": "Hearts",
          "value": "Nine"
        },
        {
          "suit": "Hearts",
          "value": "Ten"
        },
        {
          "suit": "Diamonds",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "King"
        },
        {
          "suit": "Spades",
          "value": "Ace"
        },
        {
          "suit": "Joker",
          "value": "Joker"
        },
        {
          "suit": "Joker",
          "value": "Joker"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "TAKE_FROM_DISCARD",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 8,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Two"
        },
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Diamonds",
          "value": "Nine"
        },
        {
          "suit": "Hearts",
          "value": "Seven"
        },
        {
          "suit": "Diamonds",
          "value": "Ace"
        },
        {
          "suit": "Joker",
          "value": "Joker"
        },
        {
          "suit": "Spades",
          "value": "Six"
        },
        {
          "suit": "Clubs",
          "value": "Five"
        },
        {
          "suit": "Diamonds",
          "value": "Queen"
        },
        {
          "suit": "Spades",
          "value": "Jack"
        },
        {
          "suit": "Spades",
          "value": "Ace"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "LAY_DOWN",
    "payload": {
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Two"
        },
        {
          "suit": "Diamonds",
          "value": "Three"
        },
        {
          "suit": "Hearts",
          "value": "Three"
        },
        {
          "suit": "Clubs",
          "value": "Six"
        },
        {
          "suit": "Clubs",
          "value": "Nine"
        },
        {
          "suit": "Hearts",
          "value": "Nine"
        },
        {
          "suit": "Hearts",
          "value": "Ten"
        },
        {
          "suit": "Diamonds",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "King"
        },
        {
          "suit": "Joker",
          "value": "Joker"
        },
        {
          "suit": "Joker",
          "value": "Joker"
        }
      ],
      "melds": [
        {
          "cardIndices": [
            1,
            2,
            9
          ],
          "type": "set"
        },
        {
          "cardIndices": [
            4,
            5,
            10
          ],
          "type": "set"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 2,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Two"
        },
        {
          "suit": "Clubs",
          "value": "Six"
        },
        {
          "suit": "Hearts",
          "value": "Ten"
        },
        {
          "suit": "Diamonds",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "King"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 4,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Two"
        },
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Diamonds",
          "value": "Nine"
        },
        {
          "suit": "Hearts",
          "value": "Seven"
        },
        {
          "suit": "Diamonds",
          "value": "Ace"
        },
        {
          "suit": "Joker",
          "value": "Joker"
        },
        {
          "suit": "Spades",
          "value": "Six"
        },
        {
          "suit": "Clubs",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Jack"
        },
        {
          "suit": "Spades",
          "value": "Ace"
        },
        {
          "suit": "Clubs",
          "value": "Eight"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 3,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Two"
        },
        {
          "suit": "Clubs",
          "value": "Six"
        },
        {
          "suit": "Diamonds",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "King"
        },
        {
          "suit": "Clubs",
          "value": "Seven"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 9,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Two"
        },
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Clubs",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Six"
        },
        {
          "suit": "Hearts",
          "value": "Seven"
        },
        {
          "suit": "Clubs",
          "value": "Eight"
        },
        {
          "suit": "Diamonds",
          "value": "Nine"
        },
        {
          "suit": "Spades",
          "value": "Jack"
        },
        {
          "suit": "Spades",
          "value": "King"
        },
        {
          "suit": "Spades",
          "value": "Ace"
        },
        {
          "suit": "Joker",
          "value": "Joker"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 4,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Two"
        },
        {
          "suit": "Clubs",
          "value": "Six"
        },
        {
          "suit": "Diamonds",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "Seven"
        },
        {
          "suit": "Spades",
          "value": "Queen"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 4,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Two"
        },
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Clubs",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Six"
        },
        {
          "suit": "Hearts",
          "value": "Seven"
        },
        {
          "suit": "Clubs",
          "value": "Eight"
        },
        {
          "suit": "Diamonds",
          "value": "Nine"
        },
        {
          "suit": "Spades",
          "value": "Jack"
        },
        {
          "suit": "Spades",
          "value": "King"
        },
        {
          "suit": "Joker",
          "value": "Joker"
        },
        {
          "suit": "Diamonds",
          "value": "King"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 2,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Two"
        },
        {
          "suit": "Clubs",
          "value": "Six"
        },
        {
          "suit": "Diamonds",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "Seven"
        },
        {
          "suit": "Diamonds",
          "value": "Eight"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 10,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Two"
        },
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Clubs",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Six"
        },
        {
          "suit": "Clubs",
          "value": "Eight"
        },
        {
          "suit": "Diamonds",
          "value": "Nine"
        },
        {
          "suit": "Spades",
          "value": "Jack"
        },
        {
          "suit": "Spades",
          "value": "King"
        },
        {
          "suit": "Joker",
          "value": "Joker"
        },
        {
          "suit": "Diamonds",
          "value": "King"
        },
        {
          "suit": "Diamonds",
          "value": "Seven"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 4,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Two"
        },
        {
          "suit": "Clubs",
          "value": "Six"
        },
        {
          "suit": "Clubs",
          "value": "Seven"
        },
        {
          "suit": "Diamonds",
          "value": "Eight"
        },
        {
          "suit": "Hearts",
          "value": "Queen"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Two"
        },
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Clubs",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Six"
        },
        {
          "suit": "Clubs",
          "value": "Eight"
        },
        {
          "suit": "Spades",
          "value": "Eight"
        },
        {
          "suit": "Diamonds",
          "value": "Nine"
        },
        {
          "suit": "Spades",
          "value": "Jack"
        },
        {
          "suit": "Diamonds",
          "value": "King"
        },
        {
          "suit": "Spades",
          "value": "King"
        },
        {
          "suit": "Joker",
          "value": "Joker"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 3,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Two"
        },
        {
          "suit": "Clubs",
          "value": "Six"
        },
        {
          "suit": "Clubs",
          "value": "Seven"
        },
        {
          "suit": "Diamonds",
          "value": "Eight"
        },
        {
          "suit": "Clubs",
          "value": "Jack"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "TAKE_FROM_DISCARD",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "LAY_DOWN",
    "payload": {
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Clubs",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Six"
        },
        {
          "suit": "Clubs",
          "value": "Eight"
        },
        {
          "suit": "Spades",
          "value": "Eight"
        },
        {
          "suit": "Diamonds",
          "value": "Nine"
        },
        {
          "suit": "Spades",
          "value": "Jack"
        },
        {
          "suit": "Diamonds",
          "value": "King"
        },
        {
          "suit": "Spades",
          "value": "King"
        },
        {
          "suit": "Joker",
          "value": "Joker"
        },
        {
          "suit": "Diamonds",
          "value": "Eight"
        }
      ],
      "melds": [
        {
          "cardIndices": [
            3,
            4,
            10
          ],
          "type": "set"
        },
        {
          "cardIndices": [
            7,
            9,
            8
          ],
          "type": "set"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "ADD_TO_MELD",
    "payload": {
      "cardIndex": 3,
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Clubs",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Six"
        },
        {
          "suit": "Diamonds",
          "value": "Nine"
        },
        {
          "suit": "Spades",
          "value": "Jack"
        }
      ],
      "meldIndex": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Clubs",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Six"
        },
        {
          "suit": "Spades",
          "value": "Jack"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Two"
        },
        {
          "suit": "Clubs",
          "value": "Six"
        },
        {
          "suit": "Clubs",
          "value": "Seven"
        },
        {
          "suit": "Clubs",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "Two"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Clubs",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Six"
        },
        {
          "suit": "Spades",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "Four"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Clubs",
          "value": "Six"
        },
        {
          "suit": "Clubs",
          "value": "Seven"
        },
        {
          "suit": "Clubs",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "Two"
        },
        {
          "suit": "Diamonds",
          "value": "Ten"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Six"
        },
        {
          "suit": "Spades",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "Four"
        },
        {
          "suit": "Hearts",
          "value": "Six"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Clubs",
          "value": "Seven"
        },
        {
          "suit": "Clubs",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "Two"
        },
        {
          "suit": "Diamonds",
          "value": "Ten"
        },
        {
          "suit": "Clubs",
          "value": "Ten"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "Four"
        },
        {
          "suit": "Hearts",
          "value": "Six"
        },
        {
          "suit": "Diamonds",
          "value": "Four"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "ADD_TO_MELD",
    "payload": {
      "cardIndex": 4,
      "handOrder": [
        {
          "suit": "Clubs",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "Two"
        },
        {
          "suit": "Diamonds",
          "value": "Ten"
        },
        {
          "suit": "Clubs",
          "value": "Ten"
        },
        {
          "suit": "Joker",
          "value": "Joker"
        }
      ],
      "meldIndex": 0
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 3,
      "handOrder": [
        {
          "suit": "Clubs",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "Two"
        },
        {
          "suit": "Diamonds",
          "value": "Ten"
        },
        {
          "suit": "Clubs",
          "value": "Ten"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "ADD_TO_MELD",
    "payload": {
      "cardIndex": 3,
      "handOrder": [
        {
          "suit": "Clubs",
          "value": "Four"
        },
        {
          "suit": "Hearts",
          "value": "Six"
        },
        {
          "suit": "Diamonds",
          "value": "Four"
        },
        {
          "suit": "Spades",
          "value": "Three"
        }
      ],
      "meldIndex": 0
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Clubs",
          "value": "Four"
        },
        {
          "suit": "Hearts",
          "value": "Six"
        },
        {
          "suit": "Diamonds",
          "value": "Four"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "ADD_TO_MELD",
    "payload": {
      "cardIndex": 3,
      "handOrder": [
        {
          "suit": "Clubs",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "Two"
        },
        {
          "suit": "Diamonds",
          "value": "Ten"
        },
        {
          "suit": "Hearts",
          "value": "King"
        }
      ],
      "meldIndex": 3
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 2,
      "handOrder": [
        {
          "suit": "Clubs",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "Two"
        },
        {
          "suit": "Diamonds",
          "value": "Ten"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Six"
        },
        {
          "suit": "Diamonds",
          "value": "Four"
        },
        {
          "suit": "Diamonds",
          "value": "Five"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Clubs",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "Two"
        },
        {
          "suit": "Hearts",
          "value": "Five"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 2,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Four"
        },
        {
          "suit": "Diamonds",
          "value": "Five"
        },
        {
          "suit": "Hearts",
          "value": "Ace"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 2,
      "handOrder": [
        {
          "suit": "Clubs",
          "value": "Two"
        },
        {
          "suit": "Hearts",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Nine"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 2,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Four"
        },
        {
          "suit": "Diamonds",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Ten"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Clubs",
          "value": "Two"
        },
        {
          "suit": "Hearts",
          "value": "Five"
        },
        {
          "suit": "Diamonds",
          "value": "Six"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Four"
        },
        {
          "suit": "Diamonds",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Seven"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 2,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Five"
        },
        {
          "suit": "Diamonds",
          "value": "Six"
        },
        {
          "suit": "Clubs",
          "value": "Ace"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 2,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Seven"
        },
        {
          "suit": "Spades",
          "value": "Two"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "ADD_TO_MELD",
    "payload": {
      "cardIndex": 2,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Five"
        },
        {
          "suit": "Diamonds",
          "value": "Six"
        },
        {
          "suit": "Clubs",
          "value": "Three"
        }
      ],
      "meldIndex": 0
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Five"
        },
        {
          "suit": "Diamonds",
          "value": "Six"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Seven"
        },
        {
          "suit": "Spades",
          "value": "Five"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 1,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Six"
        },
        {
          "suit": "Hearts",
          "value": "Jack"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 2,
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Seven"
        },
        {
          "suit": "Spades",
          "value": "Five"
        },
        {
          "suit": "Clubs",
          "value": "Queen"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Six"
        },
        {
          "suit": "Hearts",
          "value": "Four"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "ADD_TO_MELD",
    "payload": {
      "cardIndex": 2,
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Seven"
        },
        {
          "suit": "Spades",
          "value": "Five"
        },
        {
          "suit": "Hearts",
          "value": "Eight"
        }
      ],
      "meldIndex": 2
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Seven"
        },
        {
          "suit": "Spades",
          "value": "Five"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Four"
        },
        {
          "suit": "Hearts",
          "value": "Jack"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Five"
        },
        {
          "suit": "Spades",
          "value": "Four"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 1,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Jack"
        },
        {
          "suit": "Spades",
          "value": "Ace"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 1,
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Spades",
          "value": "Jack"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Hearts",
          "value": "Jack"
        },
        {
          "suit": "Clubs",
          "value": "Six"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 1,
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Diamonds",
          "value": "Six"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Clubs",
          "value": "Six"
        },
        {
          "suit": "Diamonds",
          "value": "Two"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 1,
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Clubs",
          "value": "Jack"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 1,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Two"
        },
        {
          "suit": "Diamonds",
          "value": "Queen"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 1,
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Diamonds",
          "value": "Ten"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 1,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Two"
        },
        {
          "suit": "Diamonds",
          "value": "Four"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 1,
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Diamonds",
          "value": "Ace"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 1,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Two"
        },
        {
          "suit": "Clubs",
          "value": "Four"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 1,
      "handOrder": [
        {
          "suit": "Spades",
          "value": "Four"
        },
        {
          "suit": "Clubs",
          "value": "Ten"
        }
      ]
    },
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "END_TURN",
    "payload": {},
    "playerId": "1760296851752-c8022e81d8441"
  },
  {
    "type": "DRAW",
    "payload": {
      "nCards": 1
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "ADD_TO_MELD",
    "payload": {
      "cardIndex": 1,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Two"
        },
        {
          "suit": "Clubs",
          "value": "King"
        }
      ],
      "meldIndex": 3
    },
    "playerId": "1760296854386-98da11239f7b6"
  },
  {
    "type": "DISCARD",
    "payload": {
      "cardIndex": 0,
      "handOrder": [
        {
          "suit": "Diamonds",
          "value": "Two"
        }
      ]
    },
    "playerId": "1760296854386-98da11239f7b6"
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
