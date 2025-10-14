const DisplayUtils = require('../../src/shared/DisplayUtils');

describe('DisplayUtils', () => {
  describe('formatCard', () => {
    test('should format regular cards correctly', () => {
      expect(DisplayUtils.formatCard({ suit: 'Hearts', value: 'Ace' })).toBe('[A♥]');
      expect(DisplayUtils.formatCard({ suit: 'Spades', value: 'King' })).toBe('[K♠]');
      expect(DisplayUtils.formatCard({ suit: 'Diamonds', value: 'Queen' })).toBe('[Q♦]');
      expect(DisplayUtils.formatCard({ suit: 'Clubs', value: 'Jack' })).toBe('[J♣]');
      expect(DisplayUtils.formatCard({ suit: 'Hearts', value: '10' })).toBe('[10♥]');
      expect(DisplayUtils.formatCard({ suit: 'Spades', value: '2' })).toBe('[2♠]');
    });
    
    test('should handle long form value names', () => {
      expect(DisplayUtils.formatCard({ suit: 'Hearts', value: 'Two' })).toBe('[2♥]');
      expect(DisplayUtils.formatCard({ suit: 'Diamonds', value: 'Four' })).toBe('[4♦]');
      expect(DisplayUtils.formatCard({ suit: 'Spades', value: 'Nine' })).toBe('[9♠]');
      expect(DisplayUtils.formatCard({ suit: 'Clubs', value: 'Ten' })).toBe('[10♣]');
      expect(DisplayUtils.formatCard({ suit: 'Hearts', value: 'Three' })).toBe('[3♥]');
      expect(DisplayUtils.formatCard({ suit: 'Diamonds', value: 'Five' })).toBe('[5♦]');
      expect(DisplayUtils.formatCard({ suit: 'Spades', value: 'Six' })).toBe('[6♠]');
      expect(DisplayUtils.formatCard({ suit: 'Clubs', value: 'Seven' })).toBe('[7♣]');
      expect(DisplayUtils.formatCard({ suit: 'Hearts', value: 'Eight' })).toBe('[8♥]');
    });
    
    test('should handle jokers', () => {
      expect(DisplayUtils.formatCard({ suit: 'Joker', value: 'Joker' })).toBe('🃏');
      expect(DisplayUtils.formatCard({ suit: 'Hearts', value: 'Joker' })).toBe('🃏');
      expect(DisplayUtils.formatCard({ suit: 'Joker', value: 'Red' })).toBe('🃏');
    });
    
    test('should handle string cards', () => {
      expect(DisplayUtils.formatCard('[A♥]')).toBe('[A♥]');
      expect(DisplayUtils.formatCard('🃏')).toBe('🃏');
    });
    
    test('should handle invalid cards', () => {
      expect(DisplayUtils.formatCard(null)).toBe('[Unknown Card]');
      expect(DisplayUtils.formatCard(undefined)).toBe('[Unknown Card]');
      expect(DisplayUtils.formatCard({})).toBe('[Unknown Card]');
      expect(DisplayUtils.formatCard({ suit: 'Hearts' })).toBe('[Unknown Card]');
      expect(DisplayUtils.formatCard({ value: 'Ace' })).toBe('[Unknown Card]');
    });
    
    test('should handle unknown suits and values', () => {
      expect(DisplayUtils.formatCard({ suit: 'Unknown', value: 'X' })).toBe('[XUnknown]');
    });
  });
  
  describe('formatPile', () => {
    test('should format piles with cards correctly', () => {
      const pile = {
        type: 'set',
        cards: [
          { suit: 'Hearts', value: 'Ace' },
          { suit: 'Spades', value: 'Ace' },
          { suit: 'Clubs', value: 'Ace' }
        ]
      };
      
      expect(DisplayUtils.formatPile(pile)).toBe('[A♥][A♠][A♣] (set)');
    });
    
    test('should format sequences correctly', () => {
      const pile = {
        type: 'sequence',
        cards: [
          { suit: 'Hearts', value: '6' },
          { suit: 'Hearts', value: '7' },
          { suit: 'Hearts', value: '8' },
          { suit: 'Hearts', value: '9' }
        ]
      };
      
      expect(DisplayUtils.formatPile(pile)).toBe('[6♥][7♥][8♥][9♥] (sequence)');
    });
    
    test('should handle piles without type', () => {
      const pile = {
        cards: [
          { suit: 'Hearts', value: 'King' },
          { suit: 'Spades', value: 'King' }
        ]
      };
      
      expect(DisplayUtils.formatPile(pile)).toBe('[K♥][K♠]');
    });
    
    test('should handle empty piles', () => {
      expect(DisplayUtils.formatPile({ cards: [] })).toBe('[Empty Pile]');
      expect(DisplayUtils.formatPile({ cards: null })).toBe('[Empty Pile]');
      expect(DisplayUtils.formatPile({})).toBe('[Empty Pile]');
      expect(DisplayUtils.formatPile(null)).toBe('[Empty Pile]');
      expect(DisplayUtils.formatPile(undefined)).toBe('[Empty Pile]');
    });
    
    test('should handle pile with invalid cards array', () => {
      expect(DisplayUtils.formatPile({ cards: 'not an array' })).toBe('[Empty Pile]');
    });
  });
  
  describe('formatCards', () => {
    test('should format multiple cards', () => {
      const cards = [
        { suit: 'Hearts', value: 'Ace' },
        { suit: 'Spades', value: 'King' },
        { suit: 'Diamonds', value: '10' }
      ];
      
      expect(DisplayUtils.formatCards(cards)).toBe('[A♥][K♠][10♦]');
    });
    
    test('should handle empty arrays', () => {
      expect(DisplayUtils.formatCards([])).toBe('');
    });
    
    test('should handle invalid input', () => {
      expect(DisplayUtils.formatCards(null)).toBe('');
      expect(DisplayUtils.formatCards(undefined)).toBe('');
      expect(DisplayUtils.formatCards('not an array')).toBe('');
    });
  });
  
  describe('formatPlayerName', () => {
    test('should return name as is for valid names', () => {
      expect(DisplayUtils.formatPlayerName('Player 1')).toBe('Player 1');
      expect(DisplayUtils.formatPlayerName('Alice')).toBe('Alice');
    });
    
    test('should handle null/undefined names', () => {
      expect(DisplayUtils.formatPlayerName(null)).toBe('Unknown Player');
      expect(DisplayUtils.formatPlayerName(undefined)).toBe('Unknown Player');
      expect(DisplayUtils.formatPlayerName('')).toBe('Unknown Player');
    });
  });
  
  describe('formatMeldSummary', () => {
    test('should format complete meld summary', () => {
      const pile = {
        type: 'set',
        cards: [
          { suit: 'Hearts', value: 'Ace' },
          { suit: 'Spades', value: 'Ace' }
        ]
      };
      
      const result = DisplayUtils.formatMeldSummary(pile, 0, 'Player 1');
      expect(result).toBe('1. [A♥][A♠] (set) (Player 1)');
    });
    
    test('should handle unknown owner', () => {
      const pile = {
        cards: [{ suit: 'Hearts', value: 'King' }]
      };
      
      const result = DisplayUtils.formatMeldSummary(pile, 2, null);
      expect(result).toBe('3. [K♥] (Unknown Player)');
    });
    
    test('should handle empty pile', () => {
      const result = DisplayUtils.formatMeldSummary({ cards: [] }, 0, 'Player 1');
      expect(result).toBe('1. [Empty Pile] (Player 1)');
    });
  });
  
  describe('integration with actual game objects', () => {
    test('should handle mixed card formats', () => {
      const cards = [
        '[A♥]', // string format
        { suit: 'Spades', value: 'King' }, // object format
        '🃏' // joker string
      ];
      
      expect(DisplayUtils.formatCards(cards)).toBe('[A♥][K♠]🃏');
    });
    
    test('should format typical game pile from view', () => {
      // This simulates the format that comes from GameEngine.getViewFor()
      const viewPile = {
        type: 'dupes',
        owner: 'Player 1',
        cards: ['[A♥]', '[A♠]', '[A♣]']
      };
      
      expect(DisplayUtils.formatPile(viewPile)).toBe('[A♥][A♠][A♣] (dupes)');
    });
  });
});