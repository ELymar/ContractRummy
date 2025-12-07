extends Control

@onready var back_button = $VBoxContainer/BackButton

func _ready():
	print("Game Setup screen loaded")
	back_button.pressed.connect(_on_back_pressed)

func _on_back_pressed():
	SceneManager.change_scene("TitleScreen")
