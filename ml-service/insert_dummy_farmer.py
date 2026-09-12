import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load from frontend root
load_dotenv(dotenv_path="../.env")

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not url or not key:
    print("Missing Supabase credentials")
    exit(1)

supabase: Client = create_client(url, key)

dummy_farmer = {
    "id": "f1111111-1111-1111-1111-111111111111",
    "farmer_code": "DEMO-FMR-001",
    "full_name": "Demo Farmer",
    "phone": "+919999999999",
    "state": "West Bengal",
    "district": "North 24 Parganas",
    "village": "Demo Village",
    "land_area_acres": 5,
    "verification_status": "DEMO_VERIFIED",
    "role": "FARMER"
}

try:
    data = supabase.table("farmer_profiles").upsert(dummy_farmer).execute()
    print("Successfully inserted dummy farmer:")
    print(data)
except Exception as e:
    print("Error:", e)
