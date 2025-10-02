import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    console.log('🚀 Starting to send welcome messages to existing users...');

    // Get Ghost Wayne (primeiro admin)
    const { data: ghostWayne, error: adminError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (adminError || !ghostWayne) {
      console.error('❌ Ghost Wayne not found:', adminError);
      return new Response(
        JSON.stringify({ error: 'Ghost Wayne admin not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Found Ghost Wayne:', ghostWayne.full_name, ghostWayne.id);

    // Get all users who DON'T have any messages yet (excluding admins)
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .neq('role', 'admin');

    if (usersError || !allUsers) {
      console.error('❌ Error fetching users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${allUsers.length} total users`);

    // Filter users who already have messages
    const usersToSend = [];
    for (const user of allUsers) {
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('recipient_id', user.id)
        .limit(1);

      if (!existingMessages || existingMessages.length === 0) {
        usersToSend.push(user);
      }
    }

    console.log(`📨 Sending welcome messages to ${usersToSend.length} users without messages`);

    const firstMessage = `🎧 Bem-vindo à 7T7Studios App, esta é a minha visão para a interação entre a música e a tecnologia.
Aqui podes fazer reservas, enviar projetos, comprar beats e ganhar ofertas.
💬 Qualquer dúvida manda-me mensagem aqui no chat!`;

    const secondMessage = `🎁 Já agora, pra não dizeres que não ganhas nada com isto...
Vai até à Tab "Recompensas" e vê as ofertas que tens disponíveis. Até já!`;

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersToSend) {
      try {
        // Send first message
        const { error: msg1Error } = await supabase
          .from('messages')
          .insert({
            sender_id: ghostWayne.id,
            recipient_id: user.id,
            thread_type: 'direct',
            body: firstMessage,
          });

        if (msg1Error) {
          console.error(`❌ Error sending first message to ${user.full_name}:`, msg1Error);
          errorCount++;
          continue;
        }

        // Send second message with button
        const { error: msg2Error } = await supabase
          .from('messages')
          .insert({
            sender_id: ghostWayne.id,
            recipient_id: user.id,
            thread_type: 'direct',
            body: secondMessage,
            attachments: JSON.stringify({
              action: {
                type: 'button',
                label: '🔎 Ver Recompensas',
                url: '/rewards'
              }
            })
          });

        if (msg2Error) {
          console.error(`❌ Error sending second message to ${user.full_name}:`, msg2Error);
          errorCount++;
          continue;
        }

        // Create notification
        await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title: 'Mensagem de Ghost Wayne 🦇',
            body: 'Recebeste uma mensagem de boas-vindas!',
          });

        console.log(`✅ Sent welcome messages to ${user.full_name}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error processing user ${user.full_name}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Complete! Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        errors: errorCount,
        total_users: allUsers.length,
        users_without_messages: usersToSend.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
