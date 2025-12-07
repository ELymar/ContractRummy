extends Control

const SPLASH_DURATION = 2.0  # seconds

func _ready():
	print("Splash screen loaded")

	# Auto-advance to title screen after delay
	await get_tree().create_timer(SPLASH_DURATION).timeout
	SceneManager.change_scene("TitleScreen")
