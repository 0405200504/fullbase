-- Atualizar função handle_new_user para criar owner com todas as roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Criar nova conta (empresa) para o usuário com plano FREE
  INSERT INTO public.accounts (nome_empresa, owner_id, ativo, plano)
  VALUES (company_name_var, NEW.id, true, 'free')
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
  
  -- Adicionar TODAS as roles para o owner da conta (admin, sdr, closer)
  INSERT INTO public.user_roles (user_id, role)
  VALUES 
    (NEW.id, 'admin'::app_role),
    (NEW.id, 'sdr'::app_role),
    (NEW.id, 'closer'::app_role);
  
  -- Criar etapas de funil padrão
  INSERT INTO public.etapas_funil (account_id, nome, ordem, cor, tipo_etapa, prazo_alerta_dias, ativo)
  VALUES
    (new_account_id, 'Lead', 1, '#3B82F6', 'lead', 3, true),
    (new_account_id, 'Qualificação', 2, '#8B5CF6', 'qualificacao', 5, true),
    (new_account_id, 'Call Agendada', 3, '#EC4899', 'call', 7, true),
    (new_account_id, 'Proposta', 4, '#F59E0B', 'proposta', 5, true),
    (new_account_id, 'Fechamento', 5, '#22C55E', 'fechamento', 3, true);
  
  RETURN NEW;
END;
$$;

-- Adicionar roles SDR e Closer para todos os owners existentes que só têm admin
DO $$
DECLARE
  owner_record RECORD;
BEGIN
  FOR owner_record IN 
    SELECT DISTINCT owner_id FROM public.accounts
  LOOP
    -- Adicionar role SDR se não existir
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = owner_record.owner_id AND role = 'sdr'::app_role
    ) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (owner_record.owner_id, 'sdr'::app_role);
    END IF;
    
    -- Adicionar role Closer se não existir
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = owner_record.owner_id AND role = 'closer'::app_role
    ) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (owner_record.owner_id, 'closer'::app_role);
    END IF;
  END LOOP;
END $$;