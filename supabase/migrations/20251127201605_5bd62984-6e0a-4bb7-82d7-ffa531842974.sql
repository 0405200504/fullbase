-- Permitir que super admins vejam todos os profiles
CREATE POLICY "Super admins podem ver todos os profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
);