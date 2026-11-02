import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const STUDIO_ADDRESS = 'Rua Abade Correia da Serra 20A, 2865-207 Fernão Ferro';
const HISTORY_DAYS = 60;

const toIcsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const escapeText = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Lines over 75 bytes must be folded for calendar apps to read them
const foldLine = (line: string) => {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';

  for (const char of line) {
    if (encoder.encode(current + char).length > 73) {
      parts.push(current);
      current = ' ';
    }
    current += char;
  }

  parts.push(current);
  return parts.join('\r\n');
};

// Address for the iPhone's Calendar to subscribe to, so bookings stay up to date by themselves.
// Calendar apps can't log in, so access is through the admin's private token in the URL.
Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('token');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token ?? '');
  if (!isUuid) return new Response('Not found', { status: 404 });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: owner, error: tokenError } = await supabase
      .from('admin_calendar_tokens')
      .select('user_id')
      .eq('token', token)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!owner) return new Response('Not found', { status: 404 });

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, user_id, starts_at, ends_at, service_name_snapshot, created_at')
      .eq('status', 'confirmed')
      .eq('hidden_from_admin', false)
      .not('starts_at', 'is', null)
      .gte('starts_at', new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString())
      .order('starts_at', { ascending: true });

    if (bookingsError) throw bookingsError;

    const userIds = [...new Set((bookings ?? []).map((booking) => booking.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//7T7 Studios//Reservas//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:7T7 Reservas',
      'X-WR-TIMEZONE:Europe/Lisbon',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
      'X-PUBLISHED-TTL:PT1H',
    ];

    for (const booking of bookings ?? []) {
      const client = names.get(booking.user_id) || 'Cliente';
      const service = booking.service_name_snapshot || 'Sessão';

      lines.push(
        'BEGIN:VEVENT',
        `UID:${booking.id}@7t7studios`,
        `DTSTAMP:${toIcsDate(booking.created_at)}`,
        `DTSTART:${toIcsDate(booking.starts_at)}`,
        `DTEND:${toIcsDate(booking.ends_at)}`,
        `SUMMARY:${escapeText(`${client} - ${service}`)}`,
        `LOCATION:${escapeText(STUDIO_ADDRESS)}`,
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');

    return new Response(lines.map(foldLine).join('\r\n') + '\r\n', {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="7t7-reservas.ics"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error building calendar feed:', error);
    return new Response('Error', { status: 500 });
  }
});
