extends Control

# Card dimensions - smaller for fitting everything on screen
const SMALL_CARD_WIDTH = 60
const SMALL_CARD_HEIGHT = 84
const CARD_SPACING = 2

# Preload the Card scene
var CardScene = preload("res://scenes/card/Card.tscn")

# Node references
@onready var opponent_hand_container = $MarginContainer/MainLayout/OpponentArea/OpponentHand
@onready var opponent_meld_row1 = $MarginContainer/MainLayout/OpponentArea/OpponentMelds/MeldRow1
@onready var opponent_meld_row2 = $MarginContainer/MainLayout/OpponentArea/OpponentMelds/MeldRow2
@onready var opponent_meld_row3 = $MarginContainer/MainLayout/OpponentArea/OpponentMelds/MeldRow3
@onready var deck_container = $MarginContainer/MainLayout/TableArea/LeftSide/DeckArea/DeckContainer
@onready var discard_container = $MarginContainer/MainLayout/TableArea/LeftSide/DiscardArea/DiscardContainer
@onready var player_meld_row1 = $MarginContainer/MainLayout/TableArea/RightSide/PlayerMelds/MeldRow1
@onready var player_meld_row2 = $MarginContainer/MainLayout/TableArea/RightSide/PlayerMelds/MeldRow2
@onready var player_meld_row3 = $MarginContainer/MainLayout/TableArea/RightSide/PlayerMelds/MeldRow3
@onready var player_hand = $MarginContainer/MainLayout/PlayerHandArea/PlayerHand

func _ready():
	print("Game Screen loaded - Building layout")
	_setup_test_game()

func _setup_test_game():
	"""Set up a test game with sample cards"""

	# Opponent's hand (7 face-down cards)
	_create_opponent_hand(7)

	# Opponent's melds (some example melds)
	_create_test_meld(opponent_meld_row1, [
		{"suit": "spades", "rank": "3"},
		{"suit": "hearts", "rank": "3"},
		{"suit": "diamonds", "rank": "3"}
	])
	_create_test_meld(opponent_meld_row2, [
		{"suit": "clubs", "rank": "7"},
		{"suit": "clubs", "rank": "8"},
		{"suit": "clubs", "rank": "9"},
		{"suit": "clubs", "rank": "10"}
	])

	# Deck
	_create_deck_pile()

	# Discard pile (top card showing)
	_create_discard_pile("hearts", "9")

	# Player's melds
	_create_test_meld(player_meld_row1, [
		{"suit": "spades", "rank": "K"},
		{"suit": "hearts", "rank": "K"},
		{"suit": "diamonds", "rank": "K"}
	])
	_create_test_meld(player_meld_row2, [
		{"suit": "clubs", "rank": "10"},
		{"suit": "spades", "rank": "10"},
		{"suit": "diamonds", "rank": "10"}
	])

	# Player's hand (7 cards face up)
	_create_player_hand([
		{"suit": "hearts", "rank": "K"},
		{"suit": "clubs", "rank": "K"},
		{"suit": "clubs", "rank": "10"},
		{"suit": "spades", "rank": "10"},
		{"suit": "diamonds", "rank": "10"},
		{"suit": "hearts", "rank": "9"},
		{"suit": "hearts", "rank": "4"}
	])

func _create_opponent_hand(card_count: int):
	"""Create opponent's hand with face-down cards"""
	for i in range(card_count):
		var card = _create_small_card()
		card.set_face_up(false)  # Face down
		opponent_hand_container.add_child(card)

func _create_test_meld(container: HBoxContainer, card_data: Array):
	"""Create a meld row with given cards"""
	for data in card_data:
		var card = _create_small_card()
		card.setup(data["suit"], data["rank"])
		card.set_face_up(true)
		container.add_child(card)

func _create_deck_pile():
	"""Create the deck pile"""
	var card = _create_small_card()
	card.set_face_up(false)
	card.position = Vector2(0, 0)
	deck_container.add_child(card)

	# Add a label showing card count
	var count_label = Label.new()
	count_label.text = "52"
	count_label.position = Vector2(5, 5)
	count_label.add_theme_font_size_override("font_size", 12)
	count_label.add_theme_color_override("font_color", Color.WHITE)
	count_label.add_theme_color_override("font_outline_color", Color.BLACK)
	count_label.add_theme_constant_override("outline_size", 2)
	deck_container.add_child(count_label)

func _create_discard_pile(suit: String, rank: String):
	"""Create the discard pile with top card showing"""
	var card = _create_small_card()
	card.setup(suit, rank)
	card.set_face_up(true)
	card.position = Vector2(0, 0)
	discard_container.add_child(card)

func _create_player_hand(card_data: Array):
	"""Create player's hand with face-up cards"""
	for data in card_data:
		var card = _create_small_card()
		card.setup(data["suit"], data["rank"])
		card.set_face_up(true)
		player_hand.add_card(card)

func _create_small_card() -> Card:
	"""Create a card with smaller dimensions"""
	var card = CardScene.instantiate()
	card.custom_minimum_size = Vector2(SMALL_CARD_WIDTH, SMALL_CARD_HEIGHT)
	# Override the card's internal size constants if needed
	return card

func _create_meld_slot(container: HBoxContainer):
	"""Create an empty meld slot (placeholder)"""
	var slot = ColorRect.new()
	slot.custom_minimum_size = Vector2(SMALL_CARD_WIDTH, SMALL_CARD_HEIGHT)
	slot.color = Color(0, 0, 0, 0.1)  # Semi-transparent placeholder
	container.add_child(slot)
