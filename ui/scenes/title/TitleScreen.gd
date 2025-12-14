extends Control

@onready var new_game_button = $CenterContainer/VBoxContainer/ButtonContainer/NewGameButton
@onready var join_game_button = $CenterContainer/VBoxContainer/ButtonContainer/JoinGameButton
@onready var rules_button = $CenterContainer/VBoxContainer/ButtonContainer/RulesButton
@onready var options_button = $CenterContainer/VBoxContainer/ButtonContainer/OptionsButton
@onready var about_button = $CenterContainer/VBoxContainer/ButtonContainer/AboutButton
@onready var card_test_button = $CenterContainer/VBoxContainer/ButtonContainer/CardTestButton
@onready var game_screen_button = $CenterContainer/VBoxContainer/ButtonContainer/GameScreenButton
@onready var meld_drag_test_button = $CenterContainer/VBoxContainer/ButtonContainer/MeldDragTestButton

func _ready():
	print("Title screen loaded")

	# Connect button signals
	new_game_button.pressed.connect(_on_new_game_pressed)
	join_game_button.pressed.connect(_on_join_game_pressed)
	rules_button.pressed.connect(_on_rules_pressed)
	options_button.pressed.connect(_on_options_pressed)
	about_button.pressed.connect(_on_about_pressed)
	card_test_button.pressed.connect(_on_card_test_pressed)
	game_screen_button.pressed.connect(_on_game_screen_pressed)
	meld_drag_test_button.pressed.connect(_on_meld_drag_test_pressed)

func _on_new_game_pressed():
	print("New Game clicked")
	SceneManager.change_scene("GameSetup")

func _on_join_game_pressed():
	print("Join Game clicked")
	SceneManager.change_scene("JoinGame")

func _on_rules_pressed():
	print("Rules clicked")
	SceneManager.change_scene("Rules")

func _on_options_pressed():
	print("Options clicked")
	SceneManager.change_scene("Options")

func _on_about_pressed():
	print("About clicked")
	SceneManager.change_scene("About")

func _on_card_test_pressed():
	print("Card Test clicked")
	SceneManager.change_scene("CardTest")

func _on_game_screen_pressed():
	print("Game Screen clicked")
	SceneManager.change_scene("GameScreen")

func _on_meld_drag_test_pressed():
	print("Meld Drag Test clicked")
	SceneManager.change_scene("MeldDragTest")
