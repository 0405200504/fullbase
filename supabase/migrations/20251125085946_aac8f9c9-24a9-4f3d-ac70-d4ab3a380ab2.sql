-- Recriar tabela de metas com novos campos
DROP TABLE IF EXISTS public.metas CASCADE;

CREATE TABLE public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  valor_mensal NUMERIC NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL,
  dias_trabalho INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5], -- 0=domingo, 1=segunda, etc
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(mes, ano, ativo)
);

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar metas
CREATE POLICY "Admins podem gerenciar metas" ON public.metas
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Todos podem ver metas ativas
CREATE POLICY "Todos podem ver metas ativas" ON public.metas
FOR SELECT USING (auth.role() = 'authenticated' AND ativo = true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_metas_updated_at
BEFORE UPDATE ON public.metas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();