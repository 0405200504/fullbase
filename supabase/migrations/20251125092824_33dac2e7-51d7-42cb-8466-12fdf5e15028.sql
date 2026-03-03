-- Criar tabela de calls
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  closer_id UUID NOT NULL REFERENCES public.profiles(id),
  data_hora_agendada TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'concluida', 'no_show', 'cancelada', 'remarcada')),
  resultado TEXT CHECK (resultado IN ('venda_realizada', 'proposta_enviada', 'follow_up', 'nao_qualificado')),
  proxima_acao TEXT CHECK (proxima_acao IN ('agendar_nova_call', 'enviar_proposta', 'follow_up_dias', 'mover_lixeira')),
  dias_follow_up INTEGER,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Todos podem ver calls"
ON public.calls FOR SELECT
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Closers e Admins podem criar calls"
ON public.calls FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'closer'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'sdr'::app_role)
);

CREATE POLICY "Responsáveis podem atualizar calls"
ON public.calls FOR UPDATE
USING (
  auth.uid() = closer_id OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins podem deletar calls"
ON public.calls FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Criar índices para performance
CREATE INDEX idx_calls_lead_id ON public.calls(lead_id);
CREATE INDEX idx_calls_closer_id ON public.calls(closer_id);
CREATE INDEX idx_calls_data_hora ON public.calls(data_hora_agendada);
CREATE INDEX idx_calls_status ON public.calls(status);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_calls_updated_at
BEFORE UPDATE ON public.calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.calls IS 'Registro de todas as calls agendadas e realizadas com leads';
COMMENT ON COLUMN public.calls.status IS 'Status da call: agendada, concluida, no_show, cancelada, remarcada';
COMMENT ON COLUMN public.calls.resultado IS 'Resultado da call (apenas para status concluida): venda_realizada, proposta_enviada, follow_up, nao_qualificado';
COMMENT ON COLUMN public.calls.proxima_acao IS 'Próxima ação após a call: agendar_nova_call, enviar_proposta, follow_up_dias, mover_lixeira';