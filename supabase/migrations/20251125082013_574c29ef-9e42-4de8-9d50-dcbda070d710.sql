-- Corrigir search_path das funções de trigger para segurança

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_mudanca_etapa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  etapa_antiga TEXT;
  etapa_nova TEXT;
BEGIN
  IF OLD.etapa_id IS DISTINCT FROM NEW.etapa_id THEN
    SELECT nome INTO etapa_antiga FROM public.etapas_funil WHERE id = OLD.etapa_id;
    SELECT nome INTO etapa_nova FROM public.etapas_funil WHERE id = NEW.etapa_id;
    
    INSERT INTO public.atividades (lead_id, user_id, tipo, descricao)
    VALUES (
      NEW.id,
      auth.uid(),
      'mudanca_etapa',
      'Movido de "' || COALESCE(etapa_antiga, 'Nenhuma') || '" para "' || etapa_nova || '"'
    );
    
    -- Atualizar ultima_movimentacao
    NEW.ultima_movimentacao = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;