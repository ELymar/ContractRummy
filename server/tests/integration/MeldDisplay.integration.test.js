const DisplayUtils = require('../../shared/DisplayUtils');

describe('Meld Display Unit Tests', () => {
  describe('DisplayUtils formatting with game engine view objects', () => {
    test('should format game engine downPiles correctly', () => {
      // This simulates the downPiles format that comes from GameEngine.getViewFor()
      const mockDownPiles = [
        {
          type: 'dupes',
          owner: 'Player 1', 
          cards: ['[A♥]', '[A♠]', '[A♣]']
        },
        {
          type: 'sequence',
          owner: 'Player 2',
          cards: ['[6♠]', '[7♠]', '[8♠]', '[9♠]']
        }
      ];
      
      // Test formatPile
      expect(DisplayUtils.formatPile(mockDownPiles[0])).toBe('[A♥][A♠][A♣] (dupes)');
      expect(DisplayUtils.formatPile(mockDownPiles[1])).toBe('[6♠][7♠][8♠][9♠] (sequence)');
      
      // Test formatMeldSummary (what TerminalClient now uses)
      expect(DisplayUtils.formatMeldSummary(mockDownPiles[0], 0, mockDownPiles[0].owner))
        .toBe('1. [A♥][A♠][A♣] (dupes) (Player 1)');
      expect(DisplayUtils.formatMeldSummary(mockDownPiles[1], 1, mockDownPiles[1].owner))
        .toBe('2. [6♠][7♠][8♠][9♠] (sequence) (Player 2)');
    });
    
    test('should handle object cards (pre-serialization)', () => {
      const pileWithObjects = {
        type: 'set',
        owner: 'Player 1',
        cards: [
          { suit: 'Hearts', value: 'King' },
          { suit: 'Spades', value: 'King' }, 
          { suit: 'Clubs', value: 'King' }
        ]
      };
      
      expect(DisplayUtils.formatPile(pileWithObjects)).toBe('[K♥][K♠][K♣] (set)');
      expect(DisplayUtils.formatMeldSummary(pileWithObjects, 0, 'Player 1'))
        .toBe('1. [K♥][K♠][K♣] (set) (Player 1)');
    });

    
    test('should handle empty melds gracefully', () => {
      // Test empty pile
      const emptyPile = { cards: [], owner: 'TestPlayer' };
      expect(DisplayUtils.formatPile(emptyPile)).toBe('[Empty Pile]');
      expect(DisplayUtils.formatMeldSummary(emptyPile, 0, 'TestPlayer')).toBe('1. [Empty Pile] (TestPlayer)');
      
      // Test null pile
      expect(DisplayUtils.formatPile(null)).toBe('[Empty Pile]');
      expect(DisplayUtils.formatMeldSummary(null, 0, 'TestPlayer')).toBe('1. [Empty Pile] (TestPlayer)');
    });

    test('should handle various card formats from game engine', () => {
      // Test pile with mixed card formats (as they might come from game engine)
      const mixedPile = {
        type: 'sequence',
        owner: 'Player 1',
        cards: [
          '[6♠]',  // String format
          '[7♠]',  // String format  
          '[8♠]'   // String format
        ]
      };
      
      expect(DisplayUtils.formatPile(mixedPile)).toBe('[6♠][7♠][8♠] (sequence)');
      expect(DisplayUtils.formatMeldSummary(mixedPile, 0, mixedPile.owner)).toBe('1. [6♠][7♠][8♠] (sequence) (Player 1)');
    });
    
    test('should demonstrate the fix for [object Object] bug', () => {
      // This test shows that we now properly handle pile objects from the game engine view
      // Previously these would show as "[object Object]" because toString() was undefined
      
      const gameEnginePile = {
        type: 'dupes', 
        owner: 'Player 1',
        cards: ['[Q♥]', '[Q♦]', '[Q♠]']
        // Note: no toString() method - this is a plain object from GameEngine.getViewFor()
      };
      
      // Before fix: pile.toString?.() would return undefined, leading to "[object Object]" display
      // After fix: DisplayUtils.formatPile() properly formats the cards array
      expect(DisplayUtils.formatPile(gameEnginePile)).toBe('[Q♥][Q♦][Q♠] (dupes)');
      expect(DisplayUtils.formatMeldSummary(gameEnginePile, 3, 'Player 1'))
        .toBe('4. [Q♥][Q♦][Q♠] (dupes) (Player 1)');
      
      // This is what would appear in the terminal now instead of:
      // "4. [object Object] (Player 1)"
    });
  });
});