-- Criar tabela team_members para membros que não precisam de autenticação
-- Apenas para tracking de performance
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view team members from their account"
  ON public.team_members
  FOR SELECT
  USING (account_id = get_user_account_id());

CREATE POLICY "Admins can manage team members"
  ON public.team_members
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND account_id = get_user_account_id()
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    AND account_id = get_user_account_id()
  );

-- Criar tabela team_member_roles para as funções dos membros
CREATE TABLE IF NOT EXISTS public.team_member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_member_id, role)
);

-- Habilitar RLS
ALTER TABLE public.team_member_roles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view team member roles from their account"
  ON public.team_member_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = team_member_roles.team_member_id
      AND tm.account_id = get_user_account_id()
    )
  );

CREATE POLICY "Admins can manage team member roles"
  ON public.team_member_roles
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = team_member_roles.team_member_id
      AND tm.account_id = get_user_account_id()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = team_member_roles.team_member_id
      AND tm.account_id = get_user_account_id()
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_members_updated_at();