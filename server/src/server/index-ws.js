const GameServer = require('./GameServer');

const port = process.env.WS_PORT ? Number(process.env.WS_PORT) : 8080;
new GameServer({ port }).start();
