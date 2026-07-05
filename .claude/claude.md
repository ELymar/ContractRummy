# Contract Rummy — Claude Code Project Guide

## Keep the architecture index current

`docs/ARCHITECTURE.md` is the codebase index. Whenever a change alters the
structure it describes, update it **in the same commit**. That means:
- adding, removing, moving, or repurposing files/directories
- adding or removing a player action, handler, event type, or Session method
- changing the wire protocol (`server/src/server/GameServer.js` envelopes or
  `web/src/net/protocol.ts`)
- changing what `getViewFor` exposes, the test layout, or entry points/scripts

Small edits inside an existing file (bug fixes, styling, copy) don't need an
index update. If several sections have drifted, re-run the four-agent sweep
(engine core / server infra / web client / tests + repo map) and re-synthesize
rather than patching line by line.

---

## Project overview

Contract Rummy is a multiplayer card game with a Node.js authoritative engine
in `server/`, an active Phaser 3 + TypeScript front-end in `web/`, and an
archived Godot 4.3 prototype in `ui/` (kept for reference only). The engine is
the single source of truth for every rule — the terminal client, WebSocket
server, in-browser single-player mode, and AI all drive the same `GameEngine`.
See [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for the full codebase
index and [`web/README.md`](../web/README.md) for the web client.

---

## Quick commands

| Goal | Command |
| --- | --- |
| Run the web game (dev) | `cd web && npm run dev` |
| Server tests (31 suites / 274 tests) | `cd server && npx jest` |
| Web typecheck | `cd web && npx tsc --noEmit` |
| WebSocket server | `cd server && npm run ws-server` |
| Rebuild engine bundle after `server/src` changes | `cd web && npm run build:engine` |
| Terminal hot-seat game | `cd server && npm start` |
| AI fills a WS seat | `cd server && npm run dev-bot` |

The engine bundle (`web/src/engine/bundle.js`) is git-ignored and rebuilt
automatically by the `predev` / `prebuild` hooks — run `build:engine` manually
only when the dev server is not running.

---

## Key invariants for contributors

These come from the architecture and must not be violated:

- **Server is authoritative; clients hold no rules.** `TableScene` renders a
  `GameView` and emits `Command`s — it contains zero game logic.
- **Never trust client-supplied identity.** The server overwrites every
  command's `playerId` from the connection object, so a client cannot impersonate
  another player. Covered by `CommandIdentity.integration.test.js`.
- **Events are broadcast; private info must not ride on them.** Deck-draw
  events carry no card identity — the drawer sees the card only in their own
  view from `getViewFor`. Covered by `EventPrivacy.test.js`.
- **`protocol.ts` must stay in sync with the server.** `web/src/net/protocol.ts`
  mirrors `GameEngine` actions, events, and `getViewFor` output. When any of
  those change, update the protocol file in the same commit.
- **The engine bundle is generated, not edited.** Changes to game rules go in
  `server/src/core/`; then rebuild the bundle. Never edit `web/src/engine/bundle.js` directly.

---

## Working practices

**Commit often with descriptive messages.** Commit after each meaningful
increment — "Add discard-pile take restriction for down players" not "wip".
Commit directly to `main`; no feature branches.

**Test after each change.**
- Rules and engine logic: `cd server && npx jest`. Add a regression test
  alongside every bug fix (see `scripts/add-regression-test.js`).
- Web UI changes: no automated web suite yet. Verify by running
  `cd web && npm run dev` and exercising the feature with Playwright against
  `window.__session` exposed in dev builds.
- Typecheck before declaring web changes done: `cd web && npx tsc --noEmit`.

**Keep functions focused.** One clear responsibility per function; extract
helpers rather than growing a function past ~50 lines.

**Comment non-obvious logic**, especially anything touching the turn-shape
rules (draw → optional lay-down/lay-off → discard → end turn) or the
burn-pile "dead" flag.

---

## Docs map

| File | What it is |
| --- | --- |
| [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) | Full codebase index — the authoritative reference for structure, invariants, and "where to change what" |
| [`TODO.md`](../TODO.md) | Roadmap and hosting backlog; Current Status section has the latest snapshot |
| [`web/README.md`](../web/README.md) | Web client overview: running, session seam, engine bundle, URL flags, testing |
| [`docs/game-state-schema.md`](../docs/game-state-schema.md) | Wire-protocol reference (annotated human version of `web/src/net/protocol.ts`) |
