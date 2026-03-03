-- Update registrar_mudanca_etapa to include account_id
CREATE OR REPLACE FUNCTION public.registrar_mudanca_etapa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  etapa_antiga TEXT;
  etapa_nova TEXT;
BEGIN
  IF OLD.etapa_id IS DISTINCT FROM NEW.etapa_id THEN
    SELECT nome INTO etapa_antiga FROM public.etapas_funil WHERE id = OLD.etapa_id;
    SELECT nome INTO etapa_nova FROM public.etapas_funil WHERE id = NEW.etapa_id;
    
    INSERT INTO public.atividades (lead_id, user_id, tipo, descricao, account_id)
    VALUES (
      NEW.id,
      auth.uid(),
      'mudanca_etapa',
      'Movido de "' || COALESCE(etapa_antiga, 'Nenhuma') || '" para "' || etapa_nova || '"',
      NEW.account_id
    );
    
    -- Atualizar ultima_movimentacao
    NEW.ultima_movimentacao = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update handle_lead_entrou_fechamento to include account_id
CREATE OR REPLACE FUNCTION public.handle_lead_entrou_fechamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
        observacao,
        account_id
      ) VALUES (
        NEW.id,
        NEW.closer_id,
        NEW.produto_id,
        NEW.valor_proposta,
        'pix', -- Valor padrão, pode ser alterado depois
        CURRENT_DATE,
        false,
        'Venda criada automaticamente ao mover lead para fechamento',
        NEW.account_id
      );
      
      -- Log da ação
      INSERT INTO atividades (lead_id, user_id, tipo, descricao, account_id)
      VALUES (
        NEW.id,
        auth.uid(),
        'venda_criada',
        'Venda criada automaticamente - lead movido para etapa de fechamento',
        NEW.account_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update handle_lead_saiu_fechamento to include account_id for activities
CREATE OR REPLACE FUNCTION public.handle_lead_saiu_fechamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    INSERT INTO atividades (lead_id, user_id, tipo, descricao, account_id)
    VALUES (
      NEW.id,
      auth.uid(),
      'venda_cancelada',
      'Vendas marcadas como reembolsadas - lead saiu da etapa de fechamento',
      NEW.account_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;