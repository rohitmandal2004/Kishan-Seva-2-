from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import os
import json
import csv
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Kishan Seva ML Prediction Service")

# Setup Supabase client for logging predictions
url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

# Load model globally
model = None
try:
    # Assuming run from root of ml-service
    model = joblib.load('models/rf_model.pkl')
except Exception as e:
    print(f"Warning: Model could not be loaded. Ensure training script has been run. {e}")

# Load static centre features into memory to augment incoming prediction requests
centre_features = {}
try:
    csv_path = os.path.join("data", "centre_performance_features.csv")
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            centre_features[row['centre_id']] = {
                'historical_on_time_rate': float(row.get('historical_on_time_rate', 0.8)),
                'historical_processing_efficiency': float(row.get('historical_processing_efficiency', 0.8)),
                'slot_fill_rate': float(row.get('slot_fill_rate', 0.8))
            }
except Exception as e:
    print(f"Warning: Could not load centre performance features. {e}")

class PredictionRequest(BaseModel):
    centre_id: str
    day_of_week: int
    hour_of_day: int
    current_queue_length: int
    active_counters: int
    avg_quantity_qtl: int
    avg_service_time_min: int
    no_show_count: int
    weather_condition: str

@app.post("/predict_wait_time")
async def predict_wait_time(req: PredictionRequest):
    fallback_used = False
    
    # 1. Look up static centre features
    c_feat = centre_features.get(req.centre_id, {
        'historical_on_time_rate': 0.8,
        'historical_processing_efficiency': 0.8,
        'slot_fill_rate': 0.8
    })
    
    # One-hot encode weather based on new schema
    w_clear = 1 if req.weather_condition.lower() == 'clear' else 0
    w_cloudy = 1 if req.weather_condition.lower() == 'cloudy' else 0
    w_rain = 1 if req.weather_condition.lower() == 'rain' else 0
    
    # 2. Feature array construction for merged dataset schema
    # Order MUST match train_random_forest.py `features` list
    features = [
        req.day_of_week,
        req.hour_of_day,
        req.current_queue_length,
        req.active_counters,
        req.avg_quantity_qtl,
        req.avg_service_time_min,
        req.no_show_count,
        c_feat['historical_on_time_rate'],
        c_feat['historical_processing_efficiency'],
        c_feat['slot_fill_rate'],
        w_clear,
        w_cloudy,
        w_rain
    ]
    
    # 3. Prediction
    if model:
        try:
            # model expects 2D array
            predicted_wait = float(model.predict([features])[0])
        except Exception as e:
            # Fallback to heuristic if model prediction fails
            print(f"Prediction failed: {e}")
            predicted_wait = req.current_queue_length * 4.5
            fallback_used = True
    else:
        predicted_wait = req.current_queue_length * 4.5
        fallback_used = True
        
    predicted_wait = max(5.0, round(predicted_wait)) # Minimum 5 mins wait

    # 4. Log to DB (Fire-and-forget in real prod, but we'll await here)
    try:
        # Fetch active model version id
        model_version_id = None
        registry_res = supabase.table('model_registry').select('id').eq('is_active', True).execute()
        if registry_res.data:
            model_version_id = registry_res.data[0]['id']
            
        supabase.table('ml_predictions').insert({
            "centre_id": req.centre_id,
            "model_version_id": model_version_id,
            "features": req.model_dump(),
            "predicted_wait_mins": int(predicted_wait),
            "fallback_used": fallback_used
        }).execute()
    except Exception as e:
        print(f"Failed to log prediction to DB: {e}")

    return {
        "predicted_wait_mins": predicted_wait,
        "fallback_used": fallback_used,
        "model_version": "2.0.0" if not fallback_used else "heuristic"
    }
