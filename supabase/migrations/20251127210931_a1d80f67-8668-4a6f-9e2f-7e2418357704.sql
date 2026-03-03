-- Tabela de Planos
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  stripe_product_id TEXT,
  
  -- Limites do plano
  max_leads INTEGER NOT NULL DEFAULT 25,
  max_users INTEGER NOT NULL DEFAULT 1,
  has_priority_support BOOLEAN DEFAULT false,
  has_export BOOLEAN DEFAULT false,
  history_days INTEGER NOT NULL DEFAULT 15,
  
  -- Metadata
  features JSONB DEFAULT '[]'::jsonb,
  is_popular BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir planos padrão
INSERT INTO public.plans (name, display_name, description, price_monthly, price_yearly, max_leads, max_users, has_priority_support, has_export, history_days, is_popular, features) VALUES
  ('free', 'Free', 'Para começar', 0, 0, 25, 1, false, false, 15, false, 
   '["25 leads", "1 usuário", "15 dias de histórico"]'::jsonb),
  ('basic', 'Básico', 'Para pequenas equipes', 47, 470, 200, 2, true, true, 90, false,
   '["200 leads", "2 usuários", "Suporte via chat", "90 dias de histórico", "Exportar dados"]'::jsonb),
  ('pro', 'Pro', 'Para equipes em crescimento', 97, 970, 1000, 5, true, true, 365, true,
   '["1000 leads", "5 usuários", "Suporte prioritário", "1 ano de histórico", "Exportar dados", "Integrações avançadas"]'::jsonb),
  ('enterprise', 'Enterprise', 'Para grandes operações', 497, 4970, 8000, 999, true, true, 999999, false,
   '["8000 leads", "Usuários ilimitados", "Suporte dedicado", "Histórico ilimitado", "Exportar dados", "Integrações personalizadas"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Tabela de Assinaturas
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  
  -- Stripe data
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  
  -- Status e período
  status TEXT NOT NULL DEFAULT 'active', -- active, canceled, past_due, trialing, paused
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
  
  -- Datas importantes
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Limites customizados (se diferentes do plano)
  custom_max_leads INTEGER,
  custom_max_users INTEGER,
  is_lifetime BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(account_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_account_id ON public.subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Tabela de Histórico de Uso (para tracking)
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  
  -- Contadores
  current_leads_count INTEGER DEFAULT 0,
  current_users_count INTEGER DEFAULT 0,
  
  -- Período de reset
  last_reset_at TIMESTAMPTZ DEFAULT now(),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(account_id)
);

-- Tabela de Webhooks do Stripe (para auditoria e retry)
CREATE TABLE IF NOT EXISTS public.stripe_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_event_id ON public.stripe_webhooks(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhooks_processed ON public.stripe_webhooks(processed);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies para Plans (todos podem ver planos ativos)
CREATE POLICY "Anyone can view active plans"
  ON public.plans FOR SELECT
  USING (active = true);

CREATE POLICY "Super admins can manage plans"
  ON public.plans FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies para Subscriptions
CREATE POLICY "Users can view their account subscription"
  ON public.subscriptions FOR SELECT
  USING (account_id = get_user_account_id());

CREATE POLICY "Super admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies para Usage Tracking
CREATE POLICY "Users can view their account usage"
  ON public.usage_tracking FOR SELECT
  USING (account_id = get_user_account_id());

CREATE POLICY "Super admins can view all usage"
  ON public.usage_tracking FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies para Stripe Webhooks (apenas super admins)
CREATE POLICY "Super admins can view webhooks"
  ON public.stripe_webhooks FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_subscription()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_subscription();

CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_subscription();

-- Função para obter o plano atual da conta
CREATE OR REPLACE FUNCTION public.get_account_plan(p_account_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'plan_name', p.name,
    'plan_display_name', p.display_name,
    'max_leads', COALESCE(s.custom_max_leads, p.max_leads),
    'max_users', COALESCE(s.custom_max_users, p.max_users),
    'has_priority_support', p.has_priority_support,
    'has_export', p.has_export,
    'history_days', p.history_days,
    'is_lifetime', COALESCE(s.is_lifetime, false),
    'subscription_status', s.status,
    'current_period_end', s.current_period_end
  ) INTO v_result
  FROM public.subscriptions s
  JOIN public.plans p ON s.plan_id = p.id
  WHERE s.account_id = p_account_id;
  
  -- Se não tem assinatura, retornar plano free
  IF v_result IS NULL THEN
    SELECT jsonb_build_object(
      'plan_name', 'free',
      'plan_display_name', 'Free',
      'max_leads', max_leads,
      'max_users', max_users,
      'has_priority_support', has_priority_support,
      'has_export', has_export,
      'history_days', history_days,
      'is_lifetime', false,
      'subscription_status', 'free',
      'current_period_end', null
    ) INTO v_result
    FROM public.plans
    WHERE name = 'free';
  END IF;
  
  RETURN v_result;
END;
$$;

-- Função para verificar se a conta pode adicionar mais leads
CREATE OR REPLACE FUNCTION public.can_add_lead(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan JSONB;
  v_current_count INTEGER;
  v_max_leads INTEGER;
BEGIN
  -- Obter plano da conta
  v_plan := get_account_plan(p_account_id);
  v_max_leads := (v_plan->>'max_leads')::INTEGER;
  
  -- Contar leads ativos (não arquivados)
  SELECT COUNT(*) INTO v_current_count
  FROM public.leads
  WHERE account_id = p_account_id
    AND arquivado = false;
  
  RETURN v_current_count < v_max_leads;
END;
$$;

-- Função para verificar se a conta pode adicionar mais usuários
CREATE OR REPLACE FUNCTION public.can_add_user(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan JSONB;
  v_current_count INTEGER;
  v_max_users INTEGER;
BEGIN
  -- Obter plano da conta
  v_plan := get_account_plan(p_account_id);
  v_max_users := (v_plan->>'max_users')::INTEGER;
  
  -- Contar usuários da conta
  SELECT COUNT(*) INTO v_current_count
  FROM public.profiles
  WHERE account_id = p_account_id;
  
  -- 999 significa ilimitado (enterprise)
  IF v_max_users >= 999 THEN
    RETURN true;
  END IF;
  
  RETURN v_current_count < v_max_users;
END;
$$;