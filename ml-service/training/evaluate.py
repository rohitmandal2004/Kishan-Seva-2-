import pandas as pd
import joblib

def evaluate_baseline():
    """
    Evaluates the current heuristic (current_queue_length * 4.5) against the actuals
    to show the improvement of the ML model.
    """
    df = pd.read_csv('dataset.csv')
    
    # Heuristic: 4.5 mins per person in queue
    heuristic_predictions = df['current_queue_length'] * 4.5
    
    # ML Model
    model = joblib.load('rf_model.pkl')
    df['is_raining'] = (df['rainfall_mm'] > 0).astype(int)
    features = [
        'day_of_week', 'hour_of_day', 'current_queue_length', 
        'currently_processing', 'prebooked_tokens', 
        'processing_rate_q_per_hr', 'is_raining'
    ]
    ml_predictions = model.predict(df[features])
    
    # Compare MAE
    heuristic_mae = abs(heuristic_predictions - df['actual_wait_time_mins']).mean()
    ml_mae = abs(ml_predictions - df['actual_wait_time_mins']).mean()
    
    print("=== Evaluation Report ===")
    print(f"Baseline Heuristic MAE : {heuristic_mae:.2f} mins")
    print(f"Random Forest MAE      : {ml_mae:.2f} mins")
    print(f"Improvement            : {(heuristic_mae - ml_mae) / heuristic_mae * 100:.1f}%")

if __name__ == "__main__":
    evaluate_baseline()
