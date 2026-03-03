-- Função para super admin buscar conversas com dados do owner
CREATE OR REPLACE FUNCTION public.get_support_conversations()
RETURNS TABLE (
  id UUID,
  account_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  nome_empresa TEXT,
  owner_nome TEXT,
  owner_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verificar se é super admin
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas super admins podem acessar conversas de suporte';
  END IF;

  RETURN QUERY
  SELECT 
    c.id,
    c.account_id,
    c.status,
    c.created_at,
    c.updated_at,
    a.nome_empresa,
    p.nome as owner_nome,
    p.email as owner_email
  FROM conversations c
  JOIN accounts a ON c.account_id = a.id
  JOIN profiles p ON a.owner_id = p.id
  ORDER BY c.updated_at DESC;
END;
$$;