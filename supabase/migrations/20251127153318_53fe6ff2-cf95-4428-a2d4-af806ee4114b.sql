-- ====================================
-- FUNCIONALIDADE 2: LOGS DE ATIVIDADE
-- ====================================

-- Criar tabela de logs de atividade
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_account_id ON activity_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);

-- RLS para activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Super admin pode ver todos os logs
CREATE POLICY "Super admins podem ver todos os logs"
ON activity_logs FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Users podem ver logs de sua conta
CREATE POLICY "Users podem ver logs da sua conta"
ON activity_logs FOR SELECT
USING (account_id = get_user_account_id());

-- Sistema pode inserir logs
CREATE POLICY "Sistema pode inserir logs"
ON activity_logs FOR INSERT
WITH CHECK (true);

-- Função para registrar log de atividade
CREATE OR REPLACE FUNCTION log_activity(
  p_account_id UUID,
  p_user_id UUID,
  p_action_type TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO activity_logs (account_id, user_id, action_type, details)
  VALUES (p_account_id, p_user_id, p_action_type, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Trigger para logar criação de leads
CREATE OR REPLACE FUNCTION trigger_log_lead_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM log_activity(
    NEW.account_id,
    auth.uid(),
    'lead_created',
    jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.nome)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_lead_created ON leads;
CREATE TRIGGER log_lead_created
AFTER INSERT ON leads
FOR EACH ROW
EXECUTE FUNCTION trigger_log_lead_created();

-- Trigger para logar atualização de leads
CREATE OR REPLACE FUNCTION trigger_log_lead_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.etapa_id IS DISTINCT FROM NEW.etapa_id THEN
    PERFORM log_activity(
      NEW.account_id,
      auth.uid(),
      'lead_stage_changed',
      jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.nome, 'old_stage', OLD.etapa_id, 'new_stage', NEW.etapa_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_lead_updated ON leads;
CREATE TRIGGER log_lead_updated
AFTER UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION trigger_log_lead_updated();

-- Trigger para logar vendas
CREATE OR REPLACE FUNCTION trigger_log_sale_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM log_activity(
    NEW.account_id,
    auth.uid(),
    'sale_registered',
    jsonb_build_object('sale_id', NEW.id, 'lead_id', NEW.lead_id, 'amount', NEW.valor_final)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_sale_created ON vendas;
CREATE TRIGGER log_sale_created
AFTER INSERT ON vendas
FOR EACH ROW
EXECUTE FUNCTION trigger_log_sale_created();

-- Trigger para logar criação de produtos
CREATE OR REPLACE FUNCTION trigger_log_product_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM log_activity(
    NEW.account_id,
    auth.uid(),
    'product_created',
    jsonb_build_object('product_id', NEW.id, 'product_name', NEW.nome)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_product_created ON produtos;
CREATE TRIGGER log_product_created
AFTER INSERT ON produtos
FOR EACH ROW
EXECUTE FUNCTION trigger_log_product_created();

-- Trigger para logar criação de metas
CREATE OR REPLACE FUNCTION trigger_log_goal_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM log_activity(
    NEW.account_id,
    auth.uid(),
    'goal_created',
    jsonb_build_object('goal_id', NEW.id, 'goal_name', NEW.nome, 'amount', NEW.valor_mensal)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_goal_created ON metas;
CREATE TRIGGER log_goal_created
AFTER INSERT ON metas
FOR EACH ROW
EXECUTE FUNCTION trigger_log_goal_created();

-- Trigger para logar adição de membros da equipe
CREATE OR REPLACE FUNCTION trigger_log_team_member_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Não logar o primeiro perfil (owner)
  IF (SELECT COUNT(*) FROM profiles WHERE account_id = NEW.account_id) > 1 THEN
    PERFORM log_activity(
      NEW.account_id,
      NEW.id,
      'team_member_added',
      jsonb_build_object('user_id', NEW.id, 'user_name', NEW.nome, 'user_email', NEW.email)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_team_member_added ON profiles;
CREATE TRIGGER log_team_member_added
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_log_team_member_added();

-- ====================================
-- FUNCIONALIDADE 3: ANÁLISE DE USO DE FEATURES
-- ====================================

-- Função para calcular adoção de features
CREATE OR REPLACE FUNCTION get_feature_adoption_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_total_accounts INTEGER;
  v_accounts_with_goals INTEGER;
  v_accounts_with_team INTEGER;
  v_accounts_with_products INTEGER;
  v_accounts_with_sales INTEGER;
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar estatísticas de adoção';
  END IF;

  -- Total de contas ativas
  SELECT COUNT(*) INTO v_total_accounts
  FROM accounts
  WHERE ativo = true;

  -- Contas com metas
  SELECT COUNT(DISTINCT account_id) INTO v_accounts_with_goals
  FROM metas
  WHERE ativo = true;

  -- Contas com mais de 1 membro (tem equipe)
  SELECT COUNT(*) INTO v_accounts_with_team
  FROM (
    SELECT account_id
    FROM profiles
    GROUP BY account_id
    HAVING COUNT(*) > 1
  ) sub;

  -- Contas com produtos
  SELECT COUNT(DISTINCT account_id) INTO v_accounts_with_products
  FROM produtos
  WHERE ativo = true;

  -- Contas com vendas
  SELECT COUNT(DISTINCT account_id) INTO v_accounts_with_sales
  FROM vendas
  WHERE reembolsada = false;

  RETURN json_build_object(
    'total_accounts', v_total_accounts,
    'goals_adoption', CASE WHEN v_total_accounts > 0 
      THEN ROUND((v_accounts_with_goals::numeric / v_total_accounts) * 100, 1) 
      ELSE 0 END,
    'team_adoption', CASE WHEN v_total_accounts > 0 
      THEN ROUND((v_accounts_with_team::numeric / v_total_accounts) * 100, 1) 
      ELSE 0 END,
    'products_adoption', CASE WHEN v_total_accounts > 0 
      THEN ROUND((v_accounts_with_products::numeric / v_total_accounts) * 100, 1) 
      ELSE 0 END,
    'sales_adoption', CASE WHEN v_total_accounts > 0 
      THEN ROUND((v_accounts_with_sales::numeric / v_total_accounts) * 100, 1) 
      ELSE 0 END
  );
END;
$$;

-- ====================================
-- FUNCIONALIDADE 4: COMPARAÇÃO DE NICHOS
-- ====================================

-- Função para análise comparativa por nicho
CREATE OR REPLACE FUNCTION get_niche_comparison()
RETURNS TABLE (
  niche TEXT,
  num_accounts BIGINT,
  total_sales BIGINT,
  total_revenue NUMERIC,
  avg_ticket NUMERIC,
  avg_conversion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar análise por nicho';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(p.niche, 'Não especificado') as niche,
    COUNT(DISTINCT a.id) as num_accounts,
    COUNT(DISTINCT v.id) as total_sales,
    COALESCE(SUM(v.valor_final), 0) as total_revenue,
    CASE 
      WHEN COUNT(DISTINCT v.id) > 0 
      THEN ROUND(COALESCE(SUM(v.valor_final), 0) / COUNT(DISTINCT v.id), 2)
      ELSE 0
    END as avg_ticket,
    CASE 
      WHEN COUNT(DISTINCT l.id) > 0 
      THEN ROUND((COUNT(DISTINCT v.id)::numeric / COUNT(DISTINCT l.id)) * 100, 1)
      ELSE 0
    END as avg_conversion_rate
  FROM accounts a
  JOIN profiles p ON a.owner_id = p.id
  LEFT JOIN leads l ON l.account_id = a.id
  LEFT JOIN vendas v ON v.account_id = a.id AND v.reembolsada = false
  WHERE a.ativo = true
  GROUP BY p.niche
  ORDER BY total_revenue DESC;
END;
$$;