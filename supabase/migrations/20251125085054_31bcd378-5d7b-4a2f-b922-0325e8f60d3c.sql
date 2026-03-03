-- Permitir que user_roles possa ter múltiplas roles por usuário
-- Remover constraint unique para permitir SDR ser também Closer
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Criar tabela de metas para o dashboard
CREATE TABLE IF NOT EXISTS public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  valor_alvo NUMERIC NOT NULL,
  periodo TEXT NOT NULL CHECK (periodo IN ('diario', 'semanal', 'mensal', 'trimestral', 'anual')),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar metas
CREATE POLICY "Admins podem gerenciar metas" ON public.metas
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Todos podem ver metas
CREATE POLICY "Todos podem ver metas" ON public.metas
FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger para atualizar updated_at nas metas
CREATE TRIGGER update_metas_updated_at
BEFORE UPDATE ON public.metas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();