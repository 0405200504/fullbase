-- Ajustar constraint de vendas.lead_id para permitir deleção de leads com vendas associadas
ALTER TABLE public.vendas
DROP CONSTRAINT IF EXISTS vendas_lead_id_fkey;

ALTER TABLE public.vendas
ADD CONSTRAINT vendas_lead_id_fkey
FOREIGN KEY (lead_id)
REFERENCES public.leads(id)
ON DELETE CASCADE;