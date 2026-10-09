import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the request body
    const bodyText = await req.text();
    let bodyJson = {};
    try {
        bodyJson = JSON.parse(bodyText);
    } catch(e) {
        console.error("Failed to parse JSON body:", bodyText);
    }
    
    // In case supabase client wrapped it in a 'body' key
    const payload = bodyJson.body ? bodyJson.body : bodyJson;
    
    const { operatorProfileId, email, assignedCentreId, fullName } = payload;

    if (!operatorProfileId || !email || !assignedCentreId) {
      return new Response(JSON.stringify({ 
          success: false, 
          error: 'Missing required fields', 
          receivedKeys: Object.keys(payload),
          received: payload
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 0. Generate Unique Operator ID
    const { data: centreData } = await supabaseClient
      .from('procurement_centres')
      .select('district')
      .eq('id', assignedCentreId)
      .single();
      
    const distCode = centreData?.district ? centreData.district.substring(0, 3).toUpperCase() : 'XXX';
    
    let operatorId = '';
    let isUnique = false;
    while (!isUnique) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      operatorId = `KSO-${distCode}-${randomNum}`;
      const { data: existing } = await supabaseClient
        .from('operator_profiles')
        .select('id')
        .eq('operator_id', operatorId)
        .maybeSingle();
      if (!existing) isUnique = true;
    }

    // 1. Create Clerk Account
    const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
    
    if (!clerkSecretKey) {
      throw new Error('CLERK_SECRET_KEY is missing from environment variables');
    }

    let clerkUserId = '';
    
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
    let generatedPassword = 'KSP';
    for (let i = 0; i < 6; i++) {
        generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const clerkResponse = await fetch('https://api.clerk.com/v1/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: [email],
        first_name: fullName?.split(' ')[0] || 'Operator',
        last_name: fullName?.split(' ').slice(1).join(' ') || '',
        password: generatedPassword,
        skip_password_checks: true,
        public_metadata: { role: 'OPERATOR' }
      }),
    });

    const clerkData = await clerkResponse.json();

    if (!clerkResponse.ok) {
      if (clerkData.errors?.[0]?.code === 'form_identifier_exists') {
        console.log('User already exists in Clerk, fetching user id...');
        // Fetch existing user
        const searchResponse = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`, {
           headers: { 'Authorization': `Bearer ${clerkSecretKey}` }
        });
        const searchData = await searchResponse.json();
        
        if (searchData && searchData.length > 0) {
            clerkUserId = searchData[0].id;
            
            await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${clerkSecretKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    public_metadata: { ...searchData[0].public_metadata, role: 'OPERATOR' },
                    password: generatedPassword,
                    skip_password_checks: true
                })
            });
        } else {
            return new Response(JSON.stringify({ success: false, error: 'Email exists but user not found in Clerk' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
            });
        }
      } else {
        console.error('Clerk Error:', clerkData);
        const clerkErrorMsg = clerkData.errors?.[0]?.message || 'Failed to provision Clerk account';
        return new Response(JSON.stringify({ success: false, error: clerkErrorMsg, details: clerkData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
    } else {
        clerkUserId = clerkData.id;
    }

    // 2. Generate Sign-In Token (Magic Link for setup)
    const ticketResponse = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: clerkUserId,
        expires_in_seconds: 604800 // 7 days
      }),
    });
    
    const ticketData = await ticketResponse.json();
    const ticketUrl = ticketResponse.ok ? ticketData.url : null;

    // 3. Update Supabase Profile
    const { error: updateError } = await supabaseClient
      .from('operator_profiles')
      .update({
        clerk_user_id: clerkUserId,
        operator_id: operatorId,
        credential_status: 'SETUP_REQUIRED',
        status: 'APPROVED'
      })
      .eq('id', operatorProfileId);

    if (updateError) {
      throw updateError;
    }

    // 4. Audit Log
    await supabaseClient.from('audit_logs').insert({
      actor_id: 'SYSTEM_ADMIN', 
      actor_role: 'ADMIN',
      action: 'OPERATOR_APPROVED',
      entity_type: 'operator_profile',
      entity_id: operatorProfileId,
      metadata: { operator_id: operatorId, email: email, center_id: assignedCentreId }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        clerkUserId, 
        operatorId,
        setupUrl: ticketUrl,
        password: generatedPassword
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
