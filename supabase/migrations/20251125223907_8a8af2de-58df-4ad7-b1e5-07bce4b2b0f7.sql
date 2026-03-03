-- Recriar a função handle_new_user garantindo funcionalidade completa
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_account_id UUID;
  company_name_var TEXT;
BEGIN
  -- Pegar nome da empresa dos metadados ou usar nome do usuário
  company_name_var := COALESCE(
    NEW.raw_user_meta_data->>'company_name', 
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email) || '''s Company'
  );
  
  -- Criar nova conta (empresa) para o usuário
  INSERT INTO public.accounts (nome_empresa, owner_id, ativo, plano)
  VALUES (company_name_var, NEW.id, true, 'basic')
  RETURNING id INTO new_account_id;
  
  -- Criar perfil do usuário vinculado à conta
  INSERT INTO public.profiles (id, nome, email, funcao, account_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    'admin',
    new_account_id
  );
  
  -- Adicionar role de admin para o owner da conta
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');
  
  RETURN NEW;
END;
$$;

-- Garantir que o trigger está ativo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();