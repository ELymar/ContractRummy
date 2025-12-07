extends Control

@onready var status_label = $CenterContainer/VBoxContainer/StatusLabel

func _ready():
	print("Contract Rummy - Main scene loaded")
	status_label.text = "Godot 4.3 Test - Ready!"

func _on_test_button_pressed():
	print("Test button pressed")
	status_label.text = "Button works! ✓"
