extends Control

const CardScene: PackedScene = preload("res://scenes/card/Card.tscn")

@onready var card_container: HBoxContainer = $CenterContainer/VBoxContainer/MeldSlot/Placeholder/CardContainer
@onready var placeholder: ColorRect = $CenterContainer/VBoxContainer/MeldSlot/Placeholder

func _ready():
	print("=== MELD TEST SCENE ===")
	print("Placeholder size: %s" % placeholder.size)
	print("CardContainer size: %s" % card_container.size)

	# Create 3 test cards
	var test_cards = [
		{"suit": "spades", "rank": "A"},
		{"suit": "hearts", "rank": "K"},
		{"suit": "diamonds", "rank": "Q"}
	]

	for data in test_cards:
		var card: Card = CardScene.instantiate()
		card.setup(data["suit"], data["rank"])
		card.set_face_up(true)
		card.set_display_size(Vector2(105, 147))  # 70% of 150x210
		card_container.add_child(card)
		print("Added card: %s" % card.get_card_name())

	# Wait for layout to update
	await get_tree().process_frame
	await get_tree().process_frame

	print("\n=== AFTER LAYOUT ===")
	print("Placeholder:")
	print("  position: %s" % placeholder.position)
	print("  size: %s" % placeholder.size)
	print("CardContainer:")
	print("  position: %s" % card_container.position)
	print("  size: %s" % card_container.size)
	print("  global_position: %s" % card_container.global_position)

	var i = 0
	for child in card_container.get_children():
		if child is Card:
			var card = child as Card
			print("\nCard %d (%s):" % [i, card.get_card_name()])
			print("  layout_mode: %s" % card.get("layout_mode"))
			print("  position: %s" % card.position)
			print("  size: %s" % card.size)
			print("  custom_minimum_size: %s" % card.custom_minimum_size)
			print("  global_position: %s" % card.global_position)
			print("  size_flags_horizontal: %s" % card.size_flags_horizontal)
			print("  size_flags_vertical: %s" % card.size_flags_vertical)
			i += 1
