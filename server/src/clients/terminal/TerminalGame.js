const GameState = require('../../core/domain/GameState');
const TerminalPlayerInterface = require('./TerminalPlayerInterface');
const {getContractForRound, getTotalRounds} = require('../../core/rules/RoundContract');
const ScoreKeeper = require('../../shared/ScoreKeeper');
const CardScoring = require('../../core/rules/CardScoring');
const RoundDealing = require('../../core/rules/RoundDealing');
const GameIO = require('../../shared/GameIO');

/**
 * Terminal-based Contract Rummy game orchestrator
 * Manages game flow, player turns, screen clearing, and results display
 */
class TerminalGame {
  /**
   * Create a new terminal game with two players
   * @param {string} player1Name - Name for player 1 (default: 'Player 1')
   * @param {string} player2Name - Name for player 2 (default: 'Player 2')
   * @param {Array<Array<number>>} previousScores - Array of [p1_score, p2_score] tuples for completed rounds
   */
  constructor(player1Name = 'Player 1', player2Name = 'Player 2', previousScores = []) {
    this.gameState = new GameState();
    this.players = [];
    this.currentPlayerIndex = 0;
    this.currentRound = 1; // Will be updated based on previous scores
    this.dealerIndex = 0; // Will be updated based on starting round

    // Initialize two players for terminal gameplay
    this.players.push(new TerminalPlayerInterface(player1Name));
    this.players.push(new TerminalPlayerInterface(player2Name));

    // Initialize score tracking
    const playerNames = this.players.map((player) => player.name);
    this.scoreKeeper = new ScoreKeeper(playerNames, getTotalRounds());

    // Load previous scores if provided
    if (previousScores.length > 0) {
      this.loadPreviousScores(previousScores);
      // Set starting round and dealer based on completed rounds
      this.currentRound = previousScores.length + 1;
      this.dealerIndex = previousScores.length % 2; // Dealer alternates each round
    }
  }

  /**
   * Load previous round scores into the scorekeeper
   * @param {Array<Array<number>>} previousScores - Array of [p1_score, p2_score] tuples
   */
  loadPreviousScores(previousScores) {
    this.scoreKeeper.loadPreviousScores(previousScores);
    console.log(
      `\n📊 Loaded ${previousScores.length} previous round${previousScores.length === 1 ? '' : 's'}`
    );
    console.log('Previous scores:');
    console.log(this.scoreKeeper.getScoreTable());
  }

  // Check if the game has ended (one player has no cards)
  ended = () => {
    return this.players[0].hand.length() === 0 || this.players[1].hand.length() === 0;
  };

  // Display current game state for the specified player
  displayGameState = (forPlayerIndex) => {
    console.log('\n' + '='.repeat(60));
    console.log(`GAME STATE (for ${this.players[forPlayerIndex].name}):`);
    console.log('='.repeat(60));

    // Show current round contract
    try {
      const contract = getContractForRound(this.currentRound);
      console.log(`📋 ${contract.toString()}`);
    } catch (error) {
      console.log(`📋 Round ${this.currentRound}`);
    }
    console.log('─'.repeat(60));

    console.log(`Deck cards remaining: ${this.gameState.deck.length()}`);

    // Show burn pile top card
    if (this.gameState.burnPile.cards.length > 0) {
      console.log(
        `Burn pile top card: ${this.gameState.burnPile.topCard().toString()}${this.gameState.burnPile.dead ? ' (dead)' : ''}`
      );
    } else {
      console.log('Burn pile: Empty');
    }

    // Show down piles (melds on table)
    console.log('\nDown Piles on table:');
    if (this.gameState.downPiles.length === 0) {
      console.log('  None');
    } else {
      this.gameState.downPiles.forEach((pile, idx) => {
        console.log(`  ${idx + 1}: ${pile.toString()} (${pile.getOwner()})`);
      });
    }

    // Show opponent card count
    const opponentIndex = forPlayerIndex === 0 ? 1 : 0;
    console.log(
      `\n${this.players[opponentIndex].name} has ${this.players[opponentIndex].hand.length()} cards`
    );

    // Show current player's hand
    console.log(
      `Your hand (${this.players[forPlayerIndex].hand.length()} cards): ${this.players[forPlayerIndex].hand.toString()}`
    );
    console.log('='.repeat(60));
  };

  // Set up initial game state and deal cards
  setupRound = () => {
    console.log('\n🎮 Starting New Round of Contract Rummy! 🎮');

    try {
      const contract = getContractForRound(this.currentRound);
      console.log(`Contract for this round: ${contract.toString()}`);
    } catch (error) {
      console.log('Contract details unavailable for this round.');
    }

    // Reset game state
    this.gameState.initialize();
    this.players.forEach((player) => player.roundReset());

    // Deal cards according to round requirements and dealer
    const dealConfig = RoundDealing.getCardsForRound(this.currentRound, this.dealerIndex);
    this.players[0].drawFromGameState(this.gameState, dealConfig.player1Cards);
    this.players[1].drawFromGameState(this.gameState, dealConfig.player2Cards);

    const playerNames = this.players.map((player) => player.name);
    const dealingSummary = RoundDealing.getRoundSummary(
      this.currentRound,
      this.dealerIndex,
      playerNames
    );

    console.log(`Dealer: ${this.players[this.dealerIndex].name}`);
    console.log(dealingSummary);

    // Non-dealer starts first (the player with the extra card)
    this.currentPlayerIndex = (this.dealerIndex + 1) % 2;
    console.log(`First player: ${this.players[this.currentPlayerIndex].name} (non-dealer)`);
    this.gameState.setFirstTurn(true);

    console.log('Initial hands dealt!');
    console.log(`${this.players[0].name}: ${this.players[0].hand.length()} cards`);
    console.log(`${this.players[1].name}: ${this.players[1].hand.length()} cards`);
    console.log(`Deck remaining: ${this.gameState.deck.length()} cards`);
  };

  // Switch to the next player's turn
  switchPlayer = () => {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
    this.gameState.setFirstTurn(false); // Only first turn of game is marked as firstTurn
  };

  // Display final results for a round and record scores
  displayRoundResults = () => {
    this.clearScreen();
    console.log('\n' + '🎉'.repeat(20));
    console.log('           ROUND OVER!');
    console.log('🎉'.repeat(20));

    // Determine winner and record scores
    let winner = null;
    if (this.players[0].hand.length() === 0) {
      winner = this.players[0].name;
      console.log(`\n🏆 ${this.players[0].name} wins this round! 🏆`);
      console.log(
        `${this.players[1].name} finished with ${this.players[1].hand.length()} cards remaining.`
      );
    } else if (this.players[1].hand.length() === 0) {
      winner = this.players[1].name;
      console.log(`\n🏆 ${this.players[1].name} wins this round! 🏆`);
      console.log(
        `${this.players[0].name} finished with ${this.players[0].hand.length()} cards remaining.`
      );
    }

    // Show final hands and calculate scores
    console.log('\nFinal hands:');
    const playerHands = {};
    this.players.forEach((player) => {
      if (player.hand.length() > 0) {
        console.log(`${player.name}: ${player.hand.toString()}`);
        playerHands[player.name] = player.hand.cards;
      } else {
        console.log(`${player.name}: No cards (Winner!)`);
        playerHands[player.name] = [];
      }
    });

    // Record round score
    this.scoreKeeper.recordRoundScore(this.currentRound, playerHands, winner);

    // Show round summary and score table
    console.log(this.scoreKeeper.getRoundSummary(this.currentRound));
    console.log(this.scoreKeeper.getScoreTable());

    // Show down piles that were created
    if (this.gameState.downPiles.length > 0) {
      console.log('\nMelds that were played:');
      this.gameState.downPiles.forEach((pile, idx) => {
        console.log(`  ${pile.toString()} (by ${pile.getOwner()})`);
      });
    }
  };

  /**
   * Play one complete round of Contract Rummy
   * Handles setup, turn management, and final results
   * @returns {Promise<void>}
   */
  async playRound() {
    this.setupRound();

    let turnCount = 0;
    const maxTurns = 100; // Safety limit to prevent infinite games

    // Game loop continues until someone wins or max turns reached
    while (!this.ended() && turnCount < maxTurns) {
      const currentPlayer = this.players[this.currentPlayerIndex];

      // Show player transition screen
      await this.showPlayerTransition(currentPlayer.name);

      // Show game state to current player
      this.displayGameState(this.currentPlayerIndex);

      // Execute player's turn
      try {
        await currentPlayer.takeTurn(this.gameState, this.currentRound);

        // Check if game ended after this turn
        if (this.ended()) {
          break;
        }

        // Show turn end message and wait briefly
        console.log(`\n${currentPlayer.name}'s turn complete! Switching players...`);
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Brief pause

        // Switch to next player
        this.switchPlayer();
        turnCount++;
      } catch (error) {
        console.log(`Error during ${currentPlayer.name}'s turn:`, error.message);
        // Continue game despite error
        this.switchPlayer();
        turnCount++;
      }
    }

    // Display round results and record scores
    this.displayRoundResults();

    if (turnCount >= maxTurns) {
      console.log('\n⚠️  Game ended due to turn limit reached.');
    }
  }

  /**
   * Play the complete Contract Rummy game (all rounds)
   * @returns {Promise<void>}
   */
  async playGame() {
    console.log('\n🎮 Welcome to Contract Rummy! 🎮');
    console.log('Playing all 7 rounds of the game...\n');

    while (!this.scoreKeeper.isGameComplete()) {
      this.currentRound = this.scoreKeeper.getNextRoundNumber();

      console.log(`\n📋 Starting Round ${this.currentRound}...`);
      await GameIO.waitForEnter('Press Enter to begin the round...');

      await this.playRound();

      // Switch dealer for next round
      this.dealerIndex = (this.dealerIndex + 1) % 2;

      // Check if game is complete
      if (this.scoreKeeper.isGameComplete()) {
        this.displayFinalResults();
        break;
      }

      // Wait between rounds
      console.log('\nPress Enter to continue to next round...');
      await GameIO.waitForEnter();
    }
  }

  /**
   * Display final game results after all rounds
   */
  displayFinalResults() {
    this.clearScreen();
    console.log('\n' + '🏆'.repeat(30));
    console.log('           GAME COMPLETE!');
    console.log('🏆'.repeat(30));

    // Show final score table
    console.log(this.scoreKeeper.getScoreTable());

    // Show final rankings
    const rankings = this.scoreKeeper.getFinalRankings();
    console.log('\n🏆 FINAL STANDINGS 🏆');
    console.log('─'.repeat(30));
    rankings.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      const title = index === 0 ? 'WINNER' : `${index + 1}${index === 1 ? 'nd' : 'rd'} Place`;
      console.log(`${medal} ${title}: ${player.name} (${player.score} points)`);
    });

    console.log('\n' + '🎉'.repeat(30));
    console.log('Thanks for playing Contract Rummy!');
    console.log('🎉'.repeat(30));
  }

  /**
   * Clear the terminal screen using ANSI escape sequences
   */
  clearScreen() {
    // ANSI escape sequence to clear screen and move cursor to top
    process.stdout.write('\u001b[2J\u001b[0;0H');
  }

  /**
   * Display player transition screen for laptop passing
   * @param {string} playerName - Name of the player taking their turn
   * @returns {Promise<void>}
   */
  async showPlayerTransition(playerName) {
    await GameIO.showPlayerTransition(playerName, this.clearScreen.bind(this));
  }
}

module.exports = TerminalGame;
