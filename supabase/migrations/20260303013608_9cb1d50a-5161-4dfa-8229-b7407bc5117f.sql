-- Make user_id nullable to allow logging failed login attempts without a valid user
ALTER TABLE public.login_history ALTER COLUMN user_id DROP NOT NULL;