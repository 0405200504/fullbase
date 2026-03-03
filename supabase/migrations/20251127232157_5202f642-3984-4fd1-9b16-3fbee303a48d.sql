-- Atualizar função get_revenue_ranking para excluir super admins
CREATE OR REPLACE FUNCTION public.get_revenue_ranking(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date)
RETURNS TABLE(user_id uuid, user_name text, user_email text, account_name text, foto_url text, total_revenue numeric, total_leads bigint, total_calls bigint, attended_calls bigint, show_rate numeric, total_sales bigint, conversion_rate numeric, rank_position integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se é super admin
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar ranking de faturamento';
  END IF;

  RETURN QUERY
  WITH user_metrics AS (
    SELECT 
      p.id as user_id,
      p.nome as user_name,
      p.email as user_email,
      a.nome_empresa as account_name,
      p.foto_url,
      -- Faturamento total
      COALESCE((
        SELECT SUM(v.valor_final)
        FROM vendas v
        WHERE v.closer_id = p.id
          AND v.reembolsada = false
          AND (start_date IS NULL OR v.data_fechamento >= start_date)
          AND (end_date IS NULL OR v.data_fechamento <= end_date)
      ), 0) as total_revenue,
      -- Total de leads atribuídos
      COALESCE((
        SELECT COUNT(*)
        FROM leads l
        WHERE (l.closer_id = p.id OR l.sdr_id = p.id)
          AND (start_date IS NULL OR l.created_at >= start_date::TIMESTAMP)
          AND (end_date IS NULL OR l.created_at <= (end_date::TIMESTAMP + INTERVAL '23 hours 59 minutes 59 seconds'))
      ), 0) as total_leads,
      -- Total de calls
      COALESCE((
        SELECT COUNT(*)
        FROM calls c
        WHERE c.closer_id = p.id
          AND (start_date IS NULL OR c.created_at >= start_date::TIMESTAMP)
          AND (end_date IS NULL OR c.created_at <= (end_date::TIMESTAMP + INTERVAL '23 hours 59 minutes 59 seconds'))
      ), 0) as total_calls,
      -- Calls com comparecimento
      COALESCE((
        SELECT COUNT(*)
        FROM calls c
        WHERE c.closer_id = p.id
          AND c.resultado = 'compareceu'
          AND (start_date IS NULL OR c.created_at >= start_date::TIMESTAMP)
          AND (end_date IS NULL OR c.created_at <= (end_date::TIMESTAMP + INTERVAL '23 hours 59 minutes 59 seconds'))
      ), 0) as attended_calls,
      -- Total de vendas
      COALESCE((
        SELECT COUNT(*)
        FROM vendas v
        WHERE v.closer_id = p.id
          AND v.reembolsada = false
          AND (start_date IS NULL OR v.data_fechamento >= start_date)
          AND (end_date IS NULL OR v.data_fechamento <= end_date)
      ), 0) as total_sales
    FROM profiles p
    JOIN accounts a ON p.account_id = a.id
    WHERE p.funcao IN ('closer'::app_role, 'admin'::app_role, 'sdr'::app_role)
      -- Excluir super admins
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = p.id 
        AND ur.role = 'super_admin'::app_role
      )
  )
  SELECT 
    um.user_id,
    um.user_name,
    um.user_email,
    um.account_name,
    um.foto_url,
    um.total_revenue,
    um.total_leads,
    um.total_calls,
    um.attended_calls,
    -- Taxa de comparecimento
    CASE 
      WHEN um.total_calls > 0 
      THEN ROUND((um.attended_calls::numeric / um.total_calls) * 100, 1)
      ELSE 0 
    END as show_rate,
    um.total_sales,
    -- Taxa de conversão
    CASE 
      WHEN um.total_leads > 0 
      THEN ROUND((um.total_sales::numeric / um.total_leads) * 100, 1)
      ELSE 0 
    END as conversion_rate,
    ROW_NUMBER() OVER (ORDER BY um.total_revenue DESC)::INTEGER as rank_position
  FROM user_metrics um
  WHERE um.total_revenue > 0 OR um.total_leads > 0
  ORDER BY um.total_revenue DESC;
END;
$function$;

-- Atualizar função get_active_vs_inactive_users para considerar apenas usuários que adicionaram leads
CREATE OR REPLACE FUNCTION public.get_active_vs_inactive_users(start_date date, end_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_active_count INTEGER;
  v_inactive_count INTEGER;
  v_total_count INTEGER;
BEGIN
  -- Verificar se é super admin
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar estatísticas de usuários';
  END IF;

  -- Total de usuários (excluindo super admins)
  SELECT COUNT(*) INTO v_total_count
  FROM profiles p
  WHERE p.funcao != 'super_admin'::app_role
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.id 
      AND ur.role = 'super_admin'::app_role
    );

  -- Usuários ativos: quem adicionou pelo menos 1 lead no período
  SELECT COUNT(DISTINCT user_id) INTO v_active_count
  FROM (
    SELECT DISTINCT l.sdr_id as user_id
    FROM leads l
    WHERE l.sdr_id IS NOT NULL
      AND l.created_at >= start_date::TIMESTAMP 
      AND l.created_at <= end_date::TIMESTAMP + INTERVAL '23 hours 59 minutes 59 seconds'
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = l.sdr_id 
        AND ur.role = 'super_admin'::app_role
      )
    
    UNION
    
    SELECT DISTINCT l.closer_id as user_id
    FROM leads l
    WHERE l.closer_id IS NOT NULL
      AND l.created_at >= start_date::TIMESTAMP 
      AND l.created_at <= end_date::TIMESTAMP + INTERVAL '23 hours 59 minutes 59 seconds'
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur 
        WHERE ur.user_id = l.closer_id 
        AND ur.role = 'super_admin'::app_role
      )
  ) active_users
  WHERE user_id IS NOT NULL;

  -- Usuários inativos
  v_inactive_count := v_total_count - v_active_count;

  RETURN json_build_object(
    'active_users', v_active_count,
    'inactive_users', v_inactive_count,
    'total_users', v_total_count,
    'active_percentage', CASE 
      WHEN v_total_count > 0 
      THEN ROUND((v_active_count::numeric / v_total_count) * 100, 1)
      ELSE 0 
    END,
    'inactive_percentage', CASE 
      WHEN v_total_count > 0 
      THEN ROUND((v_inactive_count::numeric / v_total_count) * 100, 1)
      ELSE 0 
    END
  );
END;
$function$;