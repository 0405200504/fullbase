-- Remover a constraint antiga que não considera account_id
ALTER TABLE public.metas DROP CONSTRAINT IF EXISTS metas_mes_ano_ativo_key;

-- Criar um índice único parcial que inclui account_id para isolar metas por conta
-- Isso permite que cada conta tenha apenas uma meta ativa por mês/ano
CREATE UNIQUE INDEX IF NOT EXISTS metas_account_mes_ano_ativo_idx 
  ON public.metas (account_id, mes, ano) 
  WHERE ativo = true;