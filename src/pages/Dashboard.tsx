import { useState, useMemo, useEffect, useRef } from "react";
import { DollarSign, ShoppingCart, Target, TrendingUp, Edit, Users, Clock, FileText, Calendar as CalendarIcon, Phone, CheckCircle, XCircle, Flame, History } from "lucide-react";
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
  return <div className="space-y-6 md:space-y-8">
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Visão geral da sua performance de vendas</p>
      </div>
    </div>

    {/* Meta Progress - Simplified */}
    {metaAtual && progressoMeta ? <div className="bg-card rounded-[40px] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.5)] text-foreground flex flex-col justify-between min-h-[200px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold mb-1">{metaAtual.nome}</h3>
          <p className="text-muted-foreground text-[14px]">
            {progressoMeta.diasUteisDecorridos} de {progressoMeta.diasUteisNoMes} dias úteis • {progressoMeta.diasUteisRestantes} dias restantes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="gap-2 rounded-full hidden sm:flex" onClick={() => setHistoricoMetasOpen(true)}>
            <History className="h-4 w-4" />
            Histórico
          </Button>
          <Button variant="secondary" className="gap-2 rounded-full hidden sm:flex" onClick={() => setMetaDialogOpen(true)}>
            <Edit className="h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      <div className="mt-auto">
        <p className="text-5xl md:text-6xl font-black tracking-tighter text-white">
          R$ {faturamentoMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(143,255,0,0.5)]" style={{ width: `${Math.min(100, (faturamentoMesAtual / metaAtual.valor_mensal) * 100)}%` }} />
          </div>
          <p className="text-muted-foreground text-sm font-medium whitespace-nowrap">
            de R$ {metaAtual.valor_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div> : <div className="bg-card rounded-[40px] p-10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] text-center flex flex-col items-center justify-center">
      <Target className="h-16 w-16 mb-4 text-muted-foreground/30" strokeWidth={1.5} />
      <h3 className="text-2xl font-bold mb-2">Defina sua meta mensal</h3>
      <p className="text-muted-foreground mb-6">Configure uma meta de faturamento</p>
      <Button onClick={() => setMetaDialogOpen(true)} className="rounded-full px-8 h-12">Criar Meta</Button>
    </div>}

    <ConfigurarMetaDialog open={metaDialogOpen} onOpenChange={setMetaDialogOpen} />
    <HistoricoMetasDialog open={historicoMetasOpen} onOpenChange={setHistoricoMetasOpen} />

    {/* Seletor de Período */}
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card rounded-[32px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
      <div>
        <h3 className="text-lg font-bold">Período de Análise</h3>
        <p className="text-sm text-muted-foreground mt-1">Selecione o período para visualizar as métricas</p>
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
              : period === "today"
                ? "Hoje"
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

    {/* Metric Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-card rounded-[32px] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col justify-between">
        <div className="flex items-start justify-between mb-6">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Faturamento</p>
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div>
          <p className="text-4xl md:text-5xl font-black tracking-tighter text-white">
            {vendasMetrics.faturamento.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0
            })}
          </p>
          {vendasMetrics.variacaoFaturamento.valor > 0 && <p className={`text-[13px] font-medium mt-3 flex items-center gap-1 ${vendasMetrics.variacaoFaturamento.positivo ? 'text-primary' : 'text-danger'}`}>
            {vendasMetrics.variacaoFaturamento.positivo ? '↑' : '↓'} {vendasMetrics.variacaoFaturamento.valor.toFixed(1)}% <span className="text-muted-foreground ml-1 font-normal">vs {vendasMetrics.labelComparacao}</span>
          </p>}
        </div>
      </div>

      <div className="bg-card rounded-[32px] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col justify-between">
        <div className="flex items-start justify-between mb-6">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Vendas Fechadas</p>
          <div className="p-3 rounded-full bg-white/5 text-white">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>
        <div>
          <p className="text-4xl md:text-5xl font-black tracking-tighter text-white">{vendasMetrics.totalVendas}</p>
          {vendasMetrics.variacaoVendas.valor > 0 && <p className={`text-[13px] font-medium mt-3 flex items-center gap-1 ${vendasMetrics.variacaoVendas.positivo ? 'text-primary' : 'text-danger'}`}>
            {vendasMetrics.variacaoVendas.positivo ? '↑' : '↓'} {vendasMetrics.variacaoVendas.valor.toFixed(1)}% <span className="text-muted-foreground ml-1 font-normal">vs {vendasMetrics.labelComparacao}</span>
          </p>}
        </div>
      </div>

      <div className="bg-card rounded-[32px] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col justify-between">
        <div className="flex items-start justify-between mb-6">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Ticket Médio</p>
          <div className="p-3 rounded-full bg-white/5 text-white">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div>
          <p className="text-4xl md:text-5xl font-black tracking-tighter text-white">
            {vendasMetrics.ticketMedio.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0
            })}
          </p>
          {vendasMetrics.variacaoTicket.valor > 0 && <p className={`text-[13px] font-medium mt-3 flex items-center gap-1 ${vendasMetrics.variacaoTicket.positivo ? 'text-primary' : 'text-danger'}`}>
            {vendasMetrics.variacaoTicket.positivo ? '↑' : '↓'} {vendasMetrics.variacaoTicket.valor.toFixed(1)}% <span className="text-muted-foreground ml-1 font-normal">vs {vendasMetrics.labelComparacao}</span>
          </p>}
        </div>
      </div>
    </div>

    {/* Chart - Evolução do Faturamento */}
    <div className="bg-card rounded-[32px] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-none">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white">Evolução do Faturamento</h3>
      </div>
      <div>
        {chartData.length === 0 ? <div className="h-[250px] md:h-[350px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma venda no período selecionado</p>
          </div>
        </div> : <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '10px' }} />
            <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '10px' }} tickFormatter={value => `R$ ${(value / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              color: 'hsl(var(--popover-foreground))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
              padding: '8px 12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            }} formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Faturamento']} />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>}
      </div>
    </div>

    {/* Secondary Metrics Cards */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">









    </div>

    {/* Widget de Calls de Hoje (High Contrast White Panel) */}
    <div className="bg-white rounded-[40px] p-8 md:p-10 shadow-[0_20px_40px_rgba(0,0,0,0.6)] text-black mt-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="p-3 bg-black rounded-full text-white">
          <Phone className="h-6 w-6" />
        </div>
        <h3 className="text-2xl font-black tracking-tight">Calls de Hoje</h3>
      </div>

      <div>
        {callsHoje.length === 0 ? <div className="text-center py-12 text-black/50">
          <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" strokeWidth={1.5} />
          <p className="text-lg font-medium">Nenhuma call agendada para hoje</p>
        </div> : <div className="space-y-4">
          {callsHoje.map(call => <div key={call.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-6 border border-black/10 rounded-3xl hover:bg-black/5 transition-all duration-300">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 text-black font-semibold text-sm">
                  <Clock className="h-4 w-4" />
                  {format(new Date(call.data_hora_agendada), "HH:mm")}
                </div>
                <span className="font-bold text-lg">{call.leads?.nome}</span>
              </div>
              <div className="text-sm text-black/60 flex flex-col md:flex-row md:items-center gap-1 md:gap-4 font-medium">
                <span>Closer: {call.profiles?.nome}</span>
                {call.leads?.produtos?.nome && <span className="hidden md:inline">• {call.leads.produtos.nome}</span>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button size="lg" className="gap-2 bg-[#8FFF00] hover:bg-[#80e500] text-black font-bold border-none shadow-none rounded-full min-h-[48px] px-6" onClick={() => handleMarcarCallConcluida(call.id)} disabled={updateCall.isPending}>
                <CheckCircle className="h-5 w-5" />
                <span>Concluída</span>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-[#FD7570] hover:text-white border-[#FD7570]/30 hover:bg-[#FD7570] hover:border-[#FD7570] min-h-[48px] rounded-full px-6 transition-all" onClick={() => handleMarcarCallNoShow(call.id)} disabled={updateCall.isPending}>
                <XCircle className="h-5 w-5" />
                <span>No-Show</span>
              </Button>
            </div>
          </div>)}
        </div>}
      </div>
    </div>
  </div>;
};
export default Dashboard;