import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePerformance } from "@/hooks/usePerformance";
import { useUserRole } from "@/hooks/useUserRole";
import { TrendingUp, Users, PhoneCall, DollarSign, Target, Zap, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

const Performance = () => {
  const [period, setPeriod] = useState("month");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const navigate = useNavigate();

  // Calcular período
  const {
    dataInicio,
    dataFim
  } = useMemo(() => {
    const hoje = new Date();
    let inicio = new Date();
    let fim = new Date();
    if (period === "custom" && customDateRange?.from) {
      inicio = customDateRange.from;
      fim = customDateRange.to || customDateRange.from;
    } else {
      switch (period) {
        case "week": {
          // Semana atual: do início da semana até hoje (mesma lógica do Calls/Vendas)
          inicio = new Date(hoje);
          inicio.setDate(hoje.getDate() - hoje.getDay());
          fim = new Date(hoje);
          break;
        }
        case "month": {
          // Mês atual: do primeiro dia até hoje (igual tela de Vendas)
          inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          fim = new Date(hoje);
          break;
        }
        case "quarter": {
          // Últimos 3 meses até hoje
          inicio = new Date(hoje);
          inicio.setMonth(hoje.getMonth() - 3);
          fim = hoje;
          break;
        }
      }
    }
    inicio.setHours(0, 0, 0, 0);
    fim.setHours(23, 59, 59, 999);
    return {
      dataInicio: inicio.toISOString(),
      dataFim: fim.toISOString()
    };
  }, [period, customDateRange]);
  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    if (value === "custom") {
      setIsCalendarOpen(true);
    }
  };
  const handleQuickSelect = (days: number | "all") => {
    const hoje = new Date();
    const fim = new Date();
    fim.setHours(23, 59, 59, 999);
    if (days === "all") {
      const inicio = new Date(2020, 0, 1);
      inicio.setHours(0, 0, 0, 0);
      setCustomDateRange({
        from: inicio,
        to: fim
      });
    } else if (days === 0) {
      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      setCustomDateRange({
        from: inicio,
        to: fim
      });
    } else {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - days);
      inicio.setHours(0, 0, 0, 0);
      setCustomDateRange({
        from: inicio,
        to: fim
      });
    }
  };
  const {
    data,
    isLoading
  } = usePerformance(dataInicio, dataFim);
  const { data: userRoles = [] } = useUserRole();
  const isAdmin = userRoles.some(r => r.role === "admin" || r.role === "super_admin");
  const isSdrOnly = !isAdmin && userRoles.some(r => r.role === "sdr") && !userRoles.some(r => r.role === "closer");
  const isCloserOnly = !isAdmin && userRoles.some(r => r.role === "closer") && !userRoles.some(r => r.role === "sdr");

  const sdrPerformance = data?.sdrPerformance || [];
  const closerPerformance = data?.closerPerformance || [];

  // Calcular métricas gerais da equipe
  const metricsGerais = useMemo(() => {
    const totalLeads = sdrPerformance.reduce((sum, sdr) => sum + sdr.leadsGerados, 0);
    const totalCallsAgendadas = sdrPerformance.reduce((sum, sdr) => sum + sdr.callsAgendadas, 0);
    const totalComparecimentos = sdrPerformance.reduce((sum, sdr) => sum + sdr.comparecimentos, 0);
    const totalCallsRealizadas = closerPerformance.reduce((sum, closer) => sum + closer.callsRealizadas, 0);
    const totalPropostas = closerPerformance.reduce((sum, closer) => sum + closer.propostasEnviadas, 0);
    const totalVendas = closerPerformance.reduce((sum, closer) => sum + closer.vendasFechadas, 0);
    const totalFaturamento = closerPerformance.reduce((sum, closer) => sum + closer.faturamento, 0);

    const taxaComparecimentoGeral = totalCallsAgendadas > 0 
      ? ((totalComparecimentos / totalCallsAgendadas) * 100).toFixed(1) 
      : "0.0";
    
    const taxaConversaoGeral = totalCallsRealizadas > 0 
      ? ((totalVendas / totalCallsRealizadas) * 100).toFixed(1) 
      : "0.0";
    
    const taxaFechamentoGeral = totalPropostas > 0 
      ? ((totalVendas / totalPropostas) * 100).toFixed(1) 
      : "0.0";

    return {
      totalLeads,
      totalCallsAgendadas,
      totalComparecimentos,
      taxaComparecimentoGeral,
      totalCallsRealizadas,
      totalPropostas,
      totalVendas,
      totalFaturamento,
      taxaConversaoGeral,
      taxaFechamentoGeral,
    };
  }, [sdrPerformance, closerPerformance]);
  const faturamentoData = closerPerformance.map(closer => ({
    nome: closer.nome.split(' ')[0],
    faturamento: closer.faturamento
  }));
  const conversionData = closerPerformance.map(closer => ({
    nome: closer.nome.split(' ')[0],
    taxa: parseFloat(closer.taxaConversao)
  }));
  const COLORS = ['hsl(var(--success))', 'hsl(var(--primary))'];
  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">Performance</h1>
          <p className="text-sm md:text-base text-muted-foreground">Análise de desempenho da equipe</p>
        </div>
        
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full md:w-[260px] min-h-[44px] justify-start text-left font-normal",
                period === "custom" && !customDateRange?.from && "text-muted-foreground"
              )}
              onClick={() => setIsCalendarOpen(true)}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {period === "custom" && customDateRange?.from
                ? customDateRange.to
                  ? `${format(customDateRange.from, "dd/MM/yyyy")} - ${format(customDateRange.to, "dd/MM/yyyy")}`
                  : format(customDateRange.from, "dd/MM/yyyy")
                : period === "week"
                ? "Semana Atual"
                : period === "quarter"
                ? "Últimos 3 meses"
                : "Mês Atual"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="flex flex-col space-y-2 p-3 border-b">
              <Button variant="ghost" className="justify-start" onClick={() => {
              handleQuickSelect(0);
              setPeriod("custom");
            }}>
                Hoje
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => {
              handleQuickSelect(7);
              setPeriod("custom");
            }}>
                Últimos 7 dias
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => {
              handleQuickSelect(30);
              setPeriod("custom");
            }}>
                Últimos 30 dias
              </Button>
              <Button variant="ghost" className="justify-start" onClick={() => {
              handleQuickSelect("all");
              setPeriod("custom");
            }}>
                Tempo todo
            </Button>
            </div>
            <Calendar initialFocus mode="range" defaultMonth={customDateRange?.from} selected={customDateRange} onSelect={setCustomDateRange} numberOfMonths={1} locale={ptBR} className="pointer-events-auto" />
            <div className="flex gap-2 p-3 border-t">
              <Button variant="outline" className="flex-1" onClick={() => {
              setIsCalendarOpen(false);
              setPeriod("month");
              setCustomDateRange(undefined);
            }}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={() => {
              setIsCalendarOpen(false);
              if (customDateRange?.from) {
                setPeriod("custom");
              }
            }} disabled={!customDateRange?.from}>
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

      </div>

      {/* Métricas Gerais da Equipe */}
      <div className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Desempenho Geral da Equipe
        </h2>

        {/* Cards Dopaminérgicos Destacados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Taxa de Comparecimento - hidden for closer-only */}
          {!isCloserOnly && (
            <div className="relative overflow-hidden bg-success rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
              <div className="relative text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Zap className="h-6 w-6" />
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    Meta: 70%
                  </Badge>
                </div>
                <p className="text-sm font-medium opacity-90 mb-2">Taxa de Comparecimento</p>
                <p className="text-5xl font-bold mb-3">{metricsGerais.taxaComparecimentoGeral}%</p>
                <p className="text-xs opacity-80">
                  {metricsGerais.totalComparecimentos} de {metricsGerais.totalCallsAgendadas} calls agendadas
                </p>
              </div>
            </div>
          )}

          {/* Taxa de Conversão - hidden for sdr-only */}
          {!isSdrOnly && (
            <div className="relative overflow-hidden bg-primary rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
              <div className="relative text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                    Calls → Vendas
                  </Badge>
                </div>
                <p className="text-sm font-medium opacity-90 mb-2">Taxa de Conversão</p>
                <p className="text-5xl font-bold mb-3">{metricsGerais.taxaConversaoGeral}%</p>
                <p className="text-xs opacity-80">
                  {metricsGerais.totalVendas} vendas de {metricsGerais.totalCallsRealizadas} calls realizadas
                </p>
              </div>
            </div>
          )}

          {/* Ticket Médio */}
          <div className="relative overflow-hidden bg-warning rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
            <div className="relative text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <DollarSign className="h-6 w-6" />
                </div>
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                  Ticket Médio
                </Badge>
              </div>
              <p className="text-sm font-medium opacity-90 mb-2">Ticket Médio</p>
              <p className="text-5xl font-bold mb-3">
                R$ {metricsGerais.totalVendas > 0 ? (metricsGerais.totalFaturamento / metricsGerais.totalVendas).toLocaleString('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }) : '0'}
              </p>
              <p className="text-xs opacity-80">
                Valor médio por venda
              </p>
            </div>
          </div>
        </div>

        {/* Métricas Gerais Grid - role-aware */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {!isCloserOnly && (
            <div className="bg-card rounded-xl p-5 shadow-md border border-border hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Leads Gerados</p>
              </div>
              <p className="text-3xl font-bold">{metricsGerais.totalLeads}</p>
            </div>
          )}

          {!isCloserOnly && (
            <div className="bg-card rounded-xl p-5 shadow-md border border-border hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-success/10 rounded-lg">
                  <PhoneCall className="h-5 w-5 text-success" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Calls Agendadas</p>
              </div>
              <p className="text-3xl font-bold">{metricsGerais.totalCallsAgendadas}</p>
            </div>
          )}

          {!isSdrOnly && (
            <div className="bg-card rounded-xl p-5 shadow-md border border-border hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Award className="h-5 w-5 text-warning" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Vendas Fechadas</p>
              </div>
              <p className="text-3xl font-bold text-success">{metricsGerais.totalVendas}</p>
            </div>
          )}

          <div className="bg-success rounded-xl p-5 shadow-xl text-white hover:shadow-2xl hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium opacity-90">Faturamento Total</p>
            </div>
            <p className="text-2xl md:text-3xl font-bold">
              R$ {metricsGerais.totalFaturamento.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* SDR Performance - hidden for closer-only */}
      {!isCloserOnly && <div className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold">Performance SDRs</h2>
        
        <div className="bg-card rounded-xl shadow-md overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SDR</th>
                  <th>Leads Gerados</th>
                  <th>Calls Agendadas</th>
                  <th>Comparecimentos</th>
                  <th>Taxa de Comparecimento</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sdrPerformance.map((sdr, index) => <tr key={index} className="cursor-pointer" onClick={() => navigate(`/profile/${sdr.id}`)}>
                    <td className="font-semibold">{sdr.nome}</td>
                    <td className="font-bold">{sdr.leadsGerados}</td>
                    <td className="font-bold">{sdr.callsAgendadas}</td>
                    <td className="font-bold">{sdr.comparecimentos}</td>
                    <td className="font-bold text-success">{sdr.taxaComparecimento}</td>
                    <td>
                      <Badge variant="default">Ativo</Badge>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-3 space-y-3">
            {sdrPerformance.map((sdr, index) => <div key={index} className="bg-muted/30 rounded-lg p-4 space-y-3 border border-border" onClick={() => navigate(`/profile/${sdr.id}`)}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-base">{sdr.nome}</p>
                  <Badge variant="default">Ativo</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Leads Gerados</p>
                    <p className="font-bold text-lg">{sdr.leadsGerados}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Calls Agendadas</p>
                    <p className="font-bold text-lg">{sdr.callsAgendadas}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Comparecimentos</p>
                    <p className="font-bold text-lg">{sdr.comparecimentos}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Taxa Comparec.</p>
                    <p className="font-bold text-lg text-success">{sdr.taxaComparecimento}</p>
                  </div>
                </div>
              </div>)}
          </div>
        </div>
      </div>}

      {/* Closer Performance - hidden for sdr-only */}
      {!isSdrOnly && <div className="space-y-4">
        <h2 className="text-xl md:text-2xl font-bold">Performance Closers</h2>
        
        <div className="bg-card rounded-xl shadow-md overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Closer</th>
                  <th>Calls Realizadas</th>
                  <th>Propostas</th>
                  <th>Vendas</th>
                  <th>Faturamento</th>
                  <th>Ticket Médio</th>
                  <th>Taxa de Conversão</th>
                </tr>
              </thead>
              <tbody>
                {closerPerformance.map((closer, index) => <tr key={index} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/profile/${closer.id}`)}>
                    <td className="font-semibold">{closer.nome}</td>
                    <td className="font-medium">{closer.callsRealizadas}</td>
                    <td className="font-medium">{closer.propostasEnviadas}</td>
                    <td>
                      <Badge variant="default" className="font-bold">
                        {closer.vendasFechadas}
                      </Badge>
                    </td>
                    <td className="font-bold text-success text-lg">
                      R$ {closer.faturamento.toLocaleString('pt-BR')}
                    </td>
                    <td className="font-medium text-lg">
                      R$ {closer.vendasFechadas > 0 
                        ? (closer.faturamento / closer.vendasFechadas).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                        : '0'}
                    </td>
                    <td>
                      <span className="font-bold text-success text-lg">
                        {closer.taxaConversao}
                      </span>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-3 space-y-3">
            {closerPerformance.map((closer, index) => <div key={index} className="bg-muted/30 rounded-lg p-4 space-y-3 border border-border" onClick={() => navigate(`/profile/${closer.id}`)}>
                <p className="font-semibold text-base">{closer.nome}</p>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Calls Realizadas</p>
                    <p className="font-medium text-base">{closer.callsRealizadas}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Propostas</p>
                    <p className="font-medium text-base">{closer.propostasEnviadas}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Vendas</p>
                    <Badge variant="default" className="font-bold">
                      {closer.vendasFechadas}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Taxa Conversão</p>
                    <p className="font-bold text-base text-success">{closer.taxaConversao}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Ticket Médio</p>
                    <p className="font-medium text-base">
                      R$ {closer.vendasFechadas > 0 
                        ? (closer.faturamento / closer.vendasFechadas).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                        : '0'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-muted-foreground text-xs mb-1">Faturamento</p>
                  <p className="font-bold text-success text-xl">
                    R$ {closer.faturamento.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>)}
          </div>
        </div>
      </div>}

      {/* Charts - hidden for sdr-only */}
      {!isSdrOnly && closerPerformance.length > 0 && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-card rounded-xl p-4 md:p-6 shadow-md border border-border">
            <h3 className="text-lg md:text-xl font-semibold mb-4">Faturamento por Closer</h3>
            <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
              <BarChart data={faturamentoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="nome" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={value => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Faturamento']} />
                <Bar dataKey="faturamento" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-xl p-4 md:p-6 shadow-md border border-border">
            <h3 className="text-lg md:text-xl font-semibold mb-4">Taxa de Conversão</h3>
            <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
              <PieChart>
                <Pie data={conversionData} cx="50%" cy="50%" labelLine={false} label={({
              nome,
              taxa
            }) => `${nome}: ${taxa}%`} outerRadius={80} fill="hsl(var(--success))" dataKey="taxa">
                  {conversionData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, 'Taxa']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>}
    </div>;
};
export default Performance;