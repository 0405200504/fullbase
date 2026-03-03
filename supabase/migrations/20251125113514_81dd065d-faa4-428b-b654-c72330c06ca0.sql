-- Criar trigger para marcar vendas como reembolsadas quando lead sai da etapa de fechamento

CREATE OR REPLACE FUNCTION public.handle_lead_saiu_fechamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  etapa_fechamento_id UUID;
  etapa_nova_tipo TEXT;
  etapa_antiga_tipo TEXT;
BEGIN
  -- Buscar tipos das etapas antiga e nova
  SELECT tipo_etapa INTO etapa_antiga_tipo 
  FROM etapas_funil 
  WHERE id = OLD.etapa_id;
  
  SELECT tipo_etapa INTO etapa_nova_tipo 
  FROM etapas_funil 
  WHERE id = NEW.etapa_id;
  
  -- Se moveu DE fechamento PARA qualquer outra etapa (exceto fechamento)
  IF OLD.etapa_id IS DISTINCT FROM NEW.etapa_id 
     AND etapa_antiga_tipo = 'fechamento' 
     AND (etapa_nova_tipo IS NULL OR etapa_nova_tipo != 'fechamento') THEN
    
    -- Marcar vendas do lead como reembolsadas
    UPDATE vendas 
    SET reembolsada = true,
        data_reembolso = NOW(),
        motivo_reembolso = 'Lead movido para fora da etapa de fechamento'
    WHERE lead_id = NEW.id 
      AND reembolsada = false;
    
    -- Log da ação
    INSERT INTO atividades (lead_id, user_id, tipo, descricao)
    VALUES (
      NEW.id,
      auth.uid(),
      'venda_cancelada',
      'Vendas marcadas como reembolsadas - lead saiu da etapa de fechamento'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_lead_saiu_fechamento ON leads;
CREATE TRIGGER trigger_lead_saiu_fechamento
  BEFORE UPDATE OF etapa_id ON leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_lead_saiu_fechamento();

COMMENT ON FUNCTION public.handle_lead_saiu_fechamento IS 'Marca vendas como reembolsadas quando um lead é movido para fora da etapa de fechamento';