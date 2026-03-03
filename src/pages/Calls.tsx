import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, List, Phone, Clock, CheckCircle, XCircle, AlertCircle, Calendar as CalendarIcon, Plus, Archive, Trash2, ArchiveRestore } from "lucide-react";
import { useCalls, useArchiveCall, useUnarchiveCall, useDeleteCall } from "@/hooks/useCalls";
import { useProfiles } from "@/hooks/useProfiles";
import { RegistrarResultadoDialog } from "@/components/RegistrarResultadoDialog";
import { AgendarCallDialog } from "@/components/AgendarCallDialog";
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Call } from "@/hooks/useCalls";
import { cn } from "@/lib/utils";
import { MoreVertical } from "lucide-react";

type ViewMode = "list" | "calendar";

const STATUS_CONFIG = {
  agendada: { label: "Agendada", color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: Clock },
  concluida: { label: "Concluída", color: "bg-green-500/10 text-green-700 border-green-200", icon: CheckCircle },
  no_show: { label: "No-Show", color: "bg-red-500/10 text-red-700 border-red-200", icon: XCircle },
  cancelada: { label: "Cancelada", color: "bg-gray-500/10 text-gray-700 border-gray-200", icon: AlertCircle },
  remarcada: { label: "Remarcada", color: "bg-yellow-500/10 text-yellow-700 border-yellow-200", icon: AlertCircle },
};

const Calls = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [periodFilter, setPeriodFilter] = useState("semana");
  const [closerFilter, setCloserFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [customDateStart, setCustomDateStart] = useState("");
  const [customDateEnd, setCustomDateEnd] = useState("");
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [resultadoOpen, setResultadoOpen] = useState(false);
  const [agendarOpen, setAgendarOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [callToDelete, setCallToDelete] = useState<string | null>(null);

  const { data: closers = [] } = useProfiles("closer");
  const archiveCall = useArchiveCall();
  const unarchiveCall = useUnarchiveCall();
  const deleteCall = useDeleteCall();

  // Calcular datas do filtro
  const { dataInicio, dataFim } = useMemo(() => {
    const hoje = new Date();
    let inicio = new Date();
    let fim = new Date();

    switch (periodFilter) {
      case "hoje":
        inicio.setHours(0, 0, 0, 0);
        fim.setHours(23, 59, 59, 999);
        break;
      case "semana":
        inicio = startOfWeek(hoje, { weekStartsOn: 0 });
        fim = endOfWeek(hoje, { weekStartsOn: 0 });
        break;
      case "mes":
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        break;
      case "personalizado":
        if (customDateStart) inicio = new Date(customDateStart + "T00:00:00");
        if (customDateEnd) fim = new Date(customDateEnd + "T23:59:59");
        break;
    }

    return {
      dataInicio: inicio.toISOString(),
      dataFim: fim.toISOString(),
    };
  }, [periodFilter, customDateStart, customDateEnd]);

  const { data: allCalls = [], isLoading } = useCalls({
    dataInicio,
    dataFim,
    closerId: closerFilter !== "todos" ? closerFilter : undefined,
    status: statusFilter !== "todos" ? statusFilter : undefined,
  });

  // Métricas
  const metrics = useMemo(() => {
    const total = allCalls.length;
    const agendadas = allCalls.filter((c) => c.status === "agendada").length;
    const concluidas = allCalls.filter((c) => c.status === "concluida").length;
    const noShows = allCalls.filter((c) => c.status === "no_show").length;
    const taxaComparecimento =
      total > 0 ? ((concluidas / (concluidas + noShows)) * 100).toFixed(1) : "0";

    return { total, agendadas, concluidas, noShows, taxaComparecimento };
  }, [allCalls]);

  const handleRegistrarResultado = (call: Call) => {
    setSelectedCall(call);
    setResultadoOpen(true);
  };

  const handleArchive = (callId: string) => {
    archiveCall.mutate(callId);
  };

  const handleUnarchive = (callId: string) => {
    unarchiveCall.mutate(callId);
  };

  const handleDeleteClick = (callId: string) => {
    setCallToDelete(callId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (callToDelete) {
      deleteCall.mutate(callToDelete);
      setDeleteDialogOpen(false);
      setCallToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">Central de Calls</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gerencie todas as calls da sua equipe</p>
        </div>

        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
          <Button
            onClick={() => setAgendarOpen(true)}
            className="gap-2 min-h-[44px] hidden md:flex"
          >
            <Plus className="h-4 w-4" />
            Agendar Call
          </Button>
          <div className="flex bg-muted rounded-lg p-1 flex-1 md:flex-none">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="gap-2 flex-1 md:flex-none min-h-[44px]"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="gap-2 flex-1 md:flex-none min-h-[44px]"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendário</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-card rounded-xl p-3 md:p-4 shadow-md border border-border">
          <div className="flex flex-col md:flex-row items-start md:items-center md:justify-between gap-2">
            <div className="w-full">
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Total de Calls</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{metrics.total}</p>
            </div>
            <Phone className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          </div>
        </div>

        <div className="bg-card rounded-xl p-3 md:p-4 shadow-md border border-border">
          <div className="flex flex-col md:flex-row items-start md:items-center md:justify-between gap-2">
            <div className="w-full">
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Agendadas</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{metrics.agendadas}</p>
            </div>
            <Clock className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-card rounded-xl p-3 md:p-4 shadow-md border border-border">
          <div className="flex flex-col md:flex-row items-start md:items-center md:justify-between gap-2">
            <div className="w-full">
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Concluídas</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{metrics.concluidas}</p>
            </div>
            <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-card rounded-xl p-3 md:p-4 shadow-md border border-border">
          <div className="flex flex-col md:flex-row items-start md:items-center md:justify-between gap-2">
            <div className="w-full">
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Taxa Comparec.</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{metrics.taxaComparecimento}%</p>
            </div>
            <CheckCircle className="h-6 w-6 md:h-8 md:w-8 text-success" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-card rounded-lg p-3 md:p-4 shadow-md border border-border">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full md:w-[180px] min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="semana">Esta Semana</SelectItem>
                <SelectItem value="mes">Este Mês</SelectItem>
                <SelectItem value="personalizado">Período Personalizado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={closerFilter} onValueChange={setCloserFilter}>
              <SelectTrigger className="w-full md:w-[200px] min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Closers</SelectItem>
                {closers.map((closer) => (
                  <SelectItem key={closer.id} value={closer.id}>
                    {closer.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px] min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="agendada">Agendada</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="no_show">No-Show</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodFilter === "personalizado" && (
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="dateStart" className="whitespace-nowrap text-sm">De:</Label>
                <Input
                  id="dateStart"
                  type="date"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                  className="flex-1 md:w-[180px] min-h-[44px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="dateEnd" className="whitespace-nowrap text-sm">Até:</Label>
                <Input
                  id="dateEnd"
                  type="date"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                  className="flex-1 md:w-[180px] min-h-[44px]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Calls */}
      {viewMode === "list" && (
        <div className="bg-card rounded-xl shadow-md overflow-hidden border border-border">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data e Hora</th>
                  <th>Lead</th>
                  <th>Produto</th>
                  <th>Closer</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {allCalls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma call encontrada para os filtros selecionados
                    </td>
                  </tr>
                ) : (
                  allCalls.map((call) => {
                    const statusConfig = STATUS_CONFIG[call.status];
                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={call.id} className="hover:bg-muted/50">
                        <td className="font-medium">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(call.data_hora_agendada), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                        </td>
                        <td>
                          <div>
                            <p className="font-semibold">{call.leads?.nome}</p>
                            <p className="text-sm text-muted-foreground">{call.leads?.telefone}</p>
                          </div>
                        </td>
                        <td>{call.leads?.produtos?.nome || "-"}</td>
                        <td>{call.profiles?.nome}</td>
                        <td>
                          <Badge
                            variant="outline"
                            className={cn("gap-1", statusConfig.color)}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {call.status === "agendada" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRegistrarResultado(call)}
                              >
                                Registrar Resultado
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {call.arquivado ? (
                                  <DropdownMenuItem onClick={() => handleUnarchive(call.id)}>
                                    <ArchiveRestore className="h-4 w-4 mr-2" />
                                    Desarquivar
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleArchive(call.id)}>
                                    <Archive className="h-4 w-4 mr-2" />
                                    Arquivar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteClick(call.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Deletar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-3 space-y-3">
            {allCalls.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma call encontrada para os filtros selecionados
              </div>
            ) : (
              allCalls.map((call) => {
                const statusConfig = STATUS_CONFIG[call.status];
                const StatusIcon = statusConfig.icon;

                return (
                  <div key={call.id} className="bg-muted/30 rounded-lg p-4 space-y-3 border border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-base mb-1">{call.leads?.nome}</p>
                        <p className="text-sm text-muted-foreground">{call.leads?.telefone}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("gap-1", statusConfig.color)}
                      >
                        <StatusIcon className="h-3 w-3" />
                        <span className="text-xs">{statusConfig.label}</span>
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(call.data_hora_agendada), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}</span>
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-medium">Produto:</span> {call.leads?.produtos?.nome || "-"}</p>
                      <p><span className="font-medium">Closer:</span> {call.profiles?.nome}</p>
                    </div>

                    <div className="flex gap-2">
                      {call.status === "agendada" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 min-h-[44px]"
                          onClick={() => handleRegistrarResultado(call)}
                        >
                          Registrar Resultado
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="min-h-[44px]">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {call.arquivado ? (
                            <DropdownMenuItem onClick={() => handleUnarchive(call.id)}>
                              <ArchiveRestore className="h-4 w-4 mr-2" />
                              Desarquivar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleArchive(call.id)}>
                              <Archive className="h-4 w-4 mr-2" />
                              Arquivar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(call.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Visualização de Calendário */}
      {viewMode === "calendar" && (
        <div className="bg-card rounded-xl p-6 shadow-md border border-border">
          <CalendarView calls={allCalls} onCallClick={handleRegistrarResultado} />
        </div>
      )}

      <RegistrarResultadoDialog
        open={resultadoOpen}
        onOpenChange={setResultadoOpen}
        call={selectedCall}
      />

      <AgendarCallDialog
        open={agendarOpen}
        onOpenChange={setAgendarOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta call? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Action Button (Mobile) */}
      <Button
        onClick={() => setAgendarOpen(true)}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 p-0"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};

// Componente de Visualização de Calendário
const CalendarView = ({
  calls,
  onCallClick,
}: {
  calls: Call[];
  onCallClick: (call: Call) => void;
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 })
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const hours = Array.from({ length: 16 }, (_, i) => i + 8); // 8h às 23h

  const getCallsForDay = (date: Date) => {
    return calls.filter((call) => isSameDay(new Date(call.data_hora_agendada), date));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {format(currentWeekStart, "dd 'de' MMMM", { locale: ptBR })} -{" "}
          {format(endOfWeek(currentWeekStart), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
          >
            Semana Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
          >
            Próxima Semana
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-2">
        <div className="text-sm font-medium text-muted-foreground">Horário</div>
        {weekDays.map((day) => (
          <div key={day.toString()} className="text-center">
            <p className="text-sm font-medium">{format(day, "EEE", { locale: ptBR })}</p>
            <p className="text-2xl font-bold">{format(day, "dd")}</p>
          </div>
        ))}

        {hours.map((hour) => (
          <>
            <div key={`hour-${hour}`} className="text-sm text-muted-foreground py-2">
              {hour}:00
            </div>
            {weekDays.map((day) => {
              const dayCalls = getCallsForDay(day).filter((call) => {
                const callHour = new Date(call.data_hora_agendada).getHours();
                return callHour === hour;
              });

              return (
                <div
                  key={`${day.toString()}-${hour}`}
                  className="border border-border rounded-md p-1 min-h-[60px] bg-muted/20"
                >
                  {dayCalls.map((call) => {
                    const statusConfig = STATUS_CONFIG[call.status];
                    return (
                      <button
                        key={call.id}
                        onClick={() => onCallClick(call)}
                        className={cn(
                          "w-full text-left p-2 rounded text-xs mb-1 hover:opacity-80 transition-opacity",
                          statusConfig.color
                        )}
                      >
                        <p className="font-semibold truncate">{call.leads?.nome}</p>
                        <p className="truncate">{call.profiles?.nome}</p>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
};

export default Calls;
