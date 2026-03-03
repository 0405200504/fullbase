-- Corrigir função get_accounts_with_stats para mostrar leads e faturamento corretos
DROP FUNCTION IF EXISTS get_accounts_with_stats();

CREATE OR REPLACE FUNCTION public.get_accounts_with_stats()
RETURNS TABLE(
  id uuid,
  nome_empresa text,
  owner_name text,
  owner_email text,
  created_at timestamp with time zone,
  num_users bigint,
  num_leads bigint,
  total_revenue numeric,
  plano text,
  ativo boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar lista de contas';
  END IF;

  RETURN QUERY
  SELECT 
    a.id,
    a.nome_empresa,
    p.nome as owner_name,
    p.email as owner_email,
    a.created_at,
    -- Contar usuários da conta
    (SELECT COUNT(*) FROM profiles WHERE account_id = a.id)::bigint as num_users,
    -- Contar leads não arquivados da conta
    (SELECT COUNT(*) FROM leads WHERE account_id = a.id AND arquivado = false)::bigint as num_leads,
    -- Somar faturamento de vendas não reembolsadas da conta
    (SELECT COALESCE(SUM(v.valor_final), 0) 
     FROM vendas v 
     WHERE v.account_id = a.id AND v.reembolsada = false) as total_revenue,
    a.plano,
    a.ativo
  FROM accounts a
  JOIN profiles p ON a.owner_id = p.id
  ORDER BY a.created_at DESC;
END;
$function$;