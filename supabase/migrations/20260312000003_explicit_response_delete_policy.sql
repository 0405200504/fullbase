-- ====================================================================
-- CORREÇÃO DE DELEÇÃO DE RESPOSTAS E ATUALIZAÇÃO DE CONTADORES
-- ====================================================================

-- 1. Garantir que usuários autenticados possam deletar suas próprias respostas
-- (A política 'Users can manage responses from their account' já deve cobrir 'ALL',
-- mas vamos reforçar com uma política explícita de DELETE para maior clareza)

DROP POLICY IF EXISTS "Users can delete responses from their account" ON public.form_responses;

CREATE POLICY "Users can delete responses from their account"
ON public.form_responses
FOR DELETE
TO authenticated
USING (account_id = get_user_account_id());

-- 2. Trigger para DECREMENTAR submissions_count quando uma resposta é deletada
CREATE OR REPLACE FUNCTION public.decrement_form_submissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.forms SET submissions_count = GREATEST(0, submissions_count - 1) WHERE id = OLD.form_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS decrement_form_submissions_trigger ON public.form_responses;

CREATE TRIGGER decrement_form_submissions_trigger
AFTER DELETE ON public.form_responses
FOR EACH ROW
EXECUTE FUNCTION public.decrement_form_submissions();
