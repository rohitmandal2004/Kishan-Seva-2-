import os
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")

supabase: Client = create_client(url, key)

def import_centres():
    """
    Imports new procurement centres from state Gov CSVs.
    """
    print("Loading centres from Gov CSV...")
    
    # Mocking a CSV load
    mock_csv_data = [
        {"name": "New Hub 1", "district": "Howrah", "latitude": 22.59, "longitude": 88.31, "capacity": 1000},
    ]
    
    for row in mock_csv_data:
        print(f"Upserting Centre {row['name']} in {row['district']}")
        # e.g., supabase.table('procurement_centres').upsert({...}).execute()
        
    print("Centre sync successful.")

if __name__ == "__main__":
    import_centres()
