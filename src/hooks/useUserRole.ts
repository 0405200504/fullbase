import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      
      return data || [];
    },
    enabled: !!user,
  });
};

export const useIsSuperAdmin = () => {
  const { data: roles } = useUserRole();
  return roles?.some(r => r.role === "super_admin") || false;
};
