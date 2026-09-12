import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import json

def train():
    # Ensure working directory is ml-service
    if os.path.basename(os.getcwd()) != "ml-service":
        if os.path.exists("ml-service"):
            os.chdir("ml-service")
            
    dataset_path = os.path.join("data", "dataset_merged.csv")
    if not os.path.exists(dataset_path):
        dataset_path = "dataset_merged.csv"
        
    df = pd.read_csv(dataset_path)
    print(f"Loaded {len(df)} rows for training.")
    
    # Feature engineering
    # One-hot encode weather_condition
    if 'weather_condition' in df.columns:
        df = pd.get_dummies(df, columns=['weather_condition'], drop_first=False)
        
    # We want standard columns to exist. If not, add them as 0 for model consistency
    expected_weather_cols = ['weather_condition_clear', 'weather_condition_cloudy', 'weather_condition_rain']
    for col in expected_weather_cols:
        if col not in df.columns:
            df[col] = 0
            
    # List of training features
    features = [
        'day_of_week', 'hour', 'queue_length', 
        'active_counters', 'avg_quantity_qtl', 
        'avg_service_time_min', 'no_show_count',
        'historical_on_time_rate', 'historical_processing_efficiency', 
        'slot_fill_rate',
        'weather_condition_clear', 'weather_condition_cloudy', 'weather_condition_rain'
    ]
    
    # Ensure all features exist in dataframe
    missing_features = [f for f in features if f not in df.columns]
    if missing_features:
        print(f"Warning: Missing features in dataset: {missing_features}")
        for missing in missing_features:
            df[missing] = 0 # Fallback
            
    X = df[features]
    y = df['observed_wait_time_min']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)
    model.fit(X_train, y_train)
    
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print(f"Model trained! MAE: {mae:.2f} mins, R2: {r2:.2f}")
    
    # Feature Importance
    importances = model.feature_importances_
    for name, imp in sorted(zip(features, importances), key=lambda x: x[1], reverse=True):
        print(f"{name}: {imp:.4f}")
    
    # Save model and metrics
    if not os.path.exists("models"):
        os.makedirs("models")
        
    model_path = os.path.join("models", "rf_model.pkl")
    joblib.dump(model, model_path)
    
    metrics_path = os.path.join("models", "metrics.json")
    with open(metrics_path, 'w') as f:
        json.dump({"mae": mae, "r2": r2, "rmse": np.sqrt(np.mean((y_test - predictions)**2))}, f)
        
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train()
