-- Adicionar coluna arquivado na tabela calls
ALTER TABLE public.calls 
ADD COLUMN arquivado boolean DEFAULT false,
ADD COLUMN data_arquivamento timestamp with time zone;

-- Criar índice para melhor performance
CREATE INDEX idx_calls_arquivado ON public.calls(arquivado);

-- Atualizar políticas RLS para permitir deletar calls
DROP POLICY IF EXISTS "Admins can delete calls in their account" ON public.calls;

CREATE POLICY "Admins and closers can delete calls in their account"
ON public.calls
FOR DELETE
USING (
  (account_id = get_user_account_id()) AND 
  (
    has_role(auth.uid(), 'admin'::app_role) OR 
    auth.uid() = closer_id
  )
);