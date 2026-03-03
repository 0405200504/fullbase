import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get('stripe-signature');
  console.log('[WEBHOOK] Requisição recebida');
  console.log('[WEBHOOK] Assinatura do Stripe presente:', !!signature);
  
  if (!signature) {
    console.error('[WEBHOOK] ✗ Erro: Assinatura do Stripe não encontrada no header');
    console.error('[WEBHOOK] Este webhook só aceita requisições assinadas pelo Stripe');
    console.error('[WEBHOOK] Para testar: Use o Stripe CLI ou configure o webhook no Stripe Dashboard');
    return new Response(JSON.stringify({ 
      error: 'Missing Stripe signature',
      message: 'This webhook only accepts requests from Stripe with valid signatures',
      tip: 'Use Stripe CLI for testing: stripe listen --forward-to YOUR_WEBHOOK_URL'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  console.log('[WEBHOOK] ✓ Assinatura presente');

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!stripeSecretKey || !webhookSecret) {
    console.error('[WEBHOOK] ✗ Erro: Credenciais do Stripe não configuradas');
    console.error('[WEBHOOK] STRIPE_SECRET_KEY configurado:', !!stripeSecretKey);
    console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET configurado:', !!webhookSecret);
    return new Response(JSON.stringify({ 
      error: 'Stripe configuration missing',
      message: 'STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not configured',
      stripeKeyConfigured: !!stripeSecretKey,
      webhookSecretConfigured: !!webhookSecret
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  console.log('[WEBHOOK] ✓ Credenciais do Stripe configuradas');

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.text();
    console.log('[WEBHOOK] Body recebido, tamanho:', body.length);
    
    // Verificar assinatura do webhook
    console.log('[WEBHOOK] Verificando assinatura do evento Stripe...');
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    console.log(`[WEBHOOK] ✓ Evento verificado com sucesso!`);
    console.log(`[WEBHOOK] Tipo: ${event.type}`);
    console.log(`[WEBHOOK] ID: ${event.id}`);

    // Registrar webhook para auditoria
    console.log('[WEBHOOK] Salvando evento no banco de dados');
    const { error: logError } = await supabase
      .from('stripe_webhooks')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event.data.object,
        processed: false,
      });

    if (logError) {
      console.error('[WEBHOOK] Erro ao salvar evento:', logError);
    } else {
      console.log('[WEBHOOK] Evento salvo com sucesso');
    }

    // Processar eventos
    console.log(`[WEBHOOK] Processando evento do tipo: ${event.type}`);
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('[WEBHOOK] Processando checkout.session.completed');
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        console.log(`[WEBHOOK] Processando ${event.type}`);
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, subscription);
        
        // Enviar email de renovação se for update
        if (event.type === 'customer.subscription.updated') {
          console.log('[WEBHOOK] Enviando email de renovação');
          await sendSubscriptionRenewalEmail(supabase, subscription);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        console.log('[WEBHOOK] Processando customer.subscription.deleted');
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        
        // Enviar email de cancelamento
        console.log('[WEBHOOK] Enviando email de cancelamento');
        await sendSubscriptionCanceledEmail(supabase, subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        console.log('[WEBHOOK] Processando invoice.payment_succeeded');
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(supabase, invoice);
        
        // Enviar email de pagamento bem-sucedido
        console.log('[WEBHOOK] Enviando email de pagamento bem-sucedido');
        await sendPaymentSuccessEmail(supabase, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        console.log('[WEBHOOK] Processando invoice.payment_failed');
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        
        // Enviar email de falha no pagamento
        console.log('[WEBHOOK] Enviando email de falha no pagamento');
        await sendPaymentFailedEmail(supabase, invoice);
        break;
      }

      default:
        console.log(`[WEBHOOK] Tipo de evento não tratado: ${event.type}`);
    }

    // Marcar webhook como processado
    console.log('[WEBHOOK] Marcando webhook como processado');
    const { error: updateError } = await supabase
      .from('stripe_webhooks')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id);
    
    if (updateError) {
      console.error('[WEBHOOK] Erro ao marcar webhook como processado:', updateError);
    }

    console.log('[WEBHOOK] Processamento concluído com sucesso');
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[WEBHOOK] ✗ Erro ao processar webhook:', err);
    console.error('[WEBHOOK] Stack trace:', err instanceof Error ? err.stack : 'N/A');
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    
    // Identificar tipo de erro
    const isSignatureError = errorMessage.includes('signature') || 
                            errorMessage.includes('timestamp') ||
                            errorMessage.includes('Unable to extract');
    
    if (isSignatureError) {
      console.error('[WEBHOOK] Erro de assinatura - requisição não veio do Stripe ou assinatura inválida');
    }
    
    // Tentar salvar o erro no banco
    try {
      await supabase
        .from('stripe_webhooks')
        .insert({
          stripe_event_id: `error_${Date.now()}`,
          event_type: 'error',
          payload: { error: errorMessage, timestamp: new Date().toISOString() },
          processed: false,
          error: errorMessage
        });
      console.log('[WEBHOOK] Erro registrado no banco de dados para análise');
    } catch (saveError) {
      console.error('[WEBHOOK] Não foi possível salvar o erro no banco:', saveError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: err instanceof Error ? err.stack : undefined,
        tip: isSignatureError 
          ? 'This webhook requires a valid Stripe signature. Configure it in Stripe Dashboard or test with: stripe listen --forward-to YOUR_WEBHOOK_URL'
          : 'Check the error details and webhook logs for more information'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleCheckoutCompleted(
  supabase: any,
  session: Stripe.Checkout.Session
) {
  console.log('Checkout completed:', session.id);
  
  const accountId = session.metadata?.account_id;
  if (!accountId) {
    console.error('Missing account_id in session metadata');
    return;
  }

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.error('Missing subscription ID');
    return;
  }

  // A subscription já deve ter sido criada pelo evento subscription.created
  // Aqui apenas logamos o sucesso do checkout
  console.log(`Checkout completed for account ${accountId}, subscription ${subscriptionId}`);
}

async function handleSubscriptionChange(
  supabase: any,
  subscription: Stripe.Subscription
) {
  console.log('Subscription changed:', subscription.id);

  const accountId = subscription.metadata?.account_id;
  if (!accountId) {
    console.error('Missing account_id in subscription metadata');
    return;
  }

  // Buscar o plano baseado no price_id
  const priceId = subscription.items.data[0]?.price.id;
  const { data: plan } = await supabase
    .from('plans')
    .select('id, name')
    .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
    .single();

  if (!plan) {
    console.error(`Plan not found for price ${priceId}`);
    return;
  }

  const billingCycle = subscription.items.data[0]?.price.recurring?.interval === 'year' 
    ? 'yearly' 
    : 'monthly';

  // Upsert subscription
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      account_id: accountId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      stripe_price_id: priceId,
      plan_id: plan.id,
      status: subscription.status,
      billing_cycle: billingCycle,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString() 
        : null,
      canceled_at: subscription.canceled_at 
        ? new Date(subscription.canceled_at * 1000).toISOString() 
        : null,
    }, {
      onConflict: 'stripe_subscription_id',
    });

  if (error) {
    console.error('Error upserting subscription:', error);
    throw error;
  }

  console.log(`Subscription ${subscription.id} updated for account ${accountId}`);
}

async function handleSubscriptionDeleted(
  supabase: any,
  subscription: Stripe.Subscription
) {
  console.log('Subscription deleted:', subscription.id);

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      ended_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating deleted subscription:', error);
    throw error;
  }

  console.log(`Subscription ${subscription.id} marked as canceled`);
}

async function handlePaymentSucceeded(
  supabase: any,
  invoice: Stripe.Invoice
) {
  console.log('Payment succeeded for invoice:', invoice.id);

  if (!invoice.subscription) {
    return;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
    })
    .eq('stripe_subscription_id', invoice.subscription);

  if (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }

  console.log(`Subscription ${invoice.subscription} marked as active`);
}

async function handlePaymentFailed(
  supabase: any,
  invoice: Stripe.Invoice
) {
  console.log('Payment failed for invoice:', invoice.id);

  if (!invoice.subscription) {
    return;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('stripe_subscription_id', invoice.subscription);

  if (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }

  console.log(`Subscription ${invoice.subscription} marked as past_due`);
}

// Funções de envio de email
async function sendSubscriptionRenewalEmail(
  supabase: any,
  subscription: Stripe.Subscription
) {
  try {
    const accountId = subscription.metadata?.account_id;
    if (!accountId) return;

    // Buscar email do owner da conta
    const { data: account } = await supabase
      .from('accounts')
      .select('owner_id')
      .eq('id', accountId)
      .single();

    if (!account) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, nome')
      .eq('id', account.owner_id)
      .single();

    if (!profile) return;

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const renewalDate = new Date(subscription.current_period_end * 1000).toLocaleDateString('pt-BR');

    await resend.emails.send({
      from: "HighLeads <onboarding@resend.dev>",
      to: [profile.email],
      subject: "Sua assinatura foi renovada - HighLeads",
      html: `
        <h1>Olá, ${profile.nome}!</h1>
        <p>Sua assinatura do HighLeads foi renovada com sucesso.</p>
        <p><strong>Próxima renovação:</strong> ${renewalDate}</p>
        <p>Continue aproveitando todos os recursos da plataforma!</p>
        <p>Se tiver alguma dúvida, estamos à disposição.</p>
        <br>
        <p>Atenciosamente,<br>Equipe HighLeads</p>
      `,
    });

    console.log(`Renewal email sent to ${profile.email}`);
  } catch (error) {
    console.error('Error sending renewal email:', error);
  }
}

async function sendSubscriptionCanceledEmail(
  supabase: any,
  subscription: Stripe.Subscription
) {
  try {
    const accountId = subscription.metadata?.account_id;
    if (!accountId) return;

    const { data: account } = await supabase
      .from('accounts')
      .select('owner_id')
      .eq('id', accountId)
      .single();

    if (!account) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, nome')
      .eq('id', account.owner_id)
      .single();

    if (!profile) return;

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const endDate = new Date(subscription.current_period_end * 1000).toLocaleDateString('pt-BR');

    await resend.emails.send({
      from: "HighLeads <onboarding@resend.dev>",
      to: [profile.email],
      subject: "Sua assinatura foi cancelada - HighLeads",
      html: `
        <h1>Olá, ${profile.nome}!</h1>
        <p>Confirmamos o cancelamento da sua assinatura do HighLeads.</p>
        <p><strong>Acesso até:</strong> ${endDate}</p>
        <p>Você continuará tendo acesso a todos os recursos até o final do período já pago.</p>
        <p>Sentiremos sua falta! Se mudar de ideia, você pode reativar sua assinatura a qualquer momento.</p>
        <br>
        <p>Atenciosamente,<br>Equipe HighLeads</p>
      `,
    });

    console.log(`Cancellation email sent to ${profile.email}`);
  } catch (error) {
    console.error('Error sending cancellation email:', error);
  }
}

async function sendPaymentSuccessEmail(
  supabase: any,
  invoice: Stripe.Invoice
) {
  try {
    if (!invoice.subscription) return;

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('account_id')
      .eq('stripe_subscription_id', invoice.subscription)
      .single();

    if (!subscription) return;

    const { data: account } = await supabase
      .from('accounts')
      .select('owner_id')
      .eq('id', subscription.account_id)
      .single();

    if (!account) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, nome')
      .eq('id', account.owner_id)
      .single();

    if (!profile) return;

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const amount = (invoice.amount_paid / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    await resend.emails.send({
      from: "HighLeads <onboarding@resend.dev>",
      to: [profile.email],
      subject: "Pagamento confirmado - HighLeads",
      html: `
        <h1>Olá, ${profile.nome}!</h1>
        <p>Seu pagamento foi processado com sucesso! 🎉</p>
        <p><strong>Valor:</strong> ${amount}</p>
        <p>Sua assinatura está ativa e você pode continuar aproveitando todos os recursos.</p>
        <p>Obrigado por confiar no HighLeads!</p>
        <br>
        <p>Atenciosamente,<br>Equipe HighLeads</p>
      `,
    });

    console.log(`Payment success email sent to ${profile.email}`);
  } catch (error) {
    console.error('Error sending payment success email:', error);
  }
}

async function sendPaymentFailedEmail(
  supabase: any,
  invoice: Stripe.Invoice
) {
  try {
    if (!invoice.subscription) return;

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('account_id')
      .eq('stripe_subscription_id', invoice.subscription)
      .single();

    if (!subscription) return;

    const { data: account } = await supabase
      .from('accounts')
      .select('owner_id')
      .eq('id', subscription.account_id)
      .single();

    if (!account) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, nome')
      .eq('id', account.owner_id)
      .single();

    if (!profile) return;

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const amount = (invoice.amount_due / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    await resend.emails.send({
      from: "HighLeads <onboarding@resend.dev>",
      to: [profile.email],
      subject: "Problema com pagamento - HighLeads",
      html: `
        <h1>Olá, ${profile.nome}!</h1>
        <p>Não conseguimos processar seu pagamento.</p>
        <p><strong>Valor pendente:</strong> ${amount}</p>
        <p>Por favor, atualize sua forma de pagamento para continuar usando o HighLeads sem interrupções.</p>
        <p>Você pode gerenciar seus dados de pagamento acessando a área de assinatura na plataforma.</p>
        <br>
        <p>Atenciosamente,<br>Equipe HighLeads</p>
      `,
    });

    console.log(`Payment failed email sent to ${profile.email}`);
  } catch (error) {
    console.error('Error sending payment failed email:', error);
  }
}