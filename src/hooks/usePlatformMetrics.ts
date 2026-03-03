import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePlatformMetrics = () => {
  return useQuery({
    queryKey: ["platform-metrics"],
    queryFn: async () => {
      // Contas ativas
      const { count: activeAccounts } = await supabase
        .from("accounts")
        .select("*", { count: "exact", head: true })
        .eq("ativo", true);

      // Contas inativas
      const { data: inactiveAccounts } = await supabase
        .from("accounts")
        .select("id, nome_empresa, created_at")
        .eq("ativo", false)
        .order("created_at", { ascending: false })
        .limit(10);

      // Total de usuários
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Total de leads
      const { count: totalLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });

      // Total de vendas (não reembolsadas)
      const { count: totalSales } = await supabase
        .from("vendas")
        .select("*", { count: "exact", head: true })
        .eq("reembolsada", false);

      // Receita total
      const { data: revenueData } = await supabase
        .from("vendas")
        .select("valor_final")
        .eq("reembolsada", false);

      const totalRevenue = revenueData?.reduce((sum, v) => sum + (v.valor_final || 0), 0) || 0;

      // Usuários por nicho
      const { data: nicheData } = await supabase
        .from("profiles")
        .select("niche, account_id")
        .not("niche", "is", null);

      const nicheStats = nicheData?.reduce((acc, profile) => {
        const niche = profile.niche || "Não especificado";
        if (!acc[niche]) {
          acc[niche] = new Set();
        }
        acc[niche].add(profile.account_id);
        return acc;
      }, {} as Record<string, Set<string>>);

      const usersByNiche = Object.entries(nicheStats || {}).map(([niche, accounts]) => ({
        niche,
        accounts: accounts.size,
      })).sort((a, b) => b.accounts - a.accounts).slice(0, 10);

      // Novas contas (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: newAccounts } = await supabase
        .from("accounts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thirtyDaysAgo.toISOString());

      // MRR simulado (por enquanto usa receita total / 6 meses)
      const mrr = Math.round(totalRevenue / 6);

      return {
        activeAccounts: activeAccounts || 0,
        inactiveAccounts: inactiveAccounts || [],
        totalUsers: totalUsers || 0,
        totalLeads: totalLeads || 0,
        totalSales: totalSales || 0,
        totalRevenue,
        usersByNiche,
        newAccounts: newAccounts || 0,
        mrr,
      };
    },
  });
};
