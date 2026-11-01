import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { corsHeaders } from '../_shared/cors.ts';

// Required secrets, from an APNs key created at developer.apple.com > Keys:
// APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (contents of the .p8 file)
const BUNDLE_ID = 'com.studios7t7.app';
const APNS_HOSTS = ['https://api.push.apple.com', 'https://api.sandbox.push.apple.com'];

const base64Url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const createApnsJwt = async (keyId: string, teamId: string, privateKey: string) => {
  const pem = privateKey.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const header = base64Url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const claims = base64Url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );

  return `${header}.${claims}.${base64Url(signature)}`;
};

// Debug builds get sandbox tokens and App Store builds get production ones,
// so a token rejected by production is retried on sandbox.
const sendToDevice = async (token: string, jwt: string, payload: string) => {
  for (const host of APNS_HOSTS) {
    const response = await fetch(`${host}/3/device/${token}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': BUNDLE_ID,
        'apns-push-type': 'alert',
        'content-type': 'application/json',
      },
      body: payload,
    });

    if (response.ok) return 'sent';

    const { reason } = await response.json().catch(() => ({ reason: '' }));
    console.error(`APNs ${host} rejected token: ${response.status} ${reason}`);

    if (response.status === 410 || reason === 'Unregistered') return 'invalid';
    if (reason !== 'BadDeviceToken') return 'failed';
  }

  return 'invalid';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const keyId = Deno.env.get('APNS_KEY_ID');
    const teamId = Deno.env.get('APNS_TEAM_ID');
    const privateKey = Deno.env.get('APNS_PRIVATE_KEY');

    if (!keyId || !teamId || !privateKey) {
      return json({ skipped: 'APNs secrets not configured' });
    }

    const { notification_id: notificationId } = await req.json();
    if (!notificationId) {
      return json({ error: 'notification_id is required' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Supabase environment not configured' }, 500);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // This endpoint is public, so each notification can only ever be pushed once
    const { data: notification, error: claimError } = await supabase
      .from('notifications')
      .update({ push_sent_at: new Date().toISOString() })
      .eq('id', notificationId)
      .is('push_sent_at', null)
      .select('id, user_id, title, body')
      .maybeSingle();

    if (claimError) throw claimError;
    if (!notification) return json({ skipped: 'already sent or not found' });

    const { data: devices, error: devicesError } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', notification.user_id);

    if (devicesError) throw devicesError;
    if (!devices?.length) return json({ sent: 0 });

    const jwt = await createApnsJwt(keyId, teamId, privateKey);
    const payload = JSON.stringify({
      aps: { alert: { title: notification.title, body: notification.body }, sound: 'default' },
      notification_id: notification.id,
    });

    let sent = 0;
    for (const { token } of devices) {
      const result = await sendToDevice(token, jwt, payload);
      if (result === 'sent') sent++;
      if (result === 'invalid') {
        await supabase.from('device_tokens').delete().eq('token', token);
      }
    }

    return json({ sent });
  } catch (error) {
    console.error('Error sending push:', error);
    return json({ error: 'Failed to send push' }, 500);
  }
});
