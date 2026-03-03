-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'sdr', 'closer');

-- Criar enum para funções de pagamento
CREATE TYPE public.metodo_pagamento AS ENUM ('pix', 'cartao', 'boleto', 'transferencia');

-- Criar enum para status de call
CREATE TYPE public.status_call AS ENUM ('agendada', 'compareceu', 'no_show', 'remarcada');

-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  foto_url TEXT,
  funcao app_role NOT NULL DEFAULT 'sdr',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de roles (separada para segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Função para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Tabela de produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  valor_padrao DECIMAL(10,2) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de etapas do funil (customizável)
CREATE TABLE public.etapas_funil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  cor TEXT DEFAULT '#3B82F6',
  prazo_alerta_dias INTEGER DEFAULT 3,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  produto_id UUID REFERENCES public.produtos(id),
  valor_proposta DECIMAL(10,2),
  etapa_id UUID REFERENCES public.etapas_funil(id),
  sdr_id UUID REFERENCES public.profiles(id),
  closer_id UUID REFERENCES public.profiles(id),
  fonte_trafego TEXT,
  data_agendamento_call TIMESTAMP WITH TIME ZONE,
  status_call status_call,
  data_envio_proposta DATE,
  arquivado BOOLEAN DEFAULT FALSE,
  data_arquivamento TIMESTAMP WITH TIME ZONE,
  contador_followups INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ultima_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de atividades (histórico)
CREATE TABLE public.atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de lembretes
CREATE TABLE public.lembretes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  descricao TEXT NOT NULL,
  data_lembrete TIMESTAMP WITH TIME ZONE NOT NULL,
  concluido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de vendas
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) NOT NULL,
  produto_id UUID REFERENCES public.produtos(id) NOT NULL,
  closer_id UUID REFERENCES public.profiles(id) NOT NULL,
  valor_final DECIMAL(10,2) NOT NULL,
  metodo_pagamento metodo_pagamento NOT NULL,
  data_fechamento DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir etapas padrão do funil
INSERT INTO public.etapas_funil (nome, ordem, cor, prazo_alerta_dias) VALUES
  ('Lead', 1, '#6B7280', 3),
  ('Qualificação', 2, '#3B82F6', 3),
  ('Call Agendada', 3, '#F59E0B', 2),
  ('Proposta', 4, '#10B981', 2),
  ('Fechamento', 5, '#059669', 1);

-- Inserir produtos de exemplo
INSERT INTO public.produtos (nome, valor_padrao) VALUES
  ('Mentoria Premium', 12000),
  ('Aceleração Digital', 25000),
  ('Consultoria Pro', 8500),
  ('Programa Elite', 35000);

-- TRIGGERS

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, funcao)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    'sdr'
  );
  
  -- Adicionar role padrão
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'sdr');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger para registrar atividade quando lead muda de etapa
CREATE OR REPLACE FUNCTION public.registrar_mudanca_etapa()
RETURNS TRIGGER AS $$
DECLARE
  etapa_antiga TEXT;
  etapa_nova TEXT;
BEGIN
  IF OLD.etapa_id IS DISTINCT FROM NEW.etapa_id THEN
    SELECT nome INTO etapa_antiga FROM public.etapas_funil WHERE id = OLD.etapa_id;
    SELECT nome INTO etapa_nova FROM public.etapas_funil WHERE id = NEW.etapa_id;
    
    INSERT INTO public.atividades (lead_id, user_id, tipo, descricao)
    VALUES (
      NEW.id,
      auth.uid(),
      'mudanca_etapa',
      'Movido de "' || COALESCE(etapa_antiga, 'Nenhuma') || '" para "' || etapa_nova || '"'
    );
    
    -- Atualizar ultima_movimentacao
    NEW.ultima_movimentacao = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mudanca_etapa
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_mudanca_etapa();

-- POLÍTICAS RLS

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas_funil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lembretes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuários podem ver todos os perfis"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para user_roles
CREATE POLICY "Admins podem gerenciar roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem ver próprias roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Políticas para produtos
CREATE POLICY "Todos podem ver produtos ativos"
  ON public.produtos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins podem gerenciar produtos"
  ON public.produtos FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para etapas_funil
CREATE POLICY "Todos podem ver etapas"
  ON public.etapas_funil FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins podem gerenciar etapas"
  ON public.etapas_funil FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para leads
CREATE POLICY "Todos podem ver leads não arquivados"
  ON public.leads FOR SELECT
  USING (auth.role() = 'authenticated' AND NOT arquivado);

CREATE POLICY "Admins podem ver todos leads"
  ON public.leads FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "SDRs e Closers podem criar leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Responsáveis podem atualizar leads"
  ON public.leads FOR UPDATE
  USING (
    auth.uid() = sdr_id OR 
    auth.uid() = closer_id OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins podem deletar leads"
  ON public.leads FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para atividades
CREATE POLICY "Todos podem ver atividades"
  ON public.atividades FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Todos podem criar atividades"
  ON public.atividades FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Políticas para lembretes
CREATE POLICY "Usuários veem próprios lembretes"
  ON public.lembretes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários criam próprios lembretes"
  ON public.lembretes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam próprios lembretes"
  ON public.lembretes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários deletam próprios lembretes"
  ON public.lembretes FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para vendas
CREATE POLICY "Todos podem ver vendas"
  ON public.vendas FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Closers e Admins podem criar vendas"
  ON public.vendas FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'closer') OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins podem atualizar vendas"
  ON public.vendas FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem deletar vendas"
  ON public.vendas FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));