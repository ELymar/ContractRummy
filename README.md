# Contract Rummy Card Game

A terminal-based Contract Rummy card game with support for local multiplayer and client-server architecture.

## Getting Started

**All commands must be run from the `server` directory:**

```bash
cd server
npm install
```

## Starting the Game

### Option 1: Standalone Terminal Game (Recommended)
Play a local 2-player game with one terminal:
```bash
cd server
npm start
```
or
```bash
cd server
node main.js
```

This starts an interactive game where you pass the laptop between players.

### Option 2: Client-Server Architecture
For testing the client-server architecture:

**Start the WebSocket server:**
```bash
cd server
npm run ws-server
```

**Connect terminal clients (in separate terminals):**
```bash
cd server
npm run ws-client
```

Run this command twice to connect two players.

### Option 3: Legacy Game
The old single-file game (for reference):
```bash
npm run legacy-game
```

## Running Tests

```bash
npm test
```

For regression tests only:
```bash
npm run test:regression
```

## Architecture

- **Server**: WebSocket-based game server with game engine
- **Terminal Client**: Interactive CLI interface
- **Game Engine**: Core game logic with UUID-based card tracking
- **Action Handlers**: Command pattern for game actions

The architecture supports future expansion to web UI, mobile apps, and bot players.