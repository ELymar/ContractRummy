# Game State Schema

This document defines the JSON structure for game state communication between client and server.

## Card Representation

```json
{
  "suit": "spades|hearts|diamonds|clubs",
  "rank": "A|2|3|4|5|6|7|8|9|10|J|Q|K"
}
```

## Player State

```json
{
  "player_id": "string",
  "name": "string",
  "hand": [
    {"suit": "spades", "rank": "A"},
    {"suit": "hearts", "rank": "K"}
  ],
  "melds": [
    [
      {"suit": "spades", "rank": "A"},
      {"suit": "spades", "rank": "2"},
      {"suit": "spades", "rank": "3"}
    ],
    [
      {"suit": "hearts", "rank": "K"},
      {"suit": "hearts", "rank": "Q"},
      {"suit": "hearts", "rank": "J"}
    ]
  ]
}
```

## Full Game State

```json
{
  "game_id": "string",
  "round": 1,
  "contract": {
    "sets": 2,
    "runs": 0
  },
  "current_player": "player_id",
  "phase": "draw|play|discard|end",
  "deck_count": 42,
  "discard_pile": [
    {"suit": "diamonds", "rank": "7"}
  ],
  "players": [
    {
      "player_id": "player1",
      "name": "You",
      "hand": [...],
      "melds": [[...], [...]]
    },
    {
      "player_id": "player2",
      "name": "Opponent 1",
      "hand_count": 7,
      "melds": [[...]]
    }
  ]
}
```

## Example Initial Game State

```json
{
  "game_id": "test-game-1",
  "round": 1,
  "contract": {
    "sets": 2,
    "runs": 0
  },
  "current_player": "player1",
  "phase": "draw",
  "deck_count": 10,
  "discard_pile": [
    {"suit": "diamonds", "rank": "7"}
  ],
  "players": [
    {
      "player_id": "player1",
      "name": "You",
      "hand": [
        {"suit": "spades", "rank": "A"},
        {"suit": "spades", "rank": "2"},
        {"suit": "spades", "rank": "3"},
        {"suit": "hearts", "rank": "K"},
        {"suit": "hearts", "rank": "Q"},
        {"suit": "clubs", "rank": "9"}
      ],
      "melds": []
    },
    {
      "player_id": "player2",
      "name": "Opponent 1",
      "hand_count": 6,
      "melds": []
    },
    {
      "player_id": "player3",
      "name": "Opponent 2",
      "hand_count": 6,
      "melds": []
    }
  ]
}
```

## Client Actions

### Draw from Deck
```json
{
  "action": "draw_deck",
  "player_id": "player1"
}
```

### Draw from Discard
```json
{
  "action": "draw_discard",
  "player_id": "player1"
}
```

### Play Meld
```json
{
  "action": "play_meld",
  "player_id": "player1",
  "meld_index": 0,
  "cards": [
    {"suit": "spades", "rank": "A"},
    {"suit": "spades", "rank": "2"},
    {"suit": "spades", "rank": "3"}
  ]
}
```

### Discard
```json
{
  "action": "discard",
  "player_id": "player1",
  "card": {"suit": "clubs", "rank": "9"}
}
```

### End Turn
```json
{
  "action": "end_turn",
  "player_id": "player1"
}
```

## Server Responses

### Game State Update
```json
{
  "type": "game_state",
  "data": {
    ... full game state ...
  }
}
```

### Action Result
```json
{
  "type": "action_result",
  "success": true,
  "action": "draw_deck",
  "card": {"suit": "hearts", "rank": "J"}
}
```

### Error
```json
{
  "type": "error",
  "message": "Cannot draw - not your turn",
  "code": "INVALID_ACTION"
}
```
