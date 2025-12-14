extends Node

# Scene Manager - Handles all scene transitions
# Usage: SceneManager.change_scene("TitleScreen")

# Scene paths
const SCENES = {
	"Splash": "res://scenes/splash/Splash.tscn",
	"TitleScreen": "res://scenes/title/TitleScreen.tscn",
	"Rules": "res://scenes/rules/Rules.tscn",
	"Options": "res://scenes/options/Options.tscn",
	"About": "res://scenes/about/About.tscn",
	"GameSetup": "res://scenes/lobby/GameSetup.tscn",
	"JoinGame": "res://scenes/lobby/JoinGame.tscn",
	"GameScreen": "res://scenes/game/GameScreen.tscn",
	"CardTest": "res://scenes/main/Main.tscn",  # Keep our test scene
	"MeldTest": "res://scenes/test/MeldTest.tscn",  # Meld layout test
	"MeldDragTest": "res://scenes/test/MeldDragTest.tscn",  # Drag & drop test
	"HandMeldTest": "res://scenes/test/HandMeldTest.tscn"  # Hand to meld test
}

var current_scene: Node = null
var scene_history: Array[String] = []

func _ready():
	var root = get_tree().root
	current_scene = root.get_child(root.get_child_count() - 1)
	print("SceneManager initialized. Current scene: ", current_scene.name)

func change_scene(scene_name: String, add_to_history: bool = true):
	"""Change to a new scene by name"""
	if not SCENES.has(scene_name):
		push_error("Scene not found: " + scene_name)
		return

	var scene_path = SCENES[scene_name]
	print("Changing scene to: ", scene_name, " (", scene_path, ")")

	# Add current scene to history
	if add_to_history and current_scene:
		scene_history.append(current_scene.name)

	# Defer the actual scene change
	call_deferred("_deferred_change_scene", scene_path)

func _deferred_change_scene(scene_path: String):
	"""Actually perform the scene change (called deferred)"""
	# Free the current scene
	if current_scene:
		current_scene.free()

	# Load and instance the new scene
	var new_scene = load(scene_path).instantiate()

	# Add it to the tree
	get_tree().root.add_child(new_scene)
	get_tree().current_scene = new_scene
	current_scene = new_scene

	print("Scene changed to: ", current_scene.name)

func go_back():
	"""Go back to the previous scene"""
	if scene_history.size() > 0:
		var previous_scene = scene_history.pop_back()
		change_scene(previous_scene, false)
	else:
		print("No previous scene in history")

func clear_history():
	"""Clear the scene history"""
	scene_history.clear()

func get_current_scene_name() -> String:
	"""Get the name of the current scene"""
	if current_scene:
		return current_scene.name
	return ""
