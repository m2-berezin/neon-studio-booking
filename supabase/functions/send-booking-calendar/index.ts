import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingCalendarRequest {
  client_name: string;
  service_name: string;
  starts_at: string; // ISO timestamp
  ends_at: string; // ISO timestamp
  booking_id: string;
}

// Generate .ics calendar file content
const generateICS = (booking: BookingCalendarRequest): string => {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const startDate = new Date(booking.starts_at).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const endDate = new Date(booking.ends_at).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//7T7Studios//Booking System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:booking-${booking.booking_id}@7t7studios.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:Reserva: ${booking.client_name} - ${booking.service_name}`,
    `DESCRIPTION:Cliente: ${booking.client_name}\\nServiço: ${booking.service_name}\\n\\nReserva confirmada no sistema 7T7Studios`,
    'LOCATION:7T7Studios, Pinhal do General, Seixal',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete: Reserva em 1 hora',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  return icsContent;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const bookingData: BookingCalendarRequest = await req.json();
    console.log("Received booking data:", bookingData);

    // Generate .ics file content
    const icsContent = generateICS(bookingData);
    console.log("Generated ICS content");

    const resend = new Resend(resendApiKey);

    // Format dates for email
    const startDate = new Date(bookingData.starts_at);
    const endDate = new Date(bookingData.ends_at);
    const dateStr = startDate.toLocaleDateString('pt-PT', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = `${startDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;

    const emailSubject = `📅 Nova Reserva: ${bookingData.client_name} - ${bookingData.service_name}`;
    const emailBody = `
      <h2>🎉 Nova Reserva Confirmada</h2>
      <p><strong>Cliente:</strong> ${bookingData.client_name}</p>
      <p><strong>Serviço:</strong> ${bookingData.service_name}</p>
      <p><strong>📅 Data:</strong> ${dateStr}</p>
      <p><strong>🕐 Horário:</strong> ${timeStr}</p>
      <p><strong>📍 Local:</strong> 7T7Studios, Pinhal do General, Seixal</p>
      <hr />
      <p><em>Este email contém um convite de calendário (.ics) em anexo. Abre o anexo para adicionar o evento ao teu calendário iOS.</em></p>
      <p><small>Email enviado automaticamente pelo sistema 7T7Studios</small></p>
    `;

    // Send email with .ics attachment
    const emailResponse = await resend.emails.send({
      from: "7T7Studios <onboarding@resend.dev>",
      to: ["marcos.pd14@hotmail.com"],
      subject: emailSubject,
      html: emailBody,
      attachments: [
        {
          filename: `reserva-${bookingData.booking_id}.ics`,
          content: Buffer.from(icsContent).toString('base64'),
        }
      ]
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, email_id: emailResponse.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-booking-calendar function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
