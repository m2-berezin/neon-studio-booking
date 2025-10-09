import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  client_name: string;
  transfer_link: string;
  service_name: string;
  notes?: string;
}

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

    const { client_name, transfer_link, service_name, notes }: EmailRequest = await req.json();

    const resend = new Resend(resendApiKey);

    const emailSubject = `${service_name} / ${client_name}`;
    const emailBody = `
      <h2>Novo pedido de Mix&Master aprovado</h2>
      <p><strong>Cliente:</strong> ${client_name}</p>
      <p><strong>Serviço:</strong> ${service_name}</p>
      <p><strong>Link de Transferência:</strong></p>
      <p><a href="${transfer_link}" target="_blank">${transfer_link}</a></p>
      ${notes ? `<p><strong>Notas do Projeto:</strong></p><p>${notes}</p>` : ''}
      <hr />
      <p><small>Email enviado automaticamente pelo sistema 7T7Studios</small></p>
    `;

    const emailResponse = await resend.emails.send({
      from: "7T7Studios <onboarding@resend.dev>",
      to: ["ghostwayne777@hotmail.com"],
      subject: emailSubject,
      html: emailBody,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-mixmaster-email function:", error);
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
