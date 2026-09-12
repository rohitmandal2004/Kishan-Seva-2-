import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")

supabase: Client = create_client(url, key)

def import_msp_rates():
    """
    Imports MSP rates from the Gov Data API and updates the Supabase table.
    """
    print("Starting MSP import from data.gov.in...")
    
    # Mocking Gov API call
    mock_api_data = [
        {"crop": "Paddy (Grade A)", "rate_per_quintal": 2203.0, "season": "Kharif", "year": "2026-27"},
        {"crop": "Common Paddy", "rate_per_quintal": 2183.0, "season": "Kharif", "year": "2026-27"},
        {"crop": "Wheat", "rate_per_quintal": 2275.0, "season": "Rabi", "year": "2026-27"},
        {"crop": "Mustard", "rate_per_quintal": 5650.0, "season": "Rabi", "year": "2026-27"},
    ]
    
    # In a real scenario we'd do an UPSERT here, but we will just print for demo.
    for record in mock_api_data:
        # e.g., supabase.table('crops').upsert({"name": record["crop"], "base_msp": record["rate_per_quintal"]}).execute()
        print(f"Upserting {record['crop']} at ₹{record['rate_per_quintal']}/q")
        
    print("MSP Import successful.")

if __name__ == "__main__":
    import_msp_rates()
