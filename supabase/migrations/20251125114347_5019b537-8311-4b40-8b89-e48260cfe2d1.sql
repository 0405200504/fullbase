-- Função para criar venda automaticamente quando lead entra em fechamento
CREATE OR REPLACE FUNCTION public.handle_lead_entrou_fechamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  etapa_fechamento_id UUID;
  etapa_nova_tipo TEXT;
  etapa_antiga_tipo TEXT;
  ja_tem_venda BOOLEAN;
BEGIN
  -- Buscar tipos das etapas antiga e nova
  SELECT tipo_etapa INTO etapa_antiga_tipo 
  FROM etapas_funil 
  WHERE id = OLD.etapa_id;
  
  SELECT tipo_etapa INTO etapa_nova_tipo 
  FROM etapas_funil 
  WHERE id = NEW.etapa_id;
  
  -- Se moveu PARA fechamento (vindo de qualquer outra etapa ou NULL)
  IF OLD.etapa_id IS DISTINCT FROM NEW.etapa_id 
     AND etapa_nova_tipo = 'fechamento' 
     AND (etapa_antiga_tipo IS NULL OR etapa_antiga_tipo != 'fechamento') THEN
    
    -- Verificar se já existe uma venda não reembolsada para este lead
    SELECT EXISTS (
      SELECT 1 FROM vendas 
      WHERE lead_id = NEW.id 
        AND reembolsada = false
    ) INTO ja_tem_venda;
    
    -- Se não tem venda ativa, criar uma nova
    IF NOT ja_tem_venda THEN
      -- Validar dados obrigatórios
      IF NEW.closer_id IS NULL THEN
        RAISE EXCEPTION 'Lead precisa ter um closer atribuído para criar venda automaticamente';
      END IF;
      
      IF NEW.produto_id IS NULL THEN
        RAISE EXCEPTION 'Lead precisa ter um produto atribuído para criar venda automaticamente';
      END IF;
      
      IF NEW.valor_proposta IS NULL OR NEW.valor_proposta <= 0 THEN
        RAISE EXCEPTION 'Lead precisa ter um valor de proposta válido para criar venda automaticamente';
      END IF;
      
      -- Criar venda automaticamente
      INSERT INTO vendas (
        lead_id,
        closer_id,
        produto_id,
        valor_final,
        metodo_pagamento,
        data_fechamento,
        reembolsada,
        observacao
      ) VALUES (
        NEW.id,
        NEW.closer_id,
        NEW.produto_id,
        NEW.valor_proposta,
        'pix', -- Valor padrão, pode ser alterado depois
        CURRENT_DATE,
        false,
        'Venda criada automaticamente ao mover lead para fechamento'
      );
      
      -- Log da ação
      INSERT INTO atividades (lead_id, user_id, tipo, descricao)
      VALUES (
        NEW.id,
        auth.uid(),
        'venda_criada',
        'Venda criada automaticamente - lead movido para etapa de fechamento'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar DEPOIS da atualização do lead
CREATE TRIGGER trigger_lead_entrou_fechamento
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_lead_entrou_fechamento();