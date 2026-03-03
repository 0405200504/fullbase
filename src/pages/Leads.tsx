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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">
            {showArchived ? "Lixeira de Leads" : "Leads"}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {showArchived
              ? "Leads arquivados e desqualificados"
              : "Gerencie todas as informações dos seus leads"}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {selectedLeadIds.length > 0 && (
            <Button
              onClick={handleDeleteMultiple}
              variant="destructive"
              className="gap-2 min-h-[44px]"
              size="sm"
            >
              <Trash2 className="h-4 w-4" />
              Deletar ({selectedLeadIds.length})
            </Button>
          )}

          <Button
            onClick={() => setDialogOpen(true)}
            className="gap-2 min-h-[44px] hidden md:flex"
          >
            <Plus className="h-4 w-4" />
            Adicionar Lead
          </Button>

          <Button
            onClick={() => setImportDialogOpen(true)}
            variant="outline"
            className="gap-2 min-h-[44px] hidden md:flex"
          >
            <Upload className="h-4 w-4" />
            Importar
          </Button>

          <Button
            variant={showOnlyMQL ? "default" : "outline"}
            onClick={() => setShowOnlyMQL(!showOnlyMQL)}
            className="gap-2 min-h-[44px]"
            size="sm"
          >
            <Star className={`h-4 w-4 ${showOnlyMQL ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">MQL</span>
          </Button>

          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
            className="gap-2 min-h-[44px] w-full md:w-auto"
            size="sm"
          >
            <Archive className="h-4 w-4" />
            {showArchived ? "Ver Leads Ativos" : "Ver Lixeira"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 md:gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, telefone ou fonte..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 min-h-[48px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={sdrFilter} onValueChange={setSdrFilter}>
            <SelectTrigger className="min-h-[48px]">
              <SelectValue placeholder="Filtrar por SDR" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os SDRs</SelectItem>
              {sdrs.map((sdr) => (
                <SelectItem key={sdr.id} value={sdr.id}>
                  {sdr.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={closerFilter} onValueChange={setCloserFilter}>
            <SelectTrigger className="min-h-[48px]">
              <SelectValue placeholder="Filtrar por Closer" />
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

          <Select value={captureFilter} onValueChange={setCaptureFilter}>
            <SelectTrigger className="min-h-[48px]">
              <SelectValue placeholder="Status de captura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os leads</SelectItem>
              <SelectItem value="parcial">Capturado parcialmente</SelectItem>
              <SelectItem value="concluido">Formulário concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 text-sm text-white/70 bg-white/5 p-4 rounded-2xl font-bold">
        <span>Total: <strong className="text-white">{filteredLeads.length}</strong> leads</span>
        <span className="hidden md:inline">•</span>
        <span>
          MQLs: <strong className="text-[#8FFF00]">{filteredLeads.filter(l => l.is_mql).length}</strong>
        </span>
        <span className="hidden md:inline">•</span>
        <span>Valor Total: <strong className="text-emerald-400 tracking-tight">
          {formatCurrency(filteredLeads.reduce((sum, lead) => sum + (lead.valor_proposta || 0), 0))}
        </strong></span>
      </div>

      {/* Leads Table/Cards */}
      {/* Leads Table/Cards */}
      <div className="bg-white text-black rounded-[40px] shadow-[0_20px_40px_rgba(0,0,0,0.6)] overflow-hidden md:p-6 mt-8">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto rounded-3xl border border-black/10">
          <table className="w-full text-sm text-left text-black bg-white [&>thead>tr>th]:bg-black/5 [&>thead>tr>th]:text-black [&>thead>tr>th]:font-bold [&>thead>tr>th]:uppercase [&>thead>tr>th]:tracking-wider [&>thead>tr>th]:text-[12px] [&>thead>tr>th]:border-b [&>thead>tr>th]:border-black/10 [&>thead>tr>th]:px-4 [&>thead>tr>th]:py-4 [&>tbody>tr>td]:border-b [&>tbody>tr>td]:border-black/5 [&>tbody>tr>td]:px-4 [&>tbody>tr>td]:py-4">
            <thead>
              <tr>
                <th className="w-12">
                  <Checkbox
                    checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Etapa</th>
                <th>Fonte</th>
                <th>Produto</th>
                <th>Valor</th>
                <th>Responsável</th>
                <th>Criado em</th>
                <th className="w-16">Contato</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-black/50 font-medium text-base">
                    Nenhum lead encontrado
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const leadComAlerta = leadsComAlerta.find((l) => l.id === lead.id);
                  return (
                    <tr
                      key={lead.id}
                      className="cursor-pointer hover:bg-black/5 transition-colors group"
                      onClick={() => handleLeadClick(lead)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedLeadIds.includes(lead.id)}
                          onCheckedChange={() => handleSelectLead(lead.id)}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {leadComAlerta?.precisaFollowup && !showArchived && (
                            <span title={`Parado há ${leadComAlerta.diasParado} dias!`}>
                              <Flame className="h-4 w-4 text-destructive animate-pulse" />
                            </span>
                          )}
                          <button
                            onClick={(e) => handleToggleMQL(lead.id, e)}
                            className="hover:scale-110 transition-transform"
                            title={lead.is_mql ? "Remover marcação MQL" : "Marcar como MQL"}
                          >
                            <Star className={`h-4 w-4 ${lead.is_mql ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground hover:text-amber-500'}`} />
                          </button>
                          <div>
                            <p className="font-semibold">{lead.nome}</p>
                            {lead.email && (
                              <p className="text-xs text-muted-foreground">{lead.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-sm">{lead.telefone}</td>
                      <td>
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: lead.etapas_funil?.cor
                              ? lead.etapas_funil.cor + '20'
                              : undefined,
                          }}
                        >
                          {lead.etapas_funil?.nome || "Sem etapa"}
                        </Badge>
                      </td>
                      <td className="text-sm">
                        {lead.fonte_trafego ? (
                          <span className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium">
                            {lead.fonte_trafego}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="text-sm">{lead.produtos?.nome || "-"}</td>
                      <td className="font-bold text-success">
                        {lead.valor_proposta ? formatCurrency(lead.valor_proposta) : "-"}
                      </td>
                      <td className="text-sm">
                        <div>
                          {lead.sdr_profile && (
                            <p className="text-xs">
                              <span className="text-muted-foreground">SDR:</span> {lead.sdr_profile.nome}
                            </p>
                          )}
                          {lead.closer_profile && (
                            <p className="text-xs">
                              <span className="text-muted-foreground">Closer:</span>{" "}
                              {lead.closer_profile.nome}
                            </p>
                          )}
                          {!lead.sdr_profile && !lead.closer_profile && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {formatDate(lead.created_at)}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <WhatsAppButton telefone={lead.telefone} size="sm" />
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {!showArchived && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleArchiveLead(lead.id, e)}
                              className="gap-1"
                              title="Arquivar lead"
                            >
                              <Archive className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteSingle(lead.id, e)}
                            className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Deletar lead permanentemente"
                          >
                            <Trash2 className="h-3 w-3" />
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

        {/* Mobile Cards */}
        <div className="md:hidden p-4 space-y-4">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-black/50 font-medium">
              Nenhum lead encontrado
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const leadComAlerta = leadsComAlerta.find((l) => l.id === lead.id);
              return (
                <div
                  key={lead.id}
                  className="bg-black/5 rounded-3xl p-5 space-y-4 border border-black/10 relative hover:bg-black/10 transition-colors"
                  onClick={() => handleLeadClick(lead)}
                >
                  <div className="absolute top-4 left-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedLeadIds.includes(lead.id)}
                      onCheckedChange={() => handleSelectLead(lead.id)}
                    />
                  </div>

                  {leadComAlerta?.precisaFollowup && !showArchived && (
                    <div
                      className="absolute -top-2 -right-2 bg-destructive rounded-full p-1.5 shadow-lg animate-pulse"
                      title={`Parado há ${leadComAlerta.diasParado} dias!`}
                    >
                      <Flame className="h-4 w-4 text-white" />
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2 pl-8">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={(e) => handleToggleMQL(lead.id, e)}
                        className="hover:scale-110 transition-transform flex-shrink-0"
                        title={lead.is_mql ? "Remover marcação MQL" : "Marcar como MQL"}
                      >
                        <Star className={`h-5 w-5 ${lead.is_mql ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground hover:text-amber-500'}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-base">{lead.nome}</p>
                          <div onClick={(e) => e.stopPropagation()}>
                            <WhatsAppButton telefone={lead.telefone} size="sm" />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{lead.telefone}</p>
                        {lead.email && (
                          <p className="text-xs text-muted-foreground">{lead.email}</p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      style={{
                        backgroundColor: lead.etapas_funil?.cor
                          ? lead.etapas_funil.cor + '20'
                          : undefined,
                      }}
                      className="text-xs"
                    >
                      {lead.etapas_funil?.nome || "Sem etapa"}
                    </Badge>
                  </div>

                  <div className="text-sm space-y-1">
                    {lead.fonte_trafego && (
                      <p>
                        <span className="text-muted-foreground">Fonte:</span>{" "}
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                          {lead.fonte_trafego}
                        </span>
                      </p>
                    )}
                    {lead.produtos?.nome && (
                      <p><span className="text-muted-foreground">Produto:</span> {lead.produtos.nome}</p>
                    )}
                    {lead.sdr_profile && (
                      <p><span className="text-muted-foreground">SDR:</span> {lead.sdr_profile.nome}</p>
                    )}
                    {lead.closer_profile && (
                      <p><span className="text-muted-foreground">Closer:</span> {lead.closer_profile.nome}</p>
                    )}
                  </div>

                  {lead.valor_proposta && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xl font-bold text-success mb-2">
                        {formatCurrency(lead.valor_proposta)}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    {!showArchived && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleArchiveLead(lead.id, e)}
                        className="gap-1 min-h-[44px] flex-1"
                      >
                        <Archive className="h-4 w-4" />
                        Arquivar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteSingle(lead.id, e)}
                      className="gap-1 min-h-[44px] flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Deletar
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <LeadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <ImportLeadsDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      <LeadDetailsSheet
        lead={selectedLead}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      {/* Floating Action Button (Mobile) */}
      {!showArchived && (
        <Button
          onClick={() => setDialogOpen(true)}
          className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 p-0"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {leadToDelete ? (
                <>
                  Tem certeza que deseja deletar este lead permanentemente?
                  Esta ação não pode ser desfeita e todos os dados relacionados (atividades, calls, vendas) serão removidos.
                </>
              ) : (
                <>
                  Tem certeza que deseja deletar <strong>{selectedLeadIds.length} leads</strong> permanentemente?
                  Esta ação não pode ser desfeita e todos os dados relacionados serão removidos.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Leads;
