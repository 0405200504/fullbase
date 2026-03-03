-- Adicionar coluna health_score na tabela accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 0;

-- Função para calcular o health score de uma conta
CREATE OR REPLACE FUNCTION calculate_health_score(p_account_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_score INTEGER := 0;
  v_last_login TIMESTAMPTZ;
  v_leads_count INTEGER;
  v_sales_count INTEGER;
  v_calls_count INTEGER;
  v_team_members INTEGER;
  v_goals_count INTEGER;
BEGIN
  -- 1. Frequência de Login (30 pontos)
  -- Buscar último login através da tabela activity_logs (será criada)
  -- Por enquanto, vamos usar a data de criação dos leads como proxy de atividade
  SELECT MAX(created_at) INTO v_last_login
  FROM leads
  WHERE account_id = p_account_id;
  
  IF v_last_login IS NULL THEN
    SELECT created_at INTO v_last_login FROM accounts WHERE id = p_account_id;
  END IF;
  
  IF v_last_login >= NOW() - INTERVAL '3 days' THEN
    v_score := v_score + 30;
  ELSIF v_last_login >= NOW() - INTERVAL '7 days' THEN
    v_score := v_score + 20;
  ELSIF v_last_login >= NOW() - INTERVAL '15 days' THEN
    v_score := v_score + 10;
  END IF;
  
  -- 2. Engajamento com Leads (30 pontos)
  SELECT COUNT(*) INTO v_leads_count
  FROM leads
  WHERE account_id = p_account_id
    AND (created_at >= NOW() - INTERVAL '30 days' 
         OR updated_at >= NOW() - INTERVAL '30 days');
  
  IF v_leads_count > 10 THEN
    v_score := v_score + 30;
  ELSIF v_leads_count >= 1 THEN
    v_score := v_score + 15;
  END IF;
  
  -- 3. Atividade de Vendas (30 pontos)
  SELECT COUNT(*) INTO v_sales_count
  FROM vendas
  WHERE account_id = p_account_id
    AND data_fechamento >= NOW() - INTERVAL '30 days'
    AND reembolsada = false;
  
  SELECT COUNT(*) INTO v_calls_count
  FROM calls
  WHERE account_id = p_account_id
    AND created_at >= NOW() - INTERVAL '30 days';
  
  IF v_sales_count > 1 THEN
    v_score := v_score + 30;
  ELSIF v_calls_count > 1 THEN
    v_score := v_score + 15;
  END IF;
  
  -- 4. Uso de Features (10 pontos)
  -- Membros da equipe
  SELECT COUNT(*) INTO v_team_members
  FROM profiles
  WHERE account_id = p_account_id;
  
  IF v_team_members > 1 THEN
    v_score := v_score + 5;
  END IF;
  
  -- Metas criadas
  SELECT COUNT(*) INTO v_goals_count
  FROM metas
  WHERE account_id = p_account_id
    AND ativo = true;
  
  IF v_goals_count > 0 THEN
    v_score := v_score + 5;
  END IF;
  
  RETURN v_score;
END;
$$;

-- Função para atualizar health score de todas as contas
CREATE OR REPLACE FUNCTION update_all_health_scores()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_account RECORD;
  v_new_score INTEGER;
  v_updated_count INTEGER := 0;
BEGIN
  FOR v_account IN SELECT id FROM accounts WHERE ativo = true
  LOOP
    v_new_score := calculate_health_score(v_account.id);
    
    UPDATE accounts
    SET health_score = v_new_score
    WHERE id = v_account.id;
    
    v_updated_count := v_updated_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'timestamp', NOW()
  );
END;
$$;