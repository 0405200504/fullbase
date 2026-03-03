import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonate } from "@/contexts/ImpersonateContext";

export interface Produto {
  id: string;
  nome: string;
  valor_padrao: number;
  descricao: string | null;
  ativo: boolean;
}

export const useProdutos = () => {
  const { effectiveAccountId, isImpersonating } = useImpersonate();
  
  return useQuery({
    queryKey: ["produtos", effectiveAccountId],
    queryFn: async () => {
      if (!effectiveAccountId) return [];
      
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("account_id", effectiveAccountId)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as Produto[];
    },
    enabled: !!effectiveAccountId,
    // Refetch em tempo real quando em modo impersonate
    refetchInterval: isImpersonating ? 3000 : false,
  });
};
