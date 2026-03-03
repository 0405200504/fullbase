-- Enforce lead limits at the database level using existing can_add_lead() and allow super admins to bypass

CREATE OR REPLACE FUNCTION public.enforce_lead_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_can_add boolean;
BEGIN
  -- Super admins podem ultrapassar o limite manualmente
  IF has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Aplicar apenas em inserts de leads não arquivados
  IF TG_OP = 'INSERT' AND (NEW.arquivado IS NULL OR NEW.arquivado = false) THEN
    v_can_add := can_add_lead(NEW.account_id);

    IF NOT v_can_add THEN
      RAISE EXCEPTION 'Limite de leads atingido para o plano atual. Faça upgrade para adicionar mais leads.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Garantir que o trigger exista e use a função acima
DROP TRIGGER IF EXISTS enforce_lead_limit_before_insert ON public.leads;

CREATE TRIGGER enforce_lead_limit_before_insert
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.enforce_lead_limit();