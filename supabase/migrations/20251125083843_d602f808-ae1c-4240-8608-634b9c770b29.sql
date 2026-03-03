-- Remover a constraint de foreign key do profiles para permitir criar profiles sem usuário auth
ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;

-- Tornar id apenas uma chave primária sem foreign key obrigatória
-- Agora podemos criar profiles manualmente para colaboradores fictícios