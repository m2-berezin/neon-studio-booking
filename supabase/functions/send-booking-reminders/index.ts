import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Booking {
  id: string;
  user_id: string;
  starts_at: string;
  service_name_snapshot: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Starting booking reminders check...');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    let notificationsCreated = 0;
    let notificationsSkipped = 0;

    // Process 72-hour reminders
    const reminder72h = new Date(now.getTime() + (72 * 60 * 60 * 1000));
    const window72hStart = new Date(reminder72h.getTime() - (30 * 60 * 1000));
    const window72hEnd = new Date(reminder72h.getTime() + (30 * 60 * 1000));

    console.log(`Looking for 72h reminders between ${window72hStart.toISOString()} and ${window72hEnd.toISOString()}`);

    const { data: bookings72h, error: bookings72hError } = await supabase
      .from('bookings')
      .select('id, user_id, starts_at, service_name_snapshot')
      .eq('status', 'confirmed')
      .gte('starts_at', window72hStart.toISOString())
      .lte('starts_at', window72hEnd.toISOString())
      .not('hidden_from_client', 'eq', true);

    if (bookings72hError) {
      console.error('Error fetching 72h bookings:', bookings72hError);
    } else if (bookings72h && bookings72h.length > 0) {
      console.log(`Found ${bookings72h.length} booking(s) for 72h reminders`);

      for (const booking of bookings72h as Booking[]) {
        console.log(`Processing 72h reminder for booking ${booking.id}`);

        // Check if 72h reminder already exists
        const { data: existing72h, error: check72hError } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', booking.user_id)
          .ilike('body', '%3 dias%')
          .gte('created_at', new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (check72hError && check72hError.code !== 'PGRST116') {
          console.error(`Error checking 72h notification for booking ${booking.id}:`, check72hError);
          continue;
        }

        if (existing72h) {
          console.log(`72h notification already exists for booking ${booking.id}, skipping`);
          notificationsSkipped++;
          continue;
        }

        // Create 72h reminder
        const { error: notification72hError } = await supabase
          .from('notifications')
          .insert({
            user_id: booking.user_id,
            role: 'user',
            title: 'Lembrete de Reserva',
            body: 'Tens sessão agendada para daqui a 3 dias! Caso queiras reagendar, manda mensagem no chat ao Ghost!',
            read: false,
          });

        if (notification72hError) {
          console.error(`Error creating 72h notification for booking ${booking.id}:`, notification72hError);
          continue;
        }

        console.log(`✅ 72h notification created for booking ${booking.id}`);
        notificationsCreated++;
      }
    }

    // Process 24-hour reminders
    const reminder24h = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    const window24hStart = new Date(reminder24h.getTime() - (30 * 60 * 1000));
    const window24hEnd = new Date(reminder24h.getTime() + (30 * 60 * 1000));

    console.log(`Looking for 24h reminders between ${window24hStart.toISOString()} and ${window24hEnd.toISOString()}`);

    const { data: bookings24h, error: bookings24hError } = await supabase
      .from('bookings')
      .select('id, user_id, starts_at, service_name_snapshot')
      .eq('status', 'confirmed')
      .gte('starts_at', window24hStart.toISOString())
      .lte('starts_at', window24hEnd.toISOString())
      .not('hidden_from_client', 'eq', true);

    if (bookings24hError) {
      console.error('Error fetching 24h bookings:', bookings24hError);
    } else if (bookings24h && bookings24h.length > 0) {
      console.log(`Found ${bookings24h.length} booking(s) for 24h reminders`);

      for (const booking of bookings24h as Booking[]) {
        console.log(`Processing 24h reminder for booking ${booking.id}`);

        // Check if 24h reminder already exists
        const { data: existing24h, error: check24hError } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', booking.user_id)
          .ilike('body', '%amanhã%')
          .gte('created_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (check24hError && check24hError.code !== 'PGRST116') {
          console.error(`Error checking 24h notification for booking ${booking.id}:`, check24hError);
          continue;
        }

        if (existing24h) {
          console.log(`24h notification already exists for booking ${booking.id}, skipping`);
          notificationsSkipped++;
          continue;
        }

        // Create 24h reminder
        const { error: notification24hError } = await supabase
          .from('notifications')
          .insert({
            user_id: booking.user_id,
            role: 'user',
            title: 'Lembrete de Reserva',
            body: 'A tua sessão é já amanhã! Até já 🦇',
            read: false,
          });

        if (notification24hError) {
          console.error(`Error creating 24h notification for booking ${booking.id}:`, notification24hError);
          continue;
        }

        console.log(`✅ 24h notification created for booking ${booking.id}`);
        notificationsCreated++;
      }
    }

    // ======== Voucher availability notifications ========
    console.log('🎫 Checking voucher availability for all users...');
    let voucherNotificationsCreated = 0;

    // Get all user profiles
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, last_voucher_at')
      .eq('role', 'user');

    if (profilesError) {
      console.error('Error fetching profiles for voucher check:', profilesError);
    } else if (allProfiles && allProfiles.length > 0) {
      for (const profile of allProfiles) {
        try {
          // Check voucher status using RPC
          const { data: voucherData, error: voucherError } = await supabase.rpc('get_voucher_status', {
            p_user_id: profile.id
          });

          if (voucherError) {
            console.error(`Error checking voucher for user ${profile.id}:`, voucherError);
            continue;
          }

          const voucherStatus = voucherData as { available: boolean; days_left: number } | null;
          
          if (voucherStatus?.available) {
            // Check if we already sent a voucher notification recently (within last 30 days)
            const { data: existingVoucherNotif, error: checkVoucherError } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', profile.id)
              .ilike('title', '%Voucher%')
              .ilike('body', '%disponível%')
              .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
              .limit(1);

            if (checkVoucherError) {
              console.error(`Error checking voucher notification for user ${profile.id}:`, checkVoucherError);
              continue;
            }

            if (existingVoucherNotif && existingVoucherNotif.length > 0) {
              console.log(`Voucher notification already exists for user ${profile.id}, skipping`);
              continue;
            }

            // Create voucher notification
            const { error: insertError } = await supabase
              .from('notifications')
              .insert({
                user_id: profile.id,
                role: 'user',
                title: 'Voucher de 15€ Disponível',
                body: 'O teu voucher de 15€ está disponível para reivindicar! Vai às Recompensas para o reclamar. 🎉',
                read: false,
              });

            if (insertError) {
              console.error(`Error creating voucher notification for user ${profile.id}:`, insertError);
              continue;
            }

            console.log(`✅ Voucher notification created for user ${profile.id}`);
            voucherNotificationsCreated++;
          }
        } catch (err) {
          console.error(`Error processing voucher for user ${profile.id}:`, err);
        }
      }
    }

    const totalBookingsFound = (bookings72h?.length || 0) + (bookings24h?.length || 0);
    
    const summary = {
      message: 'Booking reminders processed',
      bookingsFound: totalBookingsFound,
      reminders72h: bookings72h?.length || 0,
      reminders24h: bookings24h?.length || 0,
      notificationsCreated,
      notificationsSkipped,
      voucherNotificationsCreated,
    };

    console.log('📊 Summary:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error in send-booking-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
