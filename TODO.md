# Contract Rummy - Development Roadmap

This document outlines the next phases of development for the Contract Rummy card game.

---

## 📍 Current Status (2026-07)

**The front-end pivoted from Godot to a Phaser 3 + TypeScript web client (`web/`).**
The Godot work below (Phase 2) is archived — see `ui/` — and is kept for reference
only.

**Working today — offline single-player web game (`web/`):**
- ✅ Full playable game vs. the heuristic AI, running entirely in the browser
- ✅ Server `GameEngine` + `decideAction` AI bundled into the browser (esbuild),
  so the browser and Node server run identical rules (single source of truth)
- ✅ Complete human turn: draw / take discard, select + lay down a contract,
  lay off onto melds (drag-and-drop), discard
- ✅ All 7 rounds with contract progression; dealer rotation between rounds
- ✅ End-of-round score modal — per-round columns + running totals, filled in
  progressively; final round shows full standings, winner, Play Again / Menu
- ✅ Casino-table visual theme (runtime-generated felt/wood/shadows/gold pills,
  bundled Nunito font); card art unchanged
- ✅ `Session` seam with three implementations: `SinglePlayerSession` (offline),
  `GameClient` (WebSocket multiplayer), `LocalSession` (rules-free UI mock)

**Backend (`server/`):** authoritative engine, action handlers, AI, `ScoreKeeper`,
terminal + WebSocket clients. **287 tests passing.**

**Recent fixes:** discarding now correctly ends a turn's actions (no lay
down / lay off / second discard after discarding); opponent row centering and
info-bar layout.

**Nearest next steps (candidates):**
1. Round-end **animations / notice modal** polish (card dealing, meld laying)
2. Reconnect the **web `GameClient`** path to the live server end-to-end
   (multiplayer), including the new `onRoundEnd` / `nextRound` session hooks
3. Choose opponent count / game options from the menu (engine already supports N players)
4. A lightweight **Playwright test suite** for the web client (drives `window.__session`)
5. Sound effects; mobile/touch layout pass

> The Godot-specific roadmap in **Phase 2** below is **superseded** by `web/`.
> **Phase 3 (Production Deployment)** and **Phase 4 (Enhancements)** remain valid
> backlog for whichever front-end ships.

---

## Phase 1: Backend Refactoring ✅ COMPLETE

All planned refactorings have been completed:
- ✅ Duplicate player classes eliminated
- ✅ UUID-based card system implemented
- ✅ Action handlers extracted into separate classes
- ✅ Event system reviewed and validated (well-designed, no changes needed)
- ✅ Card representation reviewed (consistent, no changes needed)

**Status:** Codebase is clean, well-architected, and ready for multi-client support.

---

## Phase 2: UI Development — ⚠️ SUPERSEDED (Godot, archived)

> **Historical.** This phase describes the Godot 4.3 prototype in `ui/`. The
> project has since moved to the Phaser web client in `web/` (see Current Status
> at the top). Kept for reference; not the active plan.

### Technology Decision: **Godot Engine 4.3** ⭐

**Rationale:**
- Already familiar with Godot (fastest development)
- Cross-platform support (iOS, Android, Desktop, Web)
- Built-in WebSocket support
- Excellent for 2D card games (animations, drag-drop, particles)
- Works perfectly with existing Node.js backend

**Alternative Considered:** React Native, SwiftUI (documented for reference)

### Current Implementation Status (as of 2025-12-07)

**✅ Completed:**
- Godot 4.3 project configured (landscape, mobile renderer)
- SceneManager singleton for navigation
- All 52 card assets + joker + card back imported
- Card scene with selection, face up/down, drag support
- Hand scene with slot-based drag-and-drop and real-time preview
- Splash screen (auto-advances after 2s)
- Title screen with full menu navigation
- Placeholder screens: Rules, Options, About, GameSetup, JoinGame, GameScreen

**🔄 In Progress / Next Steps:**
- Implement GameSetup screen (display game code, player list, jokers config)
- Implement JoinGame screen (code input, player name)
- Complete WebSocket client implementation
- Build Table scene (deck, discard pile, meld areas)
- Build Opponent Area component
- Build full Game Screen with all components integrated

**📦 Assets Status:**
- ✅ Cards: Complete (52 cards + joker + back)
- ⏳ Backgrounds: Need felt table texture/color
- ⏳ Icons: Need menu, settings, and action icons
- ⏳ Fonts: Using default (need to select custom fonts)
- ⏳ Audio: Not started (future)

### Game Flow & Screen Architecture

**Complete User Journey:**

```
Splash Screen (1-2s auto-advance)
    ↓
Title Screen
    ├─→ New Game → Game Setup Screen
    ├─→ Join Game → Join Screen
    ├─→ Rules → Rules Screen
    ├─→ Options → Options Screen
    └─→ About → About Screen

Game Setup Screen
    ├─ Display game code (e.g., "XJ7K3B")
    ├─ Waiting for players list
    ├─ Jokers configuration (0, 1, or 2 jokers)
    ├─ Start button (when min players joined)
    └─→ Game Screen

Join Screen
    ├─ Enter game code input
    ├─ Player name input
    └─→ Game Setup Screen (waiting room)

Game Screen (Main gameplay)
    ├─ Opponent area (top)
    ├─ Table area (middle: deck, discard, melds)
    ├─ Player hand (bottom)
    ├─ Action buttons (draw, discard, lay down, etc.)
    ├─ Menu button → Pause Menu
    ├─ Notice Modal (turn notifications, game events)
    ├─→ Round End Modal (scores, contracts)
    └─→ Game End Screen

Round End Modal
    ├─ Round scores display
    ├─ Contract progress tracking
    ├─ Next round button
    └─→ Game Screen (next round) OR Game End Screen

Game End Screen
    ├─ Final scores chart
    ├─ Winner celebration
    ├─ Play again button → Title Screen
    └─ Exit button → Title Screen
```

---

### Detailed Screen Specifications

#### 1. Splash Screen
- **Purpose:** Branding, asset loading
- **Duration:** 1-2 seconds (auto-advance)
- **Content:**
  - App logo/title
  - Loading indicator
  - "Tap to continue" (if loading takes longer)

#### 2. Title Screen
- **Layout:** Centered menu with background
- **Buttons:**
  - **New Game** - Host a new game
  - **Join Game** - Join existing game by code
  - **Rules** - View game rules and contracts
  - **Options** - Settings (sound, music, animations)
  - **About** - Credits, version, links
- **Visual:** Felt table background, card decorations

#### 3. Game Setup Screen (New Game)
- **Host View:**
  - Large display of game code (e.g., "XJ7K3B")
  - Share button (copy code to clipboard)
  - Player list (shows who's joined)
  - Game configuration:
    - **Jokers:** Dropdown (0, 1, or 2 jokers)
    - **Round start:** Dropdown (start at round 1-7)
  - **Start Game** button (enabled when ≥2 players)
  - **Cancel** button (return to title)
- **Guest View (after joining):**
  - "Waiting for host to start..."
  - Player list
  - Ready indicator

#### 4. Join Game Screen
- **Layout:** Simple form
- **Inputs:**
  - Game code (6-char input, auto-uppercase)
  - Player name (optional, default "Player X")
- **Buttons:**
  - **Join** - Connect to game
  - **Back** - Return to title
- **Feedback:**
  - "Connecting..." spinner
  - Error messages (invalid code, game full, etc.)

#### 5. Game Screen (Main Gameplay)
- **Layout:** (Based on your sketch)
  - **Top:** Opponent cards + melds (compact view)
  - **Middle:** Deck, discard pile, player's melds
  - **Bottom:** Player's hand (scrollable, drag to reorder)
  - **Right/Corner:** Action buttons panel
- **Components:**
  - **Opponent Area:**
    - Face-down card count
    - Melds laid down (3 rows, scrollable)
    - Turn indicator (highlight active player)
  - **Table Area:**
    - Deck (left) - card back, count badge
    - Discard pile (center-left) - top card visible
    - Player's melds (right) - horizontal rows
  - **Player Hand:**
    - Scrollable horizontal card container
    - Drag-and-drop to reorder
    - Multi-select for laying down melds
  - **Action Panel:**
    - **Draw from Deck** button
    - **Draw from Discard** button
    - **Lay Down** button (opens meld builder)
    - **Add to Meld** button
    - **Discard** button
    - **End Turn** button
  - **Menu Button:** (Hamburger icon, top-left)
    - Resume
    - Rules reference
    - Options
    - Leave game (with confirmation)

#### 6. Notice Modal (In-Game Notifications)
- **Purpose:** Keep players informed of game events
- **Display:** Semi-transparent overlay, auto-dismiss after 2-3s
- **Examples:**
  - "Your turn!"
  - "Alice drew from the deck"
  - "Bob laid down a run of spades"
  - "Charlie went out!"
- **Features:**
  - Queue multiple notifications
  - Tap to dismiss immediately
  - Different colors for different event types

#### 7. Round End Modal
- **Trigger:** When a player goes out
- **Content:**
  - Round number (e.g., "Round 3 Complete")
  - Scores table:
    - Player names
    - Cards left in hand (penalty points)
    - Round score
    - Total score
  - Contract progress indicators
  - **Next Round** button (host only)
- **Layout:** Full-screen overlay, can't dismiss until host continues

#### 8. Game End Screen
- **Trigger:** After round 7 completes
- **Content:**
  - **Winner announcement** with celebration animation
  - **Final scores chart:**
    - Bar chart or table
    - All rounds breakdown
    - Final totals
  - **Stats** (optional):
    - Total cards played
    - Melds laid down
    - Rounds won
- **Buttons:**
  - **Play Again** (returns to title, creates new game)
  - **View Details** (expand score breakdown)
  - **Exit** (return to title)

#### 9. Rules Screen
- **Content:**
  - Game overview
  - Contract requirements (rounds 1-7)
  - How to form melds (sets, runs)
  - Joker rules
  - Scoring system
- **Layout:** Scrollable text with illustrations
- **Navigation:** Back button to title

#### 10. Options Screen
- **Settings:**
  - **Sound Effects:** On/Off, Volume slider
  - **Music:** On/Off, Volume slider
  - **Animations:** Fast/Normal/Slow
  - **Card Design:** Choose card back design
  - **Notifications:** Enable/disable in-game notices
- **Buttons:** Save, Cancel

#### 11. About Screen
- **Content:**
  - App version
  - Developer credits
  - Open source licenses
  - Contact/feedback link
  - Privacy policy (if applicable)
- **Navigation:** Back button

---

### UI Development Tasks

#### Milestone 0: Project Setup ✅
- [x] Create Godot project structure
- [x] Configure project settings (landscape, mobile renderer)
- [x] Create placeholder autoload singletons
- [x] Set up basic test scene

#### Milestone 1: Core Screens & Navigation (Week 1) ✅
- [x] Create screen manager / scene switcher (`SceneManager.gd`) ✅
- [x] Build Splash Screen (`Splash.tscn`) ✅
  - [x] App logo/branding
  - [x] Auto-advance to Title after 2 seconds
- [x] Build Title Screen (`TitleScreen.tscn`) ✅
  - [x] Main menu buttons (New Game, Join, Rules, Options, About)
  - [x] Background styling (felt table theme)
  - [x] Dev button to access Card Test scene
- [x] Build Rules Screen (`RulesScreen.tscn`) ✅ (Placeholder - TODO content)
  - [ ] Contract requirements display
  - [ ] Scrollable content
- [x] Build Options Screen (`OptionsScreen.tscn`) ✅ (Placeholder - TODO content)
  - [ ] Sound/music toggles and sliders
  - [ ] Animation speed selector
  - [ ] Save/load settings to file
- [x] Build About Screen (`AboutScreen.tscn`) ✅ (Placeholder - TODO content)
  - [ ] Version info, credits, links

#### Milestone 2: Lobby & Game Setup (Week 2)
- [x] Build Game Setup Screen (`GameSetup.tscn`) ✅ (Placeholder - TODO implementation)
  - [ ] Display game code (large, copyable)
  - [ ] Player list component
  - [ ] Jokers configuration dropdown
  - [ ] Start game button (host only)
- [x] Build Join Game Screen (`JoinGame.tscn`) ✅ (Placeholder - TODO implementation)
  - [ ] Game code input (6-char, auto-uppercase)
  - [ ] Player name input
  - [ ] Join button with validation
- [ ] Implement WebSocket client (`GameConnection.gd`)
  - [ ] Connect to existing `GameServer.js`
  - [ ] Handle welcome, join, and lobby messages
  - [ ] Basic error handling

#### Milestone 3: Core Game UI (Weeks 3-4)
- [x] Build Card scene (`Card.tscn`) ✅
  - [x] Card rendering (suit, value, visual styling)
  - [x] Touch/click handling
  - [x] Selection system (yellow highlight)
  - [x] Face up/down support
  - [x] Drag-and-drop support
- [x] Build Hand scene (`Hand.tscn`) ✅
  - [x] Slot-based card positioning
  - [x] Real-time drag preview (cards shift while dragging)
  - [x] Smooth animations (tweens)
  - [x] Multi-select support
  - [x] Card reordering with snap-to-slot
- [ ] Build Table scene (`Table.tscn`)
  - Deck display (left) with card count
  - Discard pile (center-left) showing top card
  - Player melds area (right side)
- [ ] Build Opponent Area (`OpponentArea.tscn`)
  - Face-down card count display
  - Opponent melds (3 rows, scrollable)
  - Turn indicator highlight
- [ ] Build Game Screen (`GameScreen.tscn`)
  - Integrate Hand, Table, OpponentArea
  - Action buttons panel (Draw, Discard, Lay Down, etc.)
  - Menu button (hamburger icon)
- [ ] Implement game actions
  - Draw card (from deck/discard)
  - Discard card
  - Lay down melds (with meld builder UI)
  - Add to existing melds
  - End turn
- [ ] Complete WebSocket integration
  - Handle game state updates
  - Send player actions to server
  - Implement reconnection logic

#### Milestone 4: Modals & Notifications (Week 5)
- [ ] Build Notice Modal (`NoticeModal.tscn`)
  - Semi-transparent overlay
  - Auto-dismiss after 2-3 seconds
  - Notification queue system
  - Event-based styling (turn, action, win)
- [ ] Build Round End Modal (`RoundEndModal.tscn`)
  - Round scores table
  - Contract progress display
  - Next round button (host only)
- [ ] Build Game End Screen (`GameEndScreen.tscn`)
  - Winner announcement with animation
  - Final scores chart/table
  - Play again and exit buttons
- [ ] Build Pause Menu (`PauseMenu.tscn`)
  - Resume, rules, options, leave game
  - Confirmation dialog for leaving

#### Milestone 5: Polish & Testing (Week 6)
- [ ] Add animations
  - Card dealing
  - [x] Card movement (tweens) ✅
  - Meld laying
  - Particle effects for winning
- [ ] Add sound effects
  - Card flip
  - Card placement
  - Turn notification
  - Win celebration
- [ ] UI polish
  - Responsive layouts
  - Dark mode support
  - Score display
  - Round transitions
- [ ] Local testing with multiple clients

#### Milestone 6: iOS Export (Week 7)
- [ ] Configure iOS export settings
  - Bundle identifier
  - App icons
  - Launch screens
  - Permissions (network access)
- [ ] Test on iOS device
- [ ] Handle iOS-specific concerns
  - Background/foreground transitions
  - Touch vs mouse input
  - Safe area insets
- [ ] Create TestFlight build
- [ ] Beta test with friends/family

---

## Phase 3: Production Deployment

### Backend Enhancements

#### Game Server Production-Ready Features
- [ ] **Multi-Instance Support**
  - Add Redis for session management
  - Implement pub/sub for cross-pod communication
  - Persist active game state to Redis

- [ ] **Room/Lobby System**
  - Generate short game codes (6 chars, e.g., "XJ7K3B")
  - Create game endpoint
  - Join game by code endpoint
  - List active games

- [ ] **Connection Management**
  - Heartbeat/ping-pong for dead connection detection
  - Graceful disconnect handling
  - Player reconnection support (restore session)
  - Connection timeout handling

- [ ] **Health & Monitoring**
  - Add `/health` endpoint for K8s liveness probe
  - Add `/ready` endpoint for K8s readiness probe
  - Add `/metrics` endpoint for Prometheus
  - Structured logging (Winston with JSON format)

- [ ] **Security Enhancements**
  - Rate limiting (per IP, per player)
  - Input validation for all client messages
  - WebSocket authentication (JWT tokens - future)
  - Sanitize error messages (don't leak internals)

#### Code Changes Required
```javascript
// Location: server/src/server/GameServer.js
- Add Redis client integration
- Add game room management (create/join/list)
- Add HTTP handler for health checks
- Implement rate limiting
- Add metrics collection
```

### Kubernetes Deployment

#### Infrastructure Setup
- [ ] **Create Kubernetes Manifests**
  - `gameserver-deployment.yaml` - Game server deployment (3 replicas)
  - `gameserver-service.yaml` - ClusterIP service
  - `redis-deployment.yaml` - Redis for session storage
  - `redis-service.yaml` - Redis service
  - `ingress.yaml` - Ingress with WSS support
  - `secrets.yaml` - Redis password, JWT secret
  - `pvc.yaml` - Persistent volume for Redis (optional)

- [ ] **Ingress Configuration**
  - Install nginx-ingress-controller
  - Configure WebSocket upgrade headers
  - Enable SSL/TLS termination
  - Set connection timeouts (3600s for long-lived WS)
  - Add rate limiting annotations

- [ ] **SSL/TLS Setup**
  - Install cert-manager
  - Create ClusterIssuer for Let's Encrypt
  - Auto-provision SSL certificates
  - Configure certificate renewal

- [ ] **Redis Setup**
  - Deploy Redis StatefulSet or Deployment
  - Configure password authentication
  - Optional: Enable persistence (RDB/AOF)
  - Optional: Redis Sentinel for HA (if needed)

#### Deployment Files Location
```
server/k8s/
├── namespace.yaml
├── gameserver-deployment.yaml
├── gameserver-service.yaml
├── redis-deployment.yaml
├── redis-service.yaml
├── ingress.yaml
├── secrets.yaml.template
└── cert-manager/
    └── cluster-issuer.yaml
```

### Docker & CI/CD

#### Dockerfile for Game Server
- [ ] Create production Dockerfile
  - Multi-stage build (build + production)
  - Node.js LTS base image
  - Install only production dependencies
  - Non-root user
  - Health check instruction

```dockerfile
# Location: server/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
CMD ["node", "src/server/index-ws.js"]
```

#### CI/CD Pipeline
- [ ] **GitHub Actions Workflow**
  - Trigger on push to `main` branch
  - Run tests (`npm test`)
  - Build Docker image
  - Push to container registry
  - Deploy to K8s cluster (kubectl apply)
  - Run smoke tests

```yaml
# Location: .github/workflows/deploy.yml
name: Deploy to K8s
on:
  push:
    branches: [main]
jobs:
  deploy:
    - Run tests
    - Build Docker image
    - Push to registry
    - Deploy to K8s
```

### Security & Best Practices

- [ ] **SSL/TLS**
  - Use `wss://` (secure WebSocket) in production
  - Enable SSL certificate verification in Godot client
  - Use Let's Encrypt for free auto-renewed certs

- [ ] **Authentication (Future)**
  - Implement JWT-based authentication
  - Player accounts and login
  - Refresh token rotation
  - Rate limit login attempts

- [ ] **DDoS Protection**
  - Add Cloudflare in front of K8s cluster
  - Configure WebSocket support in Cloudflare
  - Enable bot detection and rate limiting

- [ ] **Input Validation**
  - Validate all action types
  - Validate card UUIDs
  - Validate meld structures
  - Sanitize player names

- [ ] **Monitoring**
  - Set up Prometheus for metrics
  - Set up Grafana dashboards
  - Set up alerting (PagerDuty, Slack, etc.)
  - Log aggregation (Loki, ELK, or cloud provider)

### Production Checklist

**Before Going Live:**
- [ ] Load test WebSocket server (multiple concurrent games)
- [ ] Test reconnection scenarios (network drops, app backgrounding)
- [ ] Test multiple concurrent clients per game
- [ ] Verify SSL certificate auto-renewal works
- [ ] Set up backup for Redis (if using persistence)
- [ ] Document runbooks for common issues
- [ ] Set up monitoring and alerting
- [ ] Test Godot app on real iOS devices
- [ ] TestFlight beta with friends/family
- [ ] Fix bugs from beta testing
- [ ] App Store submission

---

## Phase 4: Optional Enhancements (Future)

### Features
- [ ] Player accounts and authentication
- [ ] Friends list and invitations
- [ ] Game history and statistics
- [ ] Leaderboards
- [ ] Push notifications (iOS)
- [ ] Spectator mode
- [ ] Custom game rules/variants
- [ ] In-game chat
- [ ] Replay system

### Platforms
- [ ] Android version (Godot export)
- [ ] Web version (Godot HTML5 export)
- [ ] Desktop version (macOS, Windows, Linux)

### Infrastructure
- [ ] PostgreSQL for persistent data
  - Player accounts
  - Game history
  - Statistics
- [ ] Horizontal scaling with Redis Cluster
- [ ] Auto-scaling (HPA) based on active games
- [ ] Multi-region deployment
- [ ] CDN for static assets

---

## Reference Documentation

### Architecture Overview
```
iOS App (Godot)
    ↓ wss://game.yourdomain.com
Cloudflare (Optional)
    ↓
K8s Ingress (nginx)
    ↓
Game Server Pods (3 replicas)
    ↓
Redis (Session Management)
    ↓
PostgreSQL (Persistent Data - Future)
```

### Technology Stack
- **Backend:** Node.js + Express + WebSocket (ws)
- **Frontend:** Godot Engine 4.x (GDScript)
- **Session Store:** Redis
- **Database:** PostgreSQL (future)
- **Container Orchestration:** Kubernetes
- **SSL/TLS:** Let's Encrypt + cert-manager
- **CI/CD:** GitHub Actions
- **Monitoring:** Prometheus + Grafana
- **Optional:** Cloudflare for DDoS protection

### Estimated Costs (Friends/Family Scale)
- K8s Cluster (managed): $70-100/month
- Domain: $12/year
- SSL Certificates: Free (Let's Encrypt)
- Cloudflare: Free tier (or $20/month Pro)
- Apple Developer Account: $99/year

**Total:** ~$80-120/month + $99/year for App Store

### Development Timeline Estimate
- UI Development: 6-8 weeks (🔄 Week 1 in progress)
- Production Deployment: 2-3 weeks
- Beta Testing: 1-2 weeks
- App Store Review: 1-2 weeks

**Total:** ~10-15 weeks to production iOS app

### Progress Summary

**Week 1 Progress (2025-12-07):**
- ✅ Project setup complete
- ✅ Card system with drag-and-drop complete
- ✅ Navigation scaffolding complete
- 🔄 Ready for lobby implementation

**Estimated Completion:**
- Milestone 1 (Navigation): ✅ 100%
- Milestone 2 (Lobby): ⏳ 20% (scaffolding done, needs implementation)
- Milestone 3 (Game UI): ⏳ 35% (Card/Hand done, need Table/Opponent/GameScreen)
- Milestone 4 (Modals): ⏳ 0%
- Milestone 5 (Polish): ⏳ 10% (card animations done)
- Milestone 6 (iOS): ⏳ 0%

**Overall UI Development:** ~25% complete

---

*Last updated: 2025-12-07*
*Current Phase: Phase 2 - UI Development (Godot)*
*Current Progress:*
- ✅ Milestone 0: Project Setup Complete
- ✅ Milestone 1: Navigation Scaffolding Complete
- ✅ Card & Hand scenes complete with slot-based drag-and-drop
- 🔄 Currently: Milestone 2 & 3 - Implement game screens

*Completed Today:*
- SceneManager for navigation
- Splash Screen (auto-advances after 2s)
- Title Screen with full menu
- Placeholder screens (Rules, Options, About, GameSetup, JoinGame)
- Card & Hand scenes with drag-and-drop

*Next Steps:*
1. Implement lobby screens (GameSetup, JoinGame) with WebSocket
2. Build Table scene (deck, discard, melds)
3. Build Opponent Area and full Game Screen

---

## Quick Reference: Screen Flow Summary

**✅ Implemented:**
1. **Splash** → auto-advances after 2s ✅
2. **Title** → New Game / Join Game / Rules / Options / About ✅
3. **Rules/Options/About** → placeholder screens with back button ✅
4. **[Dev] Card Test** → drag-and-drop test scene ✅

**⏳ To Implement:**
5. **Game Setup** (host) OR **Join Game** (guest) → waiting room
6. **Game Screen** → main gameplay
7. **Notice Modal** → in-game notifications (overlays Game Screen)
8. **Round End Modal** → scores after each round
9. **Game End Screen** → final scores and winner
10. **Back to Title** → play again loop

---

## Asset Requirements

### Cards ✅ COMPLETE
- [x] 52 card faces (A-K for each suit) - 150x210px
- [x] Joker card - 150x210px
- [x] Card back - 150x210px

### Backgrounds & UI (To Be Created)
- [ ] Felt table background - 1920x1080px (or solid color #225533)
- [ ] UI panel background - 400x400px (9-patch/sliced)
- [ ] Button backgrounds (normal, pressed, disabled) - 300x80px
- [ ] Modal overlay background - 800x600px (semi-transparent)

### Icons (To Be Created)
- [ ] Menu/hamburger icon - 64x64px
- [ ] Close/X icon - 64x64px
- [ ] Settings/gear icon - 64x64px
- [ ] Sound on/off icons - 64x64px each
- [ ] Music on/off icons - 64x64px each
- [ ] Copy/share icon - 64x64px
- [ ] Checkmark icon - 64x64px
- [ ] Back arrow icon - 64x64px
- [ ] Plus icon - 64x64px
- [ ] Refresh icon - 64x64px

### App Branding (To Be Created)
- [ ] App icon/logo - 1024x1024px master (iOS needs various sizes)
- [ ] Splash screen - 1920x1080px
- [ ] Launch screen (iOS) - 1920x1080px

### Fonts (To Be Selected)
- [ ] Primary UI font (bold sans-serif)
- [ ] Numbers/scores font (monospace/tabular)
- [ ] Optional: Display font for titles

### Audio (Future)
- [ ] Sound effects (card flip, place, button click, etc.)
- [ ] Background music (optional)

**Note:** Start with placeholder assets where needed. Visual polish can be added incrementally.
