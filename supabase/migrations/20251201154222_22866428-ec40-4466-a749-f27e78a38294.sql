-- Remove foreign key constraints que impedem team_members de serem usados como SDR/Closer
-- Isso permite que os campos sdr_id e closer_id aceitem tanto profile_id quanto team_member_id

-- Remover constraint de sdr_id na tabela leads
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_sdr_id_fkey;

-- Remover constraint de closer_id na tabela leads  
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_closer_id_fkey;

-- Remover constraint de closer_id na tabela calls
ALTER TABLE public.calls DROP CONSTRAINT IF EXISTS calls_closer_id_fkey;

-- Remover constraint de closer_id na tabela vendas
ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS vendas_closer_id_fkey;
