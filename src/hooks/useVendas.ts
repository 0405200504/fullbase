import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonate } from "@/contexts/ImpersonateContext";

export interface Venda {
  id: string;
  lead_id: string;
  produto_id: string;
  closer_id: string;
  valor_final: number;
  metodo_pagamento: "pix" | "cartao" | "boleto" | "transferencia";
  data_fechamento: string;
  created_at: string;
  reembolsada: boolean;
  data_reembolso: string | null;
  motivo_reembolso: string | null;
  leads: { nome: string; fonte_trafego: string | null } | null;
  produtos: { nome: string } | null;
  profiles: { nome: string } | null;
}

export const useVendas = (dataInicio?: string, dataFim?: string, incluirReembolsadas = false) => {
  const { effectiveAccountId, isImpersonating } = useImpersonate();
  
  return useQuery({
    queryKey: ["vendas", dataInicio, dataFim, incluirReembolsadas, effectiveAccountId],
    queryFn: async () => {
      if (!effectiveAccountId) return [];
      
      let query = supabase
        .from("vendas")
        .select(`
          *,
          leads(nome, fonte_trafego),
          produtos(nome),
          profiles(nome)
        `)
        .eq("account_id", effectiveAccountId)
        .order("data_fechamento", { ascending: false });

      // Filtrar vendas não reembolsadas por padrão
      if (!incluirReembolsadas) {
        query = query.eq("reembolsada", false);
      }

      if (dataInicio) {
        query = query.gte("data_fechamento", dataInicio);
      }
      if (dataFim) {
        query = query.lte("data_fechamento", dataFim);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any as Venda[];
    },
    enabled: !!effectiveAccountId,
    // Refetch em tempo real quando em modo impersonate
    refetchInterval: isImpersonating ? 3000 : false,
  });
};
