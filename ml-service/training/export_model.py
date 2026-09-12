import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")

supabase: Client = create_client(url, key)

def export_model():
    # Read metrics
    with open('metrics.json', 'r') as f:
        metrics = json.load(f)
        
    features = [
        'day_of_week', 'hour_of_day', 'current_queue_length', 
        'currently_processing', 'prebooked_tokens', 
        'processing_rate_q_per_hr', 'is_raining'
    ]
    
    # In a real app, we would upload rf_model.pkl to a storage bucket here.
    # For now, we just register the metadata.
    
    print("Registering model in Supabase model_registry...")
    
    # Deactivate all existing Random Forest models
    supabase.table('model_registry').update({"is_active": False}).eq('model_name', 'wait_time_rf').execute()
    
    # Insert new model
    response = supabase.table('model_registry').insert({
        "model_name": "wait_time_rf",
        "version": "1.0.0",
        "algorithm": "RandomForestRegressor",
        "features_used": features,
        "metrics": metrics,
        "is_active": True,
        "artifact_path": "models/rf_model.pkl" # Placeholder for S3/GCS path
    }).execute()
    
    print(f"Model registered successfully! ID: {response.data[0]['id']}")

if __name__ == "__main__":
    export_model()
