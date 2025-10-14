const Card = require('../domain/Card');
const {SUITS, VALUES} = require('../../shared/Constants');

const noChalk = (input) => {
  input.replace(/\u001b[^m]*?m/g, '');
  return input;
};

const predecessor = (value) => {
  const index = VALUES.indexOf(value);
  if (index === 0) {
    return VALUES[VALUES.length - 1];
  }
  return VALUES[index - 1];
};

const successor = (value) => {
  const index = VALUES.indexOf(value);
  if (index === VALUES.length - 1) {
    return VALUES[0];
  }
  return VALUES[index + 1];
};

// Sequence test, at least length 4, cards are same suit and in sequence. Joker is a wildcard
const isValidSequence = (cards) => {
  // Check length is greater than or equal to four
  if (cards.length < 4) {
    return false;
  }

  // Look for first card that is not a joker
  let nonJokerIndex = 0;
  while (nonJokerIndex < cards.length && cards[nonJokerIndex].value === 'Joker') {
    nonJokerIndex += 1;
  }

  // If all cards are jokers, return false (caught by base rule check later, but defensive programming)
  if (nonJokerIndex >= cards.length) {
    return false;
  }

  // Check that all cards are same suit
  const suit = cards[nonJokerIndex].suit;
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].suit !== suit && cards[i].value !== 'Joker') {
      return false;
    }
  }

  // Check that no Ace is in the middle
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].value === 'Ace' && i !== 0 && i !== cards.length - 1) {
      return false;
    }
  }

  // Check that at least two cards aren't jokers
  let nonJokerCount = 0;
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].value !== 'Joker') {
      nonJokerCount += 1;
    }
  }
  if (nonJokerCount < 2) {
    return false;
  }

  // Check that cards are in sequence forward and backwards
  const value = cards[nonJokerIndex].value;
  let index = nonJokerIndex;

  // Check forward. Calculate expected next vs current expected and compare
  current_expected = cards[nonJokerIndex].value;
  while (index < cards.length) {
    if (current_expected === 'Ace' && index > 0 && index < cards.length - 1) {
      return false;
    }
    if (cards[index].value === 'Joker') {
      index += 1;
      current_expected = successor(current_expected);
      continue;
    }
    if (cards[index].value !== current_expected) {
      return false;
    }
    current_expected = successor(current_expected);
    index += 1;
  }
  // Check backwards
  current_expected = cards[nonJokerIndex].value;
  index = nonJokerIndex;
  while (index >= 0) {
    if (current_expected === 'Ace' && index > 0 && index < cards.length - 1) {
      return false;
    }
    if (cards[index].value === 'Joker') {
      index -= 1;
      current_expected = successor(current_expected);
      continue;
    }
    if (cards[index].value !== current_expected) {
      return false;
    }

    current_expected = predecessor(current_expected);
    index -= 1;
  }
  return true;
};

const isValidDupes = (cards) => {
  if (cards.length < 3) {
    return false;
  }
  // at least 2 non jokers
  let nonJokerCount = 0;
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].value !== 'Joker') {
      nonJokerCount += 1;
    }
  }
  if (nonJokerCount < 2) {
    return false;
  }

  const setOfValues = new Set();
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].value === 'Joker') {
      continue;
    }
    setOfValues.add(cards[i].value);
    if (setOfValues.size > 1) {
      return false;
    }
  }
  return true;
};

// Four (straight flush length four)

module.exports = {isValidSequence, isValidDupes};
