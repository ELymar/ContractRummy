# Wire Protocol Reference

> **Machine-readable source of truth:** `web/src/net/protocol.ts`  
> This document is the annotated human-readable version. Keep both in sync when
> changing the protocol. Last updated: 2026-07.
>
> For the broader architecture (engine layers, round rules, test pipeline) see
> `docs/ARCHITECTURE.md`. This file covers only the WebSocket message shapes.

---

## Transport

WebSocket, text frames, JSON-encoded. One server per game; each client holds
one connection. The server runs on port 8080 by default (`WS_PORT` env).

---

## Primitive types

### CardDTO

Cards on the wire carry a stable UUID (assigned at deck creation; never changes
for the lifetime of a round).

```
{
  suit:  "Hearts" | "Spades" | "Clubs" | "Diamonds" | "Joker"
  value: "Two" | "Three" | "Four" | "Five" | "Six" | "Seven" | "Eight"
       | "Nine" | "Ten" | "Jack" | "Queen" | "King" | "Ace" | "Joker"
  uuid:  string   // crypto UUID; use this as the stable card identity
}
```

Note: suits and values are Title Case full words, not the short notations used
in the old schema.

---

## Client → Server

Two envelope kinds are recognised. Any other shape causes an `error` reply.

### `command`

```json
{ "kind": "command", "command": { "type": "<ActionType>", "payload": {} } }
```

**Security invariant:** `command.playerId` is ignored. The server overwrites it
with the identity derived from the connection. A client cannot act as another
player. (Covered by `CommandIdentity.integration.test.js`.)

Per-action payload shapes:

| ActionType | Payload fields |
|---|---|
| `DRAW` | *(none)* |
| `TAKE_FROM_DISCARD` | *(none)* |
| `DISCARD` | `{ cardUuid: string }` |
| `LAY_DOWN` | `{ melds: [{ cardUuids: string[], type: "set" \| "sequence" }] }` |
| `ADD_TO_MELD` | `{ cardUuid: string, meldIndex: number, position?: number }` |
| `END_TURN` | *(none)* |
| `QUIT` | *(none)* |

`JOIN` and `READY` are applied automatically by `GameServer` on connection; the
client never needs to send them. `LAY_DOWN.melds` must match the contract
requirement count for the current round exactly (server validates and re-checks
the meld predicates). `position` in `ADD_TO_MELD` is the insertion index within
the target meld; omit to append.

### `next_round`

```json
{ "kind": "next_round" }
```

Advances past the score screen when the server is in `pauseAtRoundEnd` mode
(production default). Any connected player may send this; duplicates are
no-ops. Has no effect if a round is not pending.

---

## Server → Client

### `welcome`

Sent immediately on connection, before any game events.

```json
{ "kind": "welcome", "gameId": "string", "playerId": "string" }
```

`playerId` is the server-assigned identity for this connection. Store it; it is
the canonical `you.id` in every subsequent `GameView`.

### `events`

Sent after every state change (including the auto-join/ready that happens on
connect). Each client receives the **same event list** but a **personalised
snapshot** — `snapshot.view` is computed by `GameEngine.getViewFor(playerId)`
for that specific connection, so information hiding is enforced per-client.

```json
{
  "kind": "events",
  "events": [ /* GameEvent[] */ ],
  "snapshot": { "view": { /* GameView */ } }
}
```

### `error`

Sent when the server fails to parse or dispatch a message.

```json
{ "kind": "error", "message": "string" }
```

---

## GameView

Shape returned by `GameEngine.getViewFor(playerId)`. All fields are present on
every snapshot (no optional keys).

| Field | Type | Notes |
|---|---|---|
| `gameId` | `string` | Stable for the lifetime of the server process |
| `players` | `PlayerView[]` | All seats; see below — opponent hands are hidden |
| `you` | `{ id, name } \| null` | `null` before JOIN is processed |
| `contract` | `Contract \| null` | Current round's contract; `null` before game starts |
| `yourHand` | `CardDTO[]` | Your full hand with UUIDs. Opponents see only `handCount`. |
| `burnTop` | `CardDTO \| null` | Top of discard pile (public information) |
| `burnPileAvailable` | `boolean` | `false` after a take (pile is "dead") until next discard |
| `downPiles` | `DownPileView[]` | All melds on the table (visible to everyone) |
| `currentPlayerIndex` | `number` | Index into `players` |
| `dealerIndex` | `number` | Index into `players` |
| `started` | `boolean` | `false` in the lobby |
| `round` | `number` | 1-indexed; 7 rounds in a full game |
| `firstTurn` | `boolean` | `true` for the very first action of each round; no draw required |
| `deckCount` | `number` | Card count only — deck contents are never revealed |
| `isYourTurn` | `boolean` | |
| `youAreDown` | `boolean` | Whether you have laid down your contract melds this round |
| `tookCard` | `boolean` | Whether you have drawn or taken from discard this turn |
| `discarded` | `boolean` | Whether you have discarded this turn (action phase is over) |
| `validActions` | `ActionType[]` | Non-empty only when `isYourTurn`; empty otherwise |

### PlayerView

```
{
  id:        string | number
  name:      string
  handCount: number          // always present; opponent cards are not revealed
  isDown:    boolean
}
```

### DownPileView

```
{
  type:  string   // "dupes" (set) or "sequence" (run)
  owner: string   // player name
  cards: CardDTO[]
}
```

### Contract

```
{
  description:  string
  requirements: [{ type: "set" | "sequence", minCards: number }]
}
```

---

## Events

Every event object has:

```
{
  type:    string             // EventType constant
  payload: Record<string, unknown>  // may be {} for structural events
  seq:     number             // monotonically increasing per game
  ts:      number             // Unix ms timestamp
}
```

### Event catalogue

| Event | Payload fields | Notes |
|---|---|---|
| `GAME_CREATED` | *(none)* | Reserved in `events.js`; not currently emitted by any handler |
| `PLAYER_JOINED` | `playerId`, `name` | |
| `GAME_STARTED` | `round` | Emitted when ≥2 players ready, and again at each new round |
| `TURN_STARTED` | `playerIndex` | |
| `CARD_DRAWN` (deck) | `playerId`, `n` | No card identity — event is broadcast to all; drawer sees the card in their own view snapshot |
| `CARD_DRAWN` (discard) | `playerId`, `n: 1`, `cardIds: [string]`, `source: "discard"` | Card was face-up so identity is public; `cardIds` are `Card.toString()` strings e.g. `"[K♥]"` |
| `CARD_DISCARDED` | `playerId`, `cardId`, `remainingCards` | `cardId` is `Card.toString()` |
| `MELD_LAID` | `playerId`, `melds: [{cards: string[], type}]` | `cards` are `Card.toString()` strings |
| `MELD_EXTENDED` | `playerId`, `meldIndex`, `cardId`, `remainingCards` | `cardId` is `Card.toString()` |
| `DECK_RESHUFFLED` | *(none)* | Raised by GameState when the burn pile is recycled into the deck |
| `PLAYER_QUIT` | `playerId`, `playerName` | |
| `ROUND_ENDED` | see below | |
| `GAME_ENDED` | `reason`, `scoreTable?` | `reason` is `"opponent_quit"` or `"server_error"`; also emitted (with `scoreTable`) when all 7 rounds are complete and `startNextRound` finds `isGameComplete()` |
| `ERROR` | `message` | Returned as an event when a handler encounters an internal error |

**Identity note on `CARD_DRAWN`:** deck-draw events carry no card identity
because they are broadcast verbatim to all clients; revealing the card in the
event would break information hiding. The drawer discovers their new card via
the personalised `snapshot.view.yourHand` that arrives in the same `events`
envelope. Discard takes include `cardIds` and `source: "discard"` because the
card was already face-up and public.

### ROUND_ENDED payload

```
{
  winner:       string        // playerId
  winnerName:   string
  reason:       string | null // null for normal win; "opponent_quit" otherwise
  roundNumber:  number
  scores:       { [playerName: string]: number }  // penalty points this round
  scoreTable:   object | null // ScoreKeeper internal table (legacy; prefer scoreboard)
  scoreboard:   Scoreboard    // structured score table; use this for UI rendering
  gameComplete: boolean
}
```

### Scoreboard

```
{
  totalRounds: number      // always 7
  players: [
    {
      name:   string
      rounds: (number | null)[]  // null = round not yet played; index = roundNumber - 1
      total:  number
    }
  ]
}
```

Lower scores are better (round winner scores 0). The `RoundSummary` type in
`protocol.ts` mirrors this shape with an added `winnerName` and `gameComplete`
flag for the score modal.

---

## Action phase rules (wire implications)

These constraints are enforced by the engine; violations return an `ERROR` event
instead of the expected result event.

- **Draw before action:** `DISCARD`, `LAY_DOWN`, and `ADD_TO_MELD` all require
  `tookCard = true`, except on `firstTurn` (opener may discard directly).
- **Discard ends the action phase:** once `DISCARD` succeeds, `LAY_DOWN` and
  `ADD_TO_MELD` are no longer in `validActions`; only `END_TURN` remains.
- **Down players** cannot `TAKE_FROM_DISCARD`; they must `DRAW` from the deck.
- **Burn-pile dead flag:** after one `TAKE_FROM_DISCARD`, `burnPileAvailable`
  becomes `false` until the next `DISCARD` — two players cannot take the same
  card in a row.
- **Sorting is not an engine action.** Clients reorder their own display;
  there is deliberately no `SORT` command on the wire. `Hand.js` never reorders
  cards; the engine preserves insertion order.
