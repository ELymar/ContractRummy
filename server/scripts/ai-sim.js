/**
 * Headless full-game simulation: drives the real GameEngine with the AI brain,
 * no WebSocket or browser. Proves the engine + AI + protocol play complete
 * rounds (and a full game) correctly, and surfaces any illegal move the brain
 * proposes (the server emits an ERROR event, which we treat as a failure).
 *
 *   node server/scripts/ai-sim.js            # one game
 *   GAMES=20 node server/scripts/ai-sim.js   # 20 games, summary only
 *   SEED=42 node server/scripts/ai-sim.js    # deterministic
 */
const seedrandom = require('seedrandom');
const GameEngine = require('../src/core/engine/GameEngine');
const {decideAction} = require('../src/ai/decideAction');

const GAMES = Number(process.env.GAMES || 1);
const VERBOSE = process.env.GAMES ? false : true;
const ACTION_CAP = 100000; // safety against a stuck brain

function playOneGame(gameIndex) {
  const rng = process.env.SEED ? seedrandom(`${process.env.SEED}-${gameIndex}`) : Math.random;
  const engine = new GameEngine({rng});

  // Two AI players join and ready up.
  engine.apply({type: 'JOIN', playerId: 'p1', payload: {name: 'Alice'}});
  engine.apply({type: 'JOIN', playerId: 'p2', payload: {name: 'Bob'}});
  engine.apply({type: 'READY', playerId: 'p1'});
  engine.apply({type: 'READY', playerId: 'p2'});

  const stats = {actions: 0, rounds: 0, errors: [], roundWinners: []};

  while (stats.actions < ACTION_CAP) {
    const idx = engine.state.currentPlayerIndex;
    const player = engine.state.players[idx];
    const view = engine.getViewFor(player.id);

    const command = decideAction(view);
    if (!command) {
      stats.errors.push(`no action for ${player.id} (round ${view.round})`);
      break;
    }

    if (process.env.TRACE) {
      console.log(
        `r${view.round} ${player.name} ${command.type} (hand ${view.yourHand.length}, down=${view.youAreDown})`,
      );
    }
    const evts = engine.apply({...command, playerId: player.id});
    stats.actions++;

    const error = evts.find((e) => e.type === 'ERROR');
    if (error) {
      stats.errors.push(`${command.type} rejected: ${error.payload?.message}`);
      break;
    }

    const roundEnded = evts.find((e) => e.type === 'ROUND_ENDED');
    if (roundEnded) {
      stats.rounds++;
      stats.roundWinners.push({round: view.round, winner: roundEnded.payload?.winnerId ?? roundEnded.payload?.winner});
      if (VERBOSE) {
        console.log(`  round ${view.round} ended after ${stats.actions} actions`, roundEnded.payload || {});
      }
      if (roundEnded.payload?.gameComplete) break;
      const next = engine.startNextRound();
      if (next.some((e) => e.type === 'GAME_ENDED')) break;
    }

    if (evts.some((e) => e.type === 'GAME_ENDED')) break;
  }

  const stuck = stats.actions >= ACTION_CAP;
  if (stuck) {
    stats.stuckState = {
      round: engine.state.currentRound,
      melds: (engine.state.downPiles || []).length,
      players: engine.state.players.map((p) => ({
        name: p.name,
        down: p.isDown,
        hand: p.hand?.cards?.length ?? 0,
      })),
    };
  }
  const scoreTable = engine.scoreKeeper?.getScoreTable?.() ?? null;
  return {stats, scoreTable, stuck};
}

let totalRounds = 0;
let failures = 0;
for (let g = 0; g < GAMES; g++) {
  if (VERBOSE) console.log(`=== Game ${g + 1} ===`);
  const {stats, scoreTable, stuck} = playOneGame(g);
  totalRounds += stats.rounds;

  const failed = stats.errors.length > 0 || stuck || stats.rounds === 0;
  if (failed) failures++;

  if (VERBOSE || failed) {
    console.log(
      `Game ${g + 1}: ${stats.rounds} rounds, ${stats.actions} actions` +
        (stuck ? ' [STUCK]' : '') +
        (stats.errors.length ? ` ERRORS: ${stats.errors.join('; ')}` : ''),
    );
    if (stuck) console.log('  STUCK state:', JSON.stringify(stats.stuckState));
  }
}

console.log(
  `\nSummary: ${GAMES} game(s), ${totalRounds} rounds total, ${failures} failure(s).`,
);
process.exit(failures > 0 ? 1 : 0);
