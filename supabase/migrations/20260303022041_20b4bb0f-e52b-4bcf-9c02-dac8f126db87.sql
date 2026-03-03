
-- 1. Add new columns to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contatado BOOLEAN DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_contato TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS observacoes_sdr TEXT;

-- 2. Create SECURITY DEFINER function to create leads from form submissions (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_lead_from_form(
  p_account_id UUID,
  p_form_id UUID,
  p_nome TEXT,
  p_telefone TEXT,
  p_email TEXT DEFAULT NULL,
  p_fonte_trafego TEXT DEFAULT NULL,
  p_renda_mensal NUMERIC DEFAULT NULL,
  p_investimento_disponivel NUMERIC DEFAULT NULL,
  p_dificuldades TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
  v_etapa_id UUID;
  v_sdr_id UUID;
  v_form_exists BOOLEAN;
BEGIN
  -- Validate that the form belongs to the account and is active
  SELECT EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = p_form_id
      AND account_id = p_account_id
      AND active = true
  ) INTO v_form_exists;

  IF NOT v_form_exists THEN
    RAISE EXCEPTION 'Formulário inválido ou inativo';
  END IF;

  -- Get the first active funnel stage for this account
  SELECT id INTO v_etapa_id
  FROM public.etapas_funil
  WHERE account_id = p_account_id
    AND ativo = true
  ORDER BY ordem ASC
  LIMIT 1;

  -- Get the account owner as SDR
  SELECT owner_id INTO v_sdr_id
  FROM public.accounts
  WHERE id = p_account_id;

  -- Insert the lead
  INSERT INTO public.leads (
    account_id, nome, telefone, email,
    fonte_trafego, renda_mensal, investimento_disponivel, dificuldades,
    etapa_id, sdr_id, contatado
  )
  VALUES (
    p_account_id, p_nome, p_telefone, p_email,
    p_fonte_trafego, p_renda_mensal, p_investimento_disponivel, p_dificuldades,
    v_etapa_id, v_sdr_id, false
  )
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;
