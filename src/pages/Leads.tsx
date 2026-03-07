import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Flame, Archive, Upload, Star, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeads, useUpdateLead, useDeleteLead, useDeleteLeads } from "@/hooks/useLeads";
import { useEtapasFunil } from "@/hooks/useEtapasFunil";
import { useProfiles } from "@/hooks/useProfiles";
import { useLeadAlerts } from "@/hooks/useLeadAlerts";
import { LeadDialog } from "@/components/LeadDialog";
import { LeadDetailsSheet } from "@/components/LeadDetailsSheet";
import { ImportLeadsDialog } from "@/components/ImportLeadsDialog";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { formatCurrency, formatDate } from "@/lib/dateUtils";
import type { Lead } from "@/hooks/useLeads";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const Leads = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sdrFilter, setSdrFilter] = useState<string>("todos");
  const [closerFilter, setCloserFilter] = useState<string>("todos");
  const [captureFilter, setCaptureFilter] = useState<string>("todos");
  const [showArchived, setShowArchived] = useState(false);
  const [showOnlyMQL, setShowOnlyMQL] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  const { data: leads = [], isLoading } = useLeads(showArchived);
  const { data: etapas = [] } = useEtapasFunil();
  const { data: sdrs = [] } = useProfiles("sdr");
  const { data: closers = [] } = useProfiles("closer");
  const leadsComAlerta = useLeadAlerts(leads, etapas);
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const deleteLeads = useDeleteLeads();

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefone.includes(searchTerm) ||
      lead.fonte_trafego?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSdr = sdrFilter === "todos" || lead.sdr_id === sdrFilter;
    const matchesCloser = closerFilter === "todos" || lead.closer_id === closerFilter;
    const matchesMQL = !showOnlyMQL || lead.is_mql;
    const matchesCapture =
      captureFilter === "todos" ||
      (captureFilter === "parcial" && (lead as any).capture_status === "partial") ||
      (captureFilter === "concluido" && (lead as any).capture_status === "completed");

    return matchesSearch && matchesSdr && matchesCloser && matchesMQL && matchesCapture;
  });

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsOpen(true);
  };

  const handleArchiveLead = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateLead.mutateAsync({
      id: leadId,
      arquivado: true,
    });
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

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadIds(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const handleDeleteSingle = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLeadToDelete(leadId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteMultiple = () => {
    if (selectedLeadIds.length === 0) return;
    setLeadToDelete(null);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (leadToDelete) {
        // Deletar um único lead
        await deleteLead.mutateAsync(leadToDelete);
        toast.success("Lead deletado com sucesso!");
      } else {
        // Deletar múltiplos leads
        await deleteLeads.mutateAsync(selectedLeadIds);
        setSelectedLeadIds([]);
      }
    } catch (error) {
      // Error toast já é mostrado pelo hook
    } finally {
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
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
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {showArchived ? "Lixeira de Leads" : "Leads"}
          </h1>
          <p className="text-muted-foreground">
            {showArchived
              ? "Leads arquivados e desqualificados da sua base."
              : "Gerencie e acompanhe todos os potenciais clientes."}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {selectedLeadIds.length > 0 && (
            <Button
              onClick={handleDeleteMultiple}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Excluir ({selectedLeadIds.length})
            </Button>
          )}

          <Button
            variant={showOnlyMQL ? "default" : "outline"}
            onClick={() => setShowOnlyMQL(!showOnlyMQL)}
            size="sm"
            className="gap-2"
          >
            <Star className={cn("h-4 w-4", showOnlyMQL && "fill-current")} />
            Filtrar MQL
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
            size="sm"
            className="gap-2"
          >
            {showArchived ? <Plus className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {showArchived ? "Ver Ativos" : "Ver Lixeira"}
          </Button>

          {!showArchived && (
            <>
              <Button
                onClick={() => setImportDialogOpen(true)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Importar
              </Button>
              <Button
                onClick={() => setDialogOpen(true)}
                size="sm"
                className="gap-2 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Novo Lead
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="px-6 py-4 bg-muted/30 rounded-lg border border-border flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total de Leads</span>
          <span className="text-xl font-bold">{filteredLeads.length}</span>
        </div>
        <div className="px-6 py-4 bg-primary/[0.03] rounded-lg border border-primary/10 flex items-center justify-between">
          <span className="text-sm font-medium text-primary">Leads MQL</span>
          <span className="text-xl font-bold text-primary">{filteredLeads.filter(l => l.is_mql).length}</span>
        </div>
        <div className="px-6 py-4 bg-success/[0.03] rounded-lg border border-success/10 flex items-center justify-between">
          <span className="text-sm font-medium text-success">Potencial de Vendas</span>
          <span className="text-xl font-bold text-success">
            {formatCurrency(filteredLeads.reduce((sum, lead) => sum + (lead.valor_proposta || 0), 0))}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={sdrFilter} onValueChange={setSdrFilter}>
              <SelectTrigger>
                <SelectValue placeholder="SDR Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os SDRs</SelectItem>
                {sdrs.map((sdr) => (
                  <SelectItem key={sdr.id} value={sdr.id}>{sdr.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={closerFilter} onValueChange={setCloserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Closer Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Closers</SelectItem>
                {closers.map((closer) => (
                  <SelectItem key={closer.id} value={closer.id}>{closer.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={captureFilter} onValueChange={setCaptureFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status de Captura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="parcial">Captura Parcial</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Leads */}
      <Card className="overflow-hidden border-border/60">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-4 w-10 text-center">
                  <Checkbox
                    checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[11px]">Lead</th>
                <th className="px-4 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[11px]">Etapa do Funil</th>
                <th className="px-4 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[11px]">Produto / Valor</th>
                <th className="px-4 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[11px]">Time</th>
                <th className="px-4 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[11px]">Criado</th>
                <th className="px-4 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[11px] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center text-muted-foreground italic">
                    Nenhum lead encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const leadComAlerta = leadsComAlerta.find((l) => l.id === lead.id);
                  return (
                    <tr
                      key={lead.id}
                      className="group hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handleLeadClick(lead)}
                    >
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedLeadIds.includes(lead.id)}
                          onCheckedChange={() => handleSelectLead(lead.id)}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => handleToggleMQL(lead.id, e)}
                            className="text-muted-foreground hover:scale-110 transition-all"
                          >
                            <Star className={cn("h-4 w-4", lead.is_mql ? "fill-amber-400 text-amber-400" : "hover:text-amber-400")} />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{lead.nome}</span>
                              {leadComAlerta?.precisaFollowup && !showArchived && (
                                <Badge variant="destructive" className="h-5 px-1 bg-danger text-white border-none animate-pulse">
                                  <Flame className="w-3 h-3" />
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{lead.telefone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant="outline"
                          className="font-semibold uppercase text-[10px] tracking-wide"
                          style={{
                            color: lead.etapas_funil?.cor || 'inherit',
                            borderColor: (lead.etapas_funil?.cor || 'currentColor') + '40',
                            backgroundColor: (lead.etapas_funil?.cor || 'currentColor') + '10'
                          }}
                        >
                          {lead.etapas_funil?.nome || "Sem Etapa"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{lead.produtos?.nome || "---"}</p>
                          <p className="text-xs text-success font-bold">
                            {lead.valor_proposta ? formatCurrency(lead.valor_proposta) : "R$ 0,00"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs space-y-1">
                          {lead.sdr_profile && (
                            <p><span className="text-muted-foreground">SDR:</span> <span className="font-medium">{lead.sdr_profile.nome}</span></p>
                          )}
                          {lead.closer_profile && (
                            <p><span className="text-muted-foreground">Closer:</span> <span className="font-medium">{lead.closer_profile.nome}</span></p>
                          )}
                          {!lead.sdr_profile && !lead.closer_profile && (
                            <span className="text-muted-foreground italic">Sem atribuição</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground font-medium">
                        {formatDate(lead.created_at)}
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <WhatsAppButton telefone={lead.telefone} size="sm" />
                          {!showArchived && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleArchiveLead(lead.id, e)}
                              className="w-8 h-8 text-muted-foreground hover:text-foreground"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteSingle(lead.id, e)}
                            className="w-8 h-8 text-muted-foreground hover:text-danger hover:bg-danger/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <LeadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <ImportLeadsDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      <LeadDetailsSheet
        lead={selectedLead}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      {/* Mobile FAB */}
      {!showArchived && (
        <Button
          onClick={() => setDialogOpen(true)}
          className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 p-0"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-lg border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lead Permanentemente?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {leadToDelete ? (
                "Esta ação é irreversível e removerá todos os dados, vendas e históricos deste lead."
              ) : (
                `Você está prestes a excluir ${selectedLeadIds.length} leads. Todos os dados serão perdidos para sempre.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-danger text-white hover:bg-danger/90 rounded-md"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Leads;
