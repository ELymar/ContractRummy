# Refactoring TODO

This document tracks potential refactoring opportunities to simplify and streamline the card game codebase.

## Long-Term Vision

### Target Architecture
We envision a multi-platform card game supporting diverse client types:

**Client Interfaces:**
- **Terminal Client** (current) - CLI-based gameplay for development/testing
- **Web UI** (near future) - Browser-based interface with modern web technologies
- **Mobile Apps** (future) - Native iOS/Android applications
- **Bot Players** (future) - AI agents that can play autonomously

### Architectural Goals
The game engine must be **client-agnostic** and support this evolution through:

1. **Clean Separation of Concerns**
   - Game logic completely independent of presentation layer
   - UI rendering handled by clients, not the server
   - Well-defined API contracts between engine and clients

2. **Reliable & Maintainable Abstractions**
   - Clear interfaces between game engine, networking, and client layers
   - Consistent data models that work across all client types
   - Robust error handling and validation

3. **Strong Test Coverage**
   - Comprehensive unit tests for game logic
   - Integration tests for client/server protocols
   - Regression tests for game scenarios
   - Bot behavior validation (future)

4. **Protocol Design for Multi-Client Support**
   - Standardized WebSocket/HTTP API that works for web, mobile, and bots
   - Efficient message formats (JSON/binary as needed)
   - Real-time state synchronization across clients

### Implementation Strategy
- **Phase 1**: Refactor current codebase for clean abstractions (this TODO)
- **Phase 2**: Build web UI using established engine APIs
- **Phase 3**: Develop mobile clients reusing same backend
- **Phase 4**: Implement bot framework with game engine integration

The refactorings below are prioritized to support this architectural evolution.

---

## Priority Levels
- **High**: Significant complexity reduction and maintainability improvement
- **Medium**: Good improvement with moderate effort
- **Low**: Nice to have, minimal complexity reduction

---

## 1. [X] Duplicate Player Classes (High Priority)
**Current Issue:** Two nearly identical player classes exist:
- `game_runner/Player.js` - Simple player class with basic game logic
- `game_runner/TerminalPlayer.js` - Enhanced player with terminal UI logic (400+ lines)

**Refactoring Plan:**
- Consolidate into a single `Player` class
- Use composition/strategy pattern for UI concerns
- Extract terminal-specific logic into separate UI handler

**Impact:** Eliminates code duplication, simplifies player management

---

## 2. [X] Hand Order Synchronization Complexity (High Priority)
**Current Issue:** 
- Clients send their entire hand order with every action (`handOrder: [...]`)
- Server validates and syncs hand order every time via `validateAndSyncHand()` (50+ lines)
- Creates unnecessary network overhead and code complexity
- Example current message: `{ type: 'DISCARD', payload: { cardIndex: 8, handOrder: [...10+ cards...] } }`

**Refactoring Plan - Card UUID System:**
```javascript
// 1. Add UUIDs when dealing cards
player.hand.cards = [
  { suit: 'Hearts', value: 'King', uuid: 'uuid-1' },
  { suit: 'Spades', value: 'Ace', uuid: 'uuid-2' },
  // ...
]

// 2. Client sends just the UUID
{ type: 'DISCARD', payload: { cardUuid: 'uuid-1' } }

// 3. Server validates player owns that UUID
const cardIndex = player.hand.cards.findIndex(c => c.uuid === cardUuid);
if (cardIndex === -1) return { error: 'Player does not own that card' };
```

**Security Benefits:**
- Impossible to reference cards you don't own
- No hand tampering possible
- Stronger security guarantee than current system

**Technical Benefits:**
- Eliminates complex `validateAndSyncHand()` method
- Reduces message size by ~90%
- Client can reorder UI freely without server sync
- Simpler validation logic

**Implementation Steps:**
1. Add UUID generation to Card class/dealing logic
2. Update all action payloads to use cardUuid instead of cardIndex+handOrder
3. Replace validateAndSyncHand() calls with simple UUID lookups
4. Update client code to send UUIDs instead of hand order
5. Update tests to use UUID-based actions

---

## 3. [X] GameEngine Action Handler Complexity (Medium Priority)
**Current Issue:** 
- The `apply()` method is a massive switch statement (800+ lines)
- Repetitive validation patterns across different actions
- Single method handles all game logic

**Refactoring Plan:**
- Extract action handlers into separate classes (e.g., `DiscardHandler`, `LayDownHandler`)
- Create shared validation utilities
- Use command pattern or similar for action routing

**Impact:** Better separation of concerns, easier testing, reduced method complexity

---

## 4. [ ] Event System Over-Engineering (Medium Priority)
**Current Issue:**
- Every action creates events that are collected and returned
- Most events are just "X happened" notifications
- Adds complexity without clear benefit in many cases

**Refactoring Plan:**
- Simplify to only emit events for state changes clients need to know about
- Consider direct state updates for internal-only changes
- Evaluate if event collection pattern is necessary

**Impact:** Reduced complexity, clearer data flow

---

## 5. [ ] Card Representation Inconsistency (Low Priority)
**Current Issue:** Cards are represented differently across contexts:
- `Card` objects with `.suit`/`.value` properties
- Serialized strings like `[K♦]`
- Plain objects `{suit, value}`

**Refactoring Plan:**
- Standardize on single card representation throughout codebase
- Add consistent serialization/deserialization methods
- Update all card handling code to use consistent format

**Impact:** Reduced confusion, easier debugging, consistent APIs

---

## Implementation Notes
- These refactorings should be done incrementally with full test coverage
- Maintain backward compatibility where possible during transitions
- Focus on high-priority items first for maximum impact
- Consider creating feature branches for large refactoring efforts

---

*Last updated: 2025-01-13*
*Status: Planning phase*