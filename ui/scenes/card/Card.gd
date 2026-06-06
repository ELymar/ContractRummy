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
var drag_offset: Vector2 = Vector2.ZERO
var original_position: Vector2 = Vector2.ZERO
var original_z_index: int = 0

# Card dimensions (matches your assets)
const CARD_WIDTH = 150
const CARD_HEIGHT = 210
const DEFAULT_CARD_SIZE := Vector2(CARD_WIDTH, CARD_HEIGHT)
const CARD_ASPECT_RATIO := float(CARD_WIDTH) / float(CARD_HEIGHT)
const CARD_GROUP := "card_nodes"

var display_size: Vector2 = Vector2.ZERO

@onready var card_sprite: TextureRect = $CardSprite
@onready var selection_highlight: ColorRect = $SelectionHighlight

signal card_clicked(card: Card)
signal card_selected(card: Card)
signal card_deselected(card: Card)
signal drag_started(card: Card)
signal drag_ended(card: Card)

func _enter_tree():
	add_to_group(CARD_GROUP)

func _exit_tree():
	if is_in_group(CARD_GROUP):
		remove_from_group(CARD_GROUP)

func _ready():
	selection_highlight.visible = false
	size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_apply_display_size()
	update_card_visual()

func set_display_size(size: Vector2) -> void:
	display_size = size
	_apply_display_size()

func set_display_scale(scale: float) -> void:
	set_display_size(DEFAULT_CARD_SIZE * scale)

func get_display_size() -> Vector2:
	return display_size if display_size != Vector2.ZERO else DEFAULT_CARD_SIZE

func _apply_display_size() -> void:
	var target_size := display_size

	if target_size == Vector2.ZERO:
		target_size = DEFAULT_CARD_SIZE

	display_size = target_size

	custom_minimum_size = target_size

	size = target_size
	pivot_offset = target_size * 0.5

	if card_sprite:
		card_sprite.custom_minimum_size = target_size
		card_sprite.size = target_size

	if selection_highlight:
		selection_highlight.custom_minimum_size = target_size
		selection_highlight.size = target_size

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
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				# Start potential drag
				is_dragging = true
				drag_offset = event.position
				original_position = global_position
				original_z_index = z_index
				z_index = 100  # Bring to front while dragging
				drag_started.emit(self)
				accept_event()
			else:
				# End drag
				if is_dragging:
					is_dragging = false
					z_index = original_z_index
					drag_ended.emit(self)

					# If we didn't move much, treat as a click
					if global_position.distance_to(original_position) < 5:
						card_clicked.emit(self)
						toggle_selection()

					accept_event()

	elif event is InputEventMouseMotion:
		if is_dragging:
			# Move card with mouse
			global_position = get_global_mouse_position() - drag_offset
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
