const express = require('express');
const uuid = require('uuid').v4;
const games = new Map();

/*
  Game has list of up to 2 players
  Game has board of 10 squares
  Game has a piece that moves from square to square
  Game move involves a player moving 1 or 2 places
  Game move updates board with new piece position
*/
class Player {
  constructor(name) {
    this.name = name;
    this.position = 0;
  }
}

class Game {
  constructor() {
    this.players = [];
    this.board = new Array(10).fill(null);
  }

  addPlayer(player) {
    if (this.players.length < 2) {
      this.players.push(player);
    }
  }

  move(player, places) {
    if (this.players.includes(player)) {
      this.player.position += places;
    }
  }

  isGameOver() {
    return this.players.some((player) => player.position >= this.board.length);
  }

  printBoard() {
    // log each player's position on the board
    this.players.forEach((player) => {
      console.log(`${player}: ${this.board.indexOf(player)}`);
    });
  }
}

// Hello world app
const app = express();
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Create a new game, get back code for new game to share
app.post('/api/games', (req, res) => {
  // TODO collision proof
  const code = uuid();
  const gameCode = code.slice(0, 4);
  games.set(gameCode, new Game());
  res.json({gameCode});
});

// Get list of games
app.get('/api/games', (req, res) => {
  res.json({games: Array.from(games.keys())});
});

// Get game specific information
app.get('/api/games/:code', (req, res) => {
  const code = req.params.code;
  const game = games.get(code);
  if (game) {
    res.json({success: true, game});
  } else {
    res.json({success: false});
  }
});

// join a game passing name in query parameter
app.post('/api/games/:code/players', (req, res) => {
  const code = req.params.code;
  const name = req.query.name;
  const game = games.get(code);
  if (game) {
    game.addPlayer(new Player(name));
    res.json({success: true});
  } else {
    res.json({success: false});
  }
});

app.get('/api/games:code/players', (req, res) => {
  const code = req.params.code;
  const game = games.get(code);
  if (game) {
    res.json({success: true, players: game.players});
  } else {
    res.json({success: false});
  }
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
