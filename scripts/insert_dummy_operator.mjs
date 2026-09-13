import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createDummyOperator() {
  const email = 'rohitmandal0804@gmail.com';

  console.log(`Checking if operator exists for email: ${email}`);
  
  // 1. Check if operator already exists
  const { data: existingOperator } = await supabase
    .from('operator_profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (existingOperator) {
    console.log('Operator profile already exists.');
    return;
  }

  // 2. Fetch a centre to associate with the operator
  const { data: centre, error: centreErr } = await supabase
    .from('procurement_centres')
    .select('id')
    .limit(1)
    .single();

  if (centreErr || !centre) {
    console.error('Could not find a procurement centre to associate with the operator.', centreErr);
    return;
  }

  console.log(`Associating operator with centre ID: ${centre.id}`);

  // 3. Insert operator
  const { data: operator, error: insertErr } = await supabase
    .from('operator_profiles')
    .insert({
      operator_code: `OP-${Math.floor(1000 + Math.random() * 9000)}`,
      full_name: 'Rohit Mandal (Operator)',
      phone: '9876543210',
      email: email,
      centre_id: centre.id,
      role_designation: 'Quality & Weighbridge In-charge',
      status: 'ACTIVE'
    })
    .select()
    .single();

  if (insertErr) {
    console.error('Failed to insert operator:', insertErr);
  } else {
    console.log('Successfully created operator profile:', operator);
  }
}

createDummyOperator();
