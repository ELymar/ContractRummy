/**
 * Game constants for Contract Rummy
 * Contains card suits, values, and emoji mappings
 */

// Standard playing card suits
const SUITS = [
    'Hearts',
    'Spades',
    'Clubs',
    'Diamonds',
    'Joker'
];

// Card values from Two through Ace
const VALUES = [
    'Two',
    'Three', 
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Jack',
    'Queen',
    'King',
    'Ace'
]; 

// Mapping from suit names to emoji symbols
const SUIT_TO_EMOJI_MAP = new Map([
    ['Hearts', '♥'],
    ['Spades', '♠'],
    ['Clubs', '♣'],
    ['Diamonds', '♦'],
    ['Joker', '🃏']
]);

// Mapping from value names to display symbols
const VALUE_TO_EMOJI_MAP = new Map([
    ['Two', '2'],
    ['Three', '3'],
    ['Four', '4'],
    ['Five', '5'],
    ['Six', '6'],
    ['Seven', '7'],
    ['Eight', '8'],
    ['Nine', '9'],
    ['Ten', '10'],
    ['Jack', 'J'],
    ['Queen', 'Q'],
    ['King', 'K'],
    ['Ace', 'A'],
    ['Joker', '']
]);

// Reverse mapping from emoji symbols to suit names
const EMOJI_TO_SUIT_MAP = new Map([
    ['♥', 'Hearts'],
    ['♠', 'Spades'],
    ['♣', 'Clubs'],
    ['♦', 'Diamonds'],
    ['🃏', 'Joker']
]);

// Reverse mapping from display symbols to value names
const EMOJI_TO_VALUE_MAP = new Map([
    ['A', 'Ace'],
    ['K', 'King'],
    ['Q', 'Queen'],
    ['J', 'Jack'],
    ['10', 'Ten'],
    ['9', 'Nine'],
    ['8', 'Eight'],
    ['7', 'Seven'],
    ['6', 'Six'],
    ['5', 'Five'],
    ['4', 'Four'],
    ['3', 'Three'],
    ['2', 'Two'],
    ['', 'Joker']
]);

module.exports = {
    SUITS, 
    VALUES, 
    SUIT_TO_EMOJI_MAP,
    VALUE_TO_EMOJI_MAP, 
    EMOJI_TO_SUIT_MAP,
    EMOJI_TO_VALUE_MAP
};