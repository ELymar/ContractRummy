const GameIO = require('./GameIO');
const Card = require('./Card');

// Mock console.log to capture output
const originalConsoleLog = console.log;
let consoleOutput = [];

beforeEach(() => {
    consoleOutput = [];
    console.log = jest.fn((...args) => {
        consoleOutput.push(args.join(' '));
    });
});

afterEach(() => {
    console.log = originalConsoleLog;
});

describe('GameIO', () => {
    describe('parseCardIndices', () => {
        test('should return null for cancel input', () => {
            expect(GameIO.parseCardIndices('cancel', 10)).toBeNull();
            expect(GameIO.parseCardIndices('0', 10)).toBeNull();
            expect(GameIO.parseCardIndices('', 10)).toBeNull();
        });

        test('should parse valid comma-separated indices', () => {
            expect(GameIO.parseCardIndices('1,2,3', 10)).toEqual([0, 1, 2]);
            expect(GameIO.parseCardIndices('5', 10)).toEqual([4]);
            expect(GameIO.parseCardIndices('1,5,10', 10)).toEqual([0, 4, 9]);
        });

        test('should handle whitespace in input', () => {
            expect(GameIO.parseCardIndices('1, 2, 3', 10)).toEqual([0, 1, 2]);
            expect(GameIO.parseCardIndices(' 1,2,3 ', 10)).toEqual([0, 1, 2]);
        });

        test('should return "invalid" for out-of-range indices', () => {
            expect(GameIO.parseCardIndices('1,2,11', 10)).toBe('invalid');
            expect(GameIO.parseCardIndices('0,1,2', 10)).toBe('invalid'); // 0 is invalid (1-based input)
            expect(GameIO.parseCardIndices('-1,1,2', 10)).toBe('invalid');
        });

        test('should return "invalid" for non-numeric input', () => {
            expect(GameIO.parseCardIndices('a,b,c', 10)).toBe('invalid');
            expect(GameIO.parseCardIndices('1,two,3', 10)).toBe('invalid');
            expect(GameIO.parseCardIndices('abc,def', 10)).toBe('invalid');
        });
    });

    describe('displayCardList', () => {
        test('should display numbered card list', () => {
            const cards = [
                new Card('Hearts', 'Ace'),
                new Card('Spades', 'King'),
                new Card('Clubs', 'Queen')
            ];

            GameIO.displayCardList(cards, 'Test Cards:');

            expect(consoleOutput[0]).toBe('Test Cards:');
            expect(consoleOutput[1]).toBe('1. [A♥]');
            expect(consoleOutput[2]).toBe('2. [K♠]');
            expect(consoleOutput[3]).toBe('3. [Q♣]');
        });

        test('should mark used cards in display', () => {
            const cards = [
                new Card('Hearts', 'Ace'),
                new Card('Spades', 'King'),
                new Card('Clubs', 'Queen')
            ];
            const usedIndices = new Set([0, 2]);

            GameIO.displayCardList(cards, 'Test Cards:', usedIndices);

            expect(consoleOutput[0]).toBe('Test Cards:');
            expect(consoleOutput[1]).toBe('1. [A♥] (already used)');
            expect(consoleOutput[2]).toBe('2. [K♠]');
            expect(consoleOutput[3]).toBe('3. [Q♣] (already used)');
        });

        test('should handle empty card list', () => {
            GameIO.displayCardList([], 'Empty List:');
            expect(consoleOutput[0]).toBe('Empty List:');
            expect(consoleOutput.length).toBe(1);
        });
    });

    describe('displayAvailableMelds', () => {
        test('should display meld information', () => {
            // Mock DownPile objects
            const mockMelds = [
                {
                    toString: () => '[A♥][A♠][A♣] (dupes)',
                    getOwner: () => 'Player 1'
                },
                {
                    toString: () => '[6♥][7♥][8♥][9♥] (sequence)',
                    getOwner: () => 'Player 2'
                }
            ];

            GameIO.displayAvailableMelds(mockMelds);

            expect(consoleOutput[0]).toBe('Available melds on table:');
            expect(consoleOutput[1]).toBe('1. [A♥][A♠][A♣] (dupes) (Player 1)');
            expect(consoleOutput[2]).toBe('2. [6♥][7♥][8♥][9♥] (sequence) (Player 2)');
        });

        test('should handle empty melds array', () => {
            GameIO.displayAvailableMelds([]);
            expect(consoleOutput[0]).toBe('Available melds on table:');
            expect(consoleOutput.length).toBe(1);
        });
    });

    describe('displayMeldSummary', () => {
        test('should display meld summary with cards', () => {
            const mockMelds = [
                {
                    type: 'set',
                    cards: [
                        new Card('Hearts', 'Ace'),
                        new Card('Spades', 'Ace'),
                        new Card('Clubs', 'Ace')
                    ]
                },
                {
                    type: 'sequence',
                    cards: [
                        new Card('Hearts', 'Six'),
                        new Card('Hearts', 'Seven'),
                        new Card('Hearts', 'Eight')
                    ]
                }
            ];

            GameIO.displayMeldSummary(mockMelds);

            expect(consoleOutput[0]).toBe('\n=== Meld Summary ===');
            expect(consoleOutput[1]).toBe('Meld 1 (set): [A♥], [A♠], [A♣]');
            expect(consoleOutput[2]).toBe('Meld 2 (sequence): [6♥], [7♥], [8♥]');
        });

        test('should handle empty melds array', () => {
            GameIO.displayMeldSummary([]);
            expect(consoleOutput[0]).toBe('\n=== Meld Summary ===');
            expect(consoleOutput.length).toBe(1);
        });
    });
});