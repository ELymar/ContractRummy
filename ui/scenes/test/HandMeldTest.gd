extends Control

const CardScene: PackedScene = preload("res://scenes/card/Card.tscn")

@onready var hand_container: Control = $MarginContainer/VBoxContainer/HandArea/HandContainer
@onready var deck_container: Control = $MarginContainer/VBoxContainer/TableArea/DeckDiscardRow/DeckStack/DeckSlot/CardContainer
@onready var deck_slot: ColorRect = $MarginContainer/VBoxContainer/TableArea/DeckDiscardRow/DeckStack/DeckSlot
@onready var discard_container: Control = $MarginContainer/VBoxContainer/TableArea/DeckDiscardRow/DiscardStack/DiscardSlot/CardContainer
@onready var discard_slot: ColorRect = $MarginContainer/VBoxContainer/TableArea/DeckDiscardRow/DiscardStack/DiscardSlot
@onready var meld1_container: Control = $MarginContainer/VBoxContainer/TableArea/MeldsRow/MeldSlot1/Placeholder/CardContainer
@onready var meld1_slot: ColorRect = $MarginContainer/VBoxContainer/TableArea/MeldsRow/MeldSlot1/Placeholder
@onready var meld2_container: Control = $MarginContainer/VBoxContainer/TableArea/MeldsRow/MeldSlot2/Placeholder/CardContainer
@onready var meld2_slot: ColorRect = $MarginContainer/VBoxContainer/TableArea/MeldsRow/MeldSlot2/Placeholder
@onready var end_turn_button: Button = $MarginContainer/VBoxContainer/TableArea/ActionButtons/EndTurnButton

const CARD_SIZE := Vector2(105, 147)
const HAND_CARD_SPACING := 20.0
const MELD_CARD_SPACING := 15.0

# Game state
var hand_cards: Array[Card] = []
var deck_cards: Array[Card] = []
var discard_cards: Array[Card] = []
var meld1_cards: Array[Card] = []
var meld2_cards: Array[Card] = []

# Drag state
var dragging_card: Card = null
var drag_preview_index := -1
var drag_preview_meld := 0
var original_parent: Node = null
var original_hand_index := -1
var drag_offset: Vector2 = Vector2.ZERO

# Turn state
var has_drawn := false
var can_end_turn := false

func _ready():
	print("=== HAND TO MELD FULL TURN TEST ===")
	end_turn_button.pressed.connect(_on_end_turn_pressed)
	end_turn_button.disabled = true
	_initialize_test_game()

func _initialize_test_game():
	print("Initializing test game state...")

	# Create deck (10 face-down cards)
	for i in range(10):
		var card: Card = CardScene.instantiate()
		card.setup("spades", "A")
		card.set_face_up(false)
		card.set_display_size(CARD_SIZE)
		card.set("layout_mode", 0)
		card.size_flags_horizontal = 0
		card.size_flags_vertical = 0
		deck_container.add_child(card)
		deck_cards.append(card)
		card.gui_input.connect(_on_deck_clicked.bind(card))

	# Create discard pile (1 card - 7 of diamonds)
	var discard_card: Card = CardScene.instantiate()
	discard_card.setup("diamonds", "7")
	discard_card.set_face_up(true)
	discard_card.set_display_size(CARD_SIZE)
	discard_card.set("layout_mode", 0)
	discard_card.size_flags_horizontal = 0
	discard_card.size_flags_vertical = 0
	discard_container.add_child(discard_card)
	discard_cards.append(discard_card)
	discard_card.gui_input.connect(_on_discard_clicked.bind(discard_card))

	# Create hand (6 cards)
	var test_hand = [
		{"suit": "spades", "rank": "A"},
		{"suit": "spades", "rank": "2"},
		{"suit": "spades", "rank": "3"},
		{"suit": "hearts", "rank": "K"},
		{"suit": "hearts", "rank": "Q"},
		{"suit": "clubs", "rank": "9"}
	]

	for data in test_hand:
		var card: Card = CardScene.instantiate()
		card.setup(data["suit"], data["rank"])
		card.set_face_up(true)
		card.set_display_size(CARD_SIZE)
		card.set("layout_mode", 0)
		card.size_flags_horizontal = 0
		card.size_flags_vertical = 0
		hand_container.add_child(card)
		hand_cards.append(card)
		card.gui_input.connect(_on_card_gui_input.bind(card))

	await get_tree().process_frame
	await get_tree().process_frame

	_update_deck_layout()
	_update_discard_layout()
	_update_hand_layout()

	print("Game initialized. Draw a card from deck or discard to start!")

func _on_deck_clicked(event: InputEvent, card: Card) -> void:
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed and not has_drawn:
			_draw_from_deck()
			get_viewport().set_input_as_handled()

func _on_discard_clicked(event: InputEvent, card: Card) -> void:
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and mouse_event.pressed and not has_drawn:
			_draw_from_discard()
			get_viewport().set_input_as_handled()

func _draw_from_deck() -> void:
	if deck_cards.is_empty():
		return

	print("Drawing from deck...")
	has_drawn = true
	var card = deck_cards.pop_back()
	card.setup("hearts", "J")
	card.set_face_up(true)

	var saved_global_pos = card.global_position
	card.get_parent().remove_child(card)
	hand_container.add_child(card)
	hand_cards.append(card)

	card.set("layout_mode", 0)
	card.size_flags_horizontal = 0
	card.size_flags_vertical = 0
	card.position = saved_global_pos - hand_container.global_position
	card.gui_input.disconnect(_on_deck_clicked)
	card.gui_input.connect(_on_card_gui_input.bind(card))

	_update_deck_layout()
	await get_tree().process_frame
	_update_hand_layout()
	print("Drew from deck. You now have %d cards." % hand_cards.size())
	_update_turn_state()

func _draw_from_discard() -> void:
	if discard_cards.is_empty():
		return

	print("Drawing from discard...")
	has_drawn = true
	var card = discard_cards.pop_back()

	var saved_global_pos = card.global_position
	card.get_parent().remove_child(card)
	hand_container.add_child(card)
	hand_cards.append(card)

	card.set("layout_mode", 0)
	card.size_flags_horizontal = 0
	card.size_flags_vertical = 0
	card.position = saved_global_pos - hand_container.global_position
	card.gui_input.disconnect(_on_discard_clicked)
	card.gui_input.connect(_on_card_gui_input.bind(card))

	_update_discard_layout()
	await get_tree().process_frame
	_update_hand_layout()
	print("Drew from discard. You now have %d cards." % hand_cards.size())
	_update_turn_state()

func _update_turn_state() -> void:
	can_end_turn = has_drawn and hand_cards.size() == 7
	end_turn_button.disabled = not can_end_turn
	if can_end_turn:
		print("You can now end your turn!")

func _on_end_turn_pressed() -> void:
	print("\n=== ENDING TURN ===")
	print("Hand: %d | Meld1: %d | Meld2: %d | Discard: %d" % [hand_cards.size(), meld1_cards.size(), meld2_cards.size(), discard_cards.size()])
	print("===================\n")
	has_drawn = false
	can_end_turn = false
	end_turn_button.disabled = true
	print("Turn ended. Draw a card to start your next turn!")

func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and not mouse_event.pressed and dragging_card != null:
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

	var mouse_pos = get_global_mouse_position()
	drag_offset = mouse_pos - card.global_position
	var saved_global_pos = card.global_position

	card.set("layout_mode", 0)
	card.size_flags_horizontal = 0
	card.size_flags_vertical = 0

	var hand_index = hand_cards.find(card)
	if hand_index != -1:
		original_hand_index = hand_index
		hand_cards.remove_at(hand_index)
		_update_hand_layout()
	else:
		original_hand_index = -1

	var meld1_index = meld1_cards.find(card)
	if meld1_index != -1:
		meld1_cards.remove_at(meld1_index)
		_update_meld_layout(1)

	var meld2_index = meld2_cards.find(card)
	if meld2_index != -1:
		meld2_cards.remove_at(meld2_index)
		_update_meld_layout(2)

	card.get_parent().remove_child(card)
	add_child(card)
	card.global_position = saved_global_pos
	card.z_index = 100

func _end_drag() -> void:
	if dragging_card == null:
		return

	var card = dragging_card
	dragging_card = null
	drag_preview_index = -1
	drag_preview_meld = 0

	var card_center = card.global_position + CARD_SIZE / 2

	# Check discard
	var discard_rect = Rect2(discard_slot.global_position, discard_slot.size)
	if discard_rect.has_point(card_center) and has_drawn:
		_discard_card(card)
		return

	# Check meld 1
	var meld1_rect = Rect2(meld1_slot.global_position, meld1_slot.size)
	if meld1_rect.has_point(card_center):
		_add_to_meld(card, 1, card_center)
		return

	# Check meld 2
	var meld2_rect = Rect2(meld2_slot.global_position, meld2_slot.size)
	if meld2_rect.has_point(card_center):
		_add_to_meld(card, 2, card_center)
		return

	_return_to_hand(card)

func _discard_card(card: Card) -> void:
	print("Discarding: %s" % card.get_card_name())

	var saved_global_pos = card.global_position
	card.get_parent().remove_child(card)
	discard_container.add_child(card)
	discard_cards.append(card)

	card.set("layout_mode", 0)
	card.size_flags_horizontal = 0
	card.size_flags_vertical = 0
	card.position = saved_global_pos - discard_container.global_position
	card.gui_input.disconnect(_on_card_gui_input)
	card.gui_input.connect(_on_discard_clicked.bind(card))

	await get_tree().process_frame
	_update_discard_layout()
	_update_turn_state()

func _add_to_meld(card: Card, meld_num: int, drop_position: Vector2) -> void:
	print("Adding to meld %d: %s" % [meld_num, card.get_card_name()])

	var target_container = meld1_container if meld_num == 1 else meld2_container
	var target_cards = meld1_cards if meld_num == 1 else meld2_cards

	var insert_index = _calculate_meld_insert_index(drop_position, meld_num)
	var saved_global_pos = card.global_position

	card.get_parent().remove_child(card)
	target_container.add_child(card)
	target_cards.insert(insert_index, card)

	card.set("layout_mode", 0)
	card.size_flags_horizontal = 0
	card.size_flags_vertical = 0
	card.position = saved_global_pos - target_container.global_position

	await get_tree().process_frame
	_update_meld_layout(meld_num)

func _return_to_hand(card: Card) -> void:
	var saved_global_pos = card.global_position
	card.get_parent().remove_child(card)
	hand_container.add_child(card)

	if original_hand_index != -1:
		hand_cards.insert(original_hand_index, card)
	else:
		hand_cards.append(card)

	card.set("layout_mode", 0)
	card.size_flags_horizontal = 0
	card.size_flags_vertical = 0
	card.position = saved_global_pos - hand_container.global_position
	card.z_index = 0

	await get_tree().process_frame
	_update_hand_layout()
	original_hand_index = -1

func _calculate_meld_insert_index(drop_position: Vector2, meld_num: int) -> int:
	var target_slot = meld1_slot if meld_num == 1 else meld2_slot
	var target_container = meld1_container if meld_num == 1 else meld2_container
	var target_cards = meld1_cards if meld_num == 1 else meld2_cards

	if target_cards.is_empty():
		return 0

	var local_pos = drop_position - target_container.global_position
	var total_width = target_cards.size() * (CARD_SIZE.x + MELD_CARD_SPACING) - MELD_CARD_SPACING
	var start_x = (target_slot.size.x - total_width) / 2

	for i in range(target_cards.size()):
		var card_x = start_x + i * (CARD_SIZE.x + MELD_CARD_SPACING)
		var card_center_x = card_x + CARD_SIZE.x / 2
		if local_pos.x < card_center_x:
			return i

	return target_cards.size()

func _update_deck_layout() -> void:
	var center_x = (deck_slot.size.x - CARD_SIZE.x) / 2
	var center_y = (deck_slot.size.y - CARD_SIZE.y) / 2
	for card in deck_cards:
		card.position = Vector2(center_x, center_y)
		card.z_index = 0

func _update_discard_layout() -> void:
	var center_x = (discard_slot.size.x - CARD_SIZE.x) / 2
	var center_y = (discard_slot.size.y - CARD_SIZE.y) / 2
	for i in range(discard_cards.size()):
		var card = discard_cards[i]
		card.position = Vector2(center_x, center_y)
		card.z_index = i

func _update_hand_layout() -> void:
	if hand_cards.is_empty():
		return

	var num_cards = hand_cards.size()
	var total_width = num_cards * (CARD_SIZE.x + HAND_CARD_SPACING) - HAND_CARD_SPACING
	var start_x = (hand_container.size.x - total_width) / 2
	var start_y = (hand_container.size.y - CARD_SIZE.y) / 2

	for i in range(num_cards):
		var card = hand_cards[i]
		var target_pos = Vector2(start_x + i * (CARD_SIZE.x + HAND_CARD_SPACING), start_y)
		var tween = create_tween()
		tween.tween_property(card, "position", target_pos, 0.2).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		card.z_index = 0

func _update_meld_layout(meld_num: int) -> void:
	var target_slot = meld1_slot if meld_num == 1 else meld2_slot
	var target_cards = meld1_cards if meld_num == 1 else meld2_cards

	if target_cards.is_empty():
		return

	var num_cards = target_cards.size()
	var total_width = num_cards * (CARD_SIZE.x + MELD_CARD_SPACING) - MELD_CARD_SPACING
	var start_x = (target_slot.size.x - total_width) / 2
	var start_y = (target_slot.size.y - CARD_SIZE.y) / 2

	for i in range(num_cards):
		var card = target_cards[i]
		var target_pos = Vector2(start_x + i * (CARD_SIZE.x + MELD_CARD_SPACING), start_y)
		var tween = create_tween()
		tween.tween_property(card, "position", target_pos, 0.2).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		card.z_index = 0

func _process(_delta: float) -> void:
	if dragging_card == null:
		return

	dragging_card.global_position = get_global_mouse_position() - drag_offset
	var card_center = dragging_card.global_position + CARD_SIZE / 2

	var meld1_rect = Rect2(meld1_slot.global_position, meld1_slot.size)
	if meld1_rect.has_point(card_center):
		var new_preview_index = _calculate_meld_insert_index(card_center, 1)
		if new_preview_index != drag_preview_index or drag_preview_meld != 1:
			drag_preview_index = new_preview_index
			drag_preview_meld = 1
			_update_meld_preview_layout(1)
		return

	var meld2_rect = Rect2(meld2_slot.global_position, meld2_slot.size)
	if meld2_rect.has_point(card_center):
		var new_preview_index = _calculate_meld_insert_index(card_center, 2)
		if new_preview_index != drag_preview_index or drag_preview_meld != 2:
			drag_preview_index = new_preview_index
			drag_preview_meld = 2
			_update_meld_preview_layout(2)
		return

	if drag_preview_index != -1:
		drag_preview_index = -1
		if drag_preview_meld == 1:
			_update_meld_layout(1)
		elif drag_preview_meld == 2:
			_update_meld_layout(2)
		drag_preview_meld = 0

func _update_meld_preview_layout(meld_num: int) -> void:
	var target_slot = meld1_slot if meld_num == 1 else meld2_slot
	var target_cards = meld1_cards if meld_num == 1 else meld2_cards

	var num_cards = target_cards.size() + 1
	var total_width = num_cards * (CARD_SIZE.x + MELD_CARD_SPACING) - MELD_CARD_SPACING
	var start_x = (target_slot.size.x - total_width) / 2
	var start_y = (target_slot.size.y - CARD_SIZE.y) / 2

	var visual_index = 0
	for i in range(target_cards.size()):
		if visual_index == drag_preview_index:
			visual_index += 1

		var card = target_cards[i]
		var target_pos = Vector2(start_x + visual_index * (CARD_SIZE.x + MELD_CARD_SPACING), start_y)
		var tween = create_tween()
		tween.tween_property(card, "position", target_pos, 0.1).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

		visual_index += 1
