import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Plus, Flame, Edit, Trash2, Archive, UserPlus, MoveRight, X, Phone, Star, CheckCircle2, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useLeads, useUpdateLead } from "@/hooks/useLeads";
import { useEtapasFunil } from "@/hooks/useEtapasFunil";
import { useLeadAlerts } from "@/hooks/useLeadAlerts";
import { useProfiles } from "@/hooks/useProfiles";
import { useCalls } from "@/hooks/useCalls";
import { format, isWithinInterval, addHours } from "date-fns";
import { LeadDialog } from "@/components/LeadDialog";
import { LeadDetailsSheet } from "@/components/LeadDetailsSheet";
import { LeadFilters, type LeadFiltersState } from "@/components/LeadFilters";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  closestCenter,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import type { Lead } from "@/hooks/useLeads";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ViewMode = "kanban" | "list";

const LeadCard = ({ lead, precisaFollowup, diasParado, upcomingCall, onToggleMQL }: {
  lead: Lead;
  precisaFollowup?: boolean;
  diasParado?: number;
  upcomingCall?: { time: string; date: Date };
  onToggleMQL?: (e: React.MouseEvent) => void;
}) => {
  return (
    <Card className="group relative border border-border bg-transparent shadow-none hover:border-foreground hover:bg-muted/10 transition-all duration-200 overflow-visible rounded-none">
      {precisaFollowup && (
        <div
          className="absolute -top-1.5 -right-1.5 bg-foreground rounded-none p-1 shadow-none z-10"
          title={`Parado há ${diasParado} dias - Precisa follow-up!`}
        >
          <Flame className="h-3 w-3 text-background" strokeWidth={1.5} />
        </div>
      )}

      <CardContent className="p-4 space-y-3">
        {upcomingCall && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider w-fit"
            title={`Call agendada para ${format(upcomingCall.date, "dd/MM/yyyy 'às' HH:mm")}`}
          >
            <Phone className="h-3 w-3" />
            Agenda: {upcomingCall.time}
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <h4 className="font-bold text-foreground text-sm line-clamp-1 leading-tight">{lead.nome}</h4>
            <p className="text-[11px] font-medium text-muted-foreground line-clamp-1">
              {lead.produtos?.nome || "Sem produto vinculado"}
            </p>
          </div>
          <button
            onClick={onToggleMQL}
            className="shrink-0 pt-0.5 hover:scale-110 transition-transform"
          >
            <Star className={cn("h-4 w-4", lead.is_mql ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/40 hover:text-amber-400')} />
          </button>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <p className="text-base font-extrabold text-foreground tracking-tight">
            R$ {(lead.valor_proposta || 0).toLocaleString('pt-BR')}
          </p>
          <WhatsAppButton telefone={lead.telefone} size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border mt-1">
          {(lead as any).contatado ? (
            <Badge variant="outline" className="rounded-none border-foreground text-foreground text-[9px] font-bold px-1.5 py-0 uppercase tracking-widest">
              Contatado
            </Badge>
          ) : (
            <Badge variant="outline" className="rounded-none border-border text-muted-foreground text-[9px] font-bold px-1.5 py-0 uppercase tracking-widest">
              Novo Lead
            </Badge>
          )}
          {lead.sdr_profile && (
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 ml-auto">
              <UserPlus className="h-3 w-3" strokeWidth={1.25} />
              {lead.sdr_profile.nome.split(' ')[0]}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const DraggableLeadCard = ({ lead, onClick, precisaFollowup, diasParado, upcomingCall, onToggleMQL }: {
  lead: Lead;
  onClick: () => void;
  precisaFollowup?: boolean;
  diasParado?: number;
  upcomingCall?: { time: string; date: Date };
  onToggleMQL: (e: React.MouseEvent) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = transform
    ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      opacity: isDragging ? 0.6 : 1,
      zIndex: isDragging ? 50 : undefined,
    }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "cursor-grab active:cursor-grabbing outline-none",
        isDragging && "scale-[1.02] shadow-xl"
      )}
    >
      <LeadCard lead={lead} precisaFollowup={precisaFollowup} diasParado={diasParado} upcomingCall={upcomingCall} onToggleMQL={onToggleMQL} />
    </div>
  );
};

const DroppableColumn = ({
  stageId,
  stageName,
  stageColor,
  leads,
  onLeadClick,
  leadsComAlerta,
  upcomingCallsMap,
  onToggleMQL,
}: {
  stageId: string;
  stageName: string;
  stageColor: string;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  leadsComAlerta: any[];
  upcomingCallsMap: Map<string, { time: string; date: Date }>;
  onToggleMQL: (leadId: string, e: React.MouseEvent) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stageId,
  });

  return (
    <div className="flex flex-col h-full min-w-[280px] max-w-[320px] bg-transparent border-t-[3px] border-border pt-1">
      <div className="py-3 px-1">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-none" style={{ backgroundColor: stageColor }} />
            <h3 className="font-bold text-[13px] uppercase tracking-widest text-foreground">{stageName}</h3>
          </div>
          <span className="text-[11px] font-bold text-muted-foreground">
            {leads.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-3 space-y-3 min-h-[500px] transition-colors overflow-y-auto custom-scrollbar",
          isOver ? 'bg-primary/[0.03]' : ''
        )}
      >
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground/40 text-xs text-center p-6 border border-dashed border-border/40 rounded-lg">
            <Plus className="h-6 w-6 mb-2 opacity-20" />
            Vazio
          </div>
        ) : (
          leads.map((lead) => {
            const leadComAlerta = leadsComAlerta.find((l) => l.id === lead.id);
            const upcomingCall = upcomingCallsMap.get(lead.id);
            return (
              <DraggableLeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick(lead)}
                precisaFollowup={leadComAlerta?.precisaFollowup}
                diasParado={leadComAlerta?.diasParado}
                upcomingCall={upcomingCall}
                onToggleMQL={(e) => onToggleMQL(lead.id, e)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

const Pipeline = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<LeadFiltersState>({});
  const [showOnlyMQL, setShowOnlyMQL] = useState(false);
  const [captureFilter, setCaptureFilter] = useState<string>("todos");
  const navigate = useNavigate();

  const { data: allLeads = [], isLoading } = useLeads(showArchived);
  const { data: stages = [] } = useEtapasFunil();
  const { data: sdrs = [] } = useProfiles("sdr");
  const { data: closers = [] } = useProfiles("closer");
  const { data: allCalls = [] } = useCalls();
  const updateLead = useUpdateLead();

  // Create a map of leads with upcoming calls in next 24h
  const upcomingCallsMap = useMemo(() => {
    const map = new Map<string, { time: string; date: Date }>();
    const now = new Date();
    const next24h = addHours(now, 24);

    allCalls
      .filter(call => call.status === "agendada")
      .forEach(call => {
        const callDate = new Date(call.data_hora_agendada);
        if (isWithinInterval(callDate, { start: now, end: next24h })) {
          map.set(call.lead_id, {
            time: format(callDate, "HH:mm"),
            date: callDate
          });
        }
      });

    return map;
  }, [allCalls]);

  // Apply filters to leads
  const filteredLeads = useMemo(() => {
    let result = allLeads.filter(lead => !lead.arquivado || showArchived);

    if (showOnlyMQL) {
      result = result.filter(lead => lead.is_mql);
    }

    if (captureFilter === "parcial") {
      result = result.filter((lead) => (lead as any).capture_status === "partial");
    }

    if (captureFilter === "concluido") {
      result = result.filter((lead) => (lead as any).capture_status === "completed");
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(lead => {
        const leadDate = new Date(lead.created_at);
        leadDate.setHours(0, 0, 0, 0);
        return leadDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(lead => {
        const leadDate = new Date(lead.created_at);
        return leadDate <= toDate;
      });
    }

    if (filters.valueMin !== undefined) {
      result = result.filter(lead => (lead.valor_proposta || 0) >= filters.valueMin!);
    }

    if (filters.valueMax !== undefined) {
      result = result.filter(lead => (lead.valor_proposta || 0) <= filters.valueMax!);
    }

    if (filters.sdrId) {
      result = result.filter(lead => lead.sdr_id === filters.sdrId);
    }

    if (filters.closerId) {
      result = result.filter(lead => lead.closer_id === filters.closerId);
    }

    if (filters.etapaId) {
      result = result.filter(lead => lead.etapa_id === filters.etapaId);
    }

    if (filters.fonte) {
      const fonte = filters.fonte.toLowerCase();
      result = result.filter(lead =>
        lead.fonte_trafego?.toLowerCase().includes(fonte)
      );
    }

    return result;
  }, [allLeads, showArchived, filters, showOnlyMQL, captureFilter]);

  const leadsComAlerta = useLeadAlerts(filteredLeads, stages);

  // Clear selection when changing views or archive state
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "kanban") {
      setSelectedLeadIds([]);
    }
  };

  const handleToggleArchived = () => {
    setShowArchived(!showArchived);
    setSelectedLeadIds([]);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getLeadsByStage = (stageId: string) =>
    filteredLeads.filter((lead) => lead.etapa_id === stageId);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const leadId = active.id as string;
    const newEtapaId = over.id as string;

    const lead = filteredLeads.find((l) => l.id === leadId);
    if (lead && lead.etapa_id !== newEtapaId) {
      updateLead.mutate({
        id: leadId,
        etapa_id: newEtapaId,
      });
    }

    // Delay cleanup to allow React to finish reconciliation
    setTimeout(() => setActiveId(null), 0);
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsOpen(true);
  };

  const handleToggleMQL = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const lead = filteredLeads.find(l => l.id === leadId);
    if (!lead) return;

    await updateLead.mutateAsync({
      id: leadId,
      is_mql: !lead.is_mql,
      data_marcacao_mql: !lead.is_mql ? new Date().toISOString() : null,
    });
    toast.success(lead.is_mql ? "Lead desmarcado como MQL" : "Lead marcado como MQL ⭐");
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(lead => lead.id));
    }
  };

  const handleBulkAssignSDR = async (sdrId: string) => {
    for (const leadId of selectedLeadIds) {
      await updateLead.mutateAsync({ id: leadId, sdr_id: sdrId });
    }
    setSelectedLeadIds([]);
    toast.success(`${selectedLeadIds.length} leads atribuídos ao SDR`);
  };

  const handleBulkAssignCloser = async (closerId: string) => {
    for (const leadId of selectedLeadIds) {
      await updateLead.mutateAsync({ id: leadId, closer_id: closerId });
    }
    setSelectedLeadIds([]);
    toast.success(`${selectedLeadIds.length} leads atribuídos ao Closer`);
  };

  const handleBulkMoveStage = async (etapaId: string) => {
    for (const leadId of selectedLeadIds) {
      await updateLead.mutateAsync({ id: leadId, etapa_id: etapaId });
    }
    setSelectedLeadIds([]);
    toast.success(`${selectedLeadIds.length} leads movidos de etapa`);
  };

  const handleBulkArchive = async () => {
    const archiveValue = !showArchived;

    for (const leadId of selectedLeadIds) {
      await updateLead.mutateAsync({
        id: leadId,
        arquivado: archiveValue,
      });
    }
    setSelectedLeadIds([]);
    toast.success(`${selectedLeadIds.length} leads ${archiveValue ? 'arquivados' : 'desarquivados'}`);
  };

  const activeLead = filteredLeads.find((l) => l.id === activeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Profissional */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Pipeline de Vendas</h1>
          <p className="text-muted-foreground mt-1">Gestão visual de oportunidades e conversão</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button
            onClick={() => setDialogOpen(true)}
            className="font-bold h-10 gap-2 px-5"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Novo Lead
          </Button>

          <Button
            variant="outline"
            className={cn("h-10 gap-2 font-semibold transition-colors", showOnlyMQL && "bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/20 text-amber-700 dark:text-amber-400")}
            onClick={() => setShowOnlyMQL(!showOnlyMQL)}
          >
            <Star className={cn("h-4 w-4", showOnlyMQL && "fill-current")} />
            MQL
          </Button>

          <Select value={captureFilter} onValueChange={setCaptureFilter}>
            <SelectTrigger className="h-10 w-[200px] border-border/60 bg-background font-medium">
              <SelectValue placeholder="Filtro de Captura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os leads</SelectItem>
              <SelectItem value="parcial">Capturas Parciais</SelectItem>
              <SelectItem value="concluido">Concluídos</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showArchived ? "secondary" : "outline"}
            className={cn("h-10 gap-2 font-semibold", showArchived && "bg-muted/60 border-border/40")}
            onClick={handleToggleArchived}
          >
            <Trash2 className="h-4 w-4" />
            {showArchived ? "Ver Ativos" : "Lixeira"}
          </Button>

          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/40">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("kanban")}
              className={cn("h-8 gap-2 border-none px-4", viewMode === "kanban" && "bg-background shadow-sm")}
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("list")}
              className={cn("h-8 gap-2 border-none px-4", viewMode === "list" && "bg-background shadow-sm")}
            >
              <List className="h-4 w-4" />
              Lista
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate("/config-etapas")}
              className="text-muted-foreground hover:text-primary gap-1.5 h-auto py-0 font-bold uppercase tracking-wider text-[10px]"
            >
              <Edit className="h-3 w-3" />
              Customizar Etapas
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6 overflow-x-auto pb-8 min-h-[calc(100vh-280px)] custom-scrollbar">
              {stages.map((stage) => {
                const stageLeads = getLeadsByStage(stage.id);
                return (
                  <DroppableColumn
                    key={stage.id}
                    stageId={stage.id}
                    stageName={stage.nome}
                    stageColor={stage.cor}
                    leads={stageLeads}
                    onLeadClick={handleLeadClick}
                    leadsComAlerta={leadsComAlerta}
                    upcomingCallsMap={upcomingCallsMap}
                    onToggleMQL={handleToggleMQL}
                  />
                );
              })}
            </div>

            {/* Overlay para Arrastar */}
            <DragOverlay>
              {activeId && activeLead ? (
                <div className="rotate-2 scale-105 opacity-90">
                  <LeadCard
                    lead={activeLead}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-6">
          <LeadFilters
            filters={filters}
            onFiltersChange={setFilters}
            stages={stages}
            sdrs={sdrs}
            closers={closers}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-b border-border mb-6">
            <div className="p-4 flex flex-col justify-center border-r-0 md:border-r border-border">
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Total Leads</p>
              <p className="text-3xl font-extrabold">{filteredLeads.length}</p>
            </div>
            <div className="p-4 flex flex-col justify-center border-r-0 md:border-r border-border">
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Leads MQL</p>
              <p className="text-3xl font-extrabold text-foreground">{filteredLeads.filter(l => l.is_mql).length}</p>
            </div>
            <div className="p-4 flex flex-col justify-center">
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Valor em Pipeline</p>
              <p className="text-3xl font-extrabold">R$ {filteredLeads.reduce((sum, lead) => sum + (lead.valor_proposta || 0), 0).toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 border-b border-border/60">
                <tr>
                  <th className="px-4 py-3 font-bold text-foreground w-12 text-center">#</th>
                  <th className="px-4 py-3 font-bold text-foreground">Lead</th>
                  <th className="px-4 py-3 font-bold text-foreground">Produto</th>
                  <th className="px-4 py-3 font-bold text-foreground text-right">Valor</th>
                  <th className="px-4 py-3 font-bold text-foreground">Etapa</th>
                  <th className="px-4 py-3 font-bold text-foreground">Responsável (SDR)</th>
                  <th className="px-4 py-3 font-bold text-foreground w-16 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground/60 italic">
                      Nenhum lead encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead, idx) => {
                    const leadComAlerta = leadsComAlerta.find((l) => l.id === lead.id);
                    return (
                      <tr key={lead.id} className="hover:bg-muted/[0.02] transition-colors cursor-pointer" onClick={() => handleLeadClick(lead)}>
                        <td className="px-4 py-3 text-center text-muted-foreground/40 font-medium">{(idx + 1).toString().padStart(2, '0')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {lead.is_mql && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
                            <div>
                              <p className="font-bold text-foreground leading-none">{lead.nome}</p>
                              {leadComAlerta?.precisaFollowup && (
                                <p className="text-[10px] text-danger font-bold mt-1 uppercase flex items-center gap-1">
                                  <Flame className="h-2.5 w-2.5" /> Follow-up pendente
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-medium">
                          {lead.produtos?.nome || "Sem produto"}
                        </td>
                        <td className="px-4 py-3 text-right font-extrabold text-foreground">
                          R$ {(lead.valor_proposta || 0).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold h-6">
                            {lead.etapas_funil?.nome || "Sem etapa"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                              {lead.sdr_profile?.nome?.charAt(0) || "U"}
                            </div>
                            {lead.sdr_profile?.nome || "Não atribuído"}
                          </div>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <WhatsAppButton telefone={lead.telefone} size="sm" className="mx-auto" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LeadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <LeadDetailsSheet
        lead={selectedLead}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      {/* Floating Action Button (Mobile) */}
      <Button
        onClick={() => setDialogOpen(true)}
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 p-0"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default Pipeline;
