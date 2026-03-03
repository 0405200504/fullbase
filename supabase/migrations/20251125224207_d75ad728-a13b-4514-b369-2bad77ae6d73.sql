-- Atualizar função handle_new_user para criar etapas de funil padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_account_id UUID;
  company_name_var TEXT;
BEGIN
  -- Pegar nome da empresa dos metadados ou usar nome do usuário
  company_name_var := COALESCE(
    NEW.raw_user_meta_data->>'company_name', 
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email) || '''s Company'
  );
  
  -- Criar nova conta (empresa) para o usuário
  INSERT INTO public.accounts (nome_empresa, owner_id, ativo, plano)
  VALUES (company_name_var, NEW.id, true, 'basic')
  RETURNING id INTO new_account_id;
  
  -- Criar perfil do usuário vinculado à conta
  INSERT INTO public.profiles (id, nome, email, funcao, account_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    'admin',
    new_account_id
  );
  
  -- Adicionar role de admin para o owner da conta
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  -- Criar etapas de funil padrão
  INSERT INTO public.etapas_funil (account_id, nome, ordem, cor, tipo_etapa, prazo_alerta_dias, ativo)
  VALUES
    (new_account_id, 'Novo Lead', 1, '#3B82F6', 'inicial', 3, true),
    (new_account_id, 'Qualificação', 2, '#8B5CF6', 'qualificacao', 5, true),
    (new_account_id, 'Apresentação', 3, '#EC4899', 'apresentacao', 7, true),
    (new_account_id, 'Proposta Enviada', 4, '#F59E0B', 'proposta', 5, true),
    (new_account_id, 'Negociação', 5, '#10B981', 'negociacao', 7, true),
    (new_account_id, 'Fechamento', 6, '#22C55E', 'fechamento', 3, true),
    (new_account_id, 'Perdido', 7, '#EF4444', 'perdido', NULL, true);
  
  RETURN NEW;
END;
$$;