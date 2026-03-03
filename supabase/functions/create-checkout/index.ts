import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CHECKOUT] Iniciando criação de checkout session');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar autenticação
    console.log('[CHECKOUT] Verificando autenticação do usuário');
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      console.error('[CHECKOUT] Erro: Usuário não autenticado');
      throw new Error('Usuário não autenticado');
    }
    console.log(`[CHECKOUT] Usuário autenticado: ${user.id} (${user.email})`);

    // Buscar account_id do usuário
    console.log('[CHECKOUT] Buscando perfil do usuário');
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[CHECKOUT] Erro ao buscar perfil:', profileError);
    }

    if (!profile?.account_id) {
      console.error('[CHECKOUT] Erro: Perfil de usuário não encontrado');
      throw new Error('Perfil de usuário não encontrado');
    }
    console.log(`[CHECKOUT] Account ID encontrado: ${profile.account_id}`);

    const { priceId, planId, billingCycle } = await req.json();
    console.log(`[CHECKOUT] Parâmetros recebidos: priceId=${priceId}, planId=${planId}, billingCycle=${billingCycle}`);

    if (!priceId || !planId) {
      console.error('[CHECKOUT] Erro: Price ID ou Plan ID não fornecidos');
      throw new Error('Price ID e Plan ID são obrigatórios');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Criar ou buscar cliente no Stripe
    console.log('[CHECKOUT] Verificando se cliente já existe no Stripe');
    let customerId: string;
    
    const { data: existingSubscription } = await supabaseClient
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('account_id', profile.account_id)
      .single();

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id;
      console.log(`[CHECKOUT] Cliente existente encontrado: ${customerId}`);
    } else {
      console.log('[CHECKOUT] Criando novo cliente no Stripe');
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          account_id: profile.account_id,
          user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log(`[CHECKOUT] Novo cliente criado: ${customerId}`);
    }

    // Criar Checkout Session
    console.log('[CHECKOUT] Criando Checkout Session no Stripe');
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/pricing`,
      metadata: {
        account_id: profile.account_id,
        plan_id: planId,
        billing_cycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          account_id: profile.account_id,
          plan_id: planId,
        },
      },
    });

    console.log(`[CHECKOUT] Checkout Session criado com sucesso: ${session.id}`);
    console.log(`[CHECKOUT] URL de checkout: ${session.url}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[CHECKOUT] Erro ao criar checkout session:', error);
    console.error('[CHECKOUT] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
