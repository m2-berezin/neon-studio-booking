```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_ID = '6d9d1dc1-e16f-4f3d-a817-1591a1b27477';
const SESSION_MESSAGE = 'Boas! Tudo pronto pra sessão de hoje?';
const VOUCHER_AVAILABLE_TITLE = 'Voucher de 10€ Disponível';
const VOUCHER_REMINDER_TITLE = 'O teu voucher de 10€ está a acabar';
const VOUCHER_REMINDER_DAYS_LEFT = 15;

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // One failed step doesn't stop the others, but the run is reported as failed
    let errorCount = 0;
    const reportError = (...details: unknown[]) => {
      errorCount++;
      console.error(...details);
    };

    // Ends cancelled subscriptions and takes back invite diamonds that weren't used in time
    const { error: expirationsError } = await supabase.rpc('run_scheduled_expirations');
    if (expirationsError) {
      reportError('Error running scheduled expirations:', expirationsError);
    }

    const now = new Date();
    let notificationsCreated = 0;
    let notificationsSkipped = 0;

    // Process 3-day reminders, while rescheduling is still free
    const reminder3d = new Date(now.getTime() + (72 * 60 * 60 * 1000));
    const window3dStart = new Date(reminder3d.getTime() - (30 * 60 * 1000));
    const window3dEnd = new Date(reminder3d.getTime() + (30 * 60 * 1000));

    console.log(`Looking for 3-day reminders between ${window3dStart.toISOString()} and ${window3dEnd.toISOString()}`);

    const { data: bookings3d, error: bookings3dError } = await supabase
      .from('bookings')
      .select('id, user_id, starts_at, service_name_snapshot')
      .eq('status', 'confirmed')
      .gte('starts_at', window3dStart.toISOString())
      .lte('starts_at', window3dEnd.toISOString())
      .not('hidden_from_client', 'eq', true);

    if (bookings3dError) {
      reportError('Error fetching 3-day bookings:', bookings3dError);
    } else if (bookings3d && bookings3d.length > 0) {
      console.log(`Found ${bookings3d.length} booking(s) for 3-day reminders`);

      for (const booking of bookings3d as Booking[]) {
        console.log(`Processing 3-day reminder for booking ${booking.id}`);

        // The link identifies the booking, so each one is only reminded once
        const rescheduleLink = `/book?reschedule=${booking.id}`;
        const { data: existing3d, error: check3dError } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', booking.user_id)
          .eq('link', rescheduleLink)
          .limit(1);

        if (check3dError) {
          reportError(`Error checking 3-day notification for booking ${booking.id}:`, check3dError);
          continue;
        }

        if (existing3d && existing3d.length > 0) {
          console.log(`3-day notification already exists for booking ${booking.id}, skipping`);
          notificationsSkipped++;
          continue;
        }

        // Create 3-day reminder
        const { error: notification3dError } = await supabase
          .from('notifications')
          .insert({
            user_id: booking.user_id,
            role: 'user',
            title: 'Lembrete de Reserva',
            body: 'Tens sessão agendada para daqui a 3 dias! Caso precises de reagendar, trata disso hoje para não perderes o sinal dos 15€!',
            link: rescheduleLink,
            read: false,
          });

        if (notification3dError) {
          reportError(`Error creating 3-day notification for booking ${booking.id}:`, notification3dError);
          continue;
        }

        console.log(`✅ 3-day notification created for booking ${booking.id}`);
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
      reportError('Error fetching 24h bookings:', bookings24hError);
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
          reportError(`Error checking 24h notification for booking ${booking.id}:`, check24hError);
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
          reportError(`Error creating 24h notification for booking ${booking.id}:`, notification24hError);
          continue;
        }

        console.log(`✅ 24h notification created for booking ${booking.id}`);
        notificationsCreated++;

      }
    }

    // ======== Message from the Ghost 2 hours before each session ========
    // Half-open window, so a session on the boundary isn't caught by two hourly runs
    const message2hStart = new Date(now.getTime() + (90 * 60 * 1000));
    const message2hEnd = new Date(now.getTime() + (150 * 60 * 1000));
    let sessionMessagesSent = 0;

    const { data: bookings2h, error: bookings2hError } = await supabase
      .from('bookings')
      .select('id, user_id, starts_at, service_name_snapshot')
      .eq('status', 'confirmed')
      .gte('starts_at', message2hStart.toISOString())
      .lt('starts_at', message2hEnd.toISOString())
      .not('hidden_from_client', 'eq', true);

    if (bookings2hError) {
      reportError('Error fetching bookings for the 2h message:', bookings2hError);
    }

    for (const booking of (bookings2h ?? []) as Booking[]) {
      const { data: existingMessage, error: existingMessageError } = await supabase
        .from('messages')
        .select('id')
        .eq('sender_id', ADMIN_ID)
        .eq('receiver_id', booking.user_id)
        .eq('message', SESSION_MESSAGE)
        .gte('timestamp', new Date(now.getTime() - (3 * 60 * 60 * 1000)).toISOString())
        .limit(1);

      if (existingMessageError) {
        reportError(`Error checking 2h message for booking ${booking.id}:`, existingMessageError);
        continue;
      }

      if (existingMessage && existingMessage.length > 0) continue;

      const ids = [ADMIN_ID, booking.user_id].sort();
      const { error: messageError } = await supabase.from('messages').insert({
        thread_id: `${ids[0]}-${ids[1]}`,
        sender_id: ADMIN_ID,
        receiver_id: booking.user_id,
        message: SESSION_MESSAGE,
        timestamp: new Date().toISOString(),
      });

      if (messageError) {
        reportError(`Error sending 2h message for booking ${booking.id}:`, messageError);
        continue;
      }

      sessionMessagesSent++;
    }

    // ======== Voucher availability notifications ========
    console.log('🎫 Checking voucher availability for all users...');
    let voucherNotificationsCreated = 0;

    // Only accounts still within their first 60 days can claim it
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .neq('role', 'admin')
      .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

    if (profilesError) {
      reportError('Error fetching profiles for voucher check:', profilesError);
    } else if (allProfiles && allProfiles.length > 0) {
      for (const profile of allProfiles) {
        try {
          // Check voucher status using RPC
          const { data: voucherData, error: voucherError } = await supabase.rpc('get_voucher_status', {
            p_user_id: profile.id
          });

          if (voucherError) {
            reportError(`Error checking voucher for user ${profile.id}:`, voucherError);
            continue;
          }

          const voucherStatus = voucherData as { available: boolean; days_left: number } | null;

          if (voucherStatus?.available) {
            // Announced once, then one reminder when it's about to run out
            const isReminder = voucherStatus.days_left <= VOUCHER_REMINDER_DAYS_LEFT;
            const title = isReminder ? VOUCHER_REMINDER_TITLE : VOUCHER_AVAILABLE_TITLE;

            const { data: existingVoucherNotif, error: checkVoucherError } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', profile.id)
              .eq('title', title)
              .limit(1);

            if (checkVoucherError) {
              reportError(`Error checking voucher notification for user ${profile.id}:`, checkVoucherError);
              continue;
            }

            if (existingVoucherNotif && existingVoucherNotif.length > 0) {
              continue;
            }

            const { error: insertError } = await supabase
              .from('notifications')
              .insert({
                user_id: profile.id,
                role: 'user',
                title,
                body: isReminder
                  ? `Faltam ${voucherStatus.days_left} dias para reivindicares o teu voucher de boas-vindas de 10€. Vai às Recompensas e reivindica-o antes que acabe!`
                  : 'O teu voucher de boas-vindas de 10€ está disponível para reivindicar nos primeiros 60 dias! Vai às Recompensas para o reivindicares.',
                read: false,
              });

            if (insertError) {
              reportError(`Error creating voucher notification for user ${profile.id}:`, insertError);
              continue;
            }

            console.log(`✅ Voucher notification created for user ${profile.id}`);
            voucherNotificationsCreated++;
          }
        } catch (err) {
          reportError(`Error processing voucher for user ${profile.id}:`, err);
        }
      }
    }

    const totalBookingsFound = (bookings3d?.length || 0) + (bookings24h?.length || 0);
    
    const summary = {
      message: 'Booking reminders processed',
      bookingsFound: totalBookingsFound,
      reminders3d: bookings3d?.length || 0,
      reminders24h: bookings24h?.length || 0,
      notificationsCreated,
      notificationsSkipped,
      sessionMessagesSent,
      voucherNotificationsCreated,
      errors: errorCount,
    };

    console.log('📊 Summary:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: errorCount > 0 ? 500 : 200 }
    );

  } catch (error) {
    console.error('❌ Error in send-booking-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
