from flask import Flask, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

FPL_API_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"
FOOTBALL_API_URL = "https://v3.football.api-sports.io/players"
FOOTBALL_API_KEY = "YOUR_API_KEY_HERE"  # Replace with your actual API key

def get_fpl_data():
    response = requests.get(FPL_API_URL)
    return response.json()

def get_additional_stats(player_name, team_name):
    headers = {
        "x-rapidapi-host": "v3.football.api-sports.io",
        "x-rapidapi-key": FOOTBALL_API_KEY
    }
    params = {
        "search": player_name,
        "team": team_name,
        "league": "39",  # Premier League
        "season": "2023"  # Current season
    }
    response = requests.get(FOOTBALL_API_URL, headers=headers, params=params)
    data = response.json()
    if data['results'] > 0:
        player = data['response'][0]
        return {
            "shots_total": player['statistics'][0]['shots']['total'] or 0,
            "shots_on_target": player['statistics'][0]['shots']['on'] or 0,
        }
    return {}

@app.route('/api/players')
def get_players():
    fpl_data = get_fpl_data()
    players = fpl_data['elements']
    teams = {team['id']: team['name'] for team in fpl_data['teams']}
    
    combined_data = []
    for player in players[:20]:  # Limit to 20 players to avoid hitting API rate limits
        additional_stats = get_additional_stats(f"{player['first_name']} {player['second_name']}", teams[player['team']])
        player_data = {
            "id": player['id'],
            "name": f"{player['first_name']} {player['second_name']}",
            "team": teams[player['team']],
            "position": fpl_data['element_types'][player['element_type'] - 1]['singular_name'],
            "total_points": player['total_points'],
            "goals_scored": player['goals_scored'],
            "assists": player['assists'],
            "minutes": player['minutes'],
            "shots_total": additional_stats.get('shots_total', 0),
            "shots_on_target": additional_stats.get('shots_on_target', 0),
        }
        combined_data.append(player_data)
    
    return jsonify(combined_data)

if __name__ == '__main__':
    app.run(debug=True)