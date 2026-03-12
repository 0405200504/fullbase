-- Upgrade Global: Transformar todas as contas atuais em Enterprise
DO $$
DECLARE
    v_plan_id UUID;
    v_account RECORD;
BEGIN
    -- 1. Obter o ID do plano enterprise
    SELECT id INTO v_plan_id FROM public.plans WHERE name = 'enterprise';

    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'Plano Enterprise não encontrado. Certifique-se de que os planos iniciais foram carregados.';
    END IF;

    -- 2. Para cada conta existente, garantir que tenha uma assinatura Enterprise
    FOR v_account IN SELECT id FROM public.accounts LOOP
        INSERT INTO public.subscriptions (account_id, plan_id, status, billing_cycle)
        VALUES (v_account.id, v_plan_id, 'active', 'yearly')
        ON CONFLICT (account_id) DO UPDATE 
        SET plan_id = EXCLUDED.plan_id,
            status = 'active',
            updated_at = NOW();
            
        -- 3. Resetar trackers de uso para garantir que os limites novos sejam aplicados
        INSERT INTO public.usage_tracking (account_id, current_leads_count, current_users_count)
        VALUES (v_account.id, 0, 0)
        ON CONFLICT (account_id) DO UPDATE 
        SET updated_at = NOW();
    END LOOP;
END $$;
