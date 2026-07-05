# Contract Rummy — Architecture

An index of the codebase: what lives where, how the pieces talk, and the
invariants that keep the game honest. Generated from a full code sweep
(2026-07); update alongside structural changes.

**The one-sentence architecture:** a Node.js authoritative `GameEngine` is the
single source of truth for the rules; every client — terminal, WebSocket
multiplayer, the in-browser single-player game, and the AI — drives that same
engine, so rule behavior is identical everywhere.

---

## Repository map

| Path        | Status     | What it is |
| ----------- | ---------- | ---------- |
| `server/`   | active     | Authoritative engine, action handlers, AI, scoring, WebSocket server, terminal clients, test suite (37 suites / 292 tests passing as of 2026-07). |
| `web/`      | active     | Phaser 3 + TypeScript front-end (the current focus). Offline single-player vs. the AI by bundling the server engine into the browser; multiplayer via `GameClient`. |
| `ui/`       | archived   | Godot 4.3 prototype, superseded by `web/` (2025-12 pivot). Kept for reference. |
| `docs/`     | active     | This file + `game-state-schema.md` (original message-shape notes). |
| `README.md` / `TODO.md` | active | Overview / roadmap with current-status snapshot. |
| `design.md`, `cards.txt`, `sketch.pdf`, `ai_sketch.png` | historical | 2022 design notes and sketches. |

Git-ignored but load-bearing: `web/src/engine/bundle.js` (generated engine
bundle, see §4.3), `server/tests/recorded-games/` and `server/tests/generated/`
(game recordings + generated tests; the curated `server/tests/regression/` IS
committed via a `.gitignore` negation).

---

## 1. Engine core (`server/src/core/`)

```
core/
├── domain/            value objects & mutable state
│   ├── Card.js        suit/value + crypto UUID; toString → "[K♥]", "[🃏]"
│   ├── Deck.js        (nJokers, nDecks, rng); game uses 1 deck + 4 jokers = 56 cards
│   ├── BurnPile.js    discard pile with a "dead" flag (one take per discard cycle)
│   ├── DownPile.js    a validated meld on the table ('dupes' | 'sequence')
│   ├── Hand.js        ordered cards; engine never reorders (sorting is client-side)
│   ├── Player.js      hand + per-turn flags (tookCard, discarded, isDown, isOut)
│   └── GameState.js   root state (EventEmitter); auto-reshuffles burn → deck
├── engine/
│   ├── GameEngine.js  apply / getViewFor / startNextRound / handleRoundEnd
│   ├── actions.js     ActionType enum (the command vocabulary)
│   ├── events.js      EventType enum (the event vocabulary)
│   └── handlers/      one class per action (command pattern, base: ActionHandler)
├── rules/
│   ├── RoundContract.js  the 7 contracts + isContractSatisfied()
│   ├── RoundDealing.js   cards per round; dealer gets one fewer than others
│   └── CardScoring.js    2–10 → 5 pts, face → 10, Ace → 15, Joker → 20
└── utils/Utils.js        isValidSequence / isValidDupes (the meld predicates)
```

### Command → events → mutation

`GameEngine.apply({type, playerId, payload})` routes to the handler registered
for `type`. The handler validates (turn, flags, ownership by card UUID) and
mutates state in place, returning events. `collectEvents()` merges in any
`DECK_RESHUFFLED` events that `GameState` raised internally during the call.
There is no command queue — validation and mutation happen synchronously in
one `handle()` call.

| Handler | Action | Guards → mutation |
| --- | --- | --- |
| `JoinHandler` | JOIN | not already joined → push player |
| `ReadyHandler` | READY | ≥2 players, not started → init state, deal, create `ScoreKeeper(names, 7)` |
| `DrawHandler` | DRAW | your turn, `!tookCard` → draw from deck, set `tookCard` |
| `TakeFromDiscardHandler` | TAKE_FROM_DISCARD | + `!isDown`, pile live → take top (pile goes dead), set `tookCard` |
| `LayDownHandler` | LAY_DOWN | + `tookCard`, `!isDown`, `!discarded`, melds satisfy contract → create DownPiles, set `isDown` |
| `AddToMeldHandler` | ADD_TO_MELD | + `isDown`, `!discarded`, DownPile accepts card → move card; round ends if hand empties |
| `DiscardHandler` | DISCARD | drew (except first turn), `!discarded` → card to burn pile, set `discarded`; round ends if hand empties |
| `EndTurnHandler` | END_TURN | `discarded` → clear flags, advance player, clear `firstTurn` |
| `QuitHandler` | QUIT | your turn → mark out; end round if ≤1 active player |

### Per-player views (information hiding)

`getViewFor(playerId)` is the only way state leaves the engine:

- Opponents' hands → `handCount` only; your own hand → full `CardDTO[]` with UUIDs.
- Deck contents → `deckCount` only. Discard top card is public.
- `validActions` computed per player, only when it's their turn.
- Deck-draw events (`CARD_DRAWN` without `source`) carry **no card identity** —
  events are broadcast to everyone; the drawer sees the card in their own view.
  Discard takes include the card (it was face up).

### Rules invariants worth knowing

- **Turn shape:** draw (or take discard) → optional lay down / lay off →
  discard → end turn. **The discard ends the action phase** — `discarded`
  blocks LAY_DOWN / ADD_TO_MELD / a second DISCARD; only END_TURN remains.
- **First turn:** no draw; the opener may discard directly (`state.firstTurn`).
- **Down players** can only draw from the deck, never the discard pile.
- **Burn-pile "dead" flag:** after a take, the pile is dead until the next
  discard — two players can't take the same card in a row.
- **Jokers:** wild in melds, but each meld needs ≥2 natural cards.
  `DownPile.replaceJoker` swaps in the natural card and relocates the joker
  to either end, re-validating before commit.
- **Aces:** high or low in sequences, never mid-run.
- **56-card conservation check** after each discard (deck + burn + hands +
  melds) in non-test environments.
- **Scoring:** lower is better; the round winner scores 0; `ScoreKeeper`
  fills a `scores[name][roundIdx]` table and `isGameComplete()` (all cells
  non-null over 7 rounds) drives `GAME_ENDED`.
- **Sorting is not an engine action** — clients reorder their own display;
  there is deliberately no SORT on the wire.

---

## 2. Server infrastructure (`server/src/` minus core)

| Area | Files | Notes |
| --- | --- | --- |
| WebSocket server | `server/GameServer.js`, `server/index-ws.js` | Wraps one `GameEngine`. `index-ws.js` is the production entry (`WS_PORT`, default 8080) and enables `pauseAtRoundEnd`. |
| Game logging | `server/GameLogger.js` | Winston; one JSON file per game under `src/tests/recorded-games/` with actions, events, and state snapshots — the raw material for replay tests. |
| Terminal (hot-seat) | `clients/terminal/TerminalGame.js`, `TerminalPlayerInterface.js` | Local pass-the-laptop game driving `GameState` directly (predates the engine). Entry: `main.js` (`npm start`). |
| Terminal (network) | `clients/terminal/TerminalClient.js` | Interactive WS client (`npm run ws-client`). |
| AI | `ai/decideAction.js`, `ai/handAnalysis.js` | Pure `(GameView) → Command`; shared by dev-bot, ai-sim, and the browser bundle. |
| Shared | `shared/ScoreKeeper.js`, `Constants.js`, `DisplayUtils.js`, `GameIO.js`, `CardSerializer.js` | Scoring table, card constants/emoji maps, formatting, stdin helpers. |
| Dev scripts | `scripts/dev-bot.js`, `scripts/ai-sim.js`, `scripts/convert-logs-to-tests.js`, `scripts/add-regression-test.js`, `scripts/regenerate-regression-tests.js` | Bot seat-filler; headless AI self-play (seeded); recorded-game → test pipeline. |

### Wire protocol

Server → client: `{kind:'welcome', gameId, playerId}` on connect, then
`{kind:'events', events, snapshot:{view}}` after every state change — each
client gets the shared events plus **its own** filtered view.
`{kind:'error', message}` on parse/dispatch failure.

Client → server: `{kind:'command', command:{type, payload}}` and
`{kind:'next_round'}`.

**Security invariant:** the server attributes every command to the connection
it arrived on — a client-supplied `playerId` is discarded
(`{...msg.command, playerId}`), so no connection can act as another player.
Covered by `CommandIdentity.integration.test.js`.

### Round-end pause

With `pauseAtRoundEnd: true` (production), the server does **not** auto-deal
after `ROUND_ENDED`; it sets `roundPending` and waits for any player's
`{kind:'next_round'}` (duplicates are no-ops) so clients can show the score
table. Default is off — tests and bots keep the auto-advance behavior.
`ROUND_ENDED` carries a structured `scoreboard` (per-round scores + totals per
player) that both front-ends render directly.

### Entry-point cheat sheet

| Goal | Command |
| --- | --- |
| Hot-seat terminal game | `cd server && npm start` |
| WebSocket server | `npm run ws-server` (pause-at-round-end on) |
| Terminal WS client | `npm run ws-client` |
| AI fills a seat | `npm run dev-bot` (`WS_URL`, `BOT_DELAY` env) |
| Headless AI self-play | `node scripts/ai-sim.js` (`GAMES`, `SEED` env) |
| Tests | `npm test` / `npm run test:regression` |

### The AI in one paragraph

`decideAction` picks exactly one command per call, in phase order: take the
discard only if `discardHelps` (joker on top, or the card feeds a planned
contract meld), else draw; lay down when `findContract` finds a disjoint
partition of hand cards satisfying every contract requirement (candidate sets +
runs with joker-gap enumeration, backtracking assignment); lay off any card a
table meld accepts; then discard the least useful card (`pickDiscardCard`
keeps jokers and partial-meld seeds via `planKeepers`, sheds deadwood,
expensive cards first); end turn. Aces count both high and low when building
runs.

---

## 3. Web client (`web/`)

Phaser 3.80 + TypeScript 5.4 + Vite 5. Canvas 1280×720, FIT-scaled.

```
web/src/
├── main.ts            Phaser config + session routing (?ws / ?mock / VITE_WS_URL)
├── net/
│   ├── Session.ts     THE seam: connect/send/onView/onError?/onEvents?/onRoundEnd?/nextRound?
│   ├── protocol.ts    hand-maintained mirror of the server wire types — keep in sync
│   ├── SinglePlayerSession.ts   engine + AI in-browser (default game mode)
│   ├── GameClient.ts  thin WebSocket client (multiplayer)
│   └── LocalSession.ts rules-free mock with a rigged hand (UI dev via ?mock)
├── scenes/
│   ├── BootScene.ts   preloads 54 card textures + waits for the Nunito font
│   ├── MenuScene.ts   single-player / multiplayer buttons
│   └── TableScene.ts  renders a GameView, emits Commands; holds NO game rules
├── render/
│   ├── cardArt.ts     CardDTO → texture key ("K_hearts", "back", "joker")
│   └── theme.ts       runtime-generated casino chrome (see below)
├── rules/meld.ts      client-side findContract/isValid* — UX only, server re-validates
└── engine/            generated bundle of the server engine (see below)
```

### The Session seam

`TableScene` talks only to the `Session` interface, so single-player,
multiplayer, and the mock are interchangeable. Optional members (`onError`,
`onEvents`, `onRoundEnd`, `nextRound`) are called only when present. The scene
tracks unsubscribe functions and releases them on shutdown — Phaser reuses
scene instances across restarts, so stale listeners would otherwise drive
destroyed objects.

`SinglePlayerSession` runs the real engine: JOIN/READY for the human + N AIs,
applies human commands directly, and plays AI turns on a 1s timer via
`decideAction`. On `ROUND_ENDED` it pauses (blocking AI and human input) until
the score modal calls `nextRound()`; `startNextRound()` then deals on.

### The engine bundle (single source of truth)

`web/scripts/build-engine.mjs` (esbuild) bundles
`server/src/core/engine/GameEngine` + `server/src/ai/decideAction` into
`web/src/engine/bundle.js` (ESM, browser target), stubbing Node-only deps:
`chalk` → identity proxy, `crypto` → `globalThis.crypto`. The bundle is
**git-ignored** (fully reproducible; regenerated by the `predev`/`prebuild`
hooks). `bundle.d.ts` is the hand-written type surface. After changing
anything under `server/src`, run `npm run build:engine` (or just restart dev).

`web/src/rules/meld.ts` is a small client-side *copy* of the meld search used
only to enable the Lay Down button and pre-partition selected cards into the
`LAY_DOWN` payload — the server always re-validates.

### TableScene mechanics

- Full dynamic-layer rebuild on every `onView` update (no incremental diffing).
- Right-column pill buttons with `enabled`/`primary` predicates per view;
  disabled Lay Down / Discard stay clickable so a toast can explain why.
- Drag/drop: hand cards drag onto the discard slot or any meld group
  (drop zones tagged `{kind:'discard'}` / `{kind:'meld', meldIndex}`).
- Score modal on `onRoundEnd`: per-round columns (dash = unplayed), totals,
  leader starred; "Next Round" mid-game, "Play Again" (single-player only) /
  "Menu" at game end; auto-closes if another player advances the round.
- Action feed: `onEvents` → four fading narration lines ("AI 1 took [7♥] from
  the discard"), newest first, so paced AI turns stay readable.
- Casino chrome (`theme.ts`) is painted onto CanvasTextures at first use —
  wood rail, radial felt, card shadows/glows, gradient pill buttons — zero
  image assets beyond the card art.

### Build & deploy

- `base: './'` in `vite.config.ts` — required for itch.io (CDN subdirectory
  hosting); all asset URLs must stay relative.
- URL flags: `?ws=<url>` (multiplayer, skips menu) > `VITE_WS_URL` (baked at
  build) > menu default `ws://<host>:8080`; `?mock` for the rules-free session.
- Dev: `window.__session` / `window.__game` exposed for console + Playwright.

---

## 4. Test infrastructure (`server/tests/`)

37 suites / 292 tests (2026-07). No automated web-client tests yet — web
changes are verified by driving the running app with Playwright against
`window.__session`; rule correctness is shared with the server suite via the
engine bundle.

| Directory | What it holds |
| --- | --- |
| `core/` (22 files) | Unit tests for domain objects, engine, rules, scoring, dealing. |
| `unit/` (7) | Focused behavior tests: event privacy, discard-ends-actions, reshuffle events, round transitions. |
| `integration/` (5) | Boot a real `GameServer` on a random port + `TestBotClient` WebSockets: single-round flow, command identity (anti-spoofing), round-end pause, ready broadcast, meld display. |
| `regression/` (1) | Curated replays of recorded games (committed; the rest of recorded-games/ is git-ignored). |
| `ai/` (1) | `handAnalysis` heuristics. |
| `helpers/` | `TestBotClient` — scriptable WS player (enqueue steps / stepProvider). |

**The replay pipeline:** `GameLogger` records every game the server hosts →
`GameTestConverter` / `IntegrationTestConverter` turn a recording into an
executable Jest spec (`scripts/convert-logs-to-tests.js`) →
`scripts/add-regression-test.js` promotes it into `tests/regression/`.
`StateBasedTestGenerator` can instead reconstruct the exact pre-action state
(from full snapshots logged at LAY_DOWN/ADD_TO_MELD) to test meld logic
without replaying a whole game; `StateValidator` diffs engine state against
logged snapshots during replay.

---

## 5. Where to change what

| I want to… | Touch |
| --- | --- |
| Change a game rule | `server/src/core/` (+ tests), then `cd web && npm run build:engine` |
| Add a player action | `actions.js`, a new handler, `getValidActionsFor`, `web/src/net/protocol.ts`, TableScene UI |
| Change what players see | `GameEngine.getViewFor` + `protocol.ts` (`GameView`) |
| Change the table UI | `web/src/scenes/TableScene.ts` (+ `theme.ts` for chrome) |
| Change AI behavior | `server/src/ai/` (affects bot, sim, and browser AI) |
| Change the wire protocol | `GameServer.js` + `protocol.ts` + `GameClient.ts` — keep the three in sync |
| Add a regression test from a real game | play it against `ws-server` (logging on), then `scripts/convert-logs-to-tests.js` + `add-regression-test.js` |
