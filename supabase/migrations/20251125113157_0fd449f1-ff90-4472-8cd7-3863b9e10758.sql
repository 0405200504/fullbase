-- Adicionar coluna tipo_etapa na tabela etapas_funil
ALTER TABLE etapas_funil 
ADD COLUMN tipo_etapa TEXT;

-- Criar índice para melhor performance
CREATE INDEX idx_etapas_funil_tipo_etapa ON etapas_funil(tipo_etapa);

-- Atualizar etapas existentes baseado nos nomes comuns
UPDATE etapas_funil 
SET tipo_etapa = CASE
  WHEN LOWER(nome) LIKE '%lead%' AND LOWER(nome) NOT LIKE '%qualif%' THEN 'lead'
  WHEN LOWER(nome) LIKE '%qualif%' THEN 'qualificacao'
  WHEN LOWER(nome) LIKE '%call%' OR LOWER(nome) LIKE '%ligação%' THEN 'call'
  WHEN LOWER(nome) LIKE '%proposta%' THEN 'proposta'
  WHEN LOWER(nome) LIKE '%fechamento%' OR LOWER(nome) LIKE '%venda%' OR LOWER(nome) LIKE '%ganho%' THEN 'fechamento'
  ELSE NULL
END;

-- Comentário explicativo
COMMENT ON COLUMN etapas_funil.tipo_etapa IS 'Tipo da etapa: lead, qualificacao, call, proposta, fechamento. Usado para categorizar etapas no funil e na performance.';