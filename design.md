The King Rummy variant 

Two players take turns

Deck [ ]]]]

Rules: http://www.rummy-games.com/rules/contract-rummy.html

Game state

Deck
DiscardPile
DownPile(s)
Hand(s)

A player turn has the following options 
Draw (deck or down pile if not dead)
Reorder cards 
If not down
  Go down
Else
  Add to existing down piles 
    Special case moving joker
    Special case one card left can’t add, must discard
discard
(Check for 0 cards)

Reordering should be allowed at any point but need to make sure sorted list of cards matches 

Game state DTO has to restrict other players hand view. Just count of cards is transferred 

Server game state dto communicated to player. Player makes moves and sends back to server. Server validates and confirms it’s legal, applies state changes and next turn starts. New dto sent to next player 