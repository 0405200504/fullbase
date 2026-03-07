CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_empresa TEXT NOT NULL,
    owner_id UUID NOT NULL,
    plano TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own accounts"
  ON public.accounts FOR ALL
  USING (owner_id = auth.uid());

-- Inserir conta inicial para evitar falhas NOT NULL
INSERT INTO public.accounts (nome_empresa, owner_id, plano) 
VALUES ('FullBase Init', '00000000-0000-0000-0000-000000000000', 'pro') 
ON CONFLICT DO NOTHING;

-- Corrigir enum app_role para incluir super_admin
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Adicionar account_id à tabela profiles (que foi adicionada na UI e esquecida nas migrações)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

-- Atualizar perfis existentes com a conta padrão para evitar nulos
UPDATE public.profiles SET account_id = (SELECT id FROM public.accounts LIMIT 1) WHERE account_id IS NULL;

-- Criar a função get_user_account_id() que foi criada na UI e referenciada nas migrações
CREATE OR REPLACE FUNCTION public.get_user_account_id()
RETURNS UUID AS $$
  SELECT account_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
