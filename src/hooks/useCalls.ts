import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useImpersonate } from "@/contexts/ImpersonateContext";

export interface Call {
  id: string;
  lead_id: string;
  closer_id: string;
  data_hora_agendada: string;
  status: "agendada" | "concluida" | "no_show" | "cancelada" | "remarcada" | "compareceu";
  resultado?: "venda_realizada" | "proposta_enviada" | "follow_up" | "nao_qualificado" | "compareceu" | null;
  proxima_acao?: "agendar_nova_call" | "enviar_proposta" | "follow_up_dias" | "mover_lixeira" | null;
  dias_follow_up?: number | null;
  notas?: string | null;
  arquivado: boolean;
  data_arquivamento?: string | null;
  created_at: string;
  updated_at: string;
  leads: { nome: string; telefone: string; produtos?: { nome: string } } | null;
  profiles: { nome: string } | null;
}

export const useCalls = (filters?: {
  dataInicio?: string;
  dataFim?: string;
  closerId?: string;
  status?: string;
}) => {
  const { effectiveAccountId, isImpersonating } = useImpersonate();

  return useQuery({
    queryKey: ["calls", filters, effectiveAccountId],
    queryFn: async () => {
      if (!effectiveAccountId) return [];

      let query = supabase
        .from("calls")
        .select(`
          *,
          leads(nome, telefone, produtos(nome)),
          profiles:closer_id(nome)
        `)
        .eq("account_id", effectiveAccountId)
        .eq("arquivado", false)
        .order("data_hora_agendada", { ascending: true });

      if (filters?.dataInicio) {
        query = query.gte("data_hora_agendada", filters.dataInicio);
      }
      if (filters?.dataFim) {
        query = query.lte("data_hora_agendada", filters.dataFim);
      }
      if (filters?.closerId) {
        query = query.eq("closer_id", filters.closerId);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any as Call[];
    },
    enabled: !!effectiveAccountId,
    // Refetch em tempo real quando em modo impersonate
    refetchInterval: isImpersonating ? 3000 : false,
  });
};

export const useCallsByLead = (leadId: string) => {
  return useQuery({
    queryKey: ["calls", "lead", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select(`
          *,
          profiles:closer_id(nome)
        `)
        .eq("lead_id", leadId)
        .order("data_hora_agendada", { ascending: false });

      if (error) throw error;
      return data as any as Call[];
    },
    enabled: !!leadId,
  });
};

interface CreateCallInput {
  lead_id: string;
  closer_id: string;
  data_hora_agendada: string;
  notas?: string;
}

export const useCreateCall = () => {
  const queryClient = useQueryClient();
  const { effectiveAccountId } = useImpersonate();

  return useMutation({
    mutationFn: async (call: CreateCallInput) => {
      if (!effectiveAccountId) throw new Error("Unable to determine user account");

      const { data, error } = await supabase
        .from("calls")
        .insert([{ ...call, account_id: effectiveAccountId }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      toast.success("Call agendada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao agendar call: " + error.message);
    },
  });
};

interface UpdateCallInput {
  id: string;
  status?: "agendada" | "concluida" | "no_show" | "cancelada" | "remarcada" | "compareceu";
  resultado?: "venda_realizada" | "proposta_enviada" | "follow_up" | "nao_qualificado" | "compareceu" | null;
  proxima_acao?: "agendar_nova_call" | "enviar_proposta" | "follow_up_dias" | "mover_lixeira" | null;
  dias_follow_up?: number | null;
  notas?: string | null;
  data_hora_agendada?: string;
}

export const useUpdateCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...call }: UpdateCallInput) => {
      const { data, error } = await supabase
        .from("calls")
        .update(call)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      toast.success("Call atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar call: " + error.message);
    },
  });
};

export const useDeleteCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calls").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      toast.success("Call deletada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao deletar call: " + error.message);
    },
  });
};

export const useArchiveCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("calls")
        .update({
          arquivado: true,
          data_arquivamento: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      toast.success("Call arquivada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao arquivar call: " + error.message);
    },
  });
};

export const useUnarchiveCall = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("calls")
        .update({
          arquivado: false,
          data_arquivamento: null
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      toast.success("Call desarquivada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao desarquivar call: " + error.message);
    },
  });
};
