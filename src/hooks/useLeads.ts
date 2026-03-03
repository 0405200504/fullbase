import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useImpersonate } from "@/contexts/ImpersonateContext";

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  produto_id: string | null;
  valor_proposta: number | null;
  etapa_id: string | null;
  sdr_id: string | null;
  closer_id: string | null;
  fonte_trafego: string | null;
  data_agendamento_call: string | null;
  status_call: "agendada" | "compareceu" | "no_show" | "remarcada" | null;
  data_envio_proposta: string | null;
  arquivado: boolean;
  contador_followups: number;
  created_at: string;
  updated_at: string;
  ultima_movimentacao: string;
  renda_mensal: number | null;
  investimento_disponivel: number | null;
  dificuldades: string | null;
  is_mql: boolean;
  data_marcacao_mql: string | null;
  produtos: { nome: string; valor_padrao: number } | null;
  etapas_funil: { nome: string; cor: string } | null;
  sdr_profile: { nome: string } | null;
  closer_profile: { nome: string } | null;
  capture_status?: "partial" | "completed" | "manual";
  form_capture_metadata?: Record<string, any> | null;
}

export const useLeads = (arquivado = false) => {
  const { effectiveAccountId, isImpersonating } = useImpersonate();
  
  return useQuery({
    queryKey: ["leads", arquivado, effectiveAccountId],
    queryFn: async () => {
      if (!effectiveAccountId) return [];
      
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select(`
          *,
          produtos(nome, valor_padrao),
          etapas_funil(nome, cor)
        `)
        .eq("account_id", effectiveAccountId)
        .eq("arquivado", arquivado)
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;
      
      const { data: teamMembers } = await supabase
        .from("team_members")
        .select("id, nome")
        .eq("account_id", effectiveAccountId);
      
      const teamMap = new Map((teamMembers || []).map(tm => [tm.id, tm.nome]));
      
      const leads = (leadsData || []).map((lead: any) => {
        return {
          ...lead,
          sdr_profile: lead.sdr_id ? { nome: teamMap.get(lead.sdr_id) || "Desconhecido" } : null,
          closer_profile: lead.closer_id ? { nome: teamMap.get(lead.closer_id) || "Desconhecido" } : null,
          capture_status: "manual" as const,
          form_capture_metadata: null,
        };
      });
      
      return leads as Lead[];
    },
    enabled: !!effectiveAccountId,
    refetchInterval: isImpersonating ? 3000 : false,
  });
};

interface CreateLeadInput {
  nome: string;
  telefone: string;
  email?: string | null;
  produto_id?: string | null;
  valor_proposta?: number | null;
  etapa_id?: string | null;
  sdr_id?: string | null;
  fonte_trafego?: string | null;
}

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  const { effectiveAccountId } = useImpersonate();

  return useMutation({
    mutationFn: async (lead: CreateLeadInput) => {
      if (!effectiveAccountId) throw new Error("Unable to determine account");

      // Verificar se pode adicionar lead (respeita limite do plano)
      const { data: canAdd, error: checkError } = await supabase
        .rpc("can_add_lead", { p_account_id: effectiveAccountId });

      if (checkError) throw checkError;
      
      if (!canAdd) {
        const error = new Error("LIMIT_REACHED") as Error & { code?: string };
        error.code = "LIMIT_REACHED";
        throw error;
      }

      const { data, error } = await supabase
        .from("leads")
        .insert([{ ...lead, account_id: effectiveAccountId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead criado com sucesso!");
    },
    onError: (error: Error & { code?: string }) => {
      if (error.code === "LIMIT_REACHED" || error.message.includes("Limite de leads atingido")) {
        // Don't show error toast, let component handle upgrade dialog
        return;
      }
      toast.error("Erro ao criar lead: " + error.message);
    },
  });
};

interface UpdateLeadInput {
  id: string;
  nome?: string;
  telefone?: string;
  email?: string | null;
  produto_id?: string | null;
  valor_proposta?: number | null;
  etapa_id?: string | null;
  sdr_id?: string | null;
  closer_id?: string | null;
  fonte_trafego?: string | null;
  data_agendamento_call?: string | null;
  status_call?: "agendada" | "compareceu" | "no_show" | "remarcada" | null;
  data_envio_proposta?: string | null;
  arquivado?: boolean;
  renda_mensal?: number | null;
  investimento_disponivel?: number | null;
  dificuldades?: string | null;
  is_mql?: boolean;
  data_marcacao_mql?: string | null;
}

export const useUpdateLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...lead }: UpdateLeadInput) => {
      const { data, error } = await supabase
        .from("leads")
        .update(lead)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar lead: " + error.message);
    },
  });
};

export const useDeleteLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao deletar lead: " + error.message);
    },
  });
};

export const useDeleteLeads = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("leads")
        .delete()
        .in("id", ids);

      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`${count} lead(s) deletado(s) com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error("Erro ao deletar leads: " + error.message);
    },
  });
};
