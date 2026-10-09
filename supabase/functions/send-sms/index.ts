import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Initialize Supabase Client if needed, or Twilio
// import { Twilio } from "npm:twilio@4.19.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, message } = await req.json()

    if (!phone || !message) {
      throw new Error("Missing phone or message")
    }

    // In a real environment, you would use Twilio or MSG91 here:
    // const twilioClient = new Twilio(Deno.env.get('TWILIO_ACCOUNT_SID'), Deno.env.get('TWILIO_AUTH_TOKEN'));
    // await twilioClient.messages.create({
    //   body: message,
    //   from: Deno.env.get('TWILIO_PHONE_NUMBER'),
    //   to: phone
    // });

    console.log(`[Supabase Edge Function] Sending SMS to ${phone}: ${message}`);

    return new Response(
      JSON.stringify({ success: true, message: "SMS dispatched successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
