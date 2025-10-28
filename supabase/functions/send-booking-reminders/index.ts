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

    // Calculate the time window: 72 hours ± 30 minutes from now
    const now = new Date();
    const reminderTime = new Date(now.getTime() + (72 * 60 * 60 * 1000));
    const windowStart = new Date(reminderTime.getTime() - (30 * 60 * 1000));
    const windowEnd = new Date(reminderTime.getTime() + (30 * 60 * 1000));

    console.log(`Looking for bookings between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

    // Fetch all confirmed bookings that start in approximately 72 hours
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, user_id, starts_at, service_name_snapshot')
      .eq('status', 'confirmed')
      .gte('starts_at', windowStart.toISOString())
      .lte('starts_at', windowEnd.toISOString())
      .not('hidden_from_client', 'eq', true);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    if (!bookings || bookings.length === 0) {
      console.log('No bookings found in the 72-hour window');
      return new Response(
        JSON.stringify({ message: 'No bookings to remind', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${bookings.length} booking(s) to process`);

    let notificationsCreated = 0;
    let notificationsSkipped = 0;

    // Process each booking
    for (const booking of bookings as Booking[]) {
      console.log(`Processing booking ${booking.id} for user ${booking.user_id}`);

      // Check if a reminder notification already exists for this booking
      const { data: existingNotification, error: checkError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', booking.user_id)
        .ilike('body', `%${booking.id}%`)
        .eq('title', 'Lembrete de Reserva')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`Error checking existing notification for booking ${booking.id}:`, checkError);
        continue;
      }

      if (existingNotification) {
        console.log(`Notification already exists for booking ${booking.id}, skipping`);
        notificationsSkipped++;
        continue;
      }

      // Format the booking date/time
      const bookingDate = new Date(booking.starts_at);
      const formattedDate = bookingDate.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const formattedTime = bookingDate.toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const serviceName = booking.service_name_snapshot || 'sessão';

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: booking.user_id,
          role: 'user',
          title: 'Lembrete de Reserva',
          body: `A tua ${serviceName} está agendada para ${formattedDate} às ${formattedTime}. Lembra-te de confirmar a tua presença! (ID: ${booking.id})`,
          read: false,
        });

      if (notificationError) {
        console.error(`Error creating notification for booking ${booking.id}:`, notificationError);
        continue;
      }

      console.log(`✅ Notification created for booking ${booking.id}`);
      notificationsCreated++;
    }

    const summary = {
      message: 'Booking reminders processed',
      bookingsFound: bookings.length,
      notificationsCreated,
      notificationsSkipped,
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
