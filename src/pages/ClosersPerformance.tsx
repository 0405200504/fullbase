import { useState, useMemo } from "react";
import { useProfiles } from "@/hooks/useProfiles";
import { useCalls } from "@/hooks/useCalls";
import { useVendas } from "@/hooks/useVendas";
import { CloserPerformanceCard } from "@/components/CloserPerformanceCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

const ClosersPerformance = () => {
  const [periodo, setPeriodo] = useState("mes");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const { data: closers = [] } = useProfiles("closer");

  const handlePeriodChange = (value: string) => {
    setPeriodo(value);
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
      setCustomDateRange({ from: inicio, to: fim });
    } else if (days === 0) {
      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      setCustomDateRange({ from: inicio, to: fim });
    } else {
      const inicio = new Date(hoje);
      inicio.setDate(hoje.getDate() - days);
      inicio.setHours(0, 0, 0, 0);
      setCustomDateRange({ from: inicio, to: fim });
    }
  };

  // Calcular datas do período
  const { dataInicio, dataFim } = useMemo(() => {
    if (periodo === "custom" && customDateRange?.from) {
      const inicio = customDateRange.from;
      const fim = customDateRange.to || customDateRange.from;
      return {
        dataInicio: inicio.toISOString().split('T')[0],
        dataFim: fim.toISOString().split('T')[0],
      };
    }

    const hoje = new Date();
    let inicio: Date;
    let fim: Date;

    switch (periodo) {
      case "semana":
        inicio = startOfWeek(hoje, { weekStartsOn: 0 });
        fim = endOfWeek(hoje, { weekStartsOn: 0 });
        break;
      case "mes":
      default:
        inicio = startOfMonth(hoje);
        fim = endOfMonth(hoje);
        break;
    }

    return {
      dataInicio: inicio.toISOString().split('T')[0],
      dataFim: fim.toISOString().split('T')[0],
    };
  }, [periodo, customDateRange]);

  const { data: allCalls = [] } = useCalls({
    dataInicio,
    dataFim,
  });

  const { data: allVendas = [] } = useVendas(dataInicio, dataFim, false);

  // Calcular métricas por closer
  const closersMetrics = useMemo(() => {
    return closers.map((closer) => {
      const closerCalls = allCalls.filter((c) => c.closer_id === closer.id);
      const callsConcluidas = closerCalls.filter((c) => c.status === "concluida").length;
      const closerVendas = allVendas.filter((v) => v.closer_id === closer.id);
      
      const totalVendas = closerVendas.length;
      const valorTotal = closerVendas.reduce((sum, v) => sum + v.valor_final, 0);
      const valorMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
      const taxaConversao = callsConcluidas > 0 ? (totalVendas / callsConcluidas) * 100 : 0;

      return {
        closer,
        metrics: {
          totalCalls: closerCalls.length,
          callsConcluidas,
          totalVendas,
          valorTotal,
          valorMedio,
          taxaConversao,
        },
      };
    });
  }, [closers, allCalls, allVendas]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance dos Closers</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe métricas individuais de cada closer
          </p>
        </div>

        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] min-h-[44px] justify-start text-left font-normal",
                !customDateRange && periodo === "custom" && "text-muted-foreground"
              )}
              onClick={() => {
                if (periodo === "custom") {
                  setIsCalendarOpen(true);
                }
              }}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {periodo === "custom" && customDateRange?.from ? (
                customDateRange.to ? (
                  <>
                    {format(customDateRange.from, "dd/MM/yyyy")} -{" "}
                    {format(customDateRange.to, "dd/MM/yyyy")}
                  </>
                ) : (
                  format(customDateRange.from, "dd/MM/yyyy")
                )
              ) : periodo === "semana" ? (
                "Esta Semana"
              ) : periodo === "mes" ? (
                "Este Mês"
              ) : (
                "Selecione o período"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="flex flex-col space-y-2 p-3 border-b">
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  handleQuickSelect(0);
                  setPeriodo("custom");
                }}
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  handleQuickSelect(7);
                  setPeriodo("custom");
                }}
              >
                Últimos 7 dias
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  handleQuickSelect(30);
                  setPeriodo("custom");
                }}
              >
                Últimos 30 dias
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  handleQuickSelect("all");
                  setPeriodo("custom");
                }}
              >
                Tempo todo
              </Button>
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={customDateRange?.from}
              selected={customDateRange}
              onSelect={setCustomDateRange}
              numberOfMonths={1}
              locale={ptBR}
              className="pointer-events-auto"
            />
            <div className="flex gap-2 p-3 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsCalendarOpen(false);
                  setPeriodo("mes");
                  setCustomDateRange(undefined);
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setIsCalendarOpen(false);
                  if (customDateRange?.from) {
                    setPeriodo("custom");
                  }
                }}
                disabled={!customDateRange?.from}
              >
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>

      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {closersMetrics.map(({ closer, metrics }) => (
          <CloserPerformanceCard
            key={closer.id}
            closer={closer}
            metrics={metrics}
          />
        ))}
      </div>

      {closersMetrics.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Nenhum closer encontrado
          </p>
        </div>
      )}
    </div>
  );
};

export default ClosersPerformance;
