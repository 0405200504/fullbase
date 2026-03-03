-- Função para buscar ranking de faturamento dos usuários
CREATE OR REPLACE FUNCTION public.get_revenue_ranking(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  account_name TEXT,
  foto_url TEXT,
  total_revenue NUMERIC,
  total_leads BIGINT,
  total_calls BIGINT,
  attended_calls BIGINT,
  show_rate NUMERIC,
  total_sales BIGINT,
  conversion_rate NUMERIC,
  rank_position INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;