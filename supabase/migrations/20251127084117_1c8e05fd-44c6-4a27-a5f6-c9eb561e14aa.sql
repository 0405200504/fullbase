-- Add account_id to leads table for proper account isolation
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS account_id UUID;

-- Populate account_id for existing leads by joining through sdr_id or closer_id
UPDATE public.leads l
SET account_id = p.account_id
FROM public.profiles p
WHERE (l.sdr_id = p.id OR l.closer_id = p.id)
AND l.account_id IS NULL;

-- For orphaned leads (no sdr_id or closer_id), assign to the oldest account
UPDATE public.leads l
SET account_id = (SELECT id FROM public.accounts ORDER BY created_at ASC LIMIT 1)
WHERE l.account_id IS NULL;

-- Make account_id NOT NULL after population
ALTER TABLE public.leads ALTER COLUMN account_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE public.leads
ADD CONSTRAINT leads_account_id_fkey
FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Todos podem ver leads não arquivados" ON public.leads;
DROP POLICY IF EXISTS "Admins podem ver todos leads" ON public.leads;
DROP POLICY IF EXISTS "SDRs e Closers podem criar leads" ON public.leads;
DROP POLICY IF EXISTS "Responsáveis podem atualizar leads" ON public.leads;
DROP POLICY IF EXISTS "Admins podem deletar leads" ON public.leads;

-- Create new RLS policies with account isolation
CREATE POLICY "Users can view leads from their account"
ON public.leads FOR SELECT
USING (account_id = get_user_account_id() AND NOT arquivado);

CREATE POLICY "Admins can view all leads in their account"
ON public.leads FOR SELECT
USING (account_id = get_user_account_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create leads in their account"
ON public.leads FOR INSERT
WITH CHECK (account_id = get_user_account_id());

CREATE POLICY "Assigned users can update leads in their account"
ON public.leads FOR UPDATE
USING (
  account_id = get_user_account_id() 
  AND (auth.uid() = sdr_id OR auth.uid() = closer_id OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can delete leads in their account"
ON public.leads FOR DELETE
USING (account_id = get_user_account_id() AND has_role(auth.uid(), 'admin'::app_role));

-- Add account_id to calls table
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS account_id UUID;

-- Populate account_id for existing calls
UPDATE public.calls c
SET account_id = p.account_id
FROM public.profiles p
WHERE c.closer_id = p.id
AND c.account_id IS NULL;

-- Make account_id NOT NULL
ALTER TABLE public.calls ALTER COLUMN account_id SET NOT NULL;

-- Add foreign key
ALTER TABLE public.calls
ADD CONSTRAINT calls_account_id_fkey
FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

-- Drop existing call policies
DROP POLICY IF EXISTS "Todos podem ver calls" ON public.calls;
DROP POLICY IF EXISTS "Closers e Admins podem criar calls" ON public.calls;
DROP POLICY IF EXISTS "Responsáveis podem atualizar calls" ON public.calls;
DROP POLICY IF EXISTS "Admins podem deletar calls" ON public.calls;

-- Create new call policies with account isolation
CREATE POLICY "Users can view calls from their account"
ON public.calls FOR SELECT
USING (account_id = get_user_account_id());

CREATE POLICY "Users can create calls in their account"
ON public.calls FOR INSERT
WITH CHECK (
  account_id = get_user_account_id()
  AND (has_role(auth.uid(), 'closer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'sdr'::app_role))
);

CREATE POLICY "Assigned users can update calls in their account"
ON public.calls FOR UPDATE
USING (
  account_id = get_user_account_id()
  AND (auth.uid() = closer_id OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can delete calls in their account"
ON public.calls FOR DELETE
USING (account_id = get_user_account_id() AND has_role(auth.uid(), 'admin'::app_role));

-- Add account_id to vendas table
ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS account_id UUID;

-- Populate account_id for existing vendas
UPDATE public.vendas v
SET account_id = p.account_id
FROM public.profiles p
WHERE v.closer_id = p.id
AND v.account_id IS NULL;

-- Make account_id NOT NULL
ALTER TABLE public.vendas ALTER COLUMN account_id SET NOT NULL;

-- Add foreign key
ALTER TABLE public.vendas
ADD CONSTRAINT vendas_account_id_fkey
FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

-- Drop existing vendas policies
DROP POLICY IF EXISTS "Todos podem ver vendas" ON public.vendas;
DROP POLICY IF EXISTS "Closers e Admins podem criar vendas" ON public.vendas;
DROP POLICY IF EXISTS "Admins podem atualizar vendas" ON public.vendas;
DROP POLICY IF EXISTS "Admins podem deletar vendas" ON public.vendas;

-- Create new vendas policies with account isolation
CREATE POLICY "Users can view sales from their account"
ON public.vendas FOR SELECT
USING (account_id = get_user_account_id());

CREATE POLICY "Closers and admins can create sales in their account"
ON public.vendas FOR INSERT
WITH CHECK (
  account_id = get_user_account_id()
  AND (has_role(auth.uid(), 'closer'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can update sales in their account"
ON public.vendas FOR UPDATE
USING (account_id = get_user_account_id() AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sales in their account"
ON public.vendas FOR DELETE
USING (account_id = get_user_account_id() AND has_role(auth.uid(), 'admin'::app_role));

-- Add account_id to atividades table
ALTER TABLE public.atividades ADD COLUMN IF NOT EXISTS account_id UUID;

-- Populate account_id for existing atividades via lead relationship
UPDATE public.atividades a
SET account_id = l.account_id
FROM public.leads l
WHERE a.lead_id = l.id
AND a.account_id IS NULL;

-- Make account_id NOT NULL
ALTER TABLE public.atividades ALTER COLUMN account_id SET NOT NULL;

-- Add foreign key
ALTER TABLE public.atividades
ADD CONSTRAINT atividades_account_id_fkey
FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

-- Drop existing atividades policies
DROP POLICY IF EXISTS "Todos podem ver atividades" ON public.atividades;
DROP POLICY IF EXISTS "Todos podem criar atividades" ON public.atividades;

-- Create new atividades policies with account isolation
CREATE POLICY "Users can view activities from their account"
ON public.atividades FOR SELECT
USING (account_id = get_user_account_id());

CREATE POLICY "Users can create activities in their account"
ON public.atividades FOR INSERT
WITH CHECK (account_id = get_user_account_id());

-- Update user_roles policies to include account checking
DROP POLICY IF EXISTS "Admins podem gerenciar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários podem ver próprias roles" ON public.user_roles;

-- Create safer user_roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles in their account"
ON public.user_roles FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p1, public.profiles p2
    WHERE p1.id = auth.uid()
    AND p2.id = user_roles.user_id
    AND p1.account_id = p2.account_id
  )
);