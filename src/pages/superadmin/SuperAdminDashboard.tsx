import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, TrendingUp, Users, DollarSign, Activity, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight, Sparkles, ShoppingCart, UserPlus, Calendar as CalendarIcon } from "lucide-react";
import { formatCurrency } from "@/lib/dateUtils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HealthScoreBadge } from "@/components/HealthScoreBadge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { usePlatformMetrics } from "@/hooks/usePlatformMetrics";
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
type PeriodType = "day" | "week" | "month" | "custom";
const SuperAdminDashboard = () => {
  const {
    data: metrics,
    isLoading: isLoadingMetrics
  } = usePlatformMetrics();
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);

  // Calcular datas com base no tipo de período
  const getDateRange = () => {
    const now = new Date();
    if (periodType === "custom" && customDateRange?.from && customDateRange?.to) {
      return {
        startDate: format(startOfDay(customDateRange.from), "yyyy-MM-dd"),
        endDate: format(endOfDay(customDateRange.to), "yyyy-MM-dd"),
        granularity: "day"
      };
    }
    switch (periodType) {
      case "day":
        return {
          startDate: format(subDays(now, 6), "yyyy-MM-dd"),
          endDate: format(now, "yyyy-MM-dd"),
          granularity: "day"
        };
      case "week":
        return {
          startDate: format(subWeeks(now, 11), "yyyy-MM-dd"),
          endDate: format(now, "yyyy-MM-dd"),
          granularity: "week"
        };
      case "month":
      default:
        return {
          startDate: format(subMonths(now, 5), "yyyy-MM-dd"),
          endDate: format(now, "yyyy-MM-dd"),
          granularity: "month"
        };
    }
  };
  const dateRange = getDateRange();

  // Buscar dados de usuários ativos
  const {
    data: activeUsersData,
    isLoading: isLoadingActiveUsers
  } = useQuery({
    queryKey: ["active-users", dateRange.startDate, dateRange.endDate, dateRange.granularity],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.rpc("get_active_users_over_time", {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        granularity: dateRange.granularity
      });
      if (error) throw error;
      return data as Array<{
        period_start: string;
        period_label: string;
        active_users: number;
      }>;
    }
  });

  // Calcular crescimento de usuários ativos
  const currentActiveUsers = activeUsersData?.[activeUsersData.length - 1]?.active_users || 0;
  const previousActiveUsers = activeUsersData?.[activeUsersData.length - 2]?.active_users || 0;
  const activeUsersGrowth = previousActiveUsers > 0 ? ((currentActiveUsers - previousActiveUsers) / previousActiveUsers * 100).toFixed(1) : 0;
  const isGrowthPositive = Number(activeUsersGrowth) >= 0;
  // Buscar ativos vs inativos
  const {
    data: activeVsInactiveData,
    isLoading: isLoadingActiveVsInactive
  } = useQuery({
    queryKey: ["active-vs-inactive", dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.rpc("get_active_vs_inactive_users", {
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      });
      if (error) throw error;
      return data as {
        active_users: number;
        inactive_users: number;
        total_users: number;
        active_percentage: number;
        inactive_percentage: number;
      };
    }
  });

  const {
    data: healthStats,
    isLoading: isLoadingHealth
  } = useQuery({
    queryKey: ["health-stats"],
    queryFn: async () => {
      const {
        data: accounts,
        error
      } = await supabase.from("accounts").select("health_score, nome_empresa").eq("ativo", true).order("health_score", {
        ascending: false
      });
      if (error) throw error;
      const avgScore = accounts && accounts.length > 0 ? Math.round(accounts.reduce((sum, acc) => sum + (acc.health_score || 0), 0) / accounts.length) : 0;
      const topEngaged = accounts?.slice(0, 5) || [];
      const atRisk = [...(accounts || [])].reverse().slice(0, 5);
      return {
        avgScore,
        topEngaged,
        atRisk
      };
    }
  });
  const updateHealthScores = useMutation({
    mutationFn: async () => {
      const {
        data,
        error
      } = await supabase.rpc("update_all_health_scores");
      if (error) throw error;
      return data as {
        success: boolean;
        updated_count: number;
        timestamp: string;
      };
    },
    onSuccess: data => {
      toast.success(`Health scores atualizados! ${data.updated_count} contas processadas.`);
      window.location.reload();
    },
    onError: error => {
      toast.error("Erro ao atualizar health scores: " + error.message);
    }
  });
  if (isLoadingMetrics || isLoadingHealth || isLoadingActiveUsers || isLoadingActiveVsInactive) {
    return <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="space-y-8 p-8 bg-background min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start gap-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral da plataforma HighLeads</p>
        </div>
        
        {/* Seletor de Período */}
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant={periodType === "day" ? "default" : "outline"} size="sm" onClick={() => setPeriodType("day")}>
            Dia
          </Button>
          <Button variant={periodType === "week" ? "default" : "outline"} size="sm" onClick={() => setPeriodType("week")}>
            Semana
          </Button>
          <Button variant={periodType === "month" ? "default" : "outline"} size="sm" onClick={() => setPeriodType("month")}>
            Mês
          </Button>
          
          {/* Calendário para período personalizado */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={periodType === "custom" ? "default" : "outline"} size="sm" className={cn("gap-2", periodType === "custom" && customDateRange?.from && customDateRange?.to && "border-primary")}>
                <CalendarIcon className="h-4 w-4" />
                {periodType === "custom" && customDateRange?.from && customDateRange?.to ? <>
                    {format(customDateRange.from, "dd/MM", {
                  locale: ptBR
                })} -{" "}
                    {format(customDateRange.to, "dd/MM", {
                  locale: ptBR
                })}
                  </> : "Personalizado"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="range" selected={customDateRange} onSelect={range => {
              setCustomDateRange(range);
              if (range?.from && range?.to) {
                setPeriodType("custom");
              }
            }} numberOfMonths={2} locale={ptBR} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Card Comparativo - Ativos vs Inativos */}
      <Card className="border-none shadow-sm bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Usuários: Ativos vs Inativos
          </CardTitle>
          <CardDescription className="text-sm">
            Período: {format(new Date(dateRange.startDate), "dd/MM/yyyy")} - {format(new Date(dateRange.endDate), "dd/MM/yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-success mb-1">
                {activeVsInactiveData?.active_users || 0}
              </div>
              <div className="text-sm text-muted-foreground">Ativos</div>
              <div className="text-xs text-success font-medium mt-1">
                {activeVsInactiveData?.active_percentage || 0}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-danger mb-1">
                {activeVsInactiveData?.inactive_users || 0}
              </div>
              <div className="text-sm text-muted-foreground">Inativos</div>
              <div className="text-xs text-danger font-medium mt-1">
                {activeVsInactiveData?.inactive_percentage || 0}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground mb-1">
                {activeVsInactiveData?.total_users || 0}
              </div>
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-xs text-muted-foreground font-medium mt-1">
                100%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usuários Ativos Hero Card - Destaque Principal */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base font-medium text-muted-foreground">
                Usuários Ativos
              </CardTitle>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${isGrowthPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
              {isGrowthPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {activeUsersGrowth}%
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-bold tracking-tight text-foreground mb-6">
            {currentActiveUsers}
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeUsersData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="period_label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value}`} />
                <Tooltip contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }} formatter={value => [`${value} usuários`, 'Ativos']} />
                <Line type="monotone" dataKey="active_users" stroke="hsl(var(--primary))" strokeWidth={3} dot={{
                fill: 'hsl(var(--primary))',
                strokeWidth: 2,
                r: 4
              }} activeDot={{
                r: 6
              }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {/* Contas Ativas */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">Contas Ativas</CardDescription>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {metrics?.activeAccounts || 0}
            </div>
          </CardContent>
        </Card>

        {/* Novas Contas (30 dias) */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">Novas Contas (30d)</CardDescription>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-success">
              +{metrics?.newAccounts || 0}
            </div>
          </CardContent>
        </Card>

        {/* Total de Usuários */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">Total de Usuários</CardDescription>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {metrics?.totalUsers || 0}
            </div>
          </CardContent>
        </Card>

        {/* Total de Leads */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">Total de Leads</CardDescription>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {metrics?.totalLeads || 0}
            </div>
          </CardContent>
        </Card>

        {/* Total de Vendas */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">Total de Vendas</CardDescription>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {metrics?.totalSales || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabelas de Análise */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Top Contas Engajadas */}
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-success/10 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <CardTitle className="text-base font-semibold">Top 5 Contas Engajadas</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Contas com maior health score da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="text-xs font-medium text-muted-foreground">Empresa</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {healthStats?.topEngaged.map((account: any) => <TableRow key={account.nome_empresa} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm py-4">{account.nome_empresa}</TableCell>
                    <TableCell className="text-right">
                      <HealthScoreBadge score={account.health_score || 0} showLabel={false} />
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Contas em Risco */}
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-danger/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-danger" />
              </div>
              <CardTitle className="text-base font-semibold">Top 5 Contas em Risco</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Contas que precisam de atenção imediata
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="text-xs font-medium text-muted-foreground">Empresa</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {healthStats?.atRisk.map((account: any) => <TableRow key={account.nome_empresa} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm py-4">{account.nome_empresa}</TableCell>
                    <TableCell className="text-right">
                      <HealthScoreBadge score={account.health_score || 0} showLabel={false} />
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Contas Inativas */}
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-muted rounded-lg">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-base font-semibold">Contas Inativas</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Contas desativadas na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="text-xs font-medium text-muted-foreground">Empresa</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics?.inactiveAccounts && metrics.inactiveAccounts.length > 0 ? metrics.inactiveAccounts.map((account: any) => <TableRow key={account.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-sm py-4">{account.nome_empresa}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(new Date(account.created_at), "dd/MM/yyyy")}
                      </TableCell>
                    </TableRow>) : <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-8">
                      Nenhuma conta inativa
                    </TableCell>
                  </TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Usuários por Nicho */}
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold">Usuários por Nicho</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Distribuição de contas por segmento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="text-xs font-medium text-muted-foreground">Nicho</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-right">Contas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics?.usersByNiche && metrics.usersByNiche.length > 0 ? metrics.usersByNiche.map((item: any) => <TableRow key={item.niche} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-sm py-4">{item.niche}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {item.accounts}
                        </span>
                      </TableCell>
                    </TableRow>) : <TableRow>
                    <TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-8">
                      Nenhum dado de nicho disponível
                    </TableCell>
                  </TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default SuperAdminDashboard;