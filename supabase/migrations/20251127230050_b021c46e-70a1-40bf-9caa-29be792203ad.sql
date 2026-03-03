-- Função para buscar usuários ativos por período
CREATE OR REPLACE FUNCTION public.get_active_users_over_time(
  start_date DATE,
  end_date DATE,
  granularity TEXT DEFAULT 'day'
)
RETURNS TABLE(
  period_start TIMESTAMP WITH TIME ZONE,
  period_label TEXT,
  active_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se é super admin
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar estatísticas de usuários ativos';
  END IF;

  RETURN QUERY
  WITH date_series AS (
    SELECT 
      date_trunc(granularity, d)::TIMESTAMP WITH TIME ZONE as period_start,
      CASE 
        WHEN granularity = 'day' THEN to_char(d, 'DD/MM')
        WHEN granularity = 'week' THEN 'Sem ' || to_char(d, 'IW')
        WHEN granularity = 'month' THEN to_char(d, 'Mon')
        ELSE to_char(d, 'DD/MM/YYYY')
      END as period_label
    FROM generate_series(
      date_trunc(granularity, start_date::TIMESTAMP),
      date_trunc(granularity, end_date::TIMESTAMP),
      ('1 ' || granularity)::INTERVAL
    ) as d
  )
  SELECT
    ds.period_start,
    ds.period_label,
    -- Contar usuários que criaram/atualizaram leads, vendas ou calls no período
    COUNT(DISTINCT COALESCE(l.sdr_id, l.closer_id, v.closer_id, c.closer_id))::BIGINT as active_users
  FROM date_series ds
  LEFT JOIN leads l ON (
    (l.created_at >= ds.period_start 
     AND l.created_at < ds.period_start + ('1 ' || granularity)::INTERVAL)
    OR
    (l.updated_at >= ds.period_start 
     AND l.updated_at < ds.period_start + ('1 ' || granularity)::INTERVAL)
  )
  LEFT JOIN vendas v ON (
    v.created_at >= ds.period_start 
    AND v.created_at < ds.period_start + ('1 ' || granularity)::INTERVAL
  )
  LEFT JOIN calls c ON (
    c.created_at >= ds.period_start 
    AND c.created_at < ds.period_start + ('1 ' || granularity)::INTERVAL
  )
  GROUP BY ds.period_start, ds.period_label
  ORDER BY ds.period_start;
END;
$$;