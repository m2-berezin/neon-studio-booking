import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { user_id, amount, method } = await req.json();

    // Get user details
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user_id)
      .single();

    // Log the payment notification (SMS integration would go here)
    console.log('Payment notification:', {
      user: profile?.full_name,
      amount,
      method,
      timestamp: new Date().toISOString()
    });

    // TODO: Integrate with SMS provider (Twilio, Vonage, etc.)
    // Example with Twilio:
    // const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    // const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    // const TWILIO_PHONE = Deno.env.get('TWILIO_PHONE');
    // const ADMIN_PHONE = Deno.env.get('ADMIN_PHONE');
    //
    // const message = `Nova solicitação de pagamento: €${amount} de ${profile?.full_name}`;
    //
    // await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
    //     'Content-Type': 'application/x-www-form-urlencoded',
    //   },
    //   body: new URLSearchParams({
    //     To: ADMIN_PHONE,
    //     From: TWILIO_PHONE,
    //     Body: message
    //   })
    // });

    return new Response(
      JSON.stringify({ success: true, message: 'Notification logged' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
