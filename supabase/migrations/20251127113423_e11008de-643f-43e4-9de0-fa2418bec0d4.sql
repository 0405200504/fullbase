-- Criar super admin automaticamente se não existir
DO $$
DECLARE
  super_admin_id UUID;
BEGIN
  -- Verificar se o super admin já existe
  SELECT id INTO super_admin_id
  FROM auth.users
  WHERE email = 'wesley.mb.campos15@gmail.com';
  
  -- Se não existir, criar (nota: a senha será definida manualmente no primeiro acesso)
  IF super_admin_id IS NULL THEN
    -- Inserir na tabela auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'wesley.mb.campos15@gmail.com',
      crypt('@Wesley17', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"nome":"Super Admin"}',
      NOW(),
      NOW(),
      '',
      ''
    ) RETURNING id INTO super_admin_id;
    
    -- Criar conta para o super admin
    INSERT INTO public.accounts (nome_empresa, owner_id, ativo, plano)
    VALUES ('HighLeads Admin', super_admin_id, true, 'enterprise');
    
    -- Criar perfil
    INSERT INTO public.profiles (id, nome, email, funcao, account_id)
    VALUES (
      super_admin_id,
      'Super Admin',
      'wesley.mb.campos15@gmail.com',
      'admin',
      (SELECT id FROM public.accounts WHERE owner_id = super_admin_id)
    );
    
    -- Adicionar role de super_admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (super_admin_id, 'super_admin');
  END IF;
END $$;