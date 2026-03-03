import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonate } from "@/contexts/ImpersonateContext";

export interface EtapaFunil {
  id: string;
  nome: string;
  ordem: number;
  cor: string;
  prazo_alerta_dias: number;
  ativo: boolean;
  tipo_etapa: string | null;
}

export const useEtapasFunil = () => {
  const { effectiveAccountId, isImpersonating } = useImpersonate();
  
  return useQuery({
    queryKey: ["etapas_funil", effectiveAccountId],
    queryFn: async () => {
      if (!effectiveAccountId) return [];
      
      const { data, error } = await supabase
        .from("etapas_funil")
        .select("*")
        .eq("account_id", effectiveAccountId)
        .eq("ativo", true)
        .order("ordem");

      if (error) throw error;
      return data as EtapaFunil[];
    },
    enabled: !!effectiveAccountId,
    // Refetch em tempo real quando em modo impersonate
    refetchInterval: isImpersonating ? 3000 : false,
  });
};
