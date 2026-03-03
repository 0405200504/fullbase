
-- Drop all existing RESTRICTIVE policies on metas
DROP POLICY IF EXISTS "Admins podem criar metas" ON public.metas;
DROP POLICY IF EXISTS "Admins podem atualizar metas" ON public.metas;
DROP POLICY IF EXISTS "Admins podem deletar metas" ON public.metas;
DROP POLICY IF EXISTS "Usuários veem metas ativas da conta" ON public.metas;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Admins podem criar metas"
ON public.metas
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id());

CREATE POLICY "Admins podem atualizar metas"
ON public.metas
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id());

CREATE POLICY "Admins podem deletar metas"
ON public.metas
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id());

CREATE POLICY "Usuários veem metas ativas da conta"
ON public.metas
FOR SELECT
TO authenticated
USING (account_id = get_user_account_id() AND ativo = true);
