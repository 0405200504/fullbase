-- Adicionar campos de reembolso na tabela vendas
ALTER TABLE vendas 
ADD COLUMN reembolsada BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN data_reembolso TIMESTAMP WITH TIME ZONE,
ADD COLUMN motivo_reembolso TEXT;

-- Criar índice para otimizar consultas de vendas não reembolsadas
CREATE INDEX idx_vendas_reembolsada ON vendas(reembolsada) WHERE reembolsada = false;

-- Comentários para documentação
COMMENT ON COLUMN vendas.reembolsada IS 'Indica se a venda foi reembolsada';
COMMENT ON COLUMN vendas.data_reembolso IS 'Data em que o reembolso foi processado';
COMMENT ON COLUMN vendas.motivo_reembolso IS 'Motivo do reembolso da venda';