import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Plus, Flame, Edit, Trash2, Archive, UserPlus, MoveRight, X, Phone, Star, CheckCircle2 } from "lucide-react";
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

type ViewMode = "kanban" | "list";

const LeadCard = ({ lead, precisaFollowup, diasParado, upcomingCall, onToggleMQL }: { 
  lead: Lead; 
  precisaFollowup?: boolean; 
  diasParado?: number; 
  upcomingCall?: { time: string; date: Date };
  onToggleMQL?: (e: React.MouseEvent) => void;
}) => {
  return (
    <div className="bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-border relative group">
      {precisaFollowup && (
        <>
          <div 
            className="absolute -top-2 -right-2 bg-destructive rounded-full p-1.5 shadow-lg animate-pulse"
            title={`Parado há ${diasParado} dias - Precisa follow-up!`}
          >
            <Flame className="h-4 w-4 text-white" />
          </div>
        </>
      )}
      {upcomingCall && (
        <div 
          className="absolute -top-2 -left-2 bg-primary text-primary-foreground shadow-lg gap-1 pl-1.5 pr-2 py-1 rounded-md text-xs font-medium inline-flex items-center"
          title={`Call agendada para ${format(upcomingCall.date, "dd/MM/yyyy 'às' HH:mm")}`}
        >
          <Phone className="h-3 w-3" />
          {upcomingCall.time}
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{lead.nome}</h4>
          <WhatsAppButton telefone={lead.telefone} size="sm" />
        </div>
        <button
          onClick={onToggleMQL}
          className="hover:scale-110 transition-transform"
          title={lead.is_mql ? "Remover marcação MQL" : "Marcar como MQL"}
        >
          <Star className={`h-4 w-4 ${lead.is_mql ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground hover:text-amber-500'}`} />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        {lead.produtos?.nome || "Sem produto"}
      </p>
      <p className="text-lg font-bold text-success mb-3">
        R$ {(lead.valor_proposta || 0).toLocaleString('pt-BR')}
      </p>
      <div className="text-xs text-muted-foreground space-y-1">
        {lead.sdr_profile && <p>SDR: {lead.sdr_profile.nome}</p>}
        {lead.closer_profile && <p>Closer: {lead.closer_profile.nome}</p>}
      </div>
      <div className="mt-2 pt-2 border-t border-border/50">
        {(lead as any).contatado ? (
          <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] px-1.5 py-0.5">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Contatado
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground/70 text-[10px] px-1.5 py-0.5">
            Aguardando contato
          </Badge>
        )}
      </div>
    </div>
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
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className="cursor-grab active:cursor-grabbing"
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
    <div className="space-y-3">
      <div style={{ backgroundColor: stageColor + '20' }} className="rounded-lg p-3">
        <h3 className="font-semibold text-sm flex items-center justify-between">
          {stageName}
          <Badge variant="secondary" className="ml-2">{leads.length}</Badge>
        </h3>
      </div>

      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[200px] rounded-lg p-2 transition-colors ${
          isOver ? 'bg-muted/50' : ''
        }`}
      >
        {leads.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm text-center p-4">
            Nenhum lead nesta etapa
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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">Pipeline de Vendas</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gerencie seus leads e oportunidades</p>
        </div>

        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
          <Button
            onClick={() => setDialogOpen(true)}
            className="gap-2 min-h-[44px] hidden md:flex"
          >
            <Plus className="h-4 w-4" />
            Adicionar Lead
          </Button>
          <Button
            variant={showOnlyMQL ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyMQL(!showOnlyMQL)}
            className="gap-2 min-h-[44px]"
          >
            <Star className={`h-4 w-4 ${showOnlyMQL ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">MQL</span>
          </Button>
          <Select value={captureFilter} onValueChange={setCaptureFilter}>
            <SelectTrigger className="min-h-[44px] w-[210px]">
              <SelectValue placeholder="Status de captura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os leads</SelectItem>
              <SelectItem value="parcial">Capturado parcialmente</SelectItem>
              <SelectItem value="concluido">Formulário concluído</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={handleToggleArchived}
            className="gap-2 min-h-[44px]"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">{showArchived ? "Ver Ativos" : "Lixeira"}</span>
          </Button>

          <div className="flex bg-muted rounded-lg p-1 flex-1 md:flex-none">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("kanban")}
              className="gap-2 flex-1 md:flex-none min-h-[44px]"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewModeChange("list")}
              className="gap-2 flex-1 md:flex-none min-h-[44px]"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <>
          <div className="flex justify-end mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/config-etapas")}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Configurar Etapas
            </Button>
          </div>
          
          <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex md:grid md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:overflow-visible">
            {stages.map((stage) => {
              const stageLeads = getLeadsByStage(stage.id);
              return (
                <div key={stage.id} className="min-w-[85vw] md:min-w-0 snap-center">
                  <DroppableColumn
                    stageId={stage.id}
                    stageName={stage.nome}
                    stageColor={stage.cor}
                    leads={stageLeads}
                    onLeadClick={handleLeadClick}
                    leadsComAlerta={leadsComAlerta}
                    upcomingCallsMap={upcomingCallsMap}
                    onToggleMQL={handleToggleMQL}
                  />
                </div>
              );
            })}
          </div>
          
          {/* Empty State for Kanban */}
          {stages.length > 0 && filteredLeads.length === 0 && (
            <div className="text-center py-16 bg-card rounded-xl shadow-md border border-border">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Plus className="h-12 w-12 text-primary" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Seu pipeline está vazio</h3>
              <p className="text-muted-foreground mb-6">Adicione seu primeiro lead para começar!</p>
              <Button onClick={() => setDialogOpen(true)} className="gap-2 btn-premium">
                <Plus className="h-4 w-4" />
                Adicionar Lead
              </Button>
            </div>
          )}
          </DndContext>
        </>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <>
          {/* Filters */}
          <LeadFilters
            filters={filters}
            onFiltersChange={setFilters}
            stages={stages}
            sdrs={sdrs}
            closers={closers}
          />

          {/* Stats */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <span>Total: <strong className="text-foreground">{filteredLeads.length}</strong> leads</span>
            <span className="hidden md:inline">•</span>
            <span>
              MQLs: <strong className="text-amber-500">{filteredLeads.filter(l => l.is_mql).length}</strong>
            </span>
            <span className="hidden md:inline">•</span>
            <span>
              Valor Total: <strong className="text-success">
                R$ {filteredLeads.reduce((sum, lead) => sum + (lead.valor_proposta || 0), 0).toLocaleString('pt-BR')}
              </strong>
            </span>
          </div>

          {/* Bulk Actions Toolbar */}
          {selectedLeadIds.length > 0 && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {selectedLeadIds.length} {selectedLeadIds.length === 1 ? 'lead selecionado' : 'leads selecionados'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLeadIds([])}
                    className="h-7 px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Select onValueChange={handleBulkAssignSDR}>
                    <SelectTrigger className="w-[180px] h-9">
                      <UserPlus className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Atribuir SDR" />
                    </SelectTrigger>
                    <SelectContent>
                      {sdrs.map((sdr) => (
                        <SelectItem key={sdr.id} value={sdr.id}>
                          {sdr.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select onValueChange={handleBulkAssignCloser}>
                    <SelectTrigger className="w-[180px] h-9">
                      <UserPlus className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Atribuir Closer" />
                    </SelectTrigger>
                    <SelectContent>
                      {closers.map((closer) => (
                        <SelectItem key={closer.id} value={closer.id}>
                          {closer.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select onValueChange={handleBulkMoveStage}>
                    <SelectTrigger className="w-[180px] h-9">
                      <MoveRight className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Mover para etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkArchive}
                    className="gap-2"
                  >
                    <Archive className="h-4 w-4" />
                    {showArchived ? 'Desarquivar' : 'Arquivar'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl shadow-md overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12">
                    <Checkbox
                      checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th>Lead</th>
                  <th>Produto</th>
                  <th>Valor</th>
                  <th>Etapa</th>
                  <th>SDR</th>
                  <th>Closer</th>
                  <th className="w-16">Contato</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum lead encontrado
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                  const leadComAlerta = leadsComAlerta.find((l) => l.id === lead.id);
                  const upcomingCall = upcomingCallsMap.get(lead.id);
                  return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-muted/50 ${selectedLeadIds.includes(lead.id) ? 'bg-muted/30' : ''}`}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedLeadIds.includes(lead.id)}
                        onCheckedChange={() => toggleLeadSelection(lead.id)}
                      />
                    </td>
                    <td className="font-semibold cursor-pointer" onClick={() => handleLeadClick(lead)}>
                      <div className="flex items-center gap-2">
                        {leadComAlerta?.precisaFollowup && (
                          <div 
                            className="bg-destructive rounded-full p-1 animate-pulse"
                            title={`Parado há ${leadComAlerta.diasParado} dias - Precisa follow-up!`}
                          >
                            <Flame className="h-3 w-3 text-white" />
                          </div>
                        )}
                        {upcomingCall && (
                          <div 
                            className="bg-primary text-primary-foreground gap-1 px-1.5 py-0.5 rounded text-xs font-medium inline-flex items-center"
                            title={`Call agendada para ${format(upcomingCall.date, "dd/MM/yyyy 'às' HH:mm")}`}
                          >
                            <Phone className="h-3 w-3" />
                            {upcomingCall.time}
                          </div>
                        )}
                        <button
                          onClick={(e) => handleToggleMQL(lead.id, e)}
                          className="hover:scale-110 transition-transform"
                          title={lead.is_mql ? "Remover marcação MQL" : "Marcar como MQL"}
                        >
                          <Star className={`h-3.5 w-3.5 ${lead.is_mql ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground hover:text-amber-500'}`} />
                        </button>
                        {lead.nome}
                      </div>
                    </td>
                    <td className="cursor-pointer" onClick={() => handleLeadClick(lead)}>
                      {lead.produtos?.nome || "-"}
                    </td>
                    <td className="font-bold text-success cursor-pointer" onClick={() => handleLeadClick(lead)}>
                      R$ {(lead.valor_proposta || 0).toLocaleString('pt-BR')}
                    </td>
                    <td className="cursor-pointer" onClick={() => handleLeadClick(lead)}>
                      <Badge variant="secondary">
                        {lead.etapas_funil?.nome || "Sem etapa"}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground cursor-pointer" onClick={() => handleLeadClick(lead)}>
                      {lead.sdr_profile?.nome || "-"}
                    </td>
                    <td className="text-muted-foreground cursor-pointer" onClick={() => handleLeadClick(lead)}>
                      {lead.closer_profile?.nome || "-"}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <WhatsAppButton telefone={lead.telefone} size="sm" />
                    </td>
                  </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
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
