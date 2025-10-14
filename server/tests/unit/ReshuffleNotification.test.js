const TerminalClient = require('../../src/clients/terminal/TerminalClient');

describe('Reshuffle Notification Tests', () => {
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

    // Mock console.log to capture output
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should display reshuffle notification when DECK_RESHUFFLED event is processed', () => {
    const event = {
      type: 'DECK_RESHUFFLED',
      payload: {
        cardsReshuffled: 5,
      },
    };

    client.processEvent(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      '🔄 Deck was reshuffled! 5 cards were moved from discard pile to deck.'
    );
  });

  test('should display reshuffle notification with singular card when only 1 card reshuffled', () => {
    const event = {
      type: 'DECK_RESHUFFLED',
      payload: {
        cardsReshuffled: 1,
      },
    };

    client.processEvent(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      '🔄 Deck was reshuffled! 1 cards were moved from discard pile to deck.'
    );
  });

  test('should display reshuffle notification with larger numbers', () => {
    const event = {
      type: 'DECK_RESHUFFLED',
      payload: {
        cardsReshuffled: 25,
      },
    };

    client.processEvent(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      '🔄 Deck was reshuffled! 25 cards were moved from discard pile to deck.'
    );
  });

  test('should not interfere with other event processing', () => {
    // Process a different event first
    client.processEvent({
      type: 'GAME_STARTED',
    });

    // Then process reshuffle event
    client.processEvent({
      type: 'DECK_RESHUFFLED',
      payload: {cardsReshuffled: 3},
    });

    expect(consoleSpy).toHaveBeenCalledWith('\n🎮 Game Started! Contract Rummy begins...');
    expect(consoleSpy).toHaveBeenCalledWith(
      '🔄 Deck was reshuffled! 3 cards were moved from discard pile to deck.'
    );
  });
});
