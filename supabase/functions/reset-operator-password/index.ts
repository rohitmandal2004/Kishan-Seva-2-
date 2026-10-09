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

    const bodyText = await req.text();
    let bodyJson: any = {};
    try {
        bodyJson = JSON.parse(bodyText);
    } catch(e) {
        console.error("Failed to parse JSON body:", bodyText);
    }
    
    const payload = bodyJson.body ? bodyJson.body : bodyJson;
    const { operatorProfileId } = payload;

    if (!operatorProfileId) {
      return new Response(JSON.stringify({ success: false, error: 'Missing operatorProfileId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: profile } = await supabaseClient
      .from('operator_profiles')
      .select('clerk_user_id, operator_id, email, full_name, assigned_centre_id')
      .eq('id', operatorProfileId)
      .single();

    if (!profile || !profile.clerk_user_id) {
        return new Response(JSON.stringify({ success: false, error: 'Operator profile or Clerk user ID not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });
    }

    const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
    
    if (!clerkSecretKey) {
      throw new Error('CLERK_SECRET_KEY is missing');
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
    let generatedPassword = 'KSP';
    for (let i = 0; i < 6; i++) {
        generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Update password in Clerk
    const updateResponse = await fetch(`https://api.clerk.com/v1/users/${profile.clerk_user_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: generatedPassword,
        skip_password_checks: true
      }),
    });
    
    const updateData = await updateResponse.json();
    if (!updateResponse.ok) {
        throw new Error(updateData.errors?.[0]?.message || 'Failed to generate password');
    }

    let finalOperatorId = profile.operator_id;
    if (!finalOperatorId) {
       const distCode = profile.assigned_centre_id ? 'BAS' : 'BAS'; // fallback for district code
       const randomNum = Math.floor(1000 + Math.random() * 9000);
       finalOperatorId = `KSO-${distCode}-${randomNum}`;
    }

    // Update credential status and ID
    await supabaseClient
      .from('operator_profiles')
      .update({ credential_status: 'RESET_REQUIRED', operator_id: finalOperatorId })
      .eq('id', operatorProfileId);

    // Audit log
    await supabaseClient.from('audit_logs').insert({
      actor_id: 'SYSTEM_ADMIN', 
      actor_role: 'ADMIN',
      action: 'OPERATOR_PASSWORD_RESET',
      entity_type: 'operator_profile',
      entity_id: operatorProfileId,
      metadata: { operator_id: profile.operator_id, email: profile.email }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        password: generatedPassword,
        operatorId: finalOperatorId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error processing reset:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
