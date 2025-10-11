/**
 * Score tracking system for Contract Rummy across multiple rounds
 * Tracks each player's score for each round and calculates totals
 */

const CardScoring = require('./CardScoring');

class ScoreKeeper {
    /**
     * Create a new score keeper
     * @param {Array} playerNames - Array of player names
     * @param {number} totalRounds - Total number of rounds to play (default 7)
     */
    constructor(playerNames, totalRounds = 7) {
        this.playerNames = [...playerNames];
        this.totalRounds = totalRounds;
        this.scores = {}; // scores[playerName][roundNumber] = score
        this.roundDetails = {}; // roundDetails[roundNumber] = { winner, cardsRemaining }
        
        // Initialize score tracking for each player
        this.playerNames.forEach(name => {
            this.scores[name] = new Array(totalRounds).fill(null);
        });
    }
    
    /**
     * Load previous round scores (for resuming games)
     * @param {Array<Array<number>>} roundScores - Array of [p1_score, p2_score] tuples
     */
    loadPreviousScores(roundScores) {
        if (roundScores.length > this.totalRounds) {
            throw new Error(`Cannot load ${roundScores.length} rounds, game only has ${this.totalRounds} rounds`);
        }
        
        roundScores.forEach((scores, index) => {
            const roundNumber = index + 1;
            if (scores.length !== this.playerNames.length) {
                throw new Error(`Round ${roundNumber} scores must have exactly ${this.playerNames.length} scores`);
            }
            
            // Set scores for each player
            this.playerNames.forEach((playerName, playerIndex) => {
                this.scores[playerName][index] = scores[playerIndex];
            });
            
            // Create minimal round details (we don't have hand details for resumed games)
            this.roundDetails[roundNumber] = {
                winner: 'Unknown', // We don't know who won previous rounds
                cardsRemaining: {},
                playerHands: {}
            };
        });
    }
    
    /**
     * Record scores for a completed round
     * @param {number} roundNumber - Round number (1-based)
     * @param {Object} playerHands - Object mapping player names to their remaining cards
     * @param {string} winner - Name of the winning player (who went out)
     */
    recordRoundScore(roundNumber, playerHands, winner) {
        if (roundNumber < 1 || roundNumber > this.totalRounds) {
            throw new Error(`Invalid round number: ${roundNumber}`);
        }
        
        const roundIndex = roundNumber - 1;
        const cardsRemaining = {};
        
        // Calculate scores for each player
        this.playerNames.forEach(playerName => {
            const hand = playerHands[playerName] || [];
            const score = CardScoring.scoreHand(hand);
            this.scores[playerName][roundIndex] = score;
            cardsRemaining[playerName] = hand.length;
        });
        
        // Store round details
        this.roundDetails[roundNumber] = {
            winner,
            cardsRemaining,
            playerHands: { ...playerHands }
        };
    }
    
    /**
     * Get total score for a player across all completed rounds
     * @param {string} playerName - Name of the player
     * @returns {number} Total score (lower is better)
     */
    getTotalScore(playerName) {
        if (!this.scores[playerName]) {
            throw new Error(`Unknown player: ${playerName}`);
        }
        
        return this.scores[playerName]
            .filter(score => score !== null)
            .reduce((total, score) => total + score, 0);
    }
    
    /**
     * Get the current overall leader (lowest total score)
     * @returns {Object} Leader info with name and score
     */
    getCurrentLeader() {
        let leader = null;
        let lowestScore = Infinity;
        
        this.playerNames.forEach(name => {
            const total = this.getTotalScore(name);
            if (total < lowestScore) {
                lowestScore = total;
                leader = name;
            }
        });
        
        return { name: leader, score: lowestScore };
    }
    
    /**
     * Get final rankings (all players sorted by total score)
     * @returns {Array} Array of player objects sorted by score (lowest first)
     */
    getFinalRankings() {
        return this.playerNames
            .map(name => ({
                name,
                score: this.getTotalScore(name)
            }))
            .sort((a, b) => a.score - b.score);
    }
    
    /**
     * Check if all rounds are completed
     * @returns {boolean} True if all rounds are completed
     */
    isGameComplete() {
        return this.playerNames.every(name => 
            this.scores[name].every(score => score !== null)
        );
    }
    
    /**
     * Get the next round number to be played
     * @returns {number} Next round number, or null if game is complete
     */
    getNextRoundNumber() {
        for (let round = 1; round <= this.totalRounds; round++) {
            const roundIndex = round - 1;
            const hasNullScore = this.playerNames.some(name => 
                this.scores[name][roundIndex] === null
            );
            if (hasNullScore) {
                return round;
            }
        }
        return null; // Game is complete
    }
    
    /**
     * Generate a formatted score table for display
     * @returns {string} Formatted score table
     */
    getScoreTable() {
        const colWidth = 8;
        const nameWidth = 12;
        
        // Header
        let table = '\n' + '═'.repeat(nameWidth + 2 + (colWidth * (this.totalRounds + 1)) + 5) + '\n';
        table += '📊 SCORE SUMMARY\n';
        table += '═'.repeat(nameWidth + 2 + (colWidth * (this.totalRounds + 1)) + 5) + '\n';
        
        // Column headers
        table += 'Player'.padEnd(nameWidth) + ' │';
        for (let round = 1; round <= this.totalRounds; round++) {
            table += ` R${round}`.padStart(colWidth - 1) + ' │';
        }
        table += ' Total'.padStart(colWidth) + '\n';
        
        // Separator line
        table += '─'.repeat(nameWidth) + '─┼';
        for (let round = 1; round <= this.totalRounds; round++) {
            table += '─'.repeat(colWidth) + '┼';
        }
        table += '─'.repeat(colWidth) + '\n';
        
        // Player rows
        this.playerNames.forEach(name => {
            table += name.padEnd(nameWidth) + ' │';
            
            // Round scores
            for (let round = 1; round <= this.totalRounds; round++) {
                const roundIndex = round - 1;
                const score = this.scores[name][roundIndex];
                const scoreText = score === null ? '-' : score.toString();
                table += scoreText.padStart(colWidth - 1) + ' │';
            }
            
            // Total score
            const total = this.getTotalScore(name);
            table += total.toString().padStart(colWidth - 1) + '\n';
        });
        
        // Bottom border
        table += '═'.repeat(nameWidth + 2 + (colWidth * (this.totalRounds + 1)) + 5) + '\n';
        
        // Current leader
        if (!this.isGameComplete()) {
            const leader = this.getCurrentLeader();
            table += `Current Leader: ${leader.name} (${leader.score} points)\n`;
        } else {
            const rankings = this.getFinalRankings();
            table += `🏆 WINNER: ${rankings[0].name} (${rankings[0].score} points)\n`;
            if (rankings.length > 1) {
                table += `Runner-up: ${rankings[1].name} (${rankings[1].score} points)\n`;
            }
        }
        
        table += '═'.repeat(nameWidth + 2 + (colWidth * (this.totalRounds + 1)) + 5) + '\n';
        
        return table;
    }
    
    /**
     * Get a summary of a specific round
     * @param {number} roundNumber - Round number to summarize
     * @returns {string} Formatted round summary
     */
    getRoundSummary(roundNumber) {
        const details = this.roundDetails[roundNumber];
        if (!details) {
            return `Round ${roundNumber}: Not yet played`;
        }
        
        let summary = `\n📋 Round ${roundNumber} Summary\n`;
        summary += '─'.repeat(30) + '\n';
        summary += `Winner: ${details.winner} (went out)\n\n`;
        
        // Show each player's remaining cards and score
        this.playerNames.forEach(playerName => {
            const roundIndex = roundNumber - 1;
            const score = this.scores[playerName][roundIndex];
            const cardsLeft = details.cardsRemaining[playerName];
            
            summary += `${playerName}: ${cardsLeft} cards remaining = ${score} points\n`;
            
            if (playerName !== details.winner && details.playerHands[playerName]) {
                const hand = details.playerHands[playerName];
                if (hand.length > 0) {
                    summary += `  Cards: ${hand.map(card => card.toString()).join('')}\n`;
                }
            }
        });
        
        return summary;
    }
}

module.exports = ScoreKeeper;