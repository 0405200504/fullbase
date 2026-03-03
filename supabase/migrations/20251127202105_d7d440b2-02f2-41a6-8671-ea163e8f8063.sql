-- Permitir que super admins vejam todos os leads
CREATE POLICY "Super admins podem ver todos os leads"
ON public.leads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Permitir que super admins vejam todas as contas
CREATE POLICY "Super admins podem ver contas para filtros"
ON public.accounts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);