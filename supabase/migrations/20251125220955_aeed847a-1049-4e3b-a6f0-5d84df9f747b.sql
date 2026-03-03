-- ============================================
-- SISTEMA MULTI-TENANT - CORREÇÃO E IMPLEMENTAÇÃO
-- ============================================

-- 1. Criar accounts para profiles que não têm
DO $$ 
DECLARE
  profile_record RECORD;
  new_account_id UUID;
BEGIN
  FOR profile_record IN 
    SELECT id, nome, email 
    FROM public.profiles 
    WHERE account_id IS NULL
  LOOP
    -- Criar account para cada profile sem account
    INSERT INTO public.accounts (nome_empresa, owner_id, ativo, plano)
    VALUES (
      profile_record.nome || '''s Company',
      profile_record.id,
      true,
      'basic'
    )
    RETURNING id INTO new_account_id;
    
    -- Atualizar profile com o account_id
    UPDATE public.profiles
    SET account_id = new_account_id
    WHERE id = profile_record.id;
  END LOOP;
END $$;

-- 2. Atualizar função para criar account automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  RETURN NEW;
END;
$function$;

-- 3. Agora tornar account_id obrigatório
ALTER TABLE public.profiles
  ALTER COLUMN account_id SET NOT NULL;

-- 4. Criar função helper para pegar account_id
CREATE OR REPLACE FUNCTION public.get_user_account_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT account_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 5. PROFILES - Políticas por conta
DROP POLICY IF EXISTS "Usuários podem ver todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil" ON public.profiles;

CREATE POLICY "Usuários veem perfis da mesma conta"
ON public.profiles FOR SELECT
USING (account_id = get_user_account_id());

CREATE POLICY "Usuários podem atualizar próprio perfil"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);