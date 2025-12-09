extends Control

const HAND_SIDE_PADDING := 32.0
const HAND_SPACING_RATIO := 0.12
const CARD_SIZE_SCALE := 0.7
const CARD_WIDTH_MAX := Card.DEFAULT_CARD_SIZE.x * CARD_SIZE_SCALE
const CARD_HEIGHT_MAX := Card.DEFAULT_CARD_SIZE.y * CARD_SIZE_SCALE
const CARD_WIDTH_MIN := Card.DEFAULT_CARD_SIZE.x * 0.45
const CARD_HEIGHT_MIN := Card.DEFAULT_CARD_SIZE.y * 0.45
const HEIGHT_TABLE_RATIO := 0.45
const HEIGHT_OPPONENT_RATIO := 0.28
const HEIGHT_MARGIN_RATIO := 0.18

const CardScene: PackedScene = preload("res://scenes/card/Card.tscn")

@onready var margin_container: MarginContainer = $MarginContainer
@onready var main_layout: VBoxContainer = $MarginContainer/MainLayout
@onready var opponent_area: VBoxContainer = $MarginContainer/MainLayout/OpponentArea
@onready var opponent_hand_container: HBoxContainer = $MarginContainer/MainLayout/OpponentArea/OpponentHand
@onready var opponent_meld_row1: HBoxContainer = $MarginContainer/MainLayout/OpponentArea/OpponentMelds/MeldRow1
@onready var opponent_meld_row2: HBoxContainer = $MarginContainer/MainLayout/OpponentArea/OpponentMelds/MeldRow2
@onready var opponent_meld_row3: HBoxContainer = $MarginContainer/MainLayout/OpponentArea/OpponentMelds/MeldRow3
@onready var table_area: HBoxContainer = $MarginContainer/MainLayout/TableArea
@onready var deck_container: Control = $MarginContainer/MainLayout/TableArea/LeftSide/DeckArea/DeckContainer
@onready var discard_container: Control = $MarginContainer/MainLayout/TableArea/LeftSide/DiscardArea/DiscardContainer
@onready var player_meld_row1: HBoxContainer = $MarginContainer/MainLayout/TableArea/RightSide/PlayerMelds/MeldRow1
@onready var player_meld_row2: HBoxContainer = $MarginContainer/MainLayout/TableArea/RightSide/PlayerMelds/MeldRow2
@onready var player_meld_row3: HBoxContainer = $MarginContainer/MainLayout/TableArea/RightSide/PlayerMelds/MeldRow3
@onready var player_hand_area: VBoxContainer = $MarginContainer/MainLayout/PlayerHandArea
@onready var player_hand: Hand = $MarginContainer/MainLayout/PlayerHandArea/PlayerHand
@onready var player_hand_container: Control = player_hand.get_node("CardContainer")

var current_card_size: Vector2 = Vector2(Card.DEFAULT_CARD_SIZE.x, Card.DEFAULT_CARD_SIZE.y) * CARD_SIZE_SCALE
var _scaling_update_queued: bool = false

func _ready():
	print("Game Screen loaded - Building layout")
	_setup_test_game()
	_setup_responsive_layout()
	_schedule_scaling_update()

func _setup_responsive_layout() -> void:
	resized.connect(_on_layout_resized)
	margin_container.resized.connect(_on_layout_resized)
	player_hand_container.resized.connect(_on_layout_resized)
	opponent_hand_container.resized.connect(_on_layout_resized)
	table_area.resized.connect(_on_layout_resized)
	player_meld_row1.resized.connect(_on_layout_resized)
	opponent_meld_row1.resized.connect(_on_layout_resized)

	player_hand_container.child_entered_tree.connect(_on_cards_changed)
	player_hand_container.child_exiting_tree.connect(_on_cards_changed)
	opponent_hand_container.child_entered_tree.connect(_on_cards_changed)
	opponent_hand_container.child_exiting_tree.connect(_on_cards_changed)
	opponent_meld_row1.child_entered_tree.connect(_on_cards_changed)
	opponent_meld_row1.child_exiting_tree.connect(_on_cards_changed)
	opponent_meld_row2.child_entered_tree.connect(_on_cards_changed)
	opponent_meld_row2.child_exiting_tree.connect(_on_cards_changed)
	opponent_meld_row3.child_entered_tree.connect(_on_cards_changed)
	opponent_meld_row3.child_exiting_tree.connect(_on_cards_changed)
	player_meld_row1.child_entered_tree.connect(_on_cards_changed)
	player_meld_row1.child_exiting_tree.connect(_on_cards_changed)
	player_meld_row2.child_entered_tree.connect(_on_cards_changed)
	player_meld_row2.child_exiting_tree.connect(_on_cards_changed)
	player_meld_row3.child_entered_tree.connect(_on_cards_changed)
	player_meld_row3.child_exiting_tree.connect(_on_cards_changed)

func _on_layout_resized() -> void:
	_schedule_scaling_update()

func _on_cards_changed(_child: Node) -> void:
	_schedule_scaling_update()

func _schedule_scaling_update() -> void:
	if _scaling_update_queued:
		return
	_scaling_update_queued = true
	call_deferred("_run_scaling_update")

func _run_scaling_update() -> void:
	_scaling_update_queued = false
	_update_card_scaling()

func _update_card_scaling() -> void:
	if not is_inside_tree():
		return

	var target_size: Vector2 = _calculate_card_size()
	if target_size == Vector2.ZERO:
		return

	_apply_card_size(target_size)

func _calculate_card_size() -> Vector2:
	var width_candidates: Array[float] = [
		_usable_width(player_hand_container),
		_usable_width(opponent_hand_container),
		_usable_width(player_meld_row1),
		_usable_width(opponent_meld_row1)
	]
	var available_width: float = _min_positive(width_candidates)
	if available_width <= 0.0:
		return Vector2.ZERO

	var card_count: int = max(1, player_hand.get_card_count())
	var spacing_ratio: float = HAND_SPACING_RATIO
	var denom_spacing: int = max(0, card_count - 1)
	var denominator: float = float(card_count) + float(denom_spacing) * spacing_ratio
	if denominator <= 0.0:
		return Vector2.ZERO

	var card_width: float = available_width / denominator
	card_width = clamp(card_width, CARD_WIDTH_MIN, CARD_WIDTH_MAX)

	var height_from_width: float = card_width / Card.CARD_ASPECT_RATIO
	var height_candidates: Array[float] = [
		player_hand_container.size.y,
		table_area.size.y * HEIGHT_TABLE_RATIO,
		opponent_area.size.y * HEIGHT_OPPONENT_RATIO,
		main_layout.size.y * HEIGHT_MARGIN_RATIO
	]
	height_candidates = height_candidates.filter(func(value): return value > 0.0)
	if not height_candidates.is_empty():
		height_from_width = min(height_from_width, height_candidates.min())

	var card_height: float = clamp(height_from_width, CARD_HEIGHT_MIN, CARD_HEIGHT_MAX)
	var adjusted_width: float = card_height * Card.CARD_ASPECT_RATIO
	return Vector2(adjusted_width, card_height)

func _min_positive(values: Array[float]) -> float:
	var result: float = INF
	for value in values:
		if value > 0.0 and value < result:
			result = value
	return 0.0 if result == INF else result

func _usable_width(ctrl: Control) -> float:
	if ctrl == null:
		return 0.0
	var width_with_padding: float = ctrl.size.x - HAND_SIDE_PADDING * 2.0
	if width_with_padding <= 0.0:
		return 0.0
	return width_with_padding

func _apply_card_size(size: Vector2) -> void:
	current_card_size = size
	player_hand.set_card_size(size)

	var cards: Array = get_tree().get_nodes_in_group(Card.CARD_GROUP)
	for card in cards:
		(card as Card).set_display_size(size)

	_update_pile_layout(deck_container)
	_update_pile_layout(discard_container)
	_update_placeholder_sizes()

func _update_pile_layout(container: Control) -> void:
	if container == null:
		return
	container.custom_minimum_size = current_card_size
	for child in container.get_children():
		if child is Card:
			var card: Card = child as Card
			card.set_display_size(current_card_size)
			card.position = _center_in_container(container, current_card_size)
		elif child is Label:
			var label: Label = child as Label
			label.position = current_card_size * 0.08

func _update_placeholder_sizes() -> void:
	var containers: Array = [
		opponent_meld_row1,
		opponent_meld_row2,
		opponent_meld_row3,
		player_meld_row1,
		player_meld_row2,
		player_meld_row3
	]
	for container in containers:
		for child in container.get_children():
			if child is ColorRect:
				(child as ColorRect).custom_minimum_size = current_card_size

func _center_in_container(container: Control, size: Vector2) -> Vector2:
	var reference_size: Vector2 = container.size
	if reference_size == Vector2.ZERO:
		reference_size = container.custom_minimum_size
	return Vector2(
		max(0.0, (reference_size.x - size.x) * 0.5),
		max(0.0, (reference_size.y - size.y) * 0.5)
	)

func _setup_test_game():
	"""Set up a test game with sample cards"""

	_create_opponent_hand(7)
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

	_create_deck_pile()
	_create_discard_pile("hearts", "9")

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

	_create_player_hand([
		{"suit": "hearts", "rank": "K"},
		{"suit": "clubs", "rank": "K"},
		{"suit": "clubs", "rank": "10"},
		{"suit": "spades", "rank": "10"},
		{"suit": "diamonds", "rank": "10"},
		{"suit": "hearts", "rank": "9"},
		{"suit": "hearts", "rank": "4"}
	])

func _create_opponent_hand(card_count: int) -> void:
	for i in range(card_count):
		var card: Card = _instantiate_card()
		card.set_face_up(false)
		opponent_hand_container.add_child(card)
	if card_count > 0:
		_schedule_scaling_update()

func _create_test_meld(container: HBoxContainer, card_data: Array) -> void:
	for data in card_data:
		var card: Card = _instantiate_card()
		card.setup(data["suit"], data["rank"])
		card.set_face_up(true)
		container.add_child(card)
	if card_data.size() > 0:
		_schedule_scaling_update()

func _create_deck_pile() -> void:
	var card: Card = _instantiate_card()
	card.set_face_up(false)
	deck_container.add_child(card)

	var count_label: Label = Label.new()
	count_label.name = "CountLabel"
	count_label.text = "52"
	count_label.add_theme_font_size_override("font_size", 12)
	count_label.add_theme_color_override("font_color", Color.WHITE)
	count_label.add_theme_color_override("font_outline_color", Color.BLACK)
	count_label.add_theme_constant_override("outline_size", 2)
	deck_container.add_child(count_label)
	_schedule_scaling_update()

func _create_discard_pile(suit: String, rank: String) -> void:
	var card: Card = _instantiate_card()
	card.setup(suit, rank)
	card.set_face_up(true)
	discard_container.add_child(card)
	_schedule_scaling_update()

func _create_player_hand(card_data: Array) -> void:
	for data in card_data:
		var card: Card = _instantiate_card()
		card.setup(data["suit"], data["rank"])
		card.set_face_up(true)
		player_hand.add_card(card)
	if card_data.size() > 0:
		_schedule_scaling_update()

func _instantiate_card() -> Card:
	var card: Card = CardScene.instantiate()
	card.set_display_size(current_card_size)
	return card

func _create_meld_slot(container: HBoxContainer) -> void:
	var slot = ColorRect.new()
	slot.custom_minimum_size = current_card_size
	slot.color = Color(0, 0, 0, 0.1)
	container.add_child(slot)
