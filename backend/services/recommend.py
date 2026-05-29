import pickle
import pandas as pd
import json
import sys
import os

# Get user ID from command line
user_id = sys.argv[1]

# Path to your model and ratings file
model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'dj_model.pkl')
ratings_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'ratings.csv')

# Load model and data
with open(model_path, 'rb') as f:
    model = pickle.load(f)

df = pd.read_csv(ratings_path)

def get_recommendations(user_id, n=5):
    # Get all unique songs
    all_songs = df["song_id"].unique()
    
    # Get songs user already played
    played = df[df["user_id"] == user_id]["song_id"].values
    
    # Only recommend songs user hasn't played
    unplayed = [s for s in all_songs if s not in played]
    
    # Predict ratings for unplayed songs
    predictions = [model.predict(user_id, song) for song in unplayed]
    predictions.sort(key=lambda x: x.est, reverse=True)
    
    # Return top n song IDs
    return [p.iid for p in predictions[:n]]

# Get recommendations
recommendations = get_recommendations(user_id, 5)
print(json.dumps(recommendations))