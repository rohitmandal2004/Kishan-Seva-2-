import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const dummyFarmer = {
    id: 'f1111111-1111-1111-1111-111111111111',
    farmer_code: 'DEMO-FMR-001',
    full_name: 'Demo Farmer',
    phone: '+919999999999',
    state: 'West Bengal',
    district: 'North 24 Parganas',
    village: 'Demo Village',
    land_area_acres: 5,
    verification_status: 'DEMO_VERIFIED',
    role: 'FARMER'
  };

  const { data, error } = await supabase
    .from('farmer_profiles')
    .upsert(dummyFarmer)
    .select();

  if (error) {
    console.error("Error inserting dummy farmer:", error);
  } else {
    console.log("Successfully inserted/updated dummy farmer:", data);
  }
}

main();
