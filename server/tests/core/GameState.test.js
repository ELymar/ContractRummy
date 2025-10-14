const GameState = require('../../src/core/domain/GameState');
const Card = require('../../src/core/domain/Card');

describe('GameState', () => {
    let gameState;
    
    beforeEach(() => {
        gameState = new GameState();
    });
    
    describe('initialization', () => {
        test('should initialize with correct deck size for 2-player game', () => {
            expect(gameState.deck.length()).toBe(56); // 52 + 4 jokers
        });
        
        test('should initialize with empty burn pile', () => {
            expect(gameState.burnPile.cards.length).toBe(0);
        });
        
        test('should initialize with empty down piles', () => {
            expect(gameState.downPiles.length).toBe(0);
        });
        
        test('should initialize with firstTurn set to true', () => {
            expect(gameState.firstTurn).toBe(true);
        });
    });
    
    describe('drawFromDeck functionality', () => {
        test('should draw cards normally when deck has enough cards', () => {
            const drawnCards = gameState.drawFromDeck(5);
            
            expect(drawnCards.length).toBe(5);
            expect(gameState.deck.length()).toBe(51); // 56 - 5
        });
        
        test('should draw all remaining cards when requesting exact deck size', () => {
            const initialDeckSize = gameState.deck.length();
            const drawnCards = gameState.drawFromDeck(initialDeckSize);
            
            expect(drawnCards.length).toBe(initialDeckSize);
            expect(gameState.deck.length()).toBe(0);
        });
        
        test('should reshuffle burn pile when deck runs out and burn pile has cards', () => {
            // Simulate a nearly empty deck
            gameState.deck.draw(gameState.deck.length() - 2); // Leave only 2 cards
            
            // Add cards to burn pile
            gameState.burnPile.addCard(new Card('Hearts', 'Ace'));
            gameState.burnPile.addCard(new Card('Spades', 'King'));
            gameState.burnPile.addCard(new Card('Diamonds', 'Queen'));
            gameState.burnPile.addCard(new Card('Clubs', 'Jack')); // This becomes top card
            
            // Try to draw 5 cards (more than deck has, but burn pile can provide)
            const drawnCards = gameState.drawFromDeck(5);
            
            expect(drawnCards.length).toBe(5);
            expect(gameState.burnPile.cards.length).toBe(1); // Only top card remains
            expect(gameState.burnPile.topCard().toString()).toBe('[J♣]');
        });
        
        test('should throw error when not enough cards even after reshuffle', () => {
            // Empty the deck completely
            gameState.deck.draw(gameState.deck.length());
            
            // Add only one card to burn pile (not enough for reshuffle)
            gameState.burnPile.addCard(new Card('Hearts', 'Ace'));
            
            expect(() => {
                gameState.drawFromDeck(5);
            }).toThrow('Cannot draw 5 cards');
        });
        
        test('should throw error when deck is empty and burn pile is empty', () => {
            // Empty the deck completely
            gameState.deck.draw(gameState.deck.length());
            
            expect(() => {
                gameState.drawFromDeck(1);
            }).toThrow('Cannot draw 1 cards');
        });
        
        test('should handle multiple reshuffles in sequence', () => {
            // Start with very small deck
            gameState.deck.draw(gameState.deck.length() - 1); // Leave 1 card
            
            // First reshuffle scenario
            gameState.burnPile.addCard(new Card('Hearts', 'Ace'));
            gameState.burnPile.addCard(new Card('Spades', 'King'));
            gameState.burnPile.addCard(new Card('Diamonds', 'Queen'));
            
            // Draw 3 cards (triggers reshuffle)
            let drawnCards = gameState.drawFromDeck(3);
            expect(drawnCards.length).toBe(3);
            
            // Now deck should have minimal cards again, add more to burn pile
            gameState.burnPile.addCard(new Card('Clubs', 'Jack'));
            gameState.burnPile.addCard(new Card('Hearts', 'Ten'));
            gameState.burnPile.addCard(new Card('Spades', 'Nine'));
            
            // Draw again (should trigger another reshuffle)
            drawnCards = gameState.drawFromDeck(2);
            expect(drawnCards.length).toBe(2);
        });
        
        test('should preserve top card of burn pile during reshuffle', () => {
            // Empty deck
            gameState.deck.draw(gameState.deck.length());
            
            // Add multiple cards to burn pile
            gameState.burnPile.addCard(new Card('Hearts', 'Ace'));
            gameState.burnPile.addCard(new Card('Spades', 'King'));
            gameState.burnPile.addCard(new Card('Diamonds', 'Queen'));
            gameState.burnPile.addCard(new Card('Clubs', 'Jack')); // Top card
            
            const topCardBeforeReshuffle = gameState.burnPile.topCard().toString();
            
            // Draw cards to trigger reshuffle
            gameState.drawFromDeck(2);
            
            // Top card should remain the same
            expect(gameState.burnPile.topCard().toString()).toBe(topCardBeforeReshuffle);
            expect(gameState.burnPile.cards.length).toBe(1);
        });
    });
    
    describe('setFirstTurn functionality', () => {
        test('should update firstTurn flag', () => {
            gameState.setFirstTurn(false);
            expect(gameState.firstTurn).toBe(false);
            
            gameState.setFirstTurn(true);
            expect(gameState.firstTurn).toBe(true);
        });
    });
});