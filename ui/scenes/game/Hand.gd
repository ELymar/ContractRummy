extends Control
class_name Hand

# Hand configuration
const CARD_SCALE := 0.7
const MIN_CARD_SPACING := 4.0
const SPACING_RATIO := 0.12

var card_size: Vector2 = Vector2(Card.CARD_WIDTH, Card.CARD_HEIGHT) * CARD_SCALE
var cards: Array[Card] = []
var dragging_card: Card = null
var hover_index: int = -1
var _current_spacing: float = 0.0
var _current_start_x: float = 0.0
var _current_y: float = 0.0
var _layout_update_queued: bool = false
var _layout_should_animate: bool = false

@onready var card_container: Control = $CardContainer

signal card_order_changed(new_order: Array[Card])

func _ready():
	card_container.resized.connect(_on_container_resized)
	_queue_layout_update()

func add_card(card: Card):
	"""Add a card to the hand"""
	card.set_display_size(card_size)
	cards.append(card)
	card_container.add_child(card)

	# Use manual positioning for hand cards
	card.set_meta("layout_mode_backup", card.get("layout_mode"))
	card.set("layout_mode", 0)  # Position mode for manual placement

	card.drag_started.connect(_on_card_drag_started)
	card.drag_ended.connect(_on_card_drag_ended)

	_queue_layout_update()

func remove_card(card: Card):
	"""Remove a card from the hand"""
	cards.erase(card)
	card_container.remove_child(card)
	_queue_layout_update()

func clear_hand():
	"""Remove all cards"""
	for card in cards:
		card.queue_free()
	cards.clear()
	_queue_layout_update()

func get_card_count() -> int:
	return cards.size()

func _update_card_positions(animate: bool = true):
	"""Update all card positions based on current order"""
	var count := cards.size()
	if count == 0:
		return

	_current_spacing = _calculate_spacing(count)
	_current_start_x = _calculate_start_x(count, _current_spacing)
	_current_y = max(0.0, (card_container.size.y - card_size.y) * 0.5)

	for i in range(count):
		var card = cards[i]
		if card == dragging_card:
			continue

		var target_pos = _get_slot_position(i)

		if animate:
			var tween = create_tween()
			tween.set_ease(Tween.EASE_OUT)
			tween.set_trans(Tween.TRANS_CUBIC)
			tween.tween_property(card, "position", target_pos, 0.2)
		else:
			card.position = target_pos

func _get_slot_position(index: int) -> Vector2:
	# Calculate the slot's left edge
	var slot_x = _current_start_x + index * (card_size.x + _current_spacing)
	# Center the card within the available slot width by adding half the spacing
	# This assumes each slot has width of (card_size.x + spacing)
	# and we want the card centered in that space
	return Vector2(slot_x, _current_y)

func _on_card_drag_started(card: Card):
	"""Handle when a card starts being dragged"""
	dragging_card = card
	print("Hand: Drag started for ", card.get_card_name())

func _on_card_drag_ended(card: Card):
	"""Handle when a card is dropped"""
	dragging_card = null

	var drop_x = card.global_position.x - card_container.global_position.x
	var new_index = _calculate_drop_index(drop_x)
	new_index = clampi(new_index, 0, cards.size() - 1)

	var old_index = cards.find(card)

	if new_index != old_index:
		cards.remove_at(old_index)
		cards.insert(new_index, card)
		card_container.move_child(card, new_index)
		print("Hand: Moved card from index %d to %d" % [old_index, new_index])
		card_order_changed.emit(cards)

	_update_card_positions(true)

func _calculate_drop_index(drop_x: float) -> int:
	var count := cards.size()
	if count == 0:
		return 0

	var slot_width := card_size.x + _current_spacing
	if slot_width <= 0.0:
		return 0

	var relative_x := drop_x - _current_start_x
	if relative_x <= 0.0:
		return 0

	return roundi(relative_x / slot_width)

func _process(_delta):
	"""Update card positions while dragging"""
	if dragging_card:
		var drag_x = dragging_card.global_position.x - card_container.global_position.x
		var new_hover_index = _calculate_drop_index(drag_x)
		new_hover_index = clampi(new_hover_index, 0, cards.size() - 1)

		if new_hover_index != hover_index:
			hover_index = new_hover_index

			var temp_cards = cards.duplicate()
			var old_index = temp_cards.find(dragging_card)

			if old_index != hover_index:
				temp_cards.remove_at(old_index)
				temp_cards.insert(hover_index, dragging_card)

				for i in range(temp_cards.size()):
					var card = temp_cards[i]
					if card != dragging_card:
						var target_pos = _get_slot_position(i)
						var tween = create_tween()
						tween.set_ease(Tween.EASE_OUT)
						tween.set_trans(Tween.TRANS_CUBIC)
						tween.tween_property(card, "position", target_pos, 0.15)

func get_selected_cards() -> Array[Card]:
	"""Get all currently selected cards"""
	var selected: Array[Card] = []
	for card in cards:
		if card.is_selected:
			selected.append(card)
	return selected

func deselect_all():
	"""Deselect all cards"""
	for card in cards:
		if card.is_selected:
			card.set_selected(false)

func set_card_size(size: Vector2) -> void:
	card_size = size
	for card in cards:
		card.set_display_size(size)
	_queue_layout_update()

func _calculate_spacing(count: int) -> float:
	if count <= 1:
		return 0.0

	var base_spacing: float = max(MIN_CARD_SPACING, card_size.x * SPACING_RATIO)
	var available_width: float = max(0.0, card_container.size.x - card_size.x * count)
	if available_width <= 0.0:
		return 0.0

	var max_spacing: float = available_width / float(count - 1)
	return min(base_spacing, max_spacing)

func _calculate_start_x(count: int, spacing: float) -> float:
	var total_width := card_size.x * count + spacing * (count - 1)
	return max(0.0, (card_container.size.x - total_width) * 0.5)

func _on_container_resized():
	_queue_layout_update()

func _notification(what):
	if what == NOTIFICATION_RESIZED:
		_queue_layout_update()

func _queue_layout_update(animate: bool = false) -> void:
	_layout_should_animate = _layout_should_animate or animate
	if _layout_update_queued:
		return
	_layout_update_queued = true
	call_deferred("_run_layout_update")

func _run_layout_update() -> void:
	_layout_update_queued = false
	if not is_inside_tree():
		return
	if card_container.size.x <= 0.0 or card_container.size.y <= 0.0:
		_queue_layout_update(_layout_should_animate)
		return
	var animate := _layout_should_animate
	_layout_should_animate = false
	_update_card_positions(animate)
