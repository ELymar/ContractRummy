# Contract Rummy Card Game

A Contract Rummy card game with a Node.js authoritative engine, a browser
front-end, a heuristic AI opponent, and a terminal client.

## Repository layout

| Path      | What it is                                                                 |
| --------- | -------------------------------------------------------------------------- |
| `server/` | Authoritative game engine, action handlers, AI (`decideAction`), scoring, terminal + WebSocket clients. 287 tests. |
| `web/`    | **Active front-end** — Phaser 3 + TypeScript. Plays a full offline single-player game vs. the AI by bundling the server engine into the browser. See [`web/README.md`](web/README.md). |
| `ui/`     | Earlier Godot 4.3 UI prototype — archived, superseded by `web/`.           |
| `docs/`   | [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) (full codebase index) + `game-state-schema.md`. |

## Play in the browser (single-player vs. AI) — current focus

```bash
cd web
npm install
npm run dev      # then open the printed http://localhost:5173
```

Runs entirely offline: the browser bundles the same `GameEngine` and AI the
server uses, so a full 7-round game (with an end-of-round score table) needs no
server running.

## Terminal game & server

**All server commands must be run from the `server` directory:**

```bash
cd server
npm install
```

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

## Running Tests

```bash
npm test
```

For regression tests only:
```bash
npm run test:regression
```

## Architecture

- **Game Engine**: Authoritative core game logic with UUID-based card tracking
- **Action Handlers**: Command pattern for game actions (draw, lay down, discard, …)
- **AI**: `decideAction` heuristic brain, shared by the terminal, server, and web clients
- **Server**: WebSocket-based game server wrapping the engine
- **Terminal Client**: Interactive CLI interface
- **Web Client** (`web/`): Phaser front-end that bundles the engine to run
  single-player offline, and can also connect to the WebSocket server

The engine is the single source of truth for the rules; every client (terminal,
web, AI) drives the same engine, so rule behavior is consistent everywhere.