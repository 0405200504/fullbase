-- Função para buscar usuários mais ativos no período
CREATE OR REPLACE FUNCTION public.get_top_active_users(
  start_date DATE,
  end_date DATE,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  account_name TEXT,
  total_activities BIGINT,
  leads_created BIGINT,
  leads_updated BIGINT,
  sales_count BIGINT,
  calls_count BIGINT,
  last_activity TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verificar se é super admin
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar lista de usuários ativos';
  END IF;

  RETURN QUERY
  WITH user_activities AS (
    SELECT 
      p.id as user_id,
      p.nome as user_name,
      p.email as user_email,
      a.nome_empresa as account_name,
      -- Leads criados
      (SELECT COUNT(*) FROM leads l 
       WHERE (l.sdr_id = p.id OR l.closer_id = p.id)
       AND l.created_at >= start_date::TIMESTAMP 
       AND l.created_at <= end_date::TIMESTAMP + INTERVAL '23 hours 59 minutes 59 seconds'
      ) as leads_created,
      -- Leads atualizados
      (SELECT COUNT(*) FROM leads l 
       WHERE (l.sdr_id = p.id OR l.closer_id = p.id)
       AND l.updated_at >= start_date::TIMESTAMP 
       AND l.updated_at <= end_date::TIMESTAMP + INTERVAL '23 hours 59 minutes 59 seconds'
       AND l.updated_at > l.created_at
      ) as leads_updated,
      -- Vendas
      (SELECT COUNT(*) FROM vendas v 
       WHERE v.closer_id = p.id
       AND v.created_at >= start_date::TIMESTAMP 
       AND v.created_at <= end_date::TIMESTAMP + INTERVAL '23 hours 59 minutes 59 seconds'
      ) as sales_count,
      -- Calls
      (SELECT COUNT(*) FROM calls c 
       WHERE c.closer_id = p.id
       AND c.created_at >= start_date::TIMESTAMP 
       AND c.created_at <= end_date::TIMESTAMP + INTERVAL '23 hours 59 minutes 59 seconds'
      ) as calls_count,
      -- Última atividade
      GREATEST(
        (SELECT MAX(created_at) FROM leads l WHERE l.sdr_id = p.id OR l.closer_id = p.id),
        (SELECT MAX(updated_at) FROM leads l WHERE l.sdr_id = p.id OR l.closer_id = p.id),
        (SELECT MAX(created_at) FROM vendas v WHERE v.closer_id = p.id),
        (SELECT MAX(created_at) FROM calls c WHERE c.closer_id = p.id)
      ) as last_activity
    FROM profiles p
    JOIN accounts a ON p.account_id = a.id
    WHERE p.funcao != 'super_admin'::app_role
  )
  SELECT 
    ua.user_id,
    ua.user_name,
    ua.user_email,
    ua.account_name,
    (ua.leads_created + ua.leads_updated + ua.sales_count + ua.calls_count) as total_activities,
    ua.leads_created,
    ua.leads_updated,
    ua.sales_count,
    ua.calls_count,
    ua.last_activity
  FROM user_activities ua
  WHERE (ua.leads_created + ua.leads_updated + ua.sales_count + ua.calls_count) > 0
  ORDER BY total_activities DESC
  LIMIT limit_count;
END;
$$;

-- Função para contar usuários ativos vs inativos
CREATE OR REPLACE FUNCTION public.get_active_vs_inactive_users(
  start_date DATE,
  end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  FROM profiles
  WHERE funcao != 'super_admin'::app_role;

  -- Usuários ativos (com atividade no período)
  SELECT COUNT(DISTINCT user_id) INTO v_active_count
  FROM (
    SELECT DISTINCT COALESCE(l.sdr_id, l.closer_id) as user_id
    FROM leads l
    WHERE (l.created_at >= start_date::TIMESTAMP 
           AND l.created_at <= end_date::TIMESTAMP + INTERVAL '23 hours 59 minutes 59 seconds')
       OR (l.updated_at >= start_date::TIMESTAMP 
           AND l.updated_at <= end_date::TIMESTAMP + INTERVAL '23 hours 59 minutes 59 seconds')
    
    UNION
    
    SELECT DISTINCT v.closer_id as user_id
    FROM vendas v
    WHERE v.created_at >= start_date::TIMESTAMP 
      AND v.created_at <= end_date::TIMESTAMP + INTERVAL '23 hours 59 minutes 59 seconds'
    
    UNION
    
    SELECT DISTINCT c.closer_id as user_id
    FROM calls c
    WHERE c.created_at >= start_date::TIMESTAMP 
      AND c.created_at <= end_date::TIMESTAMP + INTERVAL '23 hours 59 minutes 59 seconds'
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
$$;