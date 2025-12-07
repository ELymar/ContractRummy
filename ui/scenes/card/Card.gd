extends Control
class_name Card

# Card data
var suit: String = ""  # "spades", "hearts", "diamonds", "clubs"
var rank: String = ""  # "A", "2"-"10", "J", "Q", "K"
var is_joker: bool = false
var is_face_up: bool = true
var card_uuid: String = ""  # UUID from server

# Visual state
var is_selected: bool = false
var is_dragging: bool = false

# Card dimensions (matches your assets)
const CARD_WIDTH = 150
const CARD_HEIGHT = 210

@onready var card_sprite: TextureRect = $CardSprite
@onready var selection_highlight: ColorRect = $SelectionHighlight

signal card_clicked(card: Card)
signal card_selected(card: Card)
signal card_deselected(card: Card)

func _ready():
	custom_minimum_size = Vector2(CARD_WIDTH, CARD_HEIGHT)
	selection_highlight.visible = false
	update_card_visual()

func setup(p_suit: String, p_rank: String, p_uuid: String = ""):
	"""Initialize card with suit and rank"""
	suit = p_suit
	rank = p_rank
	card_uuid = p_uuid
	is_joker = false
	update_card_visual()

func setup_joker(p_uuid: String = ""):
	"""Initialize as a joker card"""
	is_joker = true
	card_uuid = p_uuid
	update_card_visual()

func set_face_up(face_up: bool):
	"""Flip card face up or down"""
	is_face_up = face_up
	update_card_visual()

func update_card_visual():
	"""Update the card sprite based on current state"""
	if not is_inside_tree() or not card_sprite:
		return

	var texture_path: String

	if not is_face_up:
		# Show card back
		texture_path = "res://assets/cards/back.png"
	elif is_joker:
		# Show joker
		texture_path = "res://assets/cards/joker.png"
	else:
		# Show card face (e.g., "A_spades.png")
		texture_path = "res://assets/cards/%s_%s.png" % [rank, suit]

	# Load and set texture
	var texture = load(texture_path)
	if texture:
		card_sprite.texture = texture
	else:
		push_error("Failed to load card texture: " + texture_path)

func set_selected(selected: bool):
	"""Set selection state"""
	is_selected = selected
	selection_highlight.visible = selected

	if selected:
		card_selected.emit(self)
	else:
		card_deselected.emit(self)

func toggle_selection():
	"""Toggle selection state"""
	set_selected(not is_selected)

func _gui_input(event):
	"""Handle input events on the card"""
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			card_clicked.emit(self)
			toggle_selection()
			accept_event()

func get_card_name() -> String:
	"""Get human-readable card name"""
	if is_joker:
		return "Joker"
	return "%s of %s" % [rank, suit.capitalize()]

func to_dict() -> Dictionary:
	"""Convert card to dictionary (for sending to server)"""
	return {
		"suit": suit,
		"rank": rank,
		"isJoker": is_joker,
		"uuid": card_uuid
	}
