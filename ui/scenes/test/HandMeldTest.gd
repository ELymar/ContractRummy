extends Control

const CardScene: PackedScene = preload("res://scenes/card/Card.tscn")

@onready var hand_container: Control = $MarginContainer/VBoxContainer/HandArea/HandContainer
@onready var meld_container: Control = $MarginContainer/VBoxContainer/MeldArea/MeldSlot/CardContainer
@onready var meld_slot: ColorRect = $MarginContainer/VBoxContainer/MeldArea/MeldSlot

const CARD_SIZE := Vector2(105, 147)  # 70% of 150x210
const HAND_CARD_SPACING := 20.0  # Spacing between cards in hand
const MELD_CARD_SPACING := 15.0  # Spacing between cards in meld

var hand_cards: Array[Card] = []
var meld_cards: Array[Card] = []
var dragging_card: Card = null
var drag_preview_index := -1
var original_parent: Node = null
var original_hand_index := -1
var drag_offset: Vector2 = Vector2.ZERO

func _ready():
	print("=== HAND TO MELD TEST ===")

	# Create a hand of 7 cards
	var test_hand = [
		{"suit": "spades", "rank": "A"},
		{"suit": "spades", "rank": "2"},
		{"suit": "spades", "rank": "3"},
		{"suit": "hearts", "rank": "K"},
		{"suit": "hearts", "rank": "Q"},
		{"suit": "diamonds", "rank": "7"},
		{"suit": "clubs", "rank": "9"}
	]

	for data in test_hand:
		var card: Card = CardScene.instantiate()
		card.setup(data["suit"], data["rank"])
		card.set_face_up(true)
		card.set_display_size(CARD_SIZE)

		# Set layout mode before adding to container
		card.set("layout_mode", 0)
		card.size_flags_horizontal = 0
		card.size_flags_vertical = 0

		hand_container.add_child(card)
		hand_cards.append(card)

		# Connect mouse signals
		card.gui_input.connect(_on_card_gui_input.bind(card))

	print("Created hand with %d cards" % hand_cards.size())

	# Wait for layout to settle, then position cards
	await get_tree().process_frame
	await get_tree().process_frame

	print("Hand container size: %s" % hand_container.size)

	# Layout the hand
	_update_hand_layout()

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

	# Calculate drag offset (where on the card we clicked)
	var mouse_pos = get_global_mouse_position()
	drag_offset = mouse_pos - card.global_position

	# Save global position BEFORE reparenting
	var saved_global_pos = card.global_position

	# Set layout mode before reparenting to prevent position reset
	card.set("layout_mode", 0)
	card.size_flags_horizontal = 0
	card.size_flags_vertical = 0

	# Track if dragging from hand
	var hand_index = hand_cards.find(card)
	if hand_index != -1:
		original_hand_index = hand_index
		hand_cards.remove_at(hand_index)
		_update_hand_layout()
	else:
		original_hand_index = -1

	# Track if dragging from meld
	var meld_index = meld_cards.find(card)
	if meld_index != -1:
		meld_cards.remove_at(meld_index)
		_update_meld_layout()

	# Move card to root level for dragging
	card.get_parent().remove_child(card)
	add_child(card)

	# Restore position immediately after reparenting
	card.global_position = saved_global_pos
	card.z_index = 100

	print("Started dragging: %s from %s" % [card.get_card_name(), "hand" if original_hand_index != -1 else "meld"])

func _end_drag() -> void:
	if dragging_card == null:
		return

	var card = dragging_card
	dragging_card = null
	drag_preview_index = -1

	# Check if dropped over meld area
	var card_center = card.global_position + CARD_SIZE / 2
	var meld_rect = Rect2(meld_slot.global_position, meld_slot.size)

	if meld_rect.has_point(card_center):
		# Add to meld
		print("Dropped in meld area")

		# Calculate which slot to insert into BEFORE reparenting
		var insert_index = _calculate_meld_insert_index(card_center)

		# Save the current global position
		var saved_global_pos = card.global_position

		# Remove from current parent and add to meld container
		card.get_parent().remove_child(card)
		meld_container.add_child(card)

		# Add to tracking array first
		meld_cards.insert(insert_index, card)

		# Set layout mode to position mode
		card.set("layout_mode", 0)
		card.size_flags_horizontal = 0
		card.size_flags_vertical = 0

		# Convert global position to local position in new parent
		var local_pos = saved_global_pos - meld_container.global_position

		# Set position immediately
		card.position = local_pos

		print("Inserted at meld index %d, total meld cards: %d" % [insert_index, meld_cards.size()])

		# Wait a frame then animate
		await get_tree().process_frame

		_update_meld_layout()
	else:
		# Return to hand
		print("Dropped outside meld, returning to hand")

		# Save the current global position
		var saved_global_pos = card.global_position

		# Remove from current parent and add back to hand
		card.get_parent().remove_child(card)
		hand_container.add_child(card)

		# Restore to hand array
		if original_hand_index != -1:
			hand_cards.insert(original_hand_index, card)
		else:
			hand_cards.append(card)

		# Set layout mode
		card.set("layout_mode", 0)
		card.size_flags_horizontal = 0
		card.size_flags_vertical = 0

		# Convert global position to local position
		var local_pos = saved_global_pos - hand_container.global_position
		card.position = local_pos
		card.z_index = 0

		# Wait a frame then animate
		await get_tree().process_frame

		_update_hand_layout()

	original_hand_index = -1

func _calculate_meld_insert_index(drop_position: Vector2) -> int:
	if meld_cards.is_empty():
		return 0

	# Convert to meld container local coordinates
	var local_pos = drop_position - meld_container.global_position

	# Calculate grid layout
	var total_width = meld_cards.size() * (CARD_SIZE.x + MELD_CARD_SPACING) - MELD_CARD_SPACING
	var start_x = (meld_slot.size.x - total_width) / 2

	# Find closest slot
	for i in range(meld_cards.size()):
		var card_x = start_x + i * (CARD_SIZE.x + MELD_CARD_SPACING)
		var card_center_x = card_x + CARD_SIZE.x / 2

		if local_pos.x < card_center_x:
			return i

	# If past all cards, append at end
	return meld_cards.size()

func _update_hand_layout() -> void:
	if hand_cards.is_empty():
		return

	var num_cards = hand_cards.size()
	var total_width = num_cards * (CARD_SIZE.x + HAND_CARD_SPACING) - HAND_CARD_SPACING
	var start_x = (hand_container.size.x - total_width) / 2
	var start_y = (hand_container.size.y - CARD_SIZE.y) / 2

	print("\n=== Updating Hand Layout ===")
	print("Hand cards: %d, Start X: %.1f, Start Y: %.1f" % [num_cards, start_x, start_y])

	for i in range(num_cards):
		var card = hand_cards[i]
		var target_x = start_x + i * (CARD_SIZE.x + HAND_CARD_SPACING)
		var target_pos = Vector2(target_x, start_y)

		# Animate to position
		var tween = create_tween()
		tween.tween_property(card, "position", target_pos, 0.2).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		card.z_index = 0

func _update_meld_layout() -> void:
	if meld_cards.is_empty():
		return

	var num_cards = meld_cards.size()
	var total_width = num_cards * (CARD_SIZE.x + MELD_CARD_SPACING) - MELD_CARD_SPACING
	var start_x = (meld_slot.size.x - total_width) / 2
	var start_y = (meld_slot.size.y - CARD_SIZE.y) / 2

	print("\n=== Updating Meld Layout ===")
	print("Meld cards: %d, Start X: %.1f, Start Y: %.1f" % [num_cards, start_x, start_y])

	for i in range(num_cards):
		var card = meld_cards[i]
		var target_x = start_x + i * (CARD_SIZE.x + MELD_CARD_SPACING)
		var target_pos = Vector2(target_x, start_y)

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
	var meld_rect = Rect2(meld_slot.global_position, meld_slot.size)

	if meld_rect.has_point(card_center):
		var new_preview_index = _calculate_meld_insert_index(card_center)

		if new_preview_index != drag_preview_index:
			drag_preview_index = new_preview_index
			_update_meld_preview_layout()
	else:
		if drag_preview_index != -1:
			drag_preview_index = -1
			_update_meld_layout()

func _update_meld_preview_layout() -> void:
	# Show where card will be inserted
	var num_cards = meld_cards.size() + 1  # Include preview
	var total_width = num_cards * (CARD_SIZE.x + MELD_CARD_SPACING) - MELD_CARD_SPACING
	var start_x = (meld_slot.size.x - total_width) / 2
	var start_y = (meld_slot.size.y - CARD_SIZE.y) / 2

	var visual_index = 0
	for i in range(meld_cards.size()):
		if visual_index == drag_preview_index:
			visual_index += 1  # Skip preview slot

		var card = meld_cards[i]

		var target_x = start_x + visual_index * (CARD_SIZE.x + MELD_CARD_SPACING)
		var target_pos = Vector2(target_x, start_y)

		# Quick animation
		var tween = create_tween()
		tween.tween_property(card, "position", target_pos, 0.1).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

		visual_index += 1
