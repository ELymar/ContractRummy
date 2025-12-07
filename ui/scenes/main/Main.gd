extends Control

# Preload the Card scene
const CardScene = preload("res://scenes/card/Card.tscn")
const HandScene = preload("res://scenes/game/Hand.tscn")

@onready var hand_container = $VBoxContainer/HandContainer
@onready var info_label = $VBoxContainer/InfoLabel

var hand: Hand = null
var cards_face_up: bool = true

func _ready():
	print("Contract Rummy - Card Test Scene")
	create_hand()
	create_test_cards()

func create_hand():
	"""Create the Hand container"""
	hand = HandScene.instantiate()
	hand_container.add_child(hand)
	hand.card_order_changed.connect(_on_card_order_changed)

func create_test_cards():
	"""Create a few test cards to display"""
	if hand:
		hand.clear_hand()

	# Test cards: variety of suits and ranks
	var test_data = [
		{"suit": "spades", "rank": "A"},
		{"suit": "hearts", "rank": "K"},
		{"suit": "diamonds", "rank": "10"},
		{"suit": "clubs", "rank": "5"},
		{"suit": "hearts", "rank": "7"},
		{"suit": "spades", "rank": "Q"},
		{"joker": true}
	]

	for data in test_data:
		var card = CardScene.instantiate() as Card

		if data.has("joker"):
			card.setup_joker()
		else:
			card.setup(data.suit, data.rank)

		card.set_face_up(true)

		# Connect card signals
		card.card_clicked.connect(_on_card_clicked)
		card.card_selected.connect(_on_card_selected)
		card.card_deselected.connect(_on_card_deselected)

		hand.add_card(card)

	info_label.text = "Drag cards to reorder • Click to select"

func _on_card_clicked(card: Card):
	print("Card clicked: ", card.get_card_name())

func _on_card_selected(card: Card):
	print("Card selected: ", card.get_card_name())
	update_info_label()

func _on_card_deselected(card: Card):
	print("Card deselected: ", card.get_card_name())
	update_info_label()

func _on_card_order_changed(new_order: Array[Card]):
	print("Hand order changed:")
	for i in range(new_order.size()):
		print("  %d: %s" % [i, new_order[i].get_card_name()])

func update_info_label():
	var selected = hand.get_selected_cards()

	if selected.size() == 0:
		info_label.text = "Drag cards to reorder • Click to select"
	else:
		info_label.text = "%d card(s) selected" % selected.size()

func _on_flip_button_pressed():
	print("Flipping all cards")
	cards_face_up = not cards_face_up

	for card in hand.cards:
		card.set_face_up(cards_face_up)

	info_label.text = "Cards flipped " + ("face up" if cards_face_up else "face down")

func _on_reset_button_pressed():
	print("Resetting cards")
	create_test_cards()
	cards_face_up = true
