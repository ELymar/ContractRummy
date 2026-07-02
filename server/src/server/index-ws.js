const GameServer = require('./GameServer');

const port = process.env.WS_PORT ? Number(process.env.WS_PORT) : 8080;
// Human-facing server: pause after each round so clients can show the score
// table; any player advances play with a {kind:'next_round'} message.
new GameServer({port, pauseAtRoundEnd: true}).start();
