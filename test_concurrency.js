import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve('c:/Users/rohit/OneDrive/Desktop/Kishan/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConcurrency() {
  console.log("Starting concurrency test for create_booking...");

  const { data: farmers, error: farmerErr } = await supabase.from('farmer_profiles').select('*').limit(1);
  if (farmerErr || !farmers || farmers.length === 0) {
    console.error("No farmers found.", farmerErr);
    return;
  }
  const farmer = farmers[0];

  const { data: centres, error: centreErr } = await supabase.from('procurement_centres').select('*').limit(1);
  if (centreErr || !centres || centres.length === 0) {
    console.error("No centres found.", centreErr);
    return;
  }
  const centre = centres[0];

  console.log(`Using Farmer: ${farmer.full_name} (${farmer.id})`);
  console.log(`Using Centre: ${centre.name} (${centre.id})`);

  const numRequests = 10;
  const slotDate = new Date().toISOString().split('T')[0];
  const slotTime = "10:00 AM - 11:00 AM";

  const promises = [];
  for (let i = 0; i < numRequests; i++) {
    promises.push(
      supabase.rpc('create_booking', {
        p_farmer_id: farmer.id,
        p_centre_id: centre.id,
        p_crop_name: 'Wheat',
        p_expected_quantity: 50 + i,
        p_slot_date: slotDate,
        p_slot_time: slotTime,
        p_vehicle_number: 'WB 25 B 4821',
        p_vehicle_type: 'Tractor Trolley'
      })
    );
  }

  const results = await Promise.allSettled(promises);
  
  let successes = 0;
  let failures = 0;
  
  results.forEach((res, idx) => {
    if (res.status === 'fulfilled' && !res.value.error) {
      successes++;
      console.log(`Request ${idx + 1}: SUCCESS`, res.value.data.token_number);
    } else {
      failures++;
      console.error(`Request ${idx + 1}: FAILED`, res.status === 'fulfilled' ? res.value.error : res.reason);
    }
  });

  console.log(`\nTest Complete: ${successes} successful, ${failures} failed.`);
}

testConcurrency();
