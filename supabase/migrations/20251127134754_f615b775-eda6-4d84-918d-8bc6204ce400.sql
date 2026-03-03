-- Funcionalidade 1: Adicionar start_date e end_date à tabela metas
ALTER TABLE public.metas ADD COLUMN start_date DATE;
ALTER TABLE public.metas ADD COLUMN end_date DATE;

-- Atualizar metas existentes com datas baseadas em mes/ano
UPDATE public.metas 
SET 
  start_date = DATE_TRUNC('month', MAKE_DATE(ano, mes, 1))::DATE,
  end_date = (DATE_TRUNC('month', MAKE_DATE(ano, mes, 1)) + INTERVAL '1 month - 1 day')::DATE
WHERE start_date IS NULL;

-- Funcionalidade 2: Criar tabelas para o sistema de chat de suporte
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'super_admin')),
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies para conversations
CREATE POLICY "Users can view their own conversations"
ON public.conversations
FOR SELECT
USING (account_id = get_user_account_id());

CREATE POLICY "Users can create conversations for their account"
ON public.conversations
FOR INSERT
WITH CHECK (account_id = get_user_account_id());

CREATE POLICY "Super admins can view all conversations"
ON public.conversations
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update conversations"
ON public.conversations
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

-- RLS Policies para messages
CREATE POLICY "Users can view messages from their conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.account_id = get_user_account_id()
  )
);

CREATE POLICY "Users can create messages in their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_id
    AND conversations.account_id = get_user_account_id()
  )
);

CREATE POLICY "Super admins can view all messages"
ON public.messages
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can create messages"
ON public.messages
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin') AND sender_role = 'super_admin');

CREATE POLICY "Super admins can update messages"
ON public.messages
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'));

-- Índices para performance
CREATE INDEX idx_conversations_account_id ON public.conversations(account_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_is_read ON public.messages(is_read);

-- Trigger para atualizar updated_at em conversations
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar Realtime para as tabelas de chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;