# Contract Rummy — Web Client

A browser front-end for Contract Rummy, built with **Phaser 3 + TypeScript + Vite**.
This is the current, actively developed UI (it supersedes the earlier Godot
prototype in `../ui`).

Today it ships a complete **offline single-player game vs. an AI**: the
authoritative game engine and the AI brain (both from `../server/src`) are
bundled into the browser, so a full 7-round game runs with no server.

## Running

```bash
cd web
npm install
npm run dev      # http://localhost:5173 (predev rebuilds the engine bundle)
```

- `npm run build` — type-check + production build into `dist/`
- `npm run build:engine` — regenerate the engine bundle only (see below)

## How it fits together

```
TableScene / MenuScene  (Phaser rendering + input)
        │  talks only to…
        ▼
   Session (interface)          src/net/Session.ts
        ├─ SinglePlayerSession  in-browser engine + AI, offline   ← default
        ├─ GameClient           WebSocket to the Node server
        └─ LocalSession         rules-free mock for UI dev
```

The renderer never contains game rules — it renders a `GameView` and emits
`Command`s. The server is the authority; `SinglePlayerSession` just runs that
same authority locally. Swapping single-player for multiplayer is a one-line
change of which `Session` is constructed in `src/main.ts`.

### The engine bundle

`scripts/build-engine.mjs` uses esbuild to bundle `../server/src` (the
`GameEngine` + `decideAction` AI) into `src/engine/bundle.js` as ESM, with small
stubs for Node-only deps (`chalk`, `crypto`). This keeps a **single source of
truth** for the rules: the browser and the Node server run identical logic.
The bundle is generated (git-ignored) and rebuilt automatically by `predev` /
`prebuild`; run `npm run build:engine` after changing anything under
`server/src`.

`src/net/protocol.ts` mirrors the server's wire types and **must stay in sync**
with `server/src/core/engine` (actions, events, and `getViewFor`).

## URL flags (`src/main.ts`)

| URL                              | Session              | Use                          |
| -------------------------------- | -------------------- | ---------------------------- |
| _(default)_                      | SinglePlayerSession  | offline game vs. the AI      |
| `?ws=ws://host:port`             | GameClient           | live multiplayer server      |
| `?mock`                          | LocalSession         | rules-free UI/rendering dev  |

In dev builds the active session is exposed as `window.__session`, which the
Playwright checks drive directly.

## Layout

```
src/
├── main.ts              Phaser game config + session routing
├── net/                 Session seam (protocol, 3 implementations)
├── scenes/              Boot, Menu, Table (all gameplay UI)
├── render/              cardArt (texture keys), theme (casino look)
└── engine/              generated engine bundle + esbuild entry/stubs
public/
├── cards/               52 faces + joker + back
└── fonts/               Nunito (bundled UI font)
```

## Visual theme

`src/render/theme.ts` generates the whole casino-table look at runtime
(wood rail, radial felt, soft card shadows, gold pill buttons, panels) — no
image assets beyond the card art, so the bundle stays small and offline.

## Testing

No automated web test suite yet — changes are verified by driving the running
app with Playwright against `window.__session`. The game **rules** are covered
by the Node suite (`cd server && npm test`, 287 tests), and since the web client
bundles that same engine, rule correctness is shared.
