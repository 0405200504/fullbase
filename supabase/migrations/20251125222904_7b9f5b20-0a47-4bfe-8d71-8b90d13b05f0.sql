-- Atualizar função update_user_roles para verificar se usuários estão na mesma conta
CREATE OR REPLACE FUNCTION public.update_user_roles(target_user_id uuid, new_roles app_role[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result_count INTEGER;
  current_user_account_id UUID;
  target_user_account_id UUID;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem atualizar roles de usuários';
  END IF;

  -- Buscar account_id do usuário atual
  SELECT account_id INTO current_user_account_id
  FROM profiles
  WHERE id = auth.uid();

  -- Buscar account_id do usuário alvo
  SELECT account_id INTO target_user_account_id
  FROM profiles
  WHERE id = target_user_id;

  -- Verificar se ambos estão na mesma conta
  IF current_user_account_id IS NULL OR target_user_account_id IS NULL THEN
    RAISE EXCEPTION 'Perfis não encontrados';
  END IF;

  IF current_user_account_id != target_user_account_id THEN
    RAISE EXCEPTION 'Você só pode gerenciar usuários da sua própria conta';
  END IF;

  -- Deletar roles antigas do usuário
  DELETE FROM user_roles WHERE user_id = target_user_id;

  -- Inserir novas roles
  IF array_length(new_roles, 1) > 0 THEN
    INSERT INTO user_roles (user_id, role)
    SELECT target_user_id, unnest(new_roles);
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
  ELSE
    result_count := 0;
  END IF;

  -- Retornar resultado como JSON
  RETURN json_build_object(
    'success', true,
    'user_id', target_user_id,
    'roles_count', result_count
  );
END;
$$;