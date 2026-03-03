import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Hook para buscar logs de atividade de uma conta
export const useActivityLogs = (accountId: string | undefined) => {
  return useQuery({
    queryKey: ["activity-logs", accountId],
    queryFn: async () => {
      if (!accountId) return [];

      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          *,
          user:profiles(nome, email)
        `)
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return data.map((log: any) => ({
        ...log,
        user: log.user?.[0] || null,
      }));
    },
    enabled: !!accountId,
  });
};

// Hook para buscar estatísticas de adoção de features
export const useFeatureAdoption = () => {
  return useQuery({
    queryKey: ["feature-adoption"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_feature_adoption_stats");
      if (error) throw error;

      return data as {
        total_accounts: number;
        goals_adoption: number;
        team_adoption: number;
        products_adoption: number;
        sales_adoption: number;
      };
    },
  });
};

// Hook para buscar comparação por nicho
export const useNicheComparison = () => {
  return useQuery({
    queryKey: ["niche-comparison"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_niche_comparison");
      if (error) throw error;

      return data as Array<{
        niche: string;
        num_accounts: number;
        total_sales: number;
        total_revenue: number;
        avg_ticket: number;
        avg_conversion_rate: number;
      }>;
    },
  });
};

// Hook para buscar métricas de crescimento
export const useGrowthMetrics = () => {
  return useQuery({
    queryKey: ["growth-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_growth_metrics");
      if (error) throw error;

      return data as {
        total_accounts: number;
        activated_accounts: number;
        activation_rate: number;
        avg_days_to_first_sale: number;
        inactive_accounts: number;
        churn_rate: number;
      };
    },
  });
};
