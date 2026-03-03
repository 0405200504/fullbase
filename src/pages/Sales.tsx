import { useState, useMemo } from "react";
import { DollarSign, TrendingUp, Calendar as CalendarIcon, Award, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useVendas } from "@/hooks/useVendas";
import { getDateRange, formatCurrency, formatDate } from "@/lib/dateUtils";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import RegistrarReembolsoDialog from "@/components/RegistrarReembolsoDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
const Sales = () => {
  const [period, setPeriod] = useState("mes");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [reembolsoDialog, setReembolsoDialog] = useState<{
    open: boolean;
    venda: any | null;
  }>({
    open: false,
    venda: null
  });
  const dateRange = useMemo(() => {
    if (period === "custom" && customDateRange?.from) {
      const inicio = customDateRange.from;
      const fim = customDateRange.to || customDateRange.from;
      return {
        inicio: inicio.toISOString().split('T')[0],
        fim: fim.toISOString().split('T')[0]
      };
    }
    return getDateRange(period);
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
    data: vendas = [],
    isLoading
  } = useVendas(dateRange.inicio, dateRange.fim);
  const metrics = useMemo(() => {
    const totalFaturamento = vendas.reduce((sum, venda) => sum + venda.valor_final, 0);
    const totalVendas = vendas.length;
    const ticketMedio = totalVendas > 0 ? totalFaturamento / totalVendas : 0;

    // Vendas por produto
    const vendasPorProduto = vendas.reduce((acc, venda) => {
      const produto = venda.produtos?.nome || "Sem produto";
      if (!acc[produto]) {
        acc[produto] = 0;
      }
      acc[produto] += venda.valor_final;
      return acc;
    }, {} as Record<string, number>);
    const produtosData = Object.entries(vendasPorProduto).map(([nome, valor]) => ({
      nome,
      valor
    }));

    // Top 3 Closers
    const faturamentoPorCloser = vendas.reduce((acc, venda) => {
      const closer = venda.profiles?.nome || "Sem closer";
      if (!acc[closer]) {
        acc[closer] = 0;
      }
      acc[closer] += venda.valor_final;
      return acc;
    }, {} as Record<string, number>);
    const topClosers = Object.entries(faturamentoPorCloser).map(([nome, valor]) => ({
      nome,
      valor
    })).sort((a, b) => b.valor - a.valor).slice(0, 3);

    // Faturamento por período
    const faturamentoPorData = vendas.reduce((acc, venda) => {
      let chave: string;
      const data = new Date(venda.data_fechamento);
      if (period === "trimestre") {
        const mes = data.toLocaleDateString('pt-BR', {
          month: 'short',
          year: 'numeric'
        });
        chave = mes;
      } else if (period === "mes") {
        const semana = Math.ceil(data.getDate() / 7);
        chave = `Sem ${semana}`;
      } else {
        chave = data.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        });
      }
      if (!acc[chave]) {
        acc[chave] = 0;
      }
      acc[chave] += venda.valor_final;
      return acc;
    }, {} as Record<string, number>);
    const faturamentoData = Object.entries(faturamentoPorData).map(([periodo, valor]) => ({
      periodo,
      valor
    }));

    // Vendas por fonte de tráfego
    const vendasPorFonte = vendas.reduce((acc, venda) => {
      // Buscar fonte de tráfego do lead
      const fonte = venda.leads?.fonte_trafego || "Sem fonte definida";
      if (!acc[fonte]) {
        acc[fonte] = {
          quantidade: 0,
          faturamento: 0
        };
      }
      acc[fonte].quantidade += 1;
      acc[fonte].faturamento += venda.valor_final;
      return acc;
    }, {} as Record<string, {
      quantidade: number;
      faturamento: number;
    }>);
    const fontesData = Object.entries(vendasPorFonte).map(([nome, dados]) => ({
      nome,
      quantidade: dados.quantidade,
      faturamento: dados.faturamento,
      percentual: totalFaturamento > 0 ? (dados.faturamento / totalFaturamento * 100).toFixed(0) : '0'
    })).sort((a, b) => b.faturamento - a.faturamento);
    return {
      totalFaturamento,
      totalVendas,
      ticketMedio,
      produtosData,
      topClosers,
      faturamentoData,
      fontesData
    };
  }, [vendas, period]);
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }
  return <div className="space-y-4 md:space-y-6">
    {/* Header */}
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">Vendas</h1>
        <p className="text-sm md:text-base text-muted-foreground">Análise de receita e inteligência comercial</p>
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
              : period === "hoje"
                ? "Hoje"
                : period === "semana"
                  ? "Semana Atual"
                  : period === "trimestre"
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
              setPeriod("mes");
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

    {/* Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-card rounded-[32px] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col justify-between md:col-span-3 lg:col-span-1">
        <div className="flex items-start justify-between mb-6">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Total Faturado</p>
          <div className="p-3 rounded-full bg-success/10 text-success">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div>
          <p className="text-4xl md:text-5xl font-black tracking-tighter text-white">
            {formatCurrency(metrics.totalFaturamento)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 md:col-span-3 lg:col-span-2">
        <div className="bg-card rounded-[32px] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col justify-between">
          <div className="flex items-start justify-between mb-6">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Ticket Médio</p>
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-black tracking-tighter text-white">
              {formatCurrency(metrics.ticketMedio)}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-[32px] p-8 shadow-[0_10px_30px_rgba(0,0,0,0.3)] flex flex-col justify-between">
          <div className="flex items-start justify-between mb-6">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Total de Vendas</p>
            <div className="p-3 rounded-full bg-white/5 text-white">
              <CalendarIcon className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-4xl md:text-5xl font-black tracking-tighter text-white">{metrics.totalVendas}</p>
          </div>
        </div>
      </div>
    </div>

    {/* Vendas por Fonte de Tráfego */}
    {metrics.fontesData.length > 0 && (
      <div className="bg-card rounded-xl shadow-md p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-success" />
          Vendas por Fonte de Tráfego
        </h3>
        <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
          <PieChart>
            <Pie
              data={metrics.fontesData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ nome, percent }) => `${nome} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={80}
              fill="hsl(var(--primary))"
              dataKey="faturamento"
            >
              {metrics.fontesData.map((entry, index) => (
                <Cell key={`fonte-cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )}

    {/* Charts */}
    <div className="grid grid-cols-1 gap-4 md:gap-6">
      {/* Faturamento por Período */}
      <div className="bg-card rounded-xl shadow-md p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-4">Evolução do Faturamento</h3>
        <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
          <BarChart data={metrics.faturamentoData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="periodo" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }} />
            <Bar dataKey="valor" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Vendas por Produto */}
      <div className="bg-card rounded-xl shadow-md p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-bold mb-4">Vendas por Produto</h3>
        <ResponsiveContainer width="100%" height={250} className="md:h-[300px]">
          <PieChart>
            <Pie data={metrics.produtosData} cx="50%" cy="50%" labelLine={false} label={({
              nome,
              percent
            }) => `${nome} (${(percent * 100).toFixed(0)}%)`} outerRadius={80} fill="#8884d8" dataKey="valor">
              {metrics.produtosData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Top Closers */}
    <div className="bg-card rounded-xl shadow-md p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Award className="h-5 w-5 md:h-6 md:w-6 text-warning" />
        <h3 className="text-lg md:text-xl font-bold">Top 3 Closers por Faturamento</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {metrics.topClosers.map((closer, index) => <div key={index} className="p-3 md:p-4 rounded-lg bg-gradient-to-br from-primary/10 to-success/10 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-warning flex items-center justify-center text-white font-bold text-sm">
              {index + 1}
            </div>
            <p className="font-semibold text-sm md:text-base">{closer.nome}</p>
          </div>
          <p className="text-xl md:text-2xl font-bold text-success">
            {formatCurrency(closer.valor)}
          </p>
        </div>)}
      </div>
    </div>

    {/* Sales Table */}
    <div className="bg-white text-black rounded-[40px] shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden md:p-6 mt-8">
      <div className="p-4 md:p-6 mb-2">
        <h3 className="text-2xl font-black tracking-tight">Histórico de Vendas</h3>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-black/10">
        <table className="w-full text-sm text-left text-black bg-white [&>thead>tr>th]:bg-black/5 [&>thead>tr>th]:text-black [&>thead>tr>th]:font-bold [&>thead>tr>th]:uppercase [&>thead>tr>th]:tracking-wider [&>thead>tr>th]:text-[12px] [&>thead>tr>th]:border-b [&>thead>tr>th]:border-black/10 [&>thead>tr>th]:px-4 [&>thead>tr>th]:py-4 [&>tbody>tr>td]:border-b [&>tbody>tr>td]:border-black/5 [&>tbody>tr>td]:px-4 [&>tbody>tr>td]:py-4">
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Produto</th>
              <th>Valor</th>
              <th>Closer</th>
              <th>Pagamento</th>
              <th className="w-16">Ações</th>
            </tr>
          </thead>
          <tbody>
            {vendas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-black/50 font-medium text-base">
                  Nenhuma venda encontrada
                </td>
              </tr>
            ) : (
              vendas.map(venda => <tr key={venda.id} className="hover:bg-black/5 transition-colors group">
                <td className="font-medium text-black/60">{formatDate(venda.data_fechamento)}</td>
                <td className="font-bold text-base">{venda.leads?.nome || "-"}</td>
                <td className="text-black/80 font-medium">{venda.produtos?.nome || "-"}</td>
                <td className="font-black text-emerald-600 text-base">
                  {formatCurrency(venda.valor_final)}
                </td>
                <td className="text-black/60 font-medium">{venda.profiles?.nome || "-"}</td>
                <td>
                  <Badge variant="secondary" className="bg-black/5 text-black hover:bg-black/10">
                    {venda.metodo_pagamento.charAt(0).toUpperCase() + venda.metodo_pagamento.slice(1)}
                  </Badge>
                </td>
                <td>
                  <Button variant="ghost" size="sm" onClick={() => setReembolsoDialog({
                    open: true,
                    venda
                  })} className="text-red-500 hover:text-white hover:bg-red-500 rounded-full h-8 w-8 p-0">
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </td>
              </tr>)
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden p-4 space-y-4">
        {vendas.length === 0 ? (
          <div className="text-center py-12 text-black/50 font-medium text-base">
            Nenhuma venda encontrada
          </div>
        ) : (
          vendas.map(venda => <div key={venda.id} className="bg-black/5 rounded-3xl p-5 space-y-4 border border-black/10 relative hover:bg-black/10 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-lg leading-tight">{venda.leads?.nome || "-"}</p>
                <p className="text-sm text-black/50 font-medium mt-1">{formatDate(venda.data_fechamento)}</p>
              </div>
              <Badge variant="secondary" className="text-xs bg-black/5 text-black">
                {venda.metodo_pagamento.charAt(0).toUpperCase() + venda.metodo_pagamento.slice(1)}
              </Badge>
            </div>

            <div className="text-sm text-black/70 space-y-1.5 font-medium">
              <p><span className="text-black/50">Produto:</span> {venda.produtos?.nome || "-"}</p>
              <p><span className="text-black/50">Closer:</span> {venda.profiles?.nome || "-"}</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-black/10">
              <p className="text-2xl font-black text-emerald-600">
                {formatCurrency(venda.valor_final)}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setReembolsoDialog({
                open: true,
                venda
              })} className="text-red-500 hover:text-white hover:bg-red-500 rounded-full">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Reembolsar
              </Button>
            </div>
          </div>)
        )}
      </div>
    </div>

    {/* Reembolso Dialog */}
    {reembolsoDialog.venda && <RegistrarReembolsoDialog venda={reembolsoDialog.venda} open={reembolsoDialog.open} onOpenChange={open => setReembolsoDialog({
      open,
      venda: open ? reembolsoDialog.venda : null
    })} />}
  </div>;
};
export default Sales;