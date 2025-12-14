extends Control

const CardScene: PackedScene = preload("res://scenes/card/Card.tscn")

@onready var meld_container: Control = $CenterContainer/VBoxContainer/MeldSlot/Placeholder/CardContainer
@onready var meld_placeholder: ColorRect = $CenterContainer/VBoxContainer/MeldSlot/Placeholder
@onready var source_container: HBoxContainer = $CenterContainer/VBoxContainer/SourceArea/SourceContainer

const CARD_SIZE := Vector2(105, 147)  # 70% of 150x210
const CARD_SPACING := 10.0
const GRID_SPACING := 15.0

var meld_cards: Array[Card] = []
var dragging_card: Card = null
var drag_preview_index := -1
var original_parent: Node = null
var original_position: Vector2
var drag_offset: Vector2 = Vector2.ZERO

func _ready():
	print("=== MELD DRAG TEST ===")

	# Create some source cards to drag
	var test_cards = [
		{"suit": "spades", "rank": "A"},
		{"suit": "hearts", "rank": "K"},
		{"suit": "diamonds", "rank": "Q"},
		{"suit": "clubs", "rank": "J"},
		{"suit": "spades", "rank": "10"}
	]

	for data in test_cards:
		var card: Card = CardScene.instantiate()
		card.setup(data["suit"], data["rank"])
		card.set_face_up(true)
		card.set_display_size(CARD_SIZE)
		source_container.add_child(card)

		# Connect mouse signals
		card.gui_input.connect(_on_card_gui_input.bind(card))

	print("Created %d source cards" % test_cards.size())

func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and not mouse_event.pressed:
			if dragging_card != null:
				_end_drag()
				get_viewport().set_input_as_handled()

func _on_card_gui_input(event: InputEvent, card: Card) -> void:
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton

		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed:
			_start_drag(card)
			get_viewport().set_input_as_handled()

func _start_drag(card: Card) -> void:
	dragging_card = card
	original_parent = card.get_parent()
	original_position = card.position

	# Calculate drag offset (where on the card we clicked)
	var mouse_pos = get_global_mouse_position()
	drag_offset = mouse_pos - card.global_position

	# Save global position BEFORE reparenting
	var saved_global_pos = card.global_position

	# Set layout mode before reparenting to prevent position reset
	card.set("layout_mode", 0)
	card.size_flags_horizontal = 0
	card.size_flags_vertical = 0

	# Move card to this control for dragging (not root)
	card.get_parent().remove_child(card)
	add_child(card)

	# Restore position immediately after reparenting
	card.global_position = saved_global_pos
	card.z_index = 100

	# If dragging from meld, remove from meld_cards
	var meld_index = meld_cards.find(card)
	if meld_index != -1:
		meld_cards.remove_at(meld_index)
		_update_meld_layout()

	print("Started dragging: %s" % card.get_card_name())

func _end_drag() -> void:
	if dragging_card == null:
		return

	var card = dragging_card
	dragging_card = null
	drag_preview_index = -1

	# Check if dropped over meld area
	var card_center = card.global_position + CARD_SIZE / 2
	var meld_rect = Rect2(meld_placeholder.global_position, meld_placeholder.size)

	if meld_rect.has_point(card_center):
		# Add to meld
		print("Dropped in meld area")

		# Calculate which slot to insert into BEFORE reparenting
		var insert_index = _calculate_insert_index(card_center)

		# Save the current global position
		var saved_global_pos = card.global_position
		print("Card global_pos before reparent: %s" % saved_global_pos)

		# Set layout mode and clear size flags BEFORE reparenting
		card.set("layout_mode", 0)
		card.size_flags_horizontal = 0
		card.size_flags_vertical = 0

		# Remove from current parent and add to meld container
		card.get_parent().remove_child(card)
		meld_container.add_child(card)

		# Add to tracking array first
		meld_cards.insert(insert_index, card)

		# Convert global position to local position in new parent
		var local_pos = saved_global_pos - meld_container.global_position

		# Set position immediately (will be preserved now that layout_mode is 0)
		card.position = local_pos

		print("Card local position set to: %s" % card.position)
		print("Meld container global_position: %s" % meld_container.global_position)
		print("Inserted at index %d, total cards: %d" % [insert_index, meld_cards.size()])

		# Wait a frame then animate
		await get_tree().process_frame
		print("Card position after frame: %s" % card.position)

		_update_meld_layout()
	else:
		# Return to original position
		print("Dropped outside meld, returning to source")
		card.get_parent().remove_child(card)
		original_parent.add_child(card)
		card.position = original_position
		card.z_index = 0

func _calculate_insert_index(drop_position: Vector2) -> int:
	if meld_cards.is_empty():
		return 0

	# Convert to meld container local coordinates
	var local_pos = drop_position - meld_container.global_position

	# Calculate grid layout
	var total_width = meld_cards.size() * (CARD_SIZE.x + GRID_SPACING) - GRID_SPACING
	var start_x = (meld_placeholder.size.x - total_width) / 2

	# Find closest slot
	for i in range(meld_cards.size()):
		var card_x = start_x + i * (CARD_SIZE.x + GRID_SPACING)
		var card_center_x = card_x + CARD_SIZE.x / 2

		if local_pos.x < card_center_x:
			return i

	# If past all cards, append at end
	return meld_cards.size()

func _update_meld_layout() -> void:
	if meld_cards.is_empty():
		return

	var num_cards = meld_cards.size()
	var total_width = num_cards * (CARD_SIZE.x + GRID_SPACING) - GRID_SPACING
	var start_x = (meld_placeholder.size.x - total_width) / 2
	var start_y = (meld_placeholder.size.y - CARD_SIZE.y) / 2

	print("\n=== Updating Meld Layout ===")
	print("Placeholder size: %s" % meld_placeholder.size)
	print("Cards: %d, Total width: %.1f, Start X: %.1f, Start Y: %.1f" % [num_cards, total_width, start_x, start_y])

	for i in range(num_cards):
		var card = meld_cards[i]

		print("  Card %d (%s): layout_mode=%s, size_flags_h=%s, size_flags_v=%s" % [i, card.get_card_name(), card.get("layout_mode"), card.size_flags_horizontal, card.size_flags_vertical])

		var target_x = start_x + i * (CARD_SIZE.x + GRID_SPACING)
		var target_pos = Vector2(target_x, start_y)

		print("  Card %d (%s): current_pos=%s, target_pos=%s" % [i, card.get_card_name(), card.position, target_pos])

		# Animate to position
		var tween = create_tween()
		tween.tween_property(card, "position", target_pos, 0.2).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		card.z_index = 0

func _process(_delta: float) -> void:
	if dragging_card == null:
		return

	# Update dragging card position to follow mouse with offset
	dragging_card.global_position = get_global_mouse_position() - drag_offset

	# Check if over meld area and update preview
	var card_center = dragging_card.global_position + CARD_SIZE / 2
	var meld_rect = Rect2(meld_placeholder.global_position, meld_placeholder.size)

	if meld_rect.has_point(card_center):
		var new_preview_index = _calculate_insert_index(card_center)

		if new_preview_index != drag_preview_index:
			drag_preview_index = new_preview_index
			_update_preview_layout()
	else:
		if drag_preview_index != -1:
			drag_preview_index = -1
			_update_meld_layout()

func _update_preview_layout() -> void:
	# Show where card will be inserted
	var num_cards = meld_cards.size() + 1  # Include preview
	var total_width = num_cards * (CARD_SIZE.x + GRID_SPACING) - GRID_SPACING
	var start_x = (meld_placeholder.size.x - total_width) / 2
	var start_y = (meld_placeholder.size.y - CARD_SIZE.y) / 2

	var visual_index = 0
	for i in range(meld_cards.size()):
		if visual_index == drag_preview_index:
			visual_index += 1  # Skip preview slot

		var card = meld_cards[i]

		var target_x = start_x + visual_index * (CARD_SIZE.x + GRID_SPACING)
		var target_pos = Vector2(target_x, start_y)

		# Quick animation
		var tween = create_tween()
		tween.tween_property(card, "position", target_pos, 0.1).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

		visual_index += 1
