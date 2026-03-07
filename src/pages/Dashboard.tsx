import { useState, useMemo, useEffect, useRef } from "react";
import { DollarSign, ShoppingCart, Target, TrendingUp, Edit, Users, Clock, FileText, Calendar as CalendarIcon, Phone, CheckCircle, XCircle, Flame, History, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMetas, calcularProgressoMeta } from "@/hooks/useMetas";
import { useVendas } from "@/hooks/useVendas";
import { useLeads } from "@/hooks/useLeads";
import { useEtapasFunil } from "@/hooks/useEtapasFunil";
import { useCalls, useUpdateCall } from "@/hooks/useCalls";
import { startOfWeek, endOfWeek, format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { MetaProgressCard } from "@/components/MetaProgressCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { ConfigurarMetaDialog } from "@/components/ConfigurarMetaDialog";
import { HistoricoMetasDialog } from "@/components/HistoricoMetasDialog";
import MetricCard from "@/components/MetricCard";

const Dashboard = () => {
  const {
    user
  } = useAuth();
  const [period, setPeriod] = useState("month");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [historicoMetasOpen, setHistoricoMetasOpen] = useState(false);
  const previousRedistribuicaoRef = useRef<number>(0);
  const hoje = new Date();
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

  // Calcular datas baseado no período selecionado
  const {
    inicioVendas,
    fimVendas,
    inicioComparacao,
    fimComparacao
  } = useMemo(() => {
    const now = new Date();
    let inicio: Date;
    let fim: Date;
    let inicioComp: Date;
    let fimComp: Date;
    if (period === "custom" && customDateRange?.from) {
      inicio = customDateRange.from;
      fim = customDateRange.to || customDateRange.from;
      // Para comparação no custom, usar período de mesma duração antes
      const duracao = fim.getTime() - inicio.getTime();
      fimComp = new Date(inicio.getTime() - 1);
      inicioComp = new Date(fimComp.getTime() - duracao);
    } else {
      switch (period) {
        case "today":
          inicio = startOfDay(now);
          fim = endOfDay(now);
          // Comparar com ontem
          const ontem = new Date(now);
          ontem.setDate(now.getDate() - 1);
          inicioComp = startOfDay(ontem);
          fimComp = endOfDay(ontem);
          break;
        case "week":
          inicio = startOfWeek(now, {
            weekStartsOn: 0
          });
          fim = endOfWeek(now, {
            weekStartsOn: 0
          });
          // Comparar com semana anterior
          const semanaAnterior = new Date(now);
          semanaAnterior.setDate(now.getDate() - 7);
          inicioComp = startOfWeek(semanaAnterior, {
            weekStartsOn: 0
          });
          fimComp = endOfWeek(semanaAnterior, {
            weekStartsOn: 0
          });
          break;
        case "quarter":
          // Últimos 3 meses
          inicio = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          fim = endOfDay(now);
          // Comparar com 3 meses anteriores
          inicioComp = new Date(now.getFullYear(), now.getMonth() - 5, 1);
          fimComp = new Date(now.getFullYear(), now.getMonth() - 2, 0);
          break;
        case "month":
        default:
          // Mês atual
          inicio = new Date(now.getFullYear(), now.getMonth(), 1);
          fim = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          // Comparar com mês anterior
          inicioComp = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          fimComp = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
      }
    }
    return {
      inicioVendas: inicio.toISOString().split('T')[0],
      fimVendas: fim.toISOString().split('T')[0],
      inicioComparacao: inicioComp.toISOString().split('T')[0],
      fimComparacao: fimComp.toISOString().split('T')[0]
    };
  }, [period, customDateRange]);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];

  // Calcular datas para hoje e semana
  const inicioHojeStr = startOfDay(hoje).toISOString().split('T')[0];
  const fimHojeStr = endOfDay(hoje).toISOString().split('T')[0];
  const inicioSemanaStr = startOfWeek(hoje, {
    weekStartsOn: 0
  }).toISOString().split('T')[0];
  const fimSemanaStr = endOfWeek(hoje, {
    weekStartsOn: 0
  }).toISOString().split('T')[0];
  const {
    data: metas = []
  } = useMetas();
  const {
    data: vendas = []
  } = useVendas(inicioVendas, fimVendas);
  const {
    data: vendasComparacao = []
  } = useVendas(inicioComparacao, fimComparacao);
  const {
    data: vendasMesAtual = []
  } = useVendas(inicioMes, fimMes);
  const {
    data: vendasHoje = []
  } = useVendas(inicioHojeStr, fimHojeStr);
  const {
    data: vendasSemana = []
  } = useVendas(inicioSemanaStr, fimSemanaStr);
  const {
    data: leads = []
  } = useLeads();
  const {
    data: etapas = []
  } = useEtapasFunil();

  // Buscar calls da semana atual
  const inicioSemana = startOfWeek(hoje, {
    weekStartsOn: 0
  }).toISOString();
  const fimSemana = endOfWeek(hoje, {
    weekStartsOn: 0
  }).toISOString();
  const {
    data: callsSemana = []
  } = useCalls({
    dataInicio: inicioSemana,
    dataFim: fimSemana
  });

  // Buscar calls de hoje
  const inicioHoje = startOfDay(hoje).toISOString();
  const fimHoje = endOfDay(hoje).toISOString();
  const {
    data: callsHoje = []
  } = useCalls({
    dataInicio: inicioHoje,
    dataFim: fimHoje,
    status: "agendada"
  });
  const updateCall = useUpdateCall();
  const {
    toast
  } = useToast();
  const metaAtual = metas[0];
  const faturamentoMesAtual = vendasMesAtual.reduce((sum, v) => sum + v.valor_final, 0);
  const faturamentoHoje = vendasHoje.reduce((sum, v) => sum + v.valor_final, 0);
  const faturamentoSemana = vendasSemana.reduce((sum, v) => sum + v.valor_final, 0);
  const faturamentoAtual = vendas.reduce((sum, v) => sum + v.valor_final, 0);
  const progressoMeta = useMemo(() => {
    if (!metaAtual) return null;
    return calcularProgressoMeta(metaAtual, faturamentoMesAtual, faturamentoHoje, faturamentoSemana);
  }, [metaAtual, faturamentoMesAtual, faturamentoHoje, faturamentoSemana]);

  // Notificação de redistribuição automática
  useEffect(() => {
    if (!progressoMeta) return;

    const aumentoPercentual = progressoMeta.metaDiariaOriginal > 0
      ? ((progressoMeta.metaDiariaRedistribuida - progressoMeta.metaDiariaOriginal) / progressoMeta.metaDiariaOriginal) * 100
      : 0;

    // Notificar se a redistribuição aumentar mais de 20% e for diferente da anterior
    if (
      aumentoPercentual > 20 &&
      previousRedistribuicaoRef.current !== progressoMeta.metaDiariaRedistribuida &&
      previousRedistribuicaoRef.current > 0
    ) {
      toast({
        title: "⚠️ Redistribuição de Meta Ativa",
        description: `Sua meta diária aumentou ${aumentoPercentual.toFixed(0)}% para R$ ${progressoMeta.metaDiariaRedistribuida.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} devido ao valor pendente.`,
        variant: "default",
        duration: 8000,
      });
    }

    previousRedistribuicaoRef.current = progressoMeta.metaDiariaRedistribuida;
  }, [progressoMeta, toast]);

  // Calcular métricas de vendas com comparação ao período anterior
  const vendasMetrics = useMemo(() => {
    const totalVendas = vendas.length;
    const totalVendasComparacao = vendasComparacao.length;
    const faturamentoComparacao = vendasComparacao.reduce((sum, v) => sum + v.valor_final, 0);
    const ticketMedio = totalVendas > 0 ? faturamentoAtual / totalVendas : 0;
    const ticketMedioComparacao = totalVendasComparacao > 0 ? faturamentoComparacao / totalVendasComparacao : 0;

    // Calcular variações percentuais
    const variacaoFaturamento = faturamentoComparacao > 0 ? (faturamentoAtual - faturamentoComparacao) / faturamentoComparacao * 100 : 0;
    const variacaoVendas = totalVendasComparacao > 0 ? (totalVendas - totalVendasComparacao) / totalVendasComparacao * 100 : 0;
    const variacaoTicket = ticketMedioComparacao > 0 ? (ticketMedio - ticketMedioComparacao) / ticketMedioComparacao * 100 : 0;

    // Definir label de comparação baseado no período
    let labelComparacao = "período anterior";
    switch (period) {
      case "today":
        labelComparacao = "ontem";
        break;
      case "week":
        labelComparacao = "semana anterior";
        break;
      case "month":
        labelComparacao = "mês anterior";
        break;
      case "quarter":
        labelComparacao = "trimestre anterior";
        break;
    }
    return {
      faturamento: faturamentoAtual,
      totalVendas,
      ticketMedio,
      labelComparacao,
      variacaoFaturamento: {
        valor: Math.abs(variacaoFaturamento),
        positivo: variacaoFaturamento >= 0
      },
      variacaoVendas: {
        valor: Math.abs(variacaoVendas),
        positivo: variacaoVendas >= 0
      },
      variacaoTicket: {
        valor: Math.abs(variacaoTicket),
        positivo: variacaoTicket >= 0
      }
    };
  }, [vendas, vendasComparacao, faturamentoAtual, period]);

  // Calcular métricas dos leads e calls
  const leadsMetrics = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Total de leads ativos
    const leadsAtivos = leads.length;

    // Follow-ups que precisam de atenção hoje
    const followupsHoje = leads.filter(lead => {
      if (!lead.ultima_movimentacao || !lead.etapa_id) return false;
      const ultimaMov = new Date(lead.ultima_movimentacao);
      ultimaMov.setHours(0, 0, 0, 0);
      const etapa = etapas.find(e => e.id === lead.etapa_id);
      if (!etapa || !etapa.prazo_alerta_dias) return false;
      const diasPassados = Math.floor((hoje.getTime() - ultimaMov.getTime()) / (1000 * 60 * 60 * 24));
      return diasPassados >= etapa.prazo_alerta_dias;
    }).length;

    // Propostas enviadas (leads com data_envio_proposta)
    const propostasEnviadas = leads.filter(lead => lead.data_envio_proposta).length;

    // Calls agendadas (status "agendada")
    const callsAgendadas = callsSemana.filter(call => call.status === "agendada").length;

    // Taxa de comparecimento
    const callsConcluidas = callsSemana.filter(call => call.status === "concluida").length;
    const callsNoShow = callsSemana.filter(call => call.status === "no_show").length;
    const totalCallsRealizadas = callsConcluidas + callsNoShow;
    const taxaComparecimento = totalCallsRealizadas > 0 ? (callsConcluidas / totalCallsRealizadas * 100).toFixed(1) : "0";
    return {
      leadsAtivos,
      followupsHoje,
      propostasEnviadas,
      callsAgendadas,
      taxaComparecimento
    };
  }, [leads, etapas, callsSemana]);

  // Calcular dados do gráfico de evolução baseado em vendas reais
  const chartData = useMemo(() => {
    if (vendas.length === 0) return [];

    // Agrupar vendas por data
    const vendasPorData = vendas.reduce((acc, venda) => {
      const data = new Date(venda.data_fechamento);
      let chave: string;
      switch (period) {
        case "today":
          chave = format(data, "HH:mm");
          break;
        case "week":
          chave = format(data, "EEE", {
            locale: ptBR
          });
          break;
        case "quarter":
          chave = format(data, "MMM", {
            locale: ptBR
          });
          break;
        case "month":
        default:
          chave = format(data, "dd/MM");
          break;
      }
      if (!acc[chave]) {
        acc[chave] = 0;
      }
      acc[chave] += venda.valor_final;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(vendasPorData).map(([date, value]) => ({
      date,
      value
    })).sort((a, b) => {
      // Para garantir ordem cronológica
      return a.date.localeCompare(b.date);
    });
  }, [vendas, period]);
  const handleMarcarCallConcluida = (callId: string) => {
    updateCall.mutate({
      id: callId,
      status: "concluida"
    }, {
      onSuccess: () => {
        toast({
          title: "Call marcada como concluída!"
        });
      }
    });
  };
  const handleMarcarCallNoShow = (callId: string) => {
    updateCall.mutate({
      id: callId,
      status: "no_show"
    }, {
      onSuccess: () => {
        toast({
          title: "Call marcada como no-show"
        });
      }
    });
  };
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo de volta, <span className="font-semibold text-foreground">{user?.email?.split('@')[0]}</span>. Aqui está o resumo da sua operação.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => setHistoricoMetasOpen(true)}>
            <History className="h-4 w-4" />
            Histórico
          </Button>
          <Button className="gap-2 shadow-sm" onClick={() => setMetaDialogOpen(true)}>
            <Target className="h-4 w-4" />
            Meta Mensal
          </Button>
        </div>
      </div>

      {/* Meta Progress Card */}
      {metaAtual && progressoMeta ? (
        <Card className="overflow-hidden border-border bg-card shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-none border-foreground text-foreground">
                    Meta Ativa
                  </Badge>
                  <span className="text-sm text-muted-foreground font-medium">
                    {progressoMeta.diasUteisDecorridos} de {progressoMeta.diasUteisNoMes} dias úteis ({progressoMeta.diasUteisRestantes} restantes)
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{metaAtual.nome}</h2>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground">
                    R$ {faturamentoMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">
                    objetivo: R$ {metaAtual.valor_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="flex-1 max-w-xl w-full space-y-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Progresso Geral</span>
                  <span className="text-primary">{((faturamentoMesAtual / metaAtual.valor_mensal) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1 bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-foreground transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(100, (faturamentoMesAtual / metaAtual.valor_mensal) * 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="border-t border-border pt-3">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Meta Diária</p>
                    <p className="text-xl font-extrabold text-foreground">R$ {progressoMeta.metaDiariaOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                  </div>
                  <div className="border-t border-foreground pt-3">
                    <p className="text-[11px] font-bold text-foreground uppercase tracking-wider mb-1">Ajustada</p>
                    <p className="text-xl font-extrabold text-foreground">R$ {progressoMeta.metaDiariaRedistribuida.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="p-12 text-center flex flex-col items-center justify-center">
            <Target className="h-12 w-12 mb-4 text-muted-foreground/30" strokeWidth={1.5} />
            <h3 className="text-xl font-bold mb-2">Configure sua meta mensal</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">Mantenha sua equipe focada e acompanhe o progresso em tempo real.</p>
            <Button onClick={() => setMetaDialogOpen(true)} className="px-8">Definir Meta Agora</Button>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Faturamento do Período"
          value={vendasMetrics.faturamento.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0
          })}
          icon={DollarSign}
          trend={vendasMetrics.variacaoFaturamento.valor > 0 ? {
            value: `${vendasMetrics.variacaoFaturamento.valor.toFixed(1)}%`,
            isPositive: vendasMetrics.variacaoFaturamento.positivo
          } : undefined}
        />
        <MetricCard
          label="Vendas Realizadas"
          value={vendasMetrics.totalVendas}
          icon={ShoppingCart}
          trend={vendasMetrics.variacaoVendas.valor > 0 ? {
            value: `${vendasMetrics.variacaoVendas.valor.toFixed(1)}%`,
            isPositive: vendasMetrics.variacaoVendas.positivo
          } : undefined}
        />
        <MetricCard
          label="Ticket Médio"
          value={vendasMetrics.ticketMedio.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0
          })}
          icon={TrendingUp}
          trend={vendasMetrics.variacaoTicket.valor > 0 ? {
            value: `${vendasMetrics.variacaoTicket.valor.toFixed(1)}%`,
            isPositive: vendasMetrics.variacaoTicket.positivo
          } : undefined}
        />
        <MetricCard
          label="Taxa de Comparecimento"
          value={`${leadsMetrics.taxaComparecimento}%`}
          icon={Phone}
          highlight
        />
      </div>

      {/* Analytics & Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Evolution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Evolução do Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>Nenhuma venda no período selecionado</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={value => `R$${(value / 1000).toFixed(0)}k`}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Action Items / Follow-ups */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="p-6 bg-card rounded-none border border-border flex flex-col justify-between hover:border-foreground transition-all">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-5 h-5 text-muted-foreground" strokeWidth={1.25} />
                  <h4 className="font-semibold text-sm uppercase tracking-wider">Follow-ups</h4>
                </div>
                <p className="text-4xl font-extrabold tracking-tight">{leadsMetrics.followupsHoje}</p>
                <p className="text-[13px] text-muted-foreground mt-1">Leads aguardando contato hoje</p>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-6 rounded-none border-border hover:bg-foreground hover:text-background transition-colors" asChild>
                <a href="/leads">Ver Leads</a>
              </Button>
            </div>

            <div className="p-6 bg-card rounded-none border border-border flex flex-col justify-between hover:border-foreground transition-all">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-5 h-5 text-muted-foreground" strokeWidth={1.25} />
                  <h4 className="font-semibold text-sm uppercase tracking-wider">Propostas</h4>
                </div>
                <p className="text-4xl font-extrabold tracking-tight">{leadsMetrics.propostasEnviadas}</p>
                <p className="text-[13px] text-muted-foreground mt-1">Aguardando fechamento</p>
              </div>
              <Button variant="outline" size="sm" className="w-full mt-6 rounded-none border-border hover:bg-foreground hover:text-background transition-colors" asChild>
                <a href="/pipeline">Ir para Pipeline</a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calls Section - Clean Tabela/Lista */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold">Agenda de Hoje</h3>
          </div>
          <Badge variant="secondary" className="font-medium">
            {callsHoje.length} calls agendadas
          </Badge>
        </div>

        {callsHoje.length === 0 ? (
          <Card className="border-border bg-transparent shadow-none rounded-none">
            <CardContent className="py-12 text-center text-muted-foreground italic">
              Nenhuma call agendada para o dia de hoje.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-0">
            {callsHoje.map(call => (
              <div key={call.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-transparent border-b border-border hover:bg-secondary/20 transition-all duration-300">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-start justify-center min-w-[60px]">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hora</span>
                    <span className="text-lg font-extrabold text-foreground">{format(new Date(call.data_hora_agendada), "HH:mm")}</span>
                  </div>
                  <div className="space-y-1 border-l border-border pl-6">
                    <h4 className="font-bold text-foreground text-sm tracking-tight">{call.leads?.nome}</h4>
                    <div className="flex items-center gap-3 text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 opacity-70" strokeWidth={1.25} /> {call.profiles?.nome}</span>
                      {call.leads?.produtos?.nome && (
                        <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 opacity-70" strokeWidth={1.25} /> {call.leads.produtos.nome}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger/10"
                    onClick={() => handleMarcarCallNoShow(call.id)}
                    disabled={updateCall.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    No-Show
                  </Button>
                  <Button
                    size="sm"
                    className="bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => handleMarcarCallConcluida(call.id)}
                    disabled={updateCall.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    Concluída
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfigurarMetaDialog open={metaDialogOpen} onOpenChange={setMetaDialogOpen} />
      <HistoricoMetasDialog open={historicoMetasOpen} onOpenChange={setHistoricoMetasOpen} />
    </div>
  );
};

export default Dashboard;