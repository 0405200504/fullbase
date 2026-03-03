-- Add new columns to leads table for enriched lead information
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS renda_mensal numeric,
ADD COLUMN IF NOT EXISTS investimento_disponivel numeric,
ADD COLUMN IF NOT EXISTS dificuldades text,
ADD COLUMN IF NOT EXISTS is_mql boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS data_marcacao_mql timestamp with time zone;

-- Add comment to explain the columns
COMMENT ON COLUMN public.leads.renda_mensal IS 'Renda mensal, anual ou investimento disponível do lead';
COMMENT ON COLUMN public.leads.investimento_disponivel IS 'Valor de investimento, caixa ou lucro disponível';
COMMENT ON COLUMN public.leads.dificuldades IS 'Dificuldades, gargalos ou problemas identificados';
COMMENT ON COLUMN public.leads.is_mql IS 'Marketing Qualified Lead - Lead qualificado identificado pelo SDR';
COMMENT ON COLUMN public.leads.data_marcacao_mql IS 'Data em que o lead foi marcado como MQL';