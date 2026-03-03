
-- Create forms table
CREATE TABLE public.forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novo Formulário',
  theme JSONB NOT NULL DEFAULT '{"bgColor":"#ffffff","textColor":"#171717","buttonColor":"#3DA66E"}'::jsonb,
  logo JSONB DEFAULT NULL,
  background_image TEXT DEFAULT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  thank_you_screen JSONB NOT NULL DEFAULT '{"text":"Obrigado por responder! 🎉","ctaText":"Voltar"}'::jsonb,
  field_mappings JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  views_count INTEGER NOT NULL DEFAULT 0,
  submissions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, slug)
);

-- Create form_responses table
CREATE TABLE public.form_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  mapped_data JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Forms RLS policies
CREATE POLICY "Users can view forms from their account"
ON public.forms FOR SELECT
USING (account_id = get_user_account_id());

CREATE POLICY "Admins can manage forms"
ON public.forms FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND account_id = get_user_account_id());

CREATE POLICY "Public can view active forms by slug"
ON public.forms FOR SELECT
USING (active = true);

-- Form responses RLS policies
CREATE POLICY "Users can view responses from their account"
ON public.form_responses FOR SELECT
USING (account_id = get_user_account_id());

CREATE POLICY "Anyone can submit form responses"
ON public.form_responses FOR INSERT
WITH CHECK (true);

CREATE POLICY "Super admins can view all form responses"
ON public.form_responses FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger to update forms.updated_at
CREATE TRIGGER update_forms_updated_at
BEFORE UPDATE ON public.forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Increment submissions count function
CREATE OR REPLACE FUNCTION public.increment_form_submissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.forms SET submissions_count = submissions_count + 1 WHERE id = NEW.form_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER increment_form_submissions_trigger
AFTER INSERT ON public.form_responses
FOR EACH ROW
EXECUTE FUNCTION public.increment_form_submissions();
