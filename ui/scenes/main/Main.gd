extends Control

# Preload the Card scene
const CardScene = preload("res://scenes/card/Card.tscn")

@onready var card_container = $VBoxContainer/CardContainer
@onready var info_label = $VBoxContainer/InfoLabel

var cards: Array[Card] = []
var cards_face_up: bool = true

func _ready():
	print("Contract Rummy - Card Test Scene")
	create_test_cards()

func create_test_cards():
	"""Create a few test cards to display"""
	# Clear existing cards
	for card in cards:
		card.queue_free()
	cards.clear()

	# Test cards: Ace of Spades, King of Hearts, 10 of Diamonds, Joker, Card Back
	var test_data = [
		{"suit": "spades", "rank": "A"},
		{"suit": "hearts", "rank": "K"},
		{"suit": "diamonds", "rank": "10"},
		{"suit": "clubs", "rank": "5"},
		{"joker": true}
	]

	for data in test_data:
		var card = CardScene.instantiate() as Card
		card_container.add_child(card)

		if data.has("joker"):
			card.setup_joker()
		else:
			card.setup(data.suit, data.rank)

		card.set_face_up(true)

		# Connect card signals
		card.card_clicked.connect(_on_card_clicked)
		card.card_selected.connect(_on_card_selected)
		card.card_deselected.connect(_on_card_deselected)

		cards.append(card)

	info_label.text = "Click cards to select them (yellow highlight)"

func _on_card_clicked(card: Card):
	print("Card clicked: ", card.get_card_name())

func _on_card_selected(card: Card):
	print("Card selected: ", card.get_card_name())
	update_info_label()

func _on_card_deselected(card: Card):
	print("Card deselected: ", card.get_card_name())
	update_info_label()

func update_info_label():
	var selected_count = 0
	for card in cards:
		if card.is_selected:
			selected_count += 1

	if selected_count == 0:
		info_label.text = "Click cards to select them"
	else:
		info_label.text = "%d card(s) selected" % selected_count

func _on_flip_button_pressed():
	print("Flipping all cards")
	cards_face_up = not cards_face_up

	for card in cards:
		card.set_face_up(cards_face_up)

	info_label.text = "Cards flipped " + ("face up" if cards_face_up else "face down")

func _on_reset_button_pressed():
	print("Resetting cards")
	create_test_cards()
	cards_face_up = true
