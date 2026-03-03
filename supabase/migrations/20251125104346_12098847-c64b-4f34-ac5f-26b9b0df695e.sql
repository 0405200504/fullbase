-- Adicionar coluna de observações na tabela vendas
ALTER TABLE public.vendas 
ADD COLUMN observacao TEXT;