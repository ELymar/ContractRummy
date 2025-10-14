const TerminalClient = require('../../src/clients/terminal/TerminalClient');

// Mock dependencies
jest.mock('../../src/shared/GameIO');
jest.mock('../../src/clients/terminal/SimpleMenu');

describe('TerminalClient MELD_LAID Event Display', () => {
  let client;
  let consoleSpy;

  beforeEach(() => {
    client = new TerminalClient();
    client.playerId = 'player1';
    client.view = {
      players: [
        {id: 'player1', name: 'Player 1'},
        {id: 'player2', name: 'Player 2'},
      ],
    };

    // Spy on console.log to capture output
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should display melds when player lays down', () => {
    const event = {
      type: 'MELD_LAID',
      payload: {
        playerId: 'player2',
        melds: [
          {
            type: 'set',
            cards: ['[A♥]', '[A♠]', '[A♣]'],
          },
          {
            type: 'sequence',
            cards: ['[6♠]', '[7♠]', '[8♠]', '[9♠]'],
          },
        ],
      },
    };

    client.processEvent(event);

    expect(consoleSpy).toHaveBeenCalledWith('🎉 Player 2 went down with melds!');
    expect(consoleSpy).toHaveBeenCalledWith('   1. [A♥][A♠][A♣] (set)');
    expect(consoleSpy).toHaveBeenCalledWith('   2. [6♠][7♠][8♠][9♠] (sequence)');
  });

  test('should handle empty melds array', () => {
    const event = {
      type: 'MELD_LAID',
      payload: {
        playerId: 'player2',
        melds: [],
      },
    };

    client.processEvent(event);

    expect(consoleSpy).toHaveBeenCalledWith('🎉 Player 2 went down with melds!');
    expect(consoleSpy).toHaveBeenCalledTimes(1); // Only the main message, no meld details
  });

  test('should handle missing melds in payload', () => {
    const event = {
      type: 'MELD_LAID',
      payload: {
        playerId: 'player2',
        // melds is missing
      },
    };

    client.processEvent(event);

    expect(consoleSpy).toHaveBeenCalledWith('🎉 Player 2 went down with melds!');
    expect(consoleSpy).toHaveBeenCalledTimes(1); // Only the main message, no meld details
  });

  test('should handle single meld', () => {
    const event = {
      type: 'MELD_LAID',
      payload: {
        playerId: 'player2',
        melds: [
          {
            type: 'set',
            cards: ['[K♥]', '[K♦]', '[K♣]'],
          },
        ],
      },
    };

    client.processEvent(event);

    expect(consoleSpy).toHaveBeenCalledWith('🎉 Player 2 went down with melds!');
    expect(consoleSpy).toHaveBeenCalledWith('   1. [K♥][K♦][K♣] (set)');
  });

  test('should handle mixed card formats', () => {
    const event = {
      type: 'MELD_LAID',
      payload: {
        playerId: 'player2',
        melds: [
          {
            type: 'sequence',
            cards: ['[2♥]', '[3♥]', '[4♥]', '[5♥]'],
          },
        ],
      },
    };

    client.processEvent(event);

    expect(consoleSpy).toHaveBeenCalledWith('🎉 Player 2 went down with melds!');
    expect(consoleSpy).toHaveBeenCalledWith('   1. [2♥][3♥][4♥][5♥] (sequence)');
  });

  test('should work when current player lays down melds', () => {
    const event = {
      type: 'MELD_LAID',
      payload: {
        playerId: 'player1', // Current player
        melds: [
          {
            type: 'set',
            cards: ['[Q♥]', '[Q♠]', '[Q♦]'],
          },
        ],
      },
    };

    client.processEvent(event);

    expect(consoleSpy).toHaveBeenCalledWith('🎉 Player 1 went down with melds!');
    expect(consoleSpy).toHaveBeenCalledWith('   1. [Q♥][Q♠][Q♦] (set)');
  });
});
