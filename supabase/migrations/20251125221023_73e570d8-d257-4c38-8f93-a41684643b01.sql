-- Adicionar account_id em produtos, etapas e metas
-- Produtos
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

UPDATE public.produtos 
SET account_id = (SELECT id FROM public.accounts ORDER BY created_at LIMIT 1)
WHERE account_id IS NULL;

ALTER TABLE public.produtos ALTER COLUMN account_id SET NOT NULL;

DROP POLICY IF EXISTS "Todos podem ver produtos ativos" ON public.produtos;
DROP POLICY IF EXISTS "Admins podem gerenciar produtos" ON public.produtos;

CREATE POLICY "Usuários veem produtos da conta"
ON public.produtos FOR SELECT
USING (account_id = get_user_account_id());

CREATE POLICY "Admins gerenciam produtos da conta"
ON public.produtos FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id());

-- Etapas funil
ALTER TABLE public.etapas_funil ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

UPDATE public.etapas_funil 
SET account_id = (SELECT id FROM public.accounts ORDER BY created_at LIMIT 1)
WHERE account_id IS NULL;

ALTER TABLE public.etapas_funil ALTER COLUMN account_id SET NOT NULL;

DROP POLICY IF EXISTS "Todos podem ver etapas" ON public.etapas_funil;
DROP POLICY IF EXISTS "Admins podem gerenciar etapas" ON public.etapas_funil;

CREATE POLICY "Usuários veem etapas da conta"
ON public.etapas_funil FOR SELECT
USING (account_id = get_user_account_id());

CREATE POLICY "Admins gerenciam etapas da conta"
ON public.etapas_funil FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id());

-- Metas
ALTER TABLE public.metas ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

UPDATE public.metas 
SET account_id = (SELECT id FROM public.accounts ORDER BY created_at LIMIT 1)
WHERE account_id IS NULL;

ALTER TABLE public.metas ALTER COLUMN account_id SET NOT NULL;

DROP POLICY IF EXISTS "Todos podem ver metas ativas" ON public.metas;
DROP POLICY IF EXISTS "Admins podem gerenciar metas" ON public.metas;

CREATE POLICY "Usuários veem metas da conta"
ON public.metas FOR SELECT
USING (account_id = get_user_account_id() AND ativo = true);

CREATE POLICY "Admins gerenciam metas da conta"
ON public.metas FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id());