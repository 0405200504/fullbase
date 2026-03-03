-- Criar tabela para histórico de logins e atividades
CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  location_info JSONB,
  success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT
);

-- Index para buscar histórico por usuário
CREATE INDEX idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX idx_login_history_login_time ON public.login_history(login_time DESC);

-- RLS policies
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seu próprio histórico
CREATE POLICY "Users can view their own login history"
ON public.login_history
FOR SELECT
USING (auth.uid() = user_id);

-- Sistema pode inserir registros de login
CREATE POLICY "System can insert login history"
ON public.login_history
FOR INSERT
WITH CHECK (true);

-- Admins podem ver histórico de sua conta
CREATE POLICY "Admins can view account login history"
ON public.login_history
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  user_id IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.account_id = get_user_account_id()
  )
);