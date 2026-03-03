import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  nome: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nome, email }: WelcomeEmailRequest = await req.json();

    console.log(`Enviando email de boas-vindas para: ${email}`);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h1 style="color: #1a1a1a; font-size: 28px; font-weight: bold; margin: 0 0 30px; text-align: center;">
                Bem-vindo ao HighLeads! 🎉
              </h1>
              
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Olá <strong>${nome}</strong>,
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Ficamos muito felizes em ter você conosco! Sua conta foi criada com sucesso e você já pode começar a usar todas as funcionalidades da plataforma.
              </p>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 24px 0;">
                <p style="color: #1a1a1a; font-size: 18px; font-weight: bold; margin: 0 0 12px;">
                  🎯 Próximos Passos
                </p>
                <p style="color: #333333; font-size: 15px; line-height: 24px; margin: 8px 0;">
                  • Configure seu perfil e empresa
                </p>
                <p style="color: #333333; font-size: 15px; line-height: 24px; margin: 8px 0;">
                  • Adicione membros da equipe
                </p>
                <p style="color: #333333; font-size: 15px; line-height: 24px; margin: 8px 0;">
                  • Importe seus leads
                </p>
                <p style="color: #333333; font-size: 15px; line-height: 24px; margin: 8px 0;">
                  • Configure suas metas de vendas
                </p>
              </div>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${Deno.env.get('VITE_SUPABASE_URL') || 'https://app.highleads.com'}" 
                   style="background-color: #0066ff; border-radius: 6px; color: #ffffff; display: inline-block; font-size: 16px; font-weight: bold; padding: 14px 32px; text-decoration: none;">
                  Acessar Plataforma
                </a>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 21px; margin: 24px 0;">
                Se você tiver qualquer dúvida, estamos aqui para ajudar. Basta responder a este email.
              </p>
              
              <p style="color: #333333; font-size: 14px; line-height: 21px; margin: 32px 0 16px;">
                Atenciosamente,<br>
                <strong>Equipe HighLeads</strong>
              </p>
              
              <p style="color: #999999; font-size: 12px; line-height: 18px; margin: 16px 0 0;">
                Você está recebendo este email porque criou uma conta no HighLeads com o endereço ${email}.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: "HighLeads <wesley.mb.campos15@gmail.com>",
        to: [email],
        subject: "Bem-vindo ao HighLeads! 🚀",
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailResponse = await resendResponse.json();
    console.log("Email de boas-vindas enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar email de boas-vindas:", error);
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
