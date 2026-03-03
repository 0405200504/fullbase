-- Remover políticas antigas de metas
DROP POLICY IF EXISTS "Usuários veem metas da conta" ON public.metas;
DROP POLICY IF EXISTS "Admins gerenciam metas da conta" ON public.metas;

-- Criar política para visualização de metas
CREATE POLICY "Usuários veem metas ativas da conta"
ON public.metas
FOR SELECT
TO authenticated
USING (account_id = get_user_account_id() AND ativo = true);

-- Criar política para admins criarem metas
CREATE POLICY "Admins podem criar metas"
ON public.metas
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND account_id = get_user_account_id()
);

-- Criar política para admins atualizarem metas
CREATE POLICY "Admins podem atualizar metas"
ON public.metas
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND account_id = get_user_account_id()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND account_id = get_user_account_id()
);

-- Criar política para admins deletarem metas
CREATE POLICY "Admins podem deletar metas"
ON public.metas
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND account_id = get_user_account_id()
);