import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, TrendingUp, Users, Target, Phone, Flame, Star, Zap, Crown } from "lucide-react";
import { formatCurrency } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";

type PeriodType = "day" | "week" | "month" | "all" | "custom";

interface AccountWithStats {
  id: string;
  nome_empresa: string;
  owner_name: string;
  owner_email: string;
  foto_url: string | null;
  created_at: string;
  total_revenue: number;
  total_leads: number;
  total_calls: number;
  attended_calls: number;
  total_sales: number;
}

const RevenueRanking = () => {
  const [periodType, setPeriodType] = useState<PeriodType>("all");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);

  const getDateRange = () => {
    const now = new Date();
    if (periodType === "custom" && customDateRange?.from && customDateRange?.to) {
      return {
        startDate: format(startOfDay(customDateRange.from), "yyyy-MM-dd"),
        endDate: format(endOfDay(customDateRange.to), "yyyy-MM-dd"),
      };
    }
    if (periodType === "all") {
      return { startDate: null, endDate: null };
    }
    switch (periodType) {
      case "day":
        return {
          startDate: format(subDays(now, 6), "yyyy-MM-dd"),
          endDate: format(now, "yyyy-MM-dd"),
        };
      case "week":
        return {
          startDate: format(subWeeks(now, 11), "yyyy-MM-dd"),
          endDate: format(now, "yyyy-MM-dd"),
        };
      case "month":
        return {
          startDate: format(subMonths(now, 5), "yyyy-MM-dd"),
          endDate: format(now, "yyyy-MM-dd"),
        };
      default:
        return { startDate: null, endDate: null };
    }
  };

  const dateRange = getDateRange();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["all-accounts-ranking", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      // Buscar todas as contas
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("id, nome_empresa, owner_id, created_at")
        .eq("ativo", true)
        .order("created_at", { ascending: false });

      if (accountsError) throw accountsError;

      // Buscar profiles dos owners
      const ownerIds = [...new Set((accountsData || []).map(a => a.owner_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, nome, email, foto_url")
        .in("id", ownerIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      // Buscar leads por conta
      let leadsQuery = supabase.from("leads").select("account_id, id");
      if (dateRange.startDate && dateRange.endDate) {
        leadsQuery = leadsQuery
          .gte("created_at", dateRange.startDate)
          .lte("created_at", dateRange.endDate + "T23:59:59");
      }
      const { data: leadsData } = await leadsQuery;

      // Buscar vendas por conta
      let salesQuery = supabase.from("vendas").select("account_id, id, valor_final").eq("reembolsada", false);
      if (dateRange.startDate && dateRange.endDate) {
        salesQuery = salesQuery
          .gte("data_fechamento", dateRange.startDate)
          .lte("data_fechamento", dateRange.endDate);
      }
      const { data: salesData } = await salesQuery;

      // Buscar calls por conta
      let callsQuery = supabase.from("calls").select("account_id, id, resultado");
      if (dateRange.startDate && dateRange.endDate) {
        callsQuery = callsQuery
          .gte("created_at", dateRange.startDate)
          .lte("created_at", dateRange.endDate + "T23:59:59");
      }
      const { data: callsData } = await callsQuery;

      // Agrupar dados por conta
      const leadsMap = new Map<string, number>();
      const salesMap = new Map<string, { count: number; revenue: number }>();
      const callsMap = new Map<string, { total: number; attended: number }>();

      (leadsData || []).forEach(lead => {
        leadsMap.set(lead.account_id, (leadsMap.get(lead.account_id) || 0) + 1);
      });

      (salesData || []).forEach(sale => {
        const current = salesMap.get(sale.account_id) || { count: 0, revenue: 0 };
        salesMap.set(sale.account_id, {
          count: current.count + 1,
          revenue: current.revenue + (sale.valor_final || 0),
        });
      });

      (callsData || []).forEach(call => {
        const current = callsMap.get(call.account_id) || { total: 0, attended: 0 };
        callsMap.set(call.account_id, {
          total: current.total + 1,
          attended: current.attended + (call.resultado === "compareceu" ? 1 : 0),
        });
      });

      // Montar lista de contas com stats
      const accountsWithStats: AccountWithStats[] = (accountsData || []).map(account => {
        const owner = profilesMap.get(account.owner_id);
        const sales = salesMap.get(account.id) || { count: 0, revenue: 0 };
        const calls = callsMap.get(account.id) || { total: 0, attended: 0 };

        return {
          id: account.id,
          nome_empresa: account.nome_empresa,
          owner_name: owner?.nome || "Sem nome",
          owner_email: owner?.email || "",
          foto_url: owner?.foto_url || null,
          created_at: account.created_at || "",
          total_revenue: sales.revenue,
          total_leads: leadsMap.get(account.id) || 0,
          total_calls: calls.total,
          attended_calls: calls.attended,
          total_sales: sales.count,
        };
      });

      // Ordenar por faturamento
      return accountsWithStats.sort((a, b) => b.total_revenue - a.total_revenue);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
          <Trophy className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
        </div>
      </div>
    );
  }

  const getCardStyle = (position: number) => {
    if (position === 1) return "bg-gradient-to-br from-yellow-500/30 via-amber-400/20 to-orange-500/30 border-2 border-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.3)]";
    if (position === 2) return "bg-gradient-to-br from-slate-400/30 via-gray-300/20 to-slate-500/30 border-2 border-slate-300/50 shadow-[0_0_20px_rgba(148,163,184,0.3)]";
    if (position === 3) return "bg-gradient-to-br from-orange-600/30 via-amber-600/20 to-orange-700/30 border-2 border-orange-500/50 shadow-[0_0_20px_rgba(234,88,12,0.3)]";
    return "bg-card/50 border border-border/50 hover:border-primary/30 hover:shadow-lg";
  };

  const getPositionBadge = (position: number) => {
    if (position === 1) {
      return (
        <div className="relative">
          <div className="absolute -top-1 -right-1 animate-ping">
            <Star className="h-4 w-4 text-yellow-400" />
          </div>
          <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-4 py-2 rounded-full font-black text-xl shadow-lg">
            <Crown className="h-6 w-6" />
            <span>1º</span>
          </div>
        </div>
      );
    }
    if (position === 2) {
      return (
        <div className="flex items-center gap-1 bg-gradient-to-r from-slate-400 to-gray-400 text-black px-4 py-2 rounded-full font-bold text-lg">
          <Trophy className="h-5 w-5" />
          <span>2º</span>
        </div>
      );
    }
    if (position === 3) {
      return (
        <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-600 text-black px-4 py-2 rounded-full font-bold text-lg">
          <Trophy className="h-5 w-5" />
          <span>3º</span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground font-bold text-lg">
        {position}º
      </div>
    );
  };

  const getFireLevel = (revenue: number) => {
    if (revenue >= 100000) return 3;
    if (revenue >= 50000) return 2;
    if (revenue >= 10000) return 1;
    return 0;
  };

  const totalRevenue = accounts?.reduce((sum, acc) => sum + acc.total_revenue, 0) || 0;
  const totalLeads = accounts?.reduce((sum, acc) => sum + acc.total_leads, 0) || 0;
  const totalSales = accounts?.reduce((sum, acc) => sum + acc.total_sales, 0) || 0;

  return (
    <div className="space-y-8 p-6 md:p-8 bg-background min-h-screen">
      {/* Header com Stats Globais */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/20 p-6 md:p-8 border border-primary/20">
        <div className="absolute top-0 right-0 opacity-10">
          <Trophy className="h-48 w-48 -rotate-12" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              Ranking de Faturamento
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              {accounts?.length || 0} contas competindo 🔥
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { type: "all" as PeriodType, label: "Tudo" },
              { type: "day" as PeriodType, label: "7 Dias" },
              { type: "week" as PeriodType, label: "12 Semanas" },
              { type: "month" as PeriodType, label: "6 Meses" },
            ].map(({ type, label }) => (
              <Button
                key={type}
                variant={periodType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodType(type)}
                className={cn(
                  "transition-all duration-300",
                  periodType === type && "shadow-lg shadow-primary/25"
                )}
              >
                {label}
              </Button>
            ))}

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={periodType === "custom" ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                >
                  <CalendarIcon className="h-4 w-4" />
                  {periodType === "custom" && customDateRange?.from && customDateRange?.to ? (
                    <>
                      {format(customDateRange.from, "dd/MM", { locale: ptBR })} -{" "}
                      {format(customDateRange.to, "dd/MM", { locale: ptBR })}
                    </>
                  ) : (
                    "Personalizado"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={customDateRange}
                  onSelect={(range) => {
                    setCustomDateRange(range);
                    if (range?.from && range?.to) {
                      setPeriodType("custom");
                    }
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="relative z-10 grid grid-cols-3 gap-4 mt-6">
          <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Faturamento Total
            </div>
            <div className="text-2xl font-black text-green-500 mt-1">
              {formatCurrency(totalRevenue)}
            </div>
          </div>
          <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4 text-blue-500" />
              Total de Leads
            </div>
            <div className="text-2xl font-black text-blue-500 mt-1">
              {totalLeads.toLocaleString()}
            </div>
          </div>
          <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Target className="h-4 w-4 text-purple-500" />
              Total de Vendas
            </div>
            <div className="text-2xl font-black text-purple-500 mt-1">
              {totalSales.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Ranking Cards */}
      <div className="grid gap-4">
        {accounts && accounts.length > 0 ? (
          accounts.map((account, index) => {
            const position = index + 1;
            const showRate = account.total_calls > 0 
              ? Math.round((account.attended_calls / account.total_calls) * 100) 
              : 0;
            const conversionRate = account.total_leads > 0 
              ? Math.round((account.total_sales / account.total_leads) * 100) 
              : 0;
            const fireLevel = getFireLevel(account.total_revenue);

            return (
              <Card
                key={account.id}
                className={cn(
                  "transition-all duration-500 hover:scale-[1.01]",
                  getCardStyle(position),
                  position <= 3 && "animate-in slide-in-from-left-5"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-4 md:gap-6">
                    {/* Position */}
                    <div className="flex-shrink-0">
                      {getPositionBadge(position)}
                    </div>

                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <Avatar className={cn(
                        "h-14 w-14 md:h-16 md:w-16 border-4 shadow-lg",
                        position === 1 && "border-yellow-400 ring-4 ring-yellow-400/30",
                        position === 2 && "border-slate-400",
                        position === 3 && "border-orange-500",
                        position > 3 && "border-background"
                      )}>
                        <AvatarImage src={account.foto_url || undefined} alt={account.owner_name} />
                        <AvatarFallback className={cn(
                          "text-lg font-bold",
                          position === 1 && "bg-yellow-500/20 text-yellow-600",
                          position === 2 && "bg-slate-500/20 text-slate-600",
                          position === 3 && "bg-orange-500/20 text-orange-600",
                          position > 3 && "bg-primary/10 text-primary"
                        )}>
                          {account.owner_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {fireLevel > 0 && (
                        <div className="absolute -bottom-1 -right-1 flex">
                          {[...Array(fireLevel)].map((_, i) => (
                            <Flame key={i} className="h-4 w-4 text-orange-500 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg md:text-xl font-bold text-foreground truncate">
                          {account.owner_name}
                        </h3>
                        {position <= 3 && (
                          <Badge variant="secondary" className={cn(
                            "text-xs",
                            position === 1 && "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
                            position === 2 && "bg-slate-500/20 text-slate-700 dark:text-slate-300",
                            position === 3 && "bg-orange-500/20 text-orange-700 dark:text-orange-400"
                          )}>
                            {position === 1 ? "🏆 Líder" : position === 2 ? "🥈 Vice" : "🥉 Pódio"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{account.nome_empresa}</p>
                    </div>

                    {/* Stats - Desktop */}
                    <div className="hidden md:flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-black text-green-500">
                          {formatCurrency(account.total_revenue)}
                        </div>
                        <div className="text-xs text-muted-foreground">Faturamento</div>
                      </div>
                      <div className="h-12 w-px bg-border" />
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-500">{account.total_leads}</div>
                        <div className="text-xs text-muted-foreground">Leads</div>
                      </div>
                      <div className="h-12 w-px bg-border" />
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-500">{account.total_sales}</div>
                        <div className="text-xs text-muted-foreground">Vendas</div>
                      </div>
                      <div className="h-12 w-px bg-border" />
                      <div className="text-center">
                        <div className="text-xl font-bold text-foreground">{conversionRate}%</div>
                        <div className="text-xs text-muted-foreground">Conversão</div>
                      </div>
                    </div>

                    {/* Revenue Badge - Mobile */}
                    <div className="md:hidden">
                      <div className="text-lg font-black text-green-500">
                        {formatCurrency(account.total_revenue)}
                      </div>
                    </div>
                  </div>

                  {/* Stats - Mobile */}
                  <div className="md:hidden grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border/50">
                    <div className="text-center">
                      <div className="text-sm font-bold text-blue-500">{account.total_leads}</div>
                      <div className="text-xs text-muted-foreground">Leads</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-purple-500">{account.total_sales}</div>
                      <div className="text-xs text-muted-foreground">Vendas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-foreground">{showRate}%</div>
                      <div className="text-xs text-muted-foreground">Show</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-foreground">{conversionRate}%</div>
                      <div className="text-xs text-muted-foreground">Conv.</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <div className="relative inline-block">
                <Trophy className="h-20 w-20 text-muted-foreground/50 mx-auto mb-4" />
                <Zap className="absolute -top-2 -right-2 h-8 w-8 text-yellow-500 animate-bounce" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nenhuma conta encontrada
              </h3>
              <p className="text-muted-foreground">
                As contas aparecerão aqui assim que forem criadas
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RevenueRanking;
