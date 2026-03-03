import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonate } from "@/contexts/ImpersonateContext";

export interface Profile {
  id: string;
  nome: string;
  email: string;
  funcao: "admin" | "sdr" | "closer";
}

export const useProfiles = (funcao?: "sdr" | "closer") => {
  const { effectiveAccountId, isImpersonating } = useImpersonate();
  
  return useQuery({
    queryKey: ["profiles", funcao, effectiveAccountId],
    queryFn: async () => {
      if (!effectiveAccountId) return [];
      
      if (funcao) {
        // Buscar usuários que têm a role específica
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", funcao);

        if (rolesError) throw rolesError;

        const userIds = rolesData.map((r) => r.user_id);

        if (userIds.length === 0) return [];

        // Buscar profiles desses usuários da conta específica
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .eq("account_id", effectiveAccountId)
          .in("id", userIds)
          .order("nome");

        if (profilesError) throw profilesError;
        return profilesData as Profile[];
      } else {
        // Buscar todos os profiles da conta
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("account_id", effectiveAccountId)
          .order("nome");

        if (error) throw error;
        return data as Profile[];
      }
    },
    enabled: !!effectiveAccountId,
    // Refetch em tempo real quando em modo impersonate
    refetchInterval: isImpersonating ? 3000 : false,
  });
};
