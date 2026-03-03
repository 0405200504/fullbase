import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useSubscription = () => {
  const queryClient = useQueryClient();

  // Get current user's account subscription
  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Perfil não encontrado");

      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          plans (
            id,
            name,
            display_name,
            description,
            price_monthly,
            price_yearly,
            max_users,
            max_leads,
            history_days,
            has_export,
            has_priority_support,
            features
          )
        `)
        .eq("account_id", profile.account_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Get all available plans
  const { data: plans } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("active", true)
        .order("price_monthly", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Cancel subscription
  const cancelSubscription = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Perfil não encontrado");

      // Update subscription status to canceled
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
        })
        .eq("account_id", profile.account_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success("Assinatura cancelada com sucesso");
    },
    onError: (error: any) => {
      toast.error("Erro ao cancelar assinatura: " + error.message);
    },
  });

  return {
    subscription,
    plans,
    isLoading,
    cancelSubscription,
  };
};
