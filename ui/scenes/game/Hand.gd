extends Control
class_name Hand

# Hand configuration
const CARD_WIDTH = 60  # Smaller cards to fit layout
const CARD_HEIGHT = 84
const CARD_SPACING = 3  # Reduced spacing between cards

var cards: Array[Card] = []
var dragging_card: Card = null
var hover_index: int = -1

@onready var card_container: Control = $CardContainer

signal card_order_changed(new_order: Array[Card])

func _ready():
	pass

func add_card(card: Card):
	"""Add a card to the hand"""
	cards.append(card)
	card_container.add_child(card)

	# Connect card signals
	card.drag_started.connect(_on_card_drag_started)
	card.drag_ended.connect(_on_card_drag_ended)

	# Position the card
	_update_card_positions()

func remove_card(card: Card):
	"""Remove a card from the hand"""
	cards.erase(card)
	card_container.remove_child(card)
	_update_card_positions()

func clear_hand():
	"""Remove all cards"""
	for card in cards:
		card.queue_free()
	cards.clear()

func get_card_count() -> int:
	return cards.size()

func _update_card_positions(animate: bool = true):
	"""Update all card positions based on current order"""
	for i in range(cards.size()):
		var card = cards[i]
		if card == dragging_card:
			continue  # Don't reposition the card being dragged

		var target_pos = _get_slot_position(i)

		if animate:
			# Smooth animation to new position
			var tween = create_tween()
			tween.set_ease(Tween.EASE_OUT)
			tween.set_trans(Tween.TRANS_CUBIC)
			tween.tween_property(card, "position", target_pos, 0.2)
		else:
			card.position = target_pos

func _get_slot_position(index: int) -> Vector2:
	"""Calculate the position for a card at given index"""
	var x = index * (CARD_WIDTH + CARD_SPACING)
	var y = 0
	return Vector2(x, y)

func _on_card_drag_started(card: Card):
	"""Handle when a card starts being dragged"""
	dragging_card = card
	print("Hand: Drag started for ", card.get_card_name())

func _on_card_drag_ended(card: Card):
	"""Handle when a card is dropped"""
	dragging_card = null

	# Find the new index based on where the card was dropped
	var drop_x = card.global_position.x - card_container.global_position.x
	var new_index = _calculate_drop_index(drop_x)

	# Clamp to valid range
	new_index = clampi(new_index, 0, cards.size() - 1)

	var old_index = cards.find(card)

	if new_index != old_index:
		# Reorder the cards array
		cards.remove_at(old_index)
		cards.insert(new_index, card)

		# Reorder in scene tree
		card_container.move_child(card, new_index)

		print("Hand: Moved card from index %d to %d" % [old_index, new_index])
		card_order_changed.emit(cards)

	# Update all positions (including the dropped card)
	_update_card_positions(true)

func _calculate_drop_index(drop_x: float) -> int:
	"""Calculate which slot index the card should drop into"""
	# Find the slot closest to the drop position
	var slot_index = roundi(drop_x / (CARD_WIDTH + CARD_SPACING))
	return slot_index

func _process(_delta):
	"""Update card positions while dragging"""
	if dragging_card:
		# Calculate hover index (where the card would be inserted if dropped now)
		var drag_x = dragging_card.global_position.x - card_container.global_position.x
		var new_hover_index = _calculate_drop_index(drag_x)
		new_hover_index = clampi(new_hover_index, 0, cards.size() - 1)

		if new_hover_index != hover_index:
			hover_index = new_hover_index

			# Create temporary order to show preview
			var temp_cards = cards.duplicate()
			var old_index = temp_cards.find(dragging_card)

			if old_index != hover_index:
				temp_cards.remove_at(old_index)
				temp_cards.insert(hover_index, dragging_card)

				# Update positions of other cards (not the dragging card)
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
