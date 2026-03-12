-- ====================================================================
-- CORREÇÃO DE ISOLAMENTO DE DADOS E REFORÇO DE SEGURANÇA (Multi-tenancy)
-- ====================================================================

-- 1. IDENTIFICAR E SEPARAR CONTAS COMPARTILHADAS (LIMPEZA RETROATIVA)
DO $$
DECLARE
    profile_rec RECORD;
    new_acc_id UUID;
    v_company_name TEXT;
BEGIN
    -- Procurar por perfis que compartilham o mesmo account_id,
    -- mas NÃO são o owner da conta e a conta tem mais de 1 usuário vinculado.
    -- Focamos especialmente na conta 'FullBase Init' se ela ainda existir.
    
    FOR profile_rec IN 
        SELECT p.id, p.nome, p.email, p.account_id
        FROM public.profiles p
        JOIN public.accounts a ON p.account_id = a.id
        WHERE a.owner_id != p.id -- O usuário não é o dono da conta que ele está usando
        AND (
            SELECT COUNT(*) 
            FROM public.profiles p2 
            WHERE p2.account_id = p.account_id
        ) > 1 -- A conta tem mais de um usuário
    LOOP
        -- Se chegamos aqui, este perfil está em uma conta que ele não é o dono.
        -- Vamos criar uma conta exclusiva para ele.
        
        v_company_name := COALESCE(profile_rec.nome, split_part(profile_rec.email, '@', 1)) || '''s Company';
        
        -- Criar nova conta
        INSERT INTO public.accounts (nome_empresa, owner_id, plano)
        VALUES (v_company_name, profile_rec.id, 'free')
        RETURNING id INTO new_acc_id;
        
        -- Atualizar o perfil do usuário para apontar para a nova conta
        UPDATE public.profiles
        SET account_id = new_acc_id
        WHERE id = profile_rec.id;
        
        -- Migrar dados que pertencem a este usuário para a nova conta
        -- (Isso assume que o usuário criou os dados enquanto estava na conta errada)
        
        -- Leads criados por este usuário (onde sdr_id ou closer_id é ele)
        UPDATE public.leads SET account_id = new_acc_id WHERE sdr_id = profile_rec.id OR closer_id = profile_rec.id;
        
        -- Produtos (não temos tracking de criador em produtos, mas se ele criou, vamos tentar isolar)
        -- Nota: Como produtos não têm criador, é difícil saber quais mover. 
        -- Mas se o usuário é o novo owner da sua conta, ele precisará criar seus próprios produtos.
        -- Para evitar que ele fique sem nada, poderíamos copiar os produtos da conta antiga? 
        -- Melhor não para evitar duplicidade indesejada. Ele verá uma conta limpa.
        
        -- Formulários (não temos tracking de criador em forms na tabela profiles, mas o account_id vincula)
        -- Atualmente forms não têm user_id, apenas account_id.
        -- Se o usuário criou um form, ele foi gravado com o account_id antigo.
        
        RAISE NOTICE 'Usuário % (%) movido para nova conta %', profile_rec.nome, profile_rec.email, new_acc_id;
    END LOOP;
END $$;

-- 2. REFORÇO DA FUNÇÃO handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_id UUID;
  company_name_var TEXT;
BEGIN
  -- 1. Determinar o nome da empresa
  company_name_var := COALESCE(
    NEW.raw_user_meta_data->>'company_name', 
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email) || '''s Company'
  );
  
  -- 2. Criar a conta primeiro (Garantir ID único)
  INSERT INTO public.accounts (nome_empresa, owner_id, plano)
  VALUES (company_name_var, NEW.id, 'free')
  RETURNING id INTO new_account_id;
  
  -- 3. Criar o perfil vinculado à conta recém-criada
  INSERT INTO public.profiles (id, nome, email, funcao, account_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    'admin',
    new_account_id
  );
  
  -- 4. Adicionar roles (Owner recebe todas)
  INSERT INTO public.user_roles (user_id, role)
  VALUES 
    (NEW.id, 'admin'::app_role),
    (NEW.id, 'sdr'::app_role),
    (NEW.id, 'closer'::app_role);
  
  -- 5. Criar etapas de funil padrão para a nova conta
  INSERT INTO public.etapas_funil (account_id, nome, ordem, cor, tipo_etapa, prazo_alerta_dias, ativo)
  VALUES
    (new_account_id, 'Lead', 1, '#3B82F6', 'lead', 3, true),
    (new_account_id, 'Qualificação', 2, '#8B5CF6', 'qualificacao', 5, true),
    (new_account_id, 'Call Agendada', 3, '#EC4899', 'call', 7, true),
    (new_account_id, 'Proposta', 4, '#F59E0B', 'proposta', 5, true),
    (new_account_id, 'Fechamento', 5, '#22C55E', 'fechamento', 3, true);
    
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log de erro se necessário (Supabase logs capturam isso)
  RAISE;
END;
$$;

-- 3. SEGURANÇA DE FORM_RESPONSES (RESTRIÇÃO DE POLÍTICA)
-- Permitir updates apenas em situações específicas para evitar vazamento
DROP POLICY IF EXISTS "Anyone can update form responses" ON public.form_responses;
DROP POLICY IF EXISTS "Users can only update responses from their account" ON public.form_responses;

-- Usuários autenticados podem gerenciar respostas da própria conta
CREATE POLICY "Users can manage responses from their account"
ON public.form_responses
FOR ALL
TO authenticated
USING (account_id = get_user_account_id())
WITH CHECK (account_id = get_user_account_id());

-- Usuários anônimos podem atualizar APENAS respostas parciais (fluxo de early save)
-- Isso evita que alguém altere respostas já finalizadas de outros usuários
CREATE POLICY "Anonymous can update partial responses"
ON public.form_responses
FOR UPDATE
TO anon
USING (metadata->>'capture_status' = 'partial')
WITH CHECK (true);

-- 4. VERIFICAÇÃO DE POLÍTICAS DE CONTAS
-- Garantir que membros da equipe possam ver o nome da empresa, não apenas o owner
DROP POLICY IF EXISTS "Users access own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can view their own account" ON public.accounts;
DROP POLICY IF EXISTS "Users can view their account information" ON public.accounts;
DROP POLICY IF EXISTS "Account owners can manage their account" ON public.accounts;

CREATE POLICY "Users can view their account information"
ON public.accounts
FOR SELECT
TO authenticated
USING (id = get_user_account_id());

CREATE POLICY "Account owners can update their account"
ON public.accounts
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- 5. GARANTIR QUE NENHUM PERFIL FICOU SEM CONTA
UPDATE public.profiles p
SET account_id = (
    SELECT id FROM public.accounts a 
    WHERE a.owner_id = p.id 
    ORDER BY created_at DESC 
    LIMIT 1
)
WHERE p.account_id IS NULL;

-- Se ainda restarem perfis sem conta (raro), criar uma agora
DO $$
DECLARE
    p_rec RECORD;
    a_id UUID;
BEGIN
    FOR p_rec IN SELECT id, nome FROM public.profiles WHERE account_id IS NULL LOOP
        INSERT INTO public.accounts (nome_empresa, owner_id)
        VALUES (p_rec.nome || '''s Business', p_rec.id)
        RETURNING id INTO a_id;
        
        UPDATE public.profiles SET account_id = a_id WHERE id = p_rec.id;
    END LOOP;
END $$;
