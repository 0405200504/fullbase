-- Função para calcular métricas de crescimento avançadas
CREATE OR REPLACE FUNCTION public.get_growth_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_accounts INTEGER;
  v_activated_accounts INTEGER;
  v_avg_days_to_first_sale NUMERIC;
  v_inactive_accounts INTEGER;
  v_churn_rate NUMERIC;
  v_activation_rate NUMERIC;
BEGIN
  -- Verificar se é super admin
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar métricas de crescimento';
  END IF;

  -- Total de contas ativas
  SELECT COUNT(*) INTO v_total_accounts
  FROM accounts
  WHERE ativo = true;

  -- Taxa de Ativação: contas que completaram pelo menos 2 ações-chave
  -- (criar meta OU adicionar equipe OU registrar venda)
  WITH account_actions AS (
    SELECT 
      a.id,
      CASE WHEN EXISTS(SELECT 1 FROM metas WHERE account_id = a.id) THEN 1 ELSE 0 END +
      CASE WHEN (SELECT COUNT(*) FROM profiles WHERE account_id = a.id) > 1 THEN 1 ELSE 0 END +
      CASE WHEN EXISTS(SELECT 1 FROM vendas WHERE account_id = a.id AND reembolsada = false) THEN 1 ELSE 0 END as action_count
    FROM accounts a
    WHERE a.ativo = true
  )
  SELECT COUNT(*) INTO v_activated_accounts
  FROM account_actions
  WHERE action_count >= 2;

  v_activation_rate := CASE 
    WHEN v_total_accounts > 0 
    THEN ROUND((v_activated_accounts::numeric / v_total_accounts) * 100, 1)
    ELSE 0 
  END;

  -- Tempo médio para primeira venda (em dias)
  WITH first_sales AS (
    SELECT 
      a.id as account_id,
      a.created_at as account_created,
      MIN(v.data_fechamento) as first_sale_date
    FROM accounts a
    JOIN vendas v ON v.account_id = a.id
    WHERE v.reembolsada = false
    GROUP BY a.id, a.created_at
  )
  SELECT ROUND(AVG(EXTRACT(EPOCH FROM (first_sale_date::timestamp - account_created)) / 86400), 1)
  INTO v_avg_days_to_first_sale
  FROM first_sales;

  -- Taxa de Churn: contas sem atividade nos últimos 30 dias
  -- Considera atividade como: leads criados/atualizados, calls, vendas
  WITH account_last_activity AS (
    SELECT 
      a.id,
      GREATEST(
        (SELECT MAX(created_at) FROM leads WHERE account_id = a.id),
        (SELECT MAX(updated_at) FROM leads WHERE account_id = a.id),
        (SELECT MAX(created_at) FROM calls WHERE account_id = a.id),
        (SELECT MAX(created_at) FROM vendas WHERE account_id = a.id),
        a.created_at
      ) as last_activity
    FROM accounts a
    WHERE a.ativo = true
  )
  SELECT COUNT(*) INTO v_inactive_accounts
  FROM account_last_activity
  WHERE last_activity < NOW() - INTERVAL '30 days';

  v_churn_rate := CASE 
    WHEN v_total_accounts > 0 
    THEN ROUND((v_inactive_accounts::numeric / v_total_accounts) * 100, 1)
    ELSE 0 
  END;

  RETURN json_build_object(
    'total_accounts', v_total_accounts,
    'activated_accounts', v_activated_accounts,
    'activation_rate', v_activation_rate,
    'avg_days_to_first_sale', COALESCE(v_avg_days_to_first_sale, 0),
    'inactive_accounts', v_inactive_accounts,
    'churn_rate', v_churn_rate
  );
END;
$$;