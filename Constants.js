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

const SUIT_EMOJI = new Map([
    ['Hearts', '♥'],
    ['Spades', '♠'],
    ['Clubs', '♣'],
    ['Diamonds', '♦'],
    ['Joker', '🃏']  
]);
const VALUE_EMOJI = new Map([
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

module.exports = { SUITS, VALUES, SUIT_EMOJI, VALUE_EMOJI }; 