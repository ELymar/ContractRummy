const ScoreKeeper = require('./ScoreKeeper');
const Card = require('./Card');

describe('ScoreKeeper', () => {
    let scoreKeeper;
    let playerNames;

    beforeEach(() => {
        playerNames = ['Player 1', 'Player 2'];
        scoreKeeper = new ScoreKeeper(playerNames, 3); // 3 rounds for testing
    });

    describe('constructor', () => {
        test('should initialize with correct players and rounds', () => {
            expect(scoreKeeper.playerNames).toEqual(playerNames);
            expect(scoreKeeper.totalRounds).toBe(3);
            expect(scoreKeeper.scores['Player 1']).toEqual([null, null, null]);
            expect(scoreKeeper.scores['Player 2']).toEqual([null, null, null]);
        });

        test('should default to 7 rounds if not specified', () => {
            const defaultKeeper = new ScoreKeeper(playerNames);
            expect(defaultKeeper.totalRounds).toBe(7);
            expect(defaultKeeper.scores['Player 1']).toHaveLength(7);
        });
    });

    describe('recordRoundScore', () => {
        test('should record scores correctly for round 1', () => {
            const playerHands = {
                'Player 1': [],
                'Player 2': [new Card('Hearts', 'Ace'), new Card('Spades', 'King')] // 15 + 10 = 25
            };

            scoreKeeper.recordRoundScore(1, playerHands, 'Player 1');

            expect(scoreKeeper.scores['Player 1'][0]).toBe(0);
            expect(scoreKeeper.scores['Player 2'][0]).toBe(25);
            expect(scoreKeeper.roundDetails[1].winner).toBe('Player 1');
        });

        test('should throw error for invalid round number', () => {
            const playerHands = { 'Player 1': [], 'Player 2': [] };

            expect(() => {
                scoreKeeper.recordRoundScore(0, playerHands, 'Player 1');
            }).toThrow('Invalid round number: 0');

            expect(() => {
                scoreKeeper.recordRoundScore(4, playerHands, 'Player 1');
            }).toThrow('Invalid round number: 4');
        });

        test('should store round details correctly', () => {
            const playerHands = {
                'Player 1': [new Card('Hearts', 'Two')], // 5 points
                'Player 2': []
            };

            scoreKeeper.recordRoundScore(2, playerHands, 'Player 2');

            const details = scoreKeeper.roundDetails[2];
            expect(details.winner).toBe('Player 2');
            expect(details.cardsRemaining['Player 1']).toBe(1);
            expect(details.cardsRemaining['Player 2']).toBe(0);
            expect(details.playerHands).toEqual(playerHands);
        });
    });

    describe('getTotalScore', () => {
        beforeEach(() => {
            // Set up some scores
            scoreKeeper.scores['Player 1'] = [10, 25, null];
            scoreKeeper.scores['Player 2'] = [15, 0, null];
        });

        test('should calculate total score correctly', () => {
            expect(scoreKeeper.getTotalScore('Player 1')).toBe(35);
            expect(scoreKeeper.getTotalScore('Player 2')).toBe(15);
        });

        test('should throw error for unknown player', () => {
            expect(() => {
                scoreKeeper.getTotalScore('Unknown Player');
            }).toThrow('Unknown player: Unknown Player');
        });

        test('should ignore null scores', () => {
            scoreKeeper.scores['Player 1'] = [10, null, 5];
            expect(scoreKeeper.getTotalScore('Player 1')).toBe(15);
        });
    });

    describe('getCurrentLeader', () => {
        test('should return player with lowest score', () => {
            scoreKeeper.scores['Player 1'] = [10, 25, null];
            scoreKeeper.scores['Player 2'] = [15, 5, null];

            const leader = scoreKeeper.getCurrentLeader();
            expect(leader.name).toBe('Player 2');
            expect(leader.score).toBe(20);
        });

        test('should handle tied scores', () => {
            scoreKeeper.scores['Player 1'] = [10, 10, null];
            scoreKeeper.scores['Player 2'] = [15, 5, null];

            const leader = scoreKeeper.getCurrentLeader();
            expect(leader.score).toBe(20);
            // Should return first player in case of tie
            expect(['Player 1', 'Player 2']).toContain(leader.name);
        });
    });

    describe('getFinalRankings', () => {
        test('should return players sorted by total score', () => {
            scoreKeeper.scores['Player 1'] = [10, 25, 5]; // Total: 40
            scoreKeeper.scores['Player 2'] = [15, 5, 10]; // Total: 30

            const rankings = scoreKeeper.getFinalRankings();
            
            expect(rankings).toHaveLength(2);
            expect(rankings[0].name).toBe('Player 2');
            expect(rankings[0].score).toBe(30);
            expect(rankings[1].name).toBe('Player 1');
            expect(rankings[1].score).toBe(40);
        });
    });

    describe('isGameComplete', () => {
        test('should return false when rounds are incomplete', () => {
            scoreKeeper.scores['Player 1'] = [10, 25, null];
            scoreKeeper.scores['Player 2'] = [15, 5, null];

            expect(scoreKeeper.isGameComplete()).toBe(false);
        });

        test('should return true when all rounds are complete', () => {
            scoreKeeper.scores['Player 1'] = [10, 25, 5];
            scoreKeeper.scores['Player 2'] = [15, 5, 10];

            expect(scoreKeeper.isGameComplete()).toBe(true);
        });
    });

    describe('getNextRoundNumber', () => {
        test('should return 1 for new game', () => {
            expect(scoreKeeper.getNextRoundNumber()).toBe(1);
        });

        test('should return next incomplete round', () => {
            scoreKeeper.scores['Player 1'] = [10, null, null];
            scoreKeeper.scores['Player 2'] = [15, null, null];

            expect(scoreKeeper.getNextRoundNumber()).toBe(2);
        });

        test('should return null when game is complete', () => {
            scoreKeeper.scores['Player 1'] = [10, 25, 5];
            scoreKeeper.scores['Player 2'] = [15, 5, 10];

            expect(scoreKeeper.getNextRoundNumber()).toBe(null);
        });
    });

    describe('getScoreTable', () => {
        test('should generate formatted score table', () => {
            scoreKeeper.scores['Player 1'] = [10, 25, null];
            scoreKeeper.scores['Player 2'] = [15, 5, null];

            const table = scoreKeeper.getScoreTable();

            expect(table).toContain('📊 SCORE SUMMARY');
            expect(table).toContain('Player 1');
            expect(table).toContain('Player 2');
            expect(table).toContain('R1');
            expect(table).toContain('R2');
            expect(table).toContain('Total');
            expect(table).toContain('Current Leader');
        });

        test('should show winner when game is complete', () => {
            scoreKeeper.scores['Player 1'] = [10, 25, 5]; // Total: 40
            scoreKeeper.scores['Player 2'] = [15, 5, 10]; // Total: 30

            const table = scoreKeeper.getScoreTable();

            expect(table).toContain('🏆 WINNER: Player 2');
            expect(table).toContain('Runner-up: Player 1');
        });
    });

    describe('getRoundSummary', () => {
        test('should return "not yet played" for unplayed round', () => {
            const summary = scoreKeeper.getRoundSummary(1);
            expect(summary).toContain('Round 1: Not yet played');
        });

        test('should generate round summary with details', () => {
            const playerHands = {
                'Player 1': [],
                'Player 2': [new Card('Hearts', 'Ace')] // 15 points
            };

            scoreKeeper.recordRoundScore(1, playerHands, 'Player 1');

            const summary = scoreKeeper.getRoundSummary(1);

            expect(summary).toContain('📋 Round 1 Summary');
            expect(summary).toContain('Winner: Player 1');
            expect(summary).toContain('Player 1: 0 cards remaining = 0 points');
            expect(summary).toContain('Player 2: 1 cards remaining = 15 points');
        });
    });
});