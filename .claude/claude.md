# Contract Rummy - Claude Code Project Guide

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

> ⚠️ **Staleness note:** everything below referring to Godot describes the
> archived `ui/` prototype. The active front-end is the Phaser web client in
> `web/` — see `docs/ARCHITECTURE.md` and TODO.md's Current Status.

## Project Overview

Contract Rummy is a multiplayer card game built with:
- **Frontend**: Godot 4.3 (GDScript)
- **Backend**: Node.js with WebSocket communication
- **Architecture**: Client-server model with real-time game state synchronization

## Vision

Create a polished, multiplayer Contract Rummy game where:
- Players can join games online and play in real-time
- UI is clean, intuitive, and responsive
- Card drag-and-drop mechanics feel natural and smooth
- Game state is authoritative on the server
- Client provides rich visual feedback and animations

## Current State

### Completed Components

**Frontend (Godot 4.3):**
- ✅ Card component with face-up/face-down states
- ✅ Drag-and-drop system for cards
- ✅ Hand container with dynamic card positioning
- ✅ Meld slots with insertion preview
- ✅ Deck and discard pile interaction
- ✅ Full turn mechanics test scene (`HandMeldTest`)
- ✅ Responsive card centering in containers
- ✅ Smooth animations for card movement

**Backend (Node.js):**
- ✅ WebSocket server structure
- ✅ Game state management (basic)
- ⚠️ Needs refinement for full turn mechanics

**Test Scenes:**
- `MeldTest.tscn` - Static meld layout testing
- `MeldDragTest.tscn` - Basic drag & drop mechanics
- `HandMeldTest.tscn` - **Full turn simulation** (current focus)

### Key Files

```
ui/
├── scenes/
│   ├── card/
│   │   ├── Card.tscn          # Card component
│   │   └── Card.gd            # Card logic & display
│   ├── test/
│   │   ├── HandMeldTest.tscn  # Full turn test scene
│   │   └── HandMeldTest.gd    # Turn mechanics implementation
│   └── game/
│       ├── GameScreen.tscn    # Main game UI
│       └── GameScreen.gd      # Game orchestration
├── scripts/
│   └── core/
│       └── SceneManager.gd    # Scene navigation
└── assets/
    └── cards/                 # Card sprite assets

server/
├── index.js                   # WebSocket server
└── game/                      # Game logic modules

docs/
└── game-state-schema.md       # JSON schema for client-server communication
```

## Architecture Decisions

### Card Positioning System

**Problem**: Cards in containers were appearing offset (up and to the left) instead of centered.

**Root Cause**:
1. Godot's layout system was interfering with manual positioning
2. `layout_mode` and `size_flags` needed to be set correctly
3. Position was being reset when cards were reparented

**Solution**:
```gdscript
# Always set these BEFORE adding card to container
card.set("layout_mode", 0)  # Position mode (not container controlled)
card.size_flags_horizontal = 0  # No size flags
card.size_flags_vertical = 0

# After reparenting, immediately restore position
var saved_global_pos = card.global_position
card.get_parent().remove_child(card)
new_parent.add_child(card)
card.set("layout_mode", 0)  # Ensure position mode
card.position = saved_global_pos - new_parent.global_position
```

### Drag & Drop Flow

1. **Start Drag**:
   - Save global position
   - Set layout_mode=0 and clear size_flags
   - Reparent to root control
   - Restore position to prevent jump

2. **During Drag**:
   - Update card position in `_process()` with offset
   - Check if over valid drop zones
   - Show preview animations in target containers

3. **End Drag**:
   - Determine drop target (meld, discard, or return to hand)
   - Reparent to target container
   - Preserve position, then animate to final position

### Turn Structure

1. **Draw Phase**: Player must draw from deck or discard
2. **Play Phase**: Player can create melds (optional)
3. **Discard Phase**: Player must discard one card
4. **End Turn**: Player clicks "End Turn" button

State management:
```gdscript
var has_drawn := false        # Tracks if player drew
var can_end_turn := false     # Enabled when turn is valid (drew + 7 cards in hand)
```

## Game State Communication

See `/docs/game-state-schema.md` for full JSON schema.

**Key Principles:**
- Server is authoritative source of truth
- Client sends actions (draw, play_meld, discard, end_turn)
- Server validates and broadcasts state updates
- Client applies state updates to UI

**Example State Update:**
```json
{
  "type": "game_state",
  "data": {
    "current_player": "player1",
    "phase": "draw",
    "players": [...],
    "deck_count": 42,
    "discard_pile": [...]
  }
}
```

## Best Practices

### Code Quality

**1. Clear Naming**
- Use descriptive variable names: `meld1_cards` not `m1`
- Use verb-noun for functions: `_update_hand_layout()` not `_layout()`
- Constants in SCREAMING_SNAKE_CASE: `CARD_SIZE`, `MELD_CARD_SPACING`

**2. Keep Functions Focused**
- Each function should do ONE thing
- Extract complex logic into helper functions
- Max ~50 lines per function

**3. Comment Complex Logic**
```gdscript
# Convert global position to local position in new parent
# This prevents the card from jumping when reparented
var local_pos = saved_global_pos - new_parent.global_position
```

**4. Use Type Hints**
```gdscript
var hand_cards: Array[Card] = []
func _update_hand_layout() -> void:
func _calculate_insert_index(drop_position: Vector2) -> int:
```

### Testing Workflow

**Test Early, Test Often:**

1. **After each feature**: Run the game and manually test
2. **Create test scenes**: Isolate complex mechanics (like `HandMeldTest`)
3. **Test edge cases**:
   - Empty containers
   - Single card
   - Maximum cards
   - Drag from different sources

4. **Console logging**: Use print statements liberally during development
```gdscript
print("=== Updating Hand Layout ===")
print("Cards: %d, Start X: %.1f" % [num_cards, start_x])
```

5. **Visual debugging**: Add colored rectangles to see container boundaries

### Git Workflow

**Commit Often:**

Commit after each meaningful change:
- ✅ "Add drag-and-drop for cards in meld slots"
- ✅ "Fix card positioning jumping on reparent"
- ✅ "Implement draw from deck/discard"
- ❌ "WIP" or "stuff"

**Good commit structure:**
```bash
# After implementing a feature
git add ui/scenes/test/HandMeldTest.gd
git commit -m "Add full turn mechanics to HandMeldTest

- Implement draw from deck/discard
- Add meld placement with 2 slots
- Add discard pile interaction
- Add end turn button with validation"
```

**Before starting new feature:**
```bash
git status  # Check what's changed
git diff    # Review changes
```

**Branching strategy:**
```bash
main              # Stable, working code
feature/melds     # New features
fix/card-centering # Bug fixes
```

### Debug Practices

**When something doesn't work:**

1. **Add debug prints**:
```gdscript
print("Card position: %s" % card.position)
print("Container size: %s" % container.size)
print("Layout mode: %s" % card.get("layout_mode"))
```

2. **Check the console**: Godot outputs errors and warnings

3. **Use `await get_tree().process_frame`**: Wait for layout to settle

4. **Isolate the problem**: Create a minimal test scene

5. **Compare working vs broken**: What's different?

## Common Patterns

### Creating and Positioning Cards

```gdscript
var card: Card = CardScene.instantiate()
card.setup("spades", "A")
card.set_face_up(true)
card.set_display_size(Vector2(105, 147))

# Always set layout mode before adding to container
card.set("layout_mode", 0)
card.size_flags_horizontal = 0
card.size_flags_vertical = 0

container.add_child(card)
cards_array.append(card)

# Position after layout settles
await get_tree().process_frame
card.position = Vector2(target_x, target_y)
```

### Animating Card Movement

```gdscript
var tween = create_tween()
tween.tween_property(card, "position", target_pos, 0.2)\
    .set_trans(Tween.TRANS_QUAD)\
    .set_ease(Tween.EASE_OUT)
```

### Centering Cards in Container

```gdscript
var num_cards = cards.size()
var total_width = num_cards * (CARD_SIZE.x + SPACING) - SPACING
var start_x = (container.size.x - total_width) / 2
var start_y = (container.size.y - CARD_SIZE.y) / 2

for i in range(num_cards):
    var card = cards[i]
    var target_x = start_x + i * (CARD_SIZE.x + SPACING)
    card.position = Vector2(target_x, start_y)
```

### Input Handling

```gdscript
func _input(event: InputEvent) -> void:
    if event is InputEventMouseButton:
        var mouse_event := event as InputEventMouseButton
        if mouse_event.button_index == MOUSE_BUTTON_LEFT:
            if mouse_event.pressed:
                # Handle press
            else:
                # Handle release
            get_viewport().set_input_as_handled()
```

## Next Steps

### Immediate (Current Sprint)
1. ✅ Complete HandMeldTest full turn mechanics
2. 🔄 Test full turn flow thoroughly
3. ⏳ Create local test server with game state API
4. ⏳ Connect HandMeldTest to server (fetch initial state)
5. ⏳ Send player actions to server

### Short Term
- Implement opponent hand display (face-down cards)
- Add opponent meld display
- Implement turn transitions
- Add game phase indicators
- Polish animations and timing

### Medium Term
- Migrate mechanics to main GameScreen
- Implement full multiplayer flow
- Add lobby system
- Implement all Contract Rummy rounds and contracts
- Add scoring system

### Long Term
- Add sound effects and music
- Add player customization
- Implement reconnection logic
- Add spectator mode
- Deploy to production

## Debugging Checklist

When cards aren't positioning correctly:
- [ ] Is `layout_mode = 0` set?
- [ ] Are `size_flags` cleared (set to 0)?
- [ ] Did you wait a frame after adding to container?
- [ ] Is the container sized correctly? (Print `container.size`)
- [ ] Are you using global vs local position correctly?
- [ ] Is the card being repositioned by another system? (Check for tweens, layout calls)

When drag & drop isn't working:
- [ ] Is `_input()` connected for global mouse release?
- [ ] Is the card at z_index 100 while dragging?
- [ ] Is the drag offset calculated correctly?
- [ ] Are you preventing the position jump on reparent?
- [ ] Is the drop zone check using correct global positions?

## Resources

- [Godot 4.3 Documentation](https://docs.godotengine.org/en/stable/)
- [GDScript Style Guide](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_styleguide.html)
- [Contract Rummy Rules](https://www.pagat.com/rummy/ctrummy.html)

## Contact & Questions

If you're stuck:
1. Check this guide
2. Review existing test scenes
3. Look at the console output
4. Create a minimal reproduction case
5. Ask Claude Code for help with specific error messages or behavior

---

**Remember**: Test often, commit frequently, keep code clean. Small, working increments beat big, broken features.
