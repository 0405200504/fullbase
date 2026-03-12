-- Adicionar suporte a webhook na tabela de formulários
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Garantir que a coluna possa ser visualizada e editada conforme as políticas existentes
-- Como já existem políticas FOR SELECT (e o script de correção anterior as reforçou),
-- a nova coluna será automaticamente filtrada pelo account_id se o sistema usar SELECT *.
