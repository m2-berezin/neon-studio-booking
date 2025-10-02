import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!;
    
    // Get the user from the auth header
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('Sending welcome messages to user:', user.id);

    // Check if welcome messages have already been sent
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('welcome_messages_sent')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (profile.welcome_messages_sent) {
      console.log('Welcome messages already sent to user:', user.id);
      return new Response(
        JSON.stringify({ message: 'Welcome messages already sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get admin user (Ghost Wayne)
    const { data: adminProfile, error: adminError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (adminError || !adminProfile) {
      console.error('Error finding admin:', adminError);
      return new Response(
        JSON.stringify({ error: 'Admin not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const adminId = adminProfile.id;

    // First welcome message
    const firstMessage = {
      sender_id: adminId,
      recipient_id: user.id,
      thread_type: 'direct',
      body: `🦇 Olá! Sou o Ghost Wayne.
🎧 Bem-vindo à 7T7Studios App, esta é a minha visão para a interação entre a música e a tecnologia.
Aqui podes fazer reservas, enviar projetos, comprar beats e ganhar ofertas.
💬 Qualquer dúvida manda-me mensagem aqui no chat!`,
      attachments: null,
    };

    // Second welcome message with action button
    const secondMessage = {
      sender_id: adminId,
      recipient_id: user.id,
      thread_type: 'direct',
      body: `🎁 Já agora, pra não dizeres que não ganhas nada com isto...
Vai até à Tab "Recompensas" e vê as ofertas que tens disponíveis. Até já!`,
      attachments: JSON.stringify({
        action: {
          type: 'button',
          label: '🔎 Ver Recompensas',
          url: '/rewards',
        },
      }),
    };

    // Insert both messages
    const { error: messagesError } = await supabaseClient
      .from('messages')
      .insert([firstMessage, secondMessage]);

    if (messagesError) {
      console.error('Error inserting messages:', messagesError);
      return new Response(
        JSON.stringify({ error: 'Failed to send messages' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Create notifications for the user
    const notifications = [
      {
        user_id: user.id,
        title: 'Mensagem de Ghost Wayne 🦇',
        body: 'Recebeste uma mensagem de boas-vindas!',
        read: false,
      },
    ];

    const { error: notificationsError } = await supabaseClient
      .from('notifications')
      .insert(notifications);

    if (notificationsError) {
      console.error('Error creating notifications:', notificationsError);
    }

    // Update profile to mark welcome messages as sent
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ welcome_messages_sent: true })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Welcome messages sent successfully to user:', user.id);

    return new Response(
      JSON.stringify({ message: 'Welcome messages sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});