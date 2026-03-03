

## Plano: Leads do Formulário no Pipeline + Rastreamento de Contato do SDR + Anotações do SDR

---

### Contexto

A lógica de criação de leads via formulário já existe em `useForms.ts` e funciona corretamente: busca a primeira etapa do funil, atribui o owner como SDR, e respeita o filtro de qualificação. Quando `qualification.enabled = false`, cria lead se houver nome/telefone/email. O problema relatado pode ser de RLS (o formulário é submetido sem auth, mas o insert de leads exige `account_id = get_user_account_id()` que retorna NULL para anon users).

### Problema Crítico: RLS bloqueando criação de leads via formulário

A policy de INSERT em `leads` é: `account_id = get_user_account_id()`. Como o FormRunner roda sem autenticação (visitante anônimo), `auth.uid()` é NULL, logo `get_user_account_id()` retorna NULL, e o insert falha silenciosamente. Isso explica por que leads não sobem no pipeline.

### Solução

#### 1. Corrigir RLS para permitir criação de leads via formulário (Migration SQL)
- Adicionar policy PERMISSIVE de INSERT em `leads` que permita inserção quando `account_id` corresponde a um formulário ativo existente
- Alternativa mais segura: criar uma **database function** `create_lead_from_form()` com `SECURITY DEFINER` que recebe os dados e cria o lead, bypassing RLS

#### 2. Criar função `create_lead_from_form` (SECURITY DEFINER)
```sql
CREATE FUNCTION public.create_lead_from_form(
  p_account_id UUID, p_form_id UUID,
  p_nome TEXT, p_telefone TEXT, p_email TEXT,
  p_fonte_trafego TEXT, p_renda_mensal NUMERIC,
  p_investimento_disponivel NUMERIC, p_dificuldades TEXT
) RETURNS UUID
```
- Valida que o form_id pertence ao account_id e está ativo
- Busca primeira etapa ativa do funil
- Busca owner_id da conta como sdr_id
- Insere o lead e retorna o ID
- Atualiza o form_response com o lead_id

#### 3. Atualizar `useForms.ts`
- Substituir o insert direto em `leads` por chamada RPC `create_lead_from_form`
- Simplificar a lógica de qualificação: se `enabled = false`, sempre criar lead (quando há dados mínimos)

#### 4. Adicionar campo "contatado" ao lead (Migration SQL)
- `ALTER TABLE leads ADD COLUMN contatado BOOLEAN DEFAULT false`
- `ALTER TABLE leads ADD COLUMN data_contato TIMESTAMPTZ`
- Permite que o SDR marque que já entrou em contato com o lead

#### 5. Adicionar campo "observacoes_sdr" ao lead (Migration SQL)
- `ALTER TABLE leads ADD COLUMN observacoes_sdr TEXT`
- Campo de texto livre para o SDR anotar informações úteis para o closer

#### 6. Atualizar `LeadDetailsSheet.tsx`
- Adicionar botão "Marcar como Contatado" na seção de detalhes (toggle)
- Adicionar campo de textarea editável "Anotações do SDR" que salva diretamente no lead
- Mostrar badge "Contatado" ou "Aguardando contato" no header do lead

#### 7. Atualizar `Pipeline.tsx` e cards de lead
- Mostrar indicador visual (badge/ícone) nos cards do pipeline indicando se o lead foi contatado ou não
- Permitir filtrar leads por status de contato

---

### Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| **Migration SQL** | Função `create_lead_from_form`, colunas `contatado`, `data_contato`, `observacoes_sdr` |
| `src/hooks/useForms.ts` | Usar RPC ao invés de insert direto |
| `src/components/LeadDetailsSheet.tsx` | Botão contatado + textarea anotações SDR |
| `src/pages/Pipeline.tsx` | Badge contatado nos cards |

