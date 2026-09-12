import os
import pandas as pd

def build_merged_dataset():
    """
    Merges queue events with centre performance features to build a rich
    training dataset for the wait-time prediction model.
    """
    print("Building merged dataset from CSV files...")
    
    # Load primary event data
    events_path = os.path.join("data", "queue_events_training.csv")
    if not os.path.exists(events_path):
        events_path = os.path.join("..", "data", "queue_events_training.csv")
        
    events_df = pd.read_csv(events_path)
    print(f"Loaded {len(events_df)} queue events.")
    
    # Load centre performance static features
    centre_path = os.path.join("data", "centre_performance_features.csv")
    if not os.path.exists(centre_path):
        centre_path = os.path.join("..", "data", "centre_performance_features.csv")
        
    centre_df = pd.read_csv(centre_path)
    print(f"Loaded {len(centre_df)} centre profiles.")
    
    # Merge datasets on centre_id
    merged_df = pd.merge(events_df, centre_df, on="centre_id", how="left")
    
    # Feature Engineering
    # 1. Parse timestamp to extract day of week (0=Monday, 6=Sunday)
    merged_df['event_timestamp'] = pd.to_datetime(merged_df['event_timestamp'])
    merged_df['day_of_week'] = merged_df['event_timestamp'].dt.dayofweek
    
    # 2. Fill missing numerical values with medians if any
    num_cols = ['queue_length', 'active_counters', 'avg_quantity_qtl', 
                'avg_service_time_min', 'hour', 'no_show_count',
                'historical_on_time_rate', 'historical_processing_efficiency', 
                'slot_fill_rate']
    for col in num_cols:
        if col in merged_df.columns:
            merged_df[col] = merged_df[col].fillna(merged_df[col].median())
            
    # 3. Handle categorical 'weather_condition'
    # We will let the Random Forest script handle one-hot encoding or do it here
    
    # Export merged dataset
    output_path = os.path.join("data", "dataset_merged.csv")
    if not os.path.exists("data"):
        output_path = "dataset_merged.csv"
        
    merged_df.to_csv(output_path, index=False)
    print(f"Dataset successfully merged and saved to {output_path} with {len(merged_df)} records.")
    
    return merged_df

if __name__ == "__main__":
    # Ensure working directory is ml-service
    if os.path.basename(os.getcwd()) != "ml-service":
        if os.path.exists("ml-service"):
            os.chdir("ml-service")
            
    build_merged_dataset()
