import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Send2FARequest {
  userId: string;
  email: string;
  nome: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, nome }: Send2FARequest = await req.json();

    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Limpar códigos antigos do usuário
    await supabase
      .from('two_factor_codes')
      .delete()
      .eq('user_id', userId)
      .eq('verified', false);

    // Salvar novo código (expira em 10 minutos)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertError } = await supabase
      .from('two_factor_codes')
      .insert({
        user_id: userId,
        code,
        expires_at: expiresAt,
      });

    if (insertError) {
      throw new Error(`Erro ao salvar código 2FA: ${insertError.message}`);
    }

    console.log(`Código 2FA gerado para usuário ${userId}`);

    // Enviar email com código
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
                Código de Verificação 🔐
              </h1>
              
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Olá <strong>${nome}</strong>,
              </p>
              
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 16px 0;">
                Use o código abaixo para completar seu login no HighLeads:
              </p>
              
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 6px; margin: 24px 0; text-align: center;">
                <p style="color: #666666; font-size: 14px; margin: 0 0 12px;">Seu código de verificação:</p>
                <p style="color: #0066ff; font-size: 48px; font-weight: bold; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${code}
                </p>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 21px; margin: 24px 0;">
                ⏰ Este código expira em <strong>10 minutos</strong>.
              </p>
              
              <p style="color: #666666; font-size: 14px; line-height: 21px; margin: 16px 0;">
                Se você não tentou fazer login, ignore este email ou entre em contato conosco imediatamente.
              </p>
              
              <p style="color: #333333; font-size: 14px; line-height: 21px; margin: 32px 0 16px;">
                Atenciosamente,<br>
                <strong>Equipe HighLeads</strong>
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
        subject: "Código de Verificação - HighLeads",
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    const emailResponse = await resendResponse.json();
    console.log("Email 2FA enviado com sucesso:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erro ao enviar código 2FA:", error);
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
