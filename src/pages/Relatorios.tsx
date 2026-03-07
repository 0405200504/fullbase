import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, TrendingUp, Calendar as CalendarIcon, Award, Users, PhoneCall, Target, Zap, Activity, Edit, History, Clock, RefreshCcw, FileText, Eye, MousePointerClick, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { useVendas } from "@/hooks/useVendas";
import { usePerformance } from "@/hooks/usePerformance";
import { useMetas, calcularProgressoMeta } from "@/hooks/useMetas";
import { getDateRange, formatCurrency, formatDate } from "@/lib/dateUtils";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import RegistrarReembolsoDialog from "@/components/RegistrarReembolsoDialog";
import { MetaProgressCard } from "@/components/MetaProgressCard";
import { ConfigurarMetaDialog } from "@/components/ConfigurarMetaDialog";
import { HistoricoMetasDialog } from "@/components/HistoricoMetasDialog";
import { useForms, useAllFormResponses } from "@/hooks/useForms";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

const COLORS = ['hsl(221,83%,53%)', 'hsl(152,55%,42%)', 'hsl(280,67%,55%)', 'hsl(38,92%,50%)', 'hsl(0,84%,60%)'];

const Relatorios = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("analises");
  const [period, setPeriod] = useState("mes");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [historicoMetasOpen, setHistoricoMetasOpen] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [reembolsoDialog, setReembolsoDialog] = useState<{ open: boolean; venda: any | null }>({ open: false, venda: null });
  const [showMetaDetails, setShowMetaDetails] = useState(false);

  const hoje = new Date();

  const dateRange = useMemo(() => {
    if (period === "custom" && customDateRange?.from) {
      const inicio = customDateRange.from;
      const fim = customDateRange.to || customDateRange.from;
      return { inicio: inicio.toISOString().split('T')[0], fim: fim.toISOString().split('T')[0] };
    }
    return getDateRange(period);
  }, [period, customDateRange]);

  const handleQuickSelect = (days: number | "all") => {
    const fim = new Date(); fim.setHours(23, 59, 59, 999);
    if (days === "all") {
      setCustomDateRange({ from: new Date(2020, 0, 1), to: fim });
    } else if (days === 0) {
      const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
      setCustomDateRange({ from: inicio, to: fim });
    } else {
      const inicio = new Date(); inicio.setDate(inicio.getDate() - days); inicio.setHours(0, 0, 0, 0);
      setCustomDateRange({ from: inicio, to: fim });
    }
  };

  // Performance date range
  const perfDateRange = useMemo(() => {
    if (period === "custom" && customDateRange?.from) {
      const inicio = customDateRange.from;
      const fim = customDateRange.to || customDateRange.from;
      inicio.setHours(0, 0, 0, 0); fim.setHours(23, 59, 59, 999);
      return { dataInicio: inicio.toISOString(), dataFim: fim.toISOString() };
    }
    const now = new Date();
    let inicio: Date, fim: Date;
    switch (period) {
      case "hoje": inicio = startOfDay(now); fim = endOfDay(now); break;
      case "semana": inicio = startOfWeek(now, { weekStartsOn: 0 }); fim = endOfWeek(now, { weekStartsOn: 0 }); break;
      default: inicio = new Date(now.getFullYear(), now.getMonth(), 1); fim = new Date(now.getFullYear(), now.getMonth() + 1, 0); break;
    }
    return { dataInicio: inicio.toISOString(), dataFim: fim.toISOString() };
  }, [period, customDateRange]);

  // Data hooks
  const { data: vendas = [], isLoading: loadingVendas } = useVendas(dateRange.inicio, dateRange.fim);
  const { data: vendasReembolso = [] } = useVendas(dateRange.inicio, dateRange.fim, true);
  const { data: perfData, isLoading: loadingPerf } = usePerformance(perfDateRange.dataInicio, perfDateRange.dataFim);
  const { data: metas = [] } = useMetas();
  const { data: forms = [] } = useForms();
  const { data: allFormResponses = [] } = useAllFormResponses();
  const { data: userRoles = [] } = useUserRole();
  const { user } = useAuth();

  // Role checks
  const isAdmin = userRoles.some(r => r.role === "admin" || r.role === "super_admin");
  const isSdrOnly = !isAdmin && userRoles.some(r => r.role === "sdr") && !userRoles.some(r => r.role === "closer");
  const isCloserOnly = !isAdmin && userRoles.some(r => r.role === "closer") && !userRoles.some(r => r.role === "sdr");

  // Form analytics
  const formAnalytics = useMemo(() => {
    return forms.map(f => ({
      ...f,
      conversionRate: f.views_count > 0 ? ((f.submissions_count / f.views_count) * 100).toFixed(1) : "0.0",
    }));
  }, [forms]);
  const totalFormViews = forms.reduce((s, f) => s + (f.views_count || 0), 0);
  const totalFormSubmissions = forms.reduce((s, f) => s + (f.submissions_count || 0), 0);
  const avgFormConversion = totalFormViews > 0 ? ((totalFormSubmissions / totalFormViews) * 100).toFixed(1) : "0.0";

  // Form submissions over time chart data
  const formSubmissionsOverTime = useMemo(() => {
    if (allFormResponses.length === 0) return [];
    const grouped: Record<string, number> = {};
    allFormResponses.forEach(r => {
      const d = new Date(r.created_at);
      const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return Object.entries(grouped).map(([dia, submissoes]) => ({ dia, submissoes }));
  }, [allFormResponses]);

  // Submissions per form (for pie chart)
  const submissionsPerForm = useMemo(() => {
    return forms
      .filter(f => f.submissions_count > 0)
      .map(f => ({ nome: f.title, valor: f.submissions_count }))
      .sort((a, b) => b.valor - a.valor);
  }, [forms]);

  // Meta calculations
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
  const { data: vendasMes = [] } = useVendas(inicioMes, fimMes);
  const inicioHojeStr = startOfDay(hoje).toISOString().split('T')[0];
  const fimHojeStr = endOfDay(hoje).toISOString().split('T')[0];
  const { data: vendasHoje = [] } = useVendas(inicioHojeStr, fimHojeStr);
  const inicioSemanaStr = startOfWeek(hoje, { weekStartsOn: 0 }).toISOString().split('T')[0];
  const fimSemanaStr = endOfWeek(hoje, { weekStartsOn: 0 }).toISOString().split('T')[0];
  const { data: vendasSemana = [] } = useVendas(inicioSemanaStr, fimSemanaStr);

  const faturamentoMes = vendasMes.reduce((s, v) => s + v.valor_final, 0);
  const faturamentoHoje = vendasHoje.reduce((s, v) => s + v.valor_final, 0);
  const faturamentoSemana = vendasSemana.reduce((s, v) => s + v.valor_final, 0);
  const metaAtual = metas[0];
  const progressoMeta = useMemo(() => {
    if (!metaAtual) return null;
    return calcularProgressoMeta(metaAtual, faturamentoMes, faturamentoHoje, faturamentoSemana);
  }, [metaAtual, faturamentoMes, faturamentoHoje, faturamentoSemana]);

  // Sales metrics
  const metrics = useMemo(() => {
    const totalFaturamento = vendas.reduce((sum, v) => sum + v.valor_final, 0);
    const totalVendas = vendas.length;
    const ticketMedio = totalVendas > 0 ? totalFaturamento / totalVendas : 0;

    const vendasPorProduto = vendas.reduce((acc, v) => {
      const p = v.produtos?.nome || "Sem produto";
      acc[p] = (acc[p] || 0) + v.valor_final;
      return acc;
    }, {} as Record<string, number>);
    const produtosData = Object.entries(vendasPorProduto).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);

    const faturamentoPorCloser = vendas.reduce((acc, v) => {
      const c = v.profiles?.nome || "Sem closer";
      acc[c] = (acc[c] || 0) + v.valor_final;
      return acc;
    }, {} as Record<string, number>);
    const topClosers = Object.entries(faturamentoPorCloser).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor).slice(0, 5);

    const faturamentoPorData = vendas.reduce((acc, v) => {
      const d = new Date(v.data_fechamento);
      const chave = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      acc[chave] = (acc[chave] || 0) + v.valor_final;
      return acc;
    }, {} as Record<string, number>);
    const faturamentoData = Object.entries(faturamentoPorData).map(([periodo, valor]) => ({ periodo, valor }));

    const vendasPorFonte = vendas.reduce((acc, v) => {
      const f = v.leads?.fonte_trafego || "Sem fonte";
      if (!acc[f]) acc[f] = { quantidade: 0, faturamento: 0 };
      acc[f].quantidade += 1;
      acc[f].faturamento += v.valor_final;
      return acc;
    }, {} as Record<string, { quantidade: number; faturamento: number }>);
    const fontesData = Object.entries(vendasPorFonte).map(([nome, d]) => ({
      nome, quantidade: d.quantidade, faturamento: d.faturamento,
      percentual: totalFaturamento > 0 ? (d.faturamento / totalFaturamento * 100).toFixed(0) : '0'
    })).sort((a, b) => b.faturamento - a.faturamento);

    const vendasPorMetodo = vendas.reduce((acc, v) => {
      const m = v.metodo_pagamento;
      if (!acc[m]) acc[m] = { count: 0, total: 0 };
      acc[m].count += 1;
      acc[m].total += v.valor_final;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);
    const metodosData = Object.entries(vendasPorMetodo).map(([nome, d]) => ({
      nome: nome.charAt(0).toUpperCase() + nome.slice(1), count: d.count, total: d.total
    }));

    const reembolsos = vendasReembolso.filter(v => v.reembolsada);
    const totalReembolsos = reembolsos.reduce((s, v) => s + v.valor_final, 0);

    return { totalFaturamento, totalVendas, ticketMedio, produtosData, topClosers, faturamentoData, fontesData, metodosData, totalReembolsos };
  }, [vendas, vendasReembolso]);

  // Performance metrics
  const sdrPerformance = perfData?.sdrPerformance || [];
  const closerPerformance = perfData?.closerPerformance || [];

  const metricsGerais = useMemo(() => {
    const totalLeads = sdrPerformance.reduce((s, sdr) => s + sdr.leadsGerados, 0);
    const totalCallsAgendadas = sdrPerformance.reduce((s, sdr) => s + sdr.callsAgendadas, 0);
    const totalComparecimentos = sdrPerformance.reduce((s, sdr) => s + sdr.comparecimentos, 0);
    const totalCallsRealizadas = closerPerformance.reduce((s, c) => s + c.callsRealizadas, 0);
    const totalVendas = closerPerformance.reduce((s, c) => s + c.vendasFechadas, 0);
    const totalFaturamento = closerPerformance.reduce((s, c) => s + c.faturamento, 0);
    const taxaComparecimento = totalCallsAgendadas > 0 ? ((totalComparecimentos / totalCallsAgendadas) * 100).toFixed(1) : "0.0";
    const taxaConversao = totalCallsRealizadas > 0 ? ((totalVendas / totalCallsRealizadas) * 100).toFixed(1) : "0.0";
    return { totalLeads, totalCallsAgendadas, totalComparecimentos, taxaComparecimento, totalCallsRealizadas, totalVendas, totalFaturamento, taxaConversao };
  }, [sdrPerformance, closerPerformance]);

  const isLoading = loadingVendas || loadingPerf;

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  }

  const periodLabel = period === "custom" && customDateRange?.from
    ? customDateRange.to
      ? `${format(customDateRange.from, "dd/MM/yyyy")} - ${format(customDateRange.to, "dd/MM/yyyy")}`
      : format(customDateRange.from, "dd/MM/yyyy")
    : period === "hoje" ? "Hoje" : period === "semana" ? "Semana Atual" : "Mês Atual";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Análise detalhada do seu negócio</p>
        </div>
      </div>

      {/* Period Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "hoje", label: "Hoje" },
          { key: "semana", label: "7 dias" },
          { key: "mes", label: "30 dias" },
        ].map(p => (
          <Button
            key={p.key}
            variant={period === p.key ? "default" : "outline"}
            size="sm"
            className="rounded-full text-[12px] h-9"
            onClick={() => { setPeriod(p.key); setCustomDateRange(undefined); }}
          >
            {p.label}
          </Button>
        ))}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={period === "custom" ? "default" : "outline"}
              size="sm"
              className="rounded-full text-[12px] h-9 gap-1.5"
              onClick={() => setIsCalendarOpen(true)}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              {period === "custom" ? periodLabel : "Personalizado"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex flex-col space-y-1 p-3 border-b">
              {[{ d: 0, l: "Hoje" }, { d: 7, l: "Últimos 7 dias" }, { d: 30, l: "Últimos 30 dias" }, { d: "all" as const, l: "Tempo todo" }].map(q => (
                <Button key={String(q.d)} variant="ghost" size="sm" className="justify-start text-[12px]" onClick={() => { handleQuickSelect(q.d); setPeriod("custom"); }}>
                  {q.l}
                </Button>
              ))}
            </div>
            <Calendar initialFocus mode="range" defaultMonth={customDateRange?.from} selected={customDateRange} onSelect={setCustomDateRange} numberOfMonths={1} locale={ptBR} className="pointer-events-auto" />
            <div className="flex gap-2 p-3 border-t">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setIsCalendarOpen(false); setPeriod("mes"); setCustomDateRange(undefined); }}>Cancelar</Button>
              <Button size="sm" className="flex-1" onClick={() => { setIsCalendarOpen(false); if (customDateRange?.from) setPeriod("custom"); }} disabled={!customDateRange?.from}>Aplicar</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="metric-card bg-card border-border shadow-sm">
          <p className="metric-label mb-1.5 uppercase tracking-widest text-[9px] font-bold">Faturamento</p>
          <p className="text-xl md:text-2xl font-extrabold tracking-tight">{formatCurrency(metrics.totalFaturamento)}</p>
        </div>
        <div className="metric-card bg-card border-border shadow-sm">
          <p className="metric-label mb-1.5 uppercase tracking-widest text-[9px] font-bold">Vendas</p>
          <p className="text-xl md:text-2xl font-extrabold tracking-tight">{metrics.totalVendas}</p>
        </div>
        <div className="metric-card bg-card border-border shadow-sm">
          <p className="metric-label mb-1.5 uppercase tracking-widest text-[9px] font-bold">Ticket Médio</p>
          <p className="text-xl md:text-2xl font-extrabold tracking-tight">{formatCurrency(metrics.ticketMedio)}</p>
        </div>
        <div className="metric-card bg-card border-border shadow-sm">
          <p className="metric-label mb-1.5 uppercase tracking-widest text-[9px] font-bold text-danger/70">Reembolsos</p>
          <p className="text-xl md:text-2xl font-extrabold tracking-tight text-danger">{formatCurrency(metrics.totalReembolsos)}</p>
        </div>
        <div className="metric-card bg-primary text-primary-foreground border-primary shadow-md">
          <p className="text-[9px] uppercase tracking-widest font-bold text-primary-foreground/70 mb-1.5">Líquido</p>
          <p className="text-xl md:text-2xl font-extrabold tracking-tight">{formatCurrency(metrics.totalFaturamento - metrics.totalReembolsos)}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b border-border/40 rounded-none w-full justify-start gap-0 h-auto p-0 overflow-x-auto">
          {[
            { value: "analises", label: "Análises" },
            { value: "financeiro", label: "Financeiro" },
            { value: "performance", label: "Performance" },
            { value: "formularios", label: "Formulários" },
            { value: "equipe", label: "Equipe" },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-[13px] font-medium whitespace-nowrap"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Análises Tab */}
        <TabsContent value="analises" className="space-y-4 mt-4">
          {/* Meta Progress */}
          {metaAtual && progressoMeta && (
            <>
              <div className="bg-card border border-border rounded-xl p-8 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Target className="w-32 h-32" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-widest text-[10px] px-2 h-5">
                        Performance de Hoje
                      </Badge>
                      <h3 className="text-lg font-bold text-foreground">{metaAtual.nome}</h3>
                    </div>
                    <div>
                      <p className="text-5xl font-black tracking-tighter text-foreground mb-1">
                        R$ {faturamentoHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm font-medium text-muted-foreground">
                        Meta diária balanceada: <span className="text-foreground font-bold">R$ {progressoMeta.metaDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center md:items-end gap-2">
                    <div className="text-5xl font-black text-primary tracking-tighter">
                      {progressoMeta.metaDiaria > 0 ? ((faturamentoHoje / progressoMeta.metaDiaria) * 100).toFixed(0) : 0}%
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Atingido</p>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold rounded-lg gap-2" onClick={() => setMetaDialogOpen(true)}>
                        <Edit className="h-3.5 w-3.5" /> Ajustar Meta
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold rounded-lg gap-2" onClick={() => setHistoricoMetasOpen(true)}>
                        <History className="h-3.5 w-3.5" /> Histórico
                      </Button>
                    </div>
                  </div>
                </div>
                <Progress
                  value={Math.min(progressoMeta.metaDiaria > 0 ? (faturamentoHoje / progressoMeta.metaDiaria) * 100 : 0, 100)}
                  className="h-2 mt-8 bg-secondary"
                />
              </div>

              {/* Toggle button for detailed metas */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowMetaDetails(!showMetaDetails)}
              >
                {showMetaDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showMetaDetails ? "Ocultar detalhes das metas" : "Ver metas detalhadas (diária, semanal, mensal)"}
              </Button>

              <AnimatePresence>
                {showMetaDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 gap-3">
                      <MetaProgressCard titulo="Meta Diária (Com Redistribuição)" valorAtual={progressoMeta.faturamentoDiario} valorMeta={progressoMeta.metaDiaria} periodo="diário" subtitulo={progressoMeta.valorPendente > 0 ? `Meta original: R$ ${progressoMeta.metaDiariaOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : undefined} />
                      <MetaProgressCard titulo="Meta Semanal" valorAtual={faturamentoSemana} valorMeta={progressoMeta.metaSemanal} periodo="semanal" progressoEsperado={progressoMeta.progressoEsperadoSemana} />
                      <MetaProgressCard titulo="Meta Mensal" valorAtual={faturamentoMes} valorMeta={progressoMeta.metaMensal} periodo="mensal" progressoEsperado={progressoMeta.progressoEsperadoMes} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {!metaAtual && (
            <Card className="border-border/40">
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Defina sua meta mensal</h3>
                <p className="text-[13px] text-muted-foreground mb-4">Configure uma meta de faturamento</p>
                <Button onClick={() => setMetaDialogOpen(true)}>Criar Meta</Button>
              </CardContent>
            </Card>
          )}

          {/* Chart: Faturamento por dia */}
          <Card className="border-border/40">
            <CardHeader className="pb-2"><CardTitle className="text-[14px] font-semibold">Faturamento por dia</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={metrics.faturamentoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="periodo" style={{ fontSize: '10px' }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis style={{ fontSize: '10px' }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px', padding: '8px 12px' }} formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Payment Methods + Top Closers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border/40">
              <CardHeader className="pb-2"><CardTitle className="text-[14px] font-semibold">Formas de Pagamento</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="w-[120px] h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart><Pie data={metrics.metodosData} dataKey="total" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>{metrics.metodosData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie></PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {metrics.metodosData.map((m, i) => (
                      <div key={m.nome} className="flex items-center justify-between text-[13px]">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-medium">{m.nome}</span>
                        </div>
                        <span className="text-muted-foreground">{m.count}x • {formatCurrency(m.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40">
              <CardHeader className="pb-2"><CardTitle className="text-[14px] font-semibold">Melhores Closers</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.topClosers.map((c, i) => (
                    <div key={c.nome} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold", i === 0 ? "bg-primary text-primary-foreground" : i < 3 ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
                          {i + 1}
                        </span>
                        <span className="text-[13px] font-medium">{c.nome}</span>
                      </div>
                      <span className="text-[13px] font-semibold text-success">{formatCurrency(c.valor)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <Card className="border-border/40">
            <CardHeader className="pb-2"><CardTitle className="text-[14px] font-semibold">Top Produtos (Mentorias)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.produtosData.slice(0, 10).map((p, i) => (
                  <div key={p.nome} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold", i < 3 ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                        {i + 1}
                      </span>
                      <span className="text-[13px] font-medium">{p.nome}</span>
                    </div>
                    <span className="text-[13px] font-semibold">{formatCurrency(p.valor)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financeiro Tab */}
        <TabsContent value="financeiro" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="metric-card"><p className="metric-label mb-1">Faturamento Bruto</p><p className="text-xl font-bold">{formatCurrency(metrics.totalFaturamento)}</p></div>
            <div className="metric-card"><p className="metric-label mb-1">Reembolsos</p><p className="text-xl font-bold text-destructive">{formatCurrency(metrics.totalReembolsos)}</p></div>
            <div className="metric-card"><p className="metric-label mb-1">Receita Líquida</p><p className="text-xl font-bold text-success">{formatCurrency(metrics.totalFaturamento - metrics.totalReembolsos)}</p></div>
            <div className="metric-card"><p className="metric-label mb-1">Taxa de Reembolso</p><p className="text-xl font-bold">{metrics.totalFaturamento > 0 ? ((metrics.totalReembolsos / metrics.totalFaturamento) * 100).toFixed(1) : 0}%</p></div>
          </div>

          {/* Margem */}
          <Card className="border-border/40">
            <CardHeader className="pb-2"><CardTitle className="text-[14px] font-semibold">Margem de Receita</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Progress value={metrics.totalFaturamento > 0 ? ((metrics.totalFaturamento - metrics.totalReembolsos) / metrics.totalFaturamento) * 100 : 100} className="flex-1 h-3" />
                <span className="text-lg font-bold text-success">{metrics.totalFaturamento > 0 ? (((metrics.totalFaturamento - metrics.totalReembolsos) / metrics.totalFaturamento) * 100).toFixed(1) : 100}%</span>
              </div>
              <p className="text-[12px] text-muted-foreground mt-2">
                Faturamento {formatCurrency(metrics.totalFaturamento)} - Reembolsos {formatCurrency(metrics.totalReembolsos)} = Líquido {formatCurrency(metrics.totalFaturamento - metrics.totalReembolsos)}
              </p>
            </CardContent>
          </Card>

          {/* Traffic Sources */}
          {metrics.fontesData.length > 0 && (
            <Card className="border-border/40">
              <CardHeader className="pb-2"><CardTitle className="text-[14px] font-semibold">Vendas por Fonte de Tráfego</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.fontesData.map((f, i) => (
                    <div key={f.nome} className="flex items-center justify-between text-[13px]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-medium">{f.nome}</span>
                      </div>
                      <span className="text-muted-foreground">{f.quantidade}x • {formatCurrency(f.faturamento)} ({f.percentual}%)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profit by Product */}
          <Card className="border-border/40">
            <CardHeader className="pb-2"><CardTitle className="text-[14px] font-semibold">Receita por Mentoria</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.produtosData.map((p, i) => {
                  const pct = metrics.totalFaturamento > 0 ? ((p.valor / metrics.totalFaturamento) * 100).toFixed(1) : '0';
                  return (
                    <div key={p.nome} className="flex items-center justify-between text-[13px]">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold", i < 3 ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{i + 1}</span>
                        <span className="font-medium">{p.nome}</span>
                      </div>
                      <span className="font-semibold text-success">{formatCurrency(p.valor)} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sales History Table */}
          <Card className="border-border/40 overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/20"><CardTitle className="text-[14px] font-semibold">Histórico de Vendas</CardTitle></CardHeader>
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Data</th><th>Cliente</th><th>Mentoria</th><th>Valor</th><th>Closer</th><th>Pagamento</th><th>Ações</th></tr></thead>
                <tbody>
                  {vendas.map(v => (
                    <tr key={v.id}>
                      <td>{formatDate(v.data_fechamento)}</td>
                      <td className="font-semibold">{v.leads?.nome || "-"}</td>
                      <td>{v.produtos?.nome || "-"}</td>
                      <td className="font-bold text-success">{formatCurrency(v.valor_final)}</td>
                      <td className="text-muted-foreground">{v.profiles?.nome || "-"}</td>
                      <td><Badge variant="secondary" className="text-[10px]">{v.metodo_pagamento}</Badge></td>
                      <td><Button variant="ghost" size="sm" onClick={() => setReembolsoDialog({ open: true, venda: v })} className="text-destructive h-7 w-7 p-0"><RefreshCcw className="h-3.5 w-3.5" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden p-3 space-y-3">
              {vendas.map(v => (
                <div key={v.id} className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/20">
                  <div className="flex justify-between"><span className="font-semibold text-[13px]">{v.leads?.nome || "-"}</span><span className="text-[11px] text-muted-foreground">{formatDate(v.data_fechamento)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[12px] text-muted-foreground">{v.produtos?.nome}</span><span className="font-bold text-success">{formatCurrency(v.valor_final)}</span></div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Performance Tab - Role-aware */}
        <TabsContent value="performance" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* SDR-only: show lead/scheduling metrics, hide conversion */}
            {!isCloserOnly && (
              <div className="metric-card"><p className="metric-label mb-1">Leads Gerados</p><p className="text-2xl font-bold">{metricsGerais.totalLeads}</p></div>
            )}
            {!isCloserOnly && (
              <div className="metric-card"><p className="metric-label mb-1">Taxa Comparecimento</p><p className="text-2xl font-bold text-success">{metricsGerais.taxaComparecimento}%</p></div>
            )}
            {/* Closer-only: show conversion/sales, hide lead generation */}
            {!isSdrOnly && (
              <div className="metric-card"><p className="metric-label mb-1">Taxa Conversão</p><p className="text-2xl font-bold text-success">{metricsGerais.taxaConversao}%</p></div>
            )}
            {!isSdrOnly && (
              <div className="metric-card"><p className="metric-label mb-1">Vendas Fechadas</p><p className="text-2xl font-bold">{metricsGerais.totalVendas}</p></div>
            )}
            <div className="bg-primary text-primary-foreground rounded-xl p-4 apple-shadow"><p className="text-[11px] font-medium uppercase tracking-wider text-primary-foreground/70 mb-1">Faturamento</p><p className="text-2xl font-bold">R$ {metricsGerais.totalFaturamento.toLocaleString('pt-BR')}</p></div>
          </div>

          {/* SDR Table - hidden for closer-only */}
          {!isCloserOnly && (
            <Card className="border-border/40 overflow-hidden">
              <CardHeader className="pb-2 border-b border-border/20"><CardTitle className="text-[14px] font-semibold">Performance SDRs</CardTitle></CardHeader>
              <div className="hidden md:block overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>SDR</th><th>Leads</th><th>Calls Agendadas</th><th>Comparecimentos</th><th>Taxa</th></tr></thead>
                  <tbody>
                    {sdrPerformance.map((sdr, i) => (
                      <tr key={i} className="cursor-pointer" onClick={() => navigate(`/profile/${sdr.id}`)}>
                        <td className="font-semibold">{sdr.nome}</td>
                        <td>{sdr.leadsGerados}</td>
                        <td>{sdr.callsAgendadas}</td>
                        <td>{sdr.comparecimentos}</td>
                        <td className="font-bold text-success">{sdr.taxaComparecimento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden p-3 space-y-3">
                {sdrPerformance.map((sdr, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 border border-border/20" onClick={() => navigate(`/profile/${sdr.id}`)}>
                    <p className="font-semibold text-[13px] mb-2">{sdr.nome}</p>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div><span className="text-muted-foreground">Leads:</span> <span className="font-bold">{sdr.leadsGerados}</span></div>
                      <div><span className="text-muted-foreground">Taxa:</span> <span className="font-bold text-success">{sdr.taxaComparecimento}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Closer Table - hidden for sdr-only */}
          {!isSdrOnly && (
            <Card className="border-border/40 overflow-hidden">
              <CardHeader className="pb-2 border-b border-border/20"><CardTitle className="text-[14px] font-semibold">Performance Closers</CardTitle></CardHeader>
              <div className="hidden md:block overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Closer</th><th>Calls</th><th>Propostas</th><th>Vendas</th><th>Faturamento</th><th>Ticket Médio</th><th>Conversão</th></tr></thead>
                  <tbody>
                    {closerPerformance.map((c, i) => (
                      <tr key={i} className="cursor-pointer" onClick={() => navigate(`/profile/${c.id}`)}>
                        <td className="font-semibold">{c.nome}</td>
                        <td>{c.callsRealizadas}</td>
                        <td>{c.propostasEnviadas}</td>
                        <td><Badge variant="default">{c.vendasFechadas}</Badge></td>
                        <td className="font-bold text-success">R$ {c.faturamento.toLocaleString('pt-BR')}</td>
                        <td>R$ {c.vendasFechadas > 0 ? (c.faturamento / c.vendasFechadas).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0'}</td>
                        <td className="font-bold text-success">{c.taxaConversao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden p-3 space-y-3">
                {closerPerformance.map((c, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-3 border border-border/20" onClick={() => navigate(`/profile/${c.id}`)}>
                    <div className="flex justify-between mb-2"><span className="font-semibold text-[13px]">{c.nome}</span><Badge variant="default">{c.vendasFechadas} vendas</Badge></div>
                    <p className="font-bold text-success text-lg">R$ {c.faturamento.toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Formulários Tab */}
        <TabsContent value="formularios" className="space-y-4 mt-4">
          {/* Form filter */}
          {forms.length > 1 && (
            <div className="flex items-center gap-2">
              <Label className="text-[12px] whitespace-nowrap">Filtrar por:</Label>
              <Select value={selectedFormId || "all"} onValueChange={v => setSelectedFormId(v === "all" ? null : v)}>
                <SelectTrigger className="w-[220px] h-8 text-[12px]"><SelectValue placeholder="Todos os formulários" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os formulários</SelectItem>
                  {forms.map(f => <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="metric-card"><p className="metric-label mb-1">Formulários Ativos</p><p className="text-2xl font-bold">{(selectedFormId ? forms.filter(f => f.id === selectedFormId) : forms).filter(f => f.active).length}</p></div>
            <div className="metric-card"><p className="metric-label mb-1">Total de Views</p><p className="text-2xl font-bold">{(selectedFormId ? forms.filter(f => f.id === selectedFormId) : forms).reduce((s, f) => s + (f.views_count || 0), 0)}</p></div>
            <div className="metric-card"><p className="metric-label mb-1">Submissões</p><p className="text-2xl font-bold">{(selectedFormId ? forms.filter(f => f.id === selectedFormId) : forms).reduce((s, f) => s + (f.submissions_count || 0), 0)}</p></div>
            <div className="metric-card"><p className="metric-label mb-1">Conversão Média</p><p className="text-2xl font-bold text-success">{(() => { const filtered = selectedFormId ? forms.filter(f => f.id === selectedFormId) : forms; const v = filtered.reduce((s, f) => s + (f.views_count || 0), 0); const sub = filtered.reduce((s, f) => s + (f.submissions_count || 0), 0); return v > 0 ? ((sub / v) * 100).toFixed(1) : "0.0"; })()}%</p></div>
          </div>

          {/* Charts */}
          {forms.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Views vs Conversão por Formulário */}
              <Card className="border-border/40">
                <CardHeader className="pb-2 border-b border-border/20">
                  <CardTitle className="text-[14px] font-semibold">Views vs Submissões por Formulário</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={formAnalytics.slice(0, 8)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="title" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + '…' : v} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="views_count" name="Views" fill="hsl(217,91%,60%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="submissions_count" name="Submissões" fill="hsl(152,55%,42%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Submissões ao longo do tempo */}
              <Card className="border-border/40">
                <CardHeader className="pb-2 border-b border-border/20">
                  <CardTitle className="text-[14px] font-semibold">Submissões ao Longo do Tempo</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {formSubmissionsOverTime.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={formSubmissionsOverTime} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="submissoes" name="Submissões" fill="hsl(152,55%,42%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground text-[13px]">
                      Nenhuma submissão registrada ainda
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Distribuição de Submissões (Pie) */}
              {submissionsPerForm.length > 1 && (
                <Card className="border-border/40">
                  <CardHeader className="pb-2 border-b border-border/20">
                    <CardTitle className="text-[14px] font-semibold">Distribuição de Submissões</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={submissionsPerForm} dataKey="valor" nameKey="nome" cx="50%" cy="50%" outerRadius={90} label={({ nome, percent }) => `${nome.length > 10 ? nome.slice(0, 10) + '…' : nome} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {submissionsPerForm.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Taxa de Conversão por Formulário */}
              <Card className="border-border/40">
                <CardHeader className="pb-2 border-b border-border/20">
                  <CardTitle className="text-[14px] font-semibold">Taxa de Conversão por Formulário</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={formAnalytics.filter(f => f.views_count > 0).slice(0, 8)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="title" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + '…' : v} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => `${v}%`} />
                      <Bar dataKey="conversionRate" name="Conversão" fill="hsl(280,67%,55%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {forms.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum formulário criado</h3>
                <p className="text-[13px] text-muted-foreground mb-4">Crie formulários de captação para acompanhar views e conversões</p>
                <Button onClick={() => navigate("/crm/forms/builder")}>Criar Formulário</Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/40 overflow-hidden">
              <CardHeader className="pb-2 border-b border-border/20"><CardTitle className="text-[14px] font-semibold">Performance por Formulário</CardTitle></CardHeader>
              <div className="hidden md:block overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Formulário</th><th>Status</th><th>Views</th><th>Submissões</th><th>Conversão</th><th>Slug</th></tr></thead>
                  <tbody>
                    {formAnalytics.map(f => (
                      <tr key={f.id}>
                        <td className="font-semibold">{f.title}</td>
                        <td><Badge variant={f.active ? "default" : "secondary"}>{f.active ? "Ativo" : "Inativo"}</Badge></td>
                        <td><div className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-muted-foreground" />{f.views_count}</div></td>
                        <td><div className="flex items-center gap-1.5"><MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />{f.submissions_count}</div></td>
                        <td className="font-bold text-primary">{f.conversionRate}%</td>
                        <td className="text-muted-foreground text-[12px]">/f/{f.slug}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden p-3 space-y-3">
                {formAnalytics.map(f => (
                  <div key={f.id} className="bg-muted/30 rounded-lg p-3 border border-border/20 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[13px]">{f.title}</span>
                      <Badge variant={f.active ? "default" : "secondary"} className="text-[10px]">{f.active ? "Ativo" : "Inativo"}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[12px]">
                      <div><span className="text-muted-foreground">Views</span><p className="font-bold">{f.views_count}</p></div>
                      <div><span className="text-muted-foreground">Envios</span><p className="font-bold">{f.submissions_count}</p></div>
                      <div><span className="text-muted-foreground">Conversão</span><p className="font-bold text-primary">{f.conversionRate}%</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Equipe Tab */}
        <TabsContent value="equipe" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Equipe</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...sdrPerformance, ...closerPerformance].map((member, i) => (
              <Card key={i} className="border-border/40 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/profile/${member.id}`)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-[14px] font-bold text-muted-foreground">
                      {member.nome.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold">{member.nome}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {'vendasFechadas' in member ? `${member.vendasFechadas} vendas • R$ ${member.faturamento.toLocaleString('pt-BR')}` : `${member.leadsGerados} leads • ${member.callsAgendadas} calls`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <ConfigurarMetaDialog open={metaDialogOpen} onOpenChange={setMetaDialogOpen} />
      <HistoricoMetasDialog open={historicoMetasOpen} onOpenChange={setHistoricoMetasOpen} />
      {reembolsoDialog.venda && <RegistrarReembolsoDialog venda={reembolsoDialog.venda} open={reembolsoDialog.open} onOpenChange={open => setReembolsoDialog({ open, venda: open ? reembolsoDialog.venda : null })} />}
    </div>
  );
};

export default Relatorios;
