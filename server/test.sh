# Game server at localhost:3000/api

# Post new game
echo "POST /api/games"
gameCode=$(curl -X POST -H "Content-Type: application/json" -d '{"name":"test"}' http://localhost:3000/api/games | jq -r '.gameCode')
echo "Created game with code: $gameCode"
