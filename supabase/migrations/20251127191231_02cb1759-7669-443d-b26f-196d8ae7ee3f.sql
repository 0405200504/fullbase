-- Criar tabela para códigos de autenticação 2FA
CREATE TABLE IF NOT EXISTS public.two_factor_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index para buscar códigos por usuário
CREATE INDEX idx_two_factor_codes_user_id ON public.two_factor_codes(user_id);

-- RLS policies
ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios códigos
CREATE POLICY "Users can view their own 2FA codes"
ON public.two_factor_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Sistema pode inserir códigos (via edge function)
CREATE POLICY "System can insert 2FA codes"
ON public.two_factor_codes
FOR INSERT
WITH CHECK (true);

-- Sistema pode atualizar códigos (marcar como verificado)
CREATE POLICY "System can update 2FA codes"
ON public.two_factor_codes
FOR UPDATE
USING (true);

-- Limpar códigos expirados automaticamente (função auxiliar)
CREATE OR REPLACE FUNCTION public.cleanup_expired_2fa_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.two_factor_codes
  WHERE expires_at < NOW() OR (verified = true AND created_at < NOW() - INTERVAL '1 hour');
END;
$$;