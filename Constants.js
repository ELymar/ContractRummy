const SUITS = [
    'Hearts',
    'Spades',
    'Clubs',
    'Diamonds',
    'Joker'
]

const VALUES = [
    'Ace',
    'King',
    'Queen',
    'Jack',
    'Ten',
    'Nine',
    'Eight',
    'Seven',
    'Six',
    'Five',
    'Four',
    'Three',
    'Two'
]

const SUIT_TO_EMOJI_MAP = new Map([
    ['Hearts', '♥'],
    ['Spades', '♠'],
    ['Clubs', '♣'],
    ['Diamonds', '♦'],
    ['Joker', '🃏']  
]);
const VALUE_TO_EMOJI_MAP = new Map([
    ['Ace', 'A'],
    ['King', 'K'],
    ['Queen', 'Q'],
    ['Jack', 'J'],
    ['Ten', '10'],
    ['Nine', '9'],
    ['Eight', '8'],
    ['Seven', '7'],
    ['Six', '6'],
    ['Five', '5'],
    ['Four', '4'],
    ['Three', '3'],
    ['Two', '2'],
    ['Joker', '']
]);

const EMOJI_TO_SUIT_MAP = new Map([
    ['♥', 'Hearts'],
    ['♠', 'Spades'],
    ['♣', 'Clubs'],
    ['♦', 'Diamonds'],
    ['🃏', 'Joker']
]);

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