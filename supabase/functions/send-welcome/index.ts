import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users without welcome messages
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id');

    if (!allUsers || allUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get Ghost Wayne admin
    const { data: ghostWayne } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!ghostWayne) {
      return new Response(
        JSON.stringify({ error: 'Ghost Wayne admin not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    let sent = 0;

    for (const user of allUsers) {
      // Check if user already has messages
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('recipient_id', user.id)
        .limit(1);

      if (existingMessages && existingMessages.length > 0) {
        continue; // Skip if user already has messages
      }

      // Send welcome message
      const welcomeMessage = `🎙️ Bem-vindo à 777Studios App!
Aqui podes fazer reservas, enviar beats para mistura e muito mais.
💬 Qualquer dúvida manda-me mensagem!`;

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: ghostWayne.id,
          recipient_id: user.id,
          receiver_role: null,
          body: welcomeMessage,
          thread_type: 'direct',
          attachments: {
            action: {
              label: '🎁 Ver Recompensas',
              url: '/rewards'
            }
          }
        });

      if (!error) {
        sent++;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Welcome messages sent successfully`,
        sent: sent,
        total: allUsers.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
