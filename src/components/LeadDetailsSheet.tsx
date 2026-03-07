import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Phone,
  Mail,
  Calendar,
  User,
  Edit,
  Trash2,
  Archive,
  ArchiveRestore,
  Clock,
  DollarSign,
  Star,
  TrendingUp,
  AlertCircle,
  FileText,
  CheckCircle2,
  MessageSquare,
  ChevronRight
} from "lucide-react";
import { Lead, useUpdateLead } from "@/hooks/useLeads";
import { toast } from "sonner";
import { useCallsByLead } from "@/hooks/useCalls";
import { useState, useEffect } from "react";
import { LeadDialog } from "./LeadDialog";
import { AgendarCallDialog } from "./AgendarCallDialog";
import { RegistrarVendaDialog } from "./RegistrarVendaDialog";
import { useDeleteLead } from "@/hooks/useLeads";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
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

interface LeadDetailsSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LeadDetailsSheet = ({ lead, open, onOpenChange }: LeadDetailsSheetProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agendarCallOpen, setAgendarCallOpen] = useState(false);
  const [registrarVendaOpen, setRegistrarVendaOpen] = useState(false);
  const [observacoesSdr, setObservacoesSdr] = useState((lead as any)?.observacoes_sdr || "");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setObservacoesSdr((lead as any)?.observacoes_sdr || "");
  }, [lead]);

  const deleteLead = useDeleteLead();
  const updateLead = useUpdateLead();
  const { data: calls = [] } = useCallsByLead(lead?.id || "");

  const { data: formResponses = [] } = useQuery({
    queryKey: ["lead-form-responses", lead?.id],
    queryFn: async () => {
      if (!lead?.id) return [];
      const { data, error } = await supabase
        .from("form_responses")
        .select("*, forms(title)")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!lead?.id,
  });

  if (!lead) return null;

  const handleDelete = async () => {
    await deleteLead.mutateAsync(lead.id);
    setDeleteDialogOpen(false);
    onOpenChange(false);
  };

  const handleArchive = async () => {
    await updateLead.mutateAsync({
      id: lead.id,
      arquivado: !lead.arquivado,
    });
    onOpenChange(false);
  };

  const handleToggleMQL = async () => {
    await updateLead.mutateAsync({
      id: lead.id,
      is_mql: !lead.is_mql,
      data_marcacao_mql: !lead.is_mql ? new Date().toISOString() : null,
    });
    toast.success(lead.is_mql ? "Lead desmarcado como MQL" : "Lead marcado como MQL ⭐");
  };

  const handleToggleContatado = async () => {
    const newValue = !(lead as any).contatado;
    await updateLead.mutateAsync({
      id: lead.id,
      contatado: newValue,
      data_contato: newValue ? new Date().toISOString() : null,
    } as any);
    toast.success(newValue ? "Lead marcado como contatado ✅" : "Contato desmarcado");
  };

  const handleSaveObservacoes = async () => {
    setSavingNotes(true);
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        observacoes_sdr: observacoesSdr || null,
      } as any);
      toast.success("Anotações salvas!");
    } finally {
      setSavingNotes(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
        <SheetContent className="sm:max-w-[550px] p-0 border-l border-border bg-background" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="h-full flex flex-col">
            {/* Header Area */}
            <div className="p-6 border-b border-border bg-muted/20">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">{lead.nome}</h2>
                    {lead.is_mql && (
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white border-border/80 font-semibold text-[10px] uppercase tracking-wider">
                      {lead.etapas_funil?.nome || "Sem Etapa"}
                    </Badge>
                    {(lead as any).contatado ? (
                      <Badge variant="default" className="bg-success text-white border-none text-[10px] uppercase tracking-wider">
                        Contatado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                        Aguardando
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("h-9 w-9 transition-colors", lead.is_mql && "bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/20 text-amber-700 dark:text-amber-400")}
                    onClick={handleToggleMQL}
                    title={lead.is_mql ? "Remover de MQL" : "Marcar como MQL"}
                  ><Star className={cn("h-4 w-4", lead.is_mql && "fill-current")} /></Button>
                  <Button variant="outline" size="icon" onClick={() => setEditDialogOpen(true)} className="h-9 w-9">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 py-2 px-3 bg-white rounded-md border border-border/50 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{lead.telefone}</span>
                </div>
                {lead.email && (
                  <div className="flex items-center gap-2 py-2 px-3 bg-white rounded-md border border-border/50 text-sm overflow-hidden">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground truncate">{lead.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <Tabs defaultValue="detalhes" className="flex-1 flex flex-col">
              <div className="px-6 border-b border-border bg-background">
                <TabsList className="h-12 w-full justify-start rounded-none bg-transparent p-0 gap-6">
                  <TabsTrigger value="detalhes" className="tab-trigger-clean">Detalhes</TabsTrigger>
                  <TabsTrigger value="formulario" className="tab-trigger-clean">Formulário</TabsTrigger>
                  <TabsTrigger value="calls" className="tab-trigger-clean">Calls</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <TabsContent value="detalhes" className="m-0 space-y-6">
                  {/* Destaque Financeiro */}
                  {lead.valor_proposta && (
                    <div className="p-4 rounded-lg bg-primary/[0.03] border border-primary/10 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">Valor da Proposta</p>
                        <p className="text-2xl font-bold text-foreground">
                          {formatCurrency(lead.valor_proposta)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Produto</p>
                        <p className="font-semibold text-foreground">{lead.produtos?.nome || "N/A"}</p>
                      </div>
                    </div>
                  )}

                  {/* Qualificação do Lead */}
                  {(lead.renda_mensal || lead.investimento_disponivel || lead.dificuldades) && (
                    <Card className="border-border/60 shadow-sm overflow-hidden">
                      <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border/60">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <TrendingUp className="h-3.5 w-3.5 text-primary" />
                          Qualificação e Perfil
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          {lead.renda_mensal && (
                            <div>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Faturamento Mensal</p>
                              <p className="text-sm font-bold text-foreground">{formatCurrency(lead.renda_mensal)}</p>
                            </div>
                          )}
                          {lead.investimento_disponivel && (
                            <div>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Investimento Disponível</p>
                              <p className="text-sm font-bold text-foreground">{formatCurrency(lead.investimento_disponivel)}</p>
                            </div>
                          )}
                        </div>
                        {lead.dificuldades && (
                          <div className="pt-3 border-t border-border/50">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-2 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Dificuldades e Gargalos
                            </p>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap italic bg-muted/20 p-3 rounded-md border border-border/30">
                              "{lead.dificuldades}"
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Informações de Origem e Time */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Origem</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Fonte</p>
                          <p className="text-sm font-medium">{lead.fonte_trafego || "Orgânico / Direto"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Criado em</p>
                          <p className="text-sm font-medium">{format(new Date(lead.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Responsáveis</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                            {lead.sdr_profile?.nome?.[0] || "?"}
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground leading-none">SDR</p>
                            <p className="text-sm font-medium leading-tight">{lead.sdr_profile?.nome || "Não atribuído"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                            {lead.closer_profile?.nome?.[0] || "?"}
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground leading-none">Closer</p>
                            <p className="text-sm font-medium leading-tight">{lead.closer_profile?.nome || "Não atribuído"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Anotações do SDR */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Anotações Estratégicas
                      </h4>
                      {savingNotes && <span className="text-[10px] text-primary animate-pulse">Salvando...</span>}
                    </div>
                    <Textarea
                      value={observacoesSdr}
                      onChange={(e) => setObservacoesSdr(e.target.value)}
                      onBlur={handleSaveObservacoes}
                      placeholder="Informações cruciais para o fechamento..."
                      className="min-h-[100px] bg-muted/20 border-border/60 focus:bg-white transition-all text-sm leading-relaxed"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="formulario" className="m-0 space-y-4">
                  {formResponses.length === 0 ? (
                    <div className="text-center py-20 bg-muted/10 rounded-lg border border-dashed border-border/60 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Nenhuma resposta de formulário encontrada</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formResponses.map((fr: any) => (
                        <Card key={fr.id} className="border-border/60 shadow-none overflow-hidden">
                          <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border/60 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-xs font-bold text-foreground">
                              {fr.forms?.title || "Lead Origin"}
                            </CardTitle>
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {format(new Date(fr.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </CardHeader>
                          <CardContent className="p-0">
                            {fr.mapped_data && (
                              <div className="divide-y divide-border/50">
                                {Object.entries(fr.mapped_data as Record<string, string>).map(([key, value]) => (
                                  <div key={key} className="px-4 py-3 flex items-start justify-between gap-4 last:border-0 hover:bg-muted/10 transition-colors">
                                    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-tight min-w-[100px] pt-0.5">
                                      {key.replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-sm font-medium text-foreground text-right">{value}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="calls" className="m-0 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-foreground">Histórico de Agendas</h4>
                    <Button onClick={() => setAgendarCallOpen(true)} size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5" />
                      Agendar Call
                    </Button>
                  </div>

                  {calls.length === 0 ? (
                    <div className="text-center py-16 bg-muted/10 rounded-lg border border-dashed border-border/60">
                      <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm text-muted-foreground mb-4">Sem agendas cadastradas</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {calls.map((call) => (
                        <div key={call.id} className="group relative p-4 border border-border/60 rounded-lg hover:border-primary/40 hover:bg-muted/10 transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 p-2 rounded bg-muted/50 group-hover:bg-primary/5">
                                <Phone className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <div>
                                <p className="font-bold text-foreground leading-none mb-1">
                                  {format(new Date(call.data_hora_agendada), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                                <p className="text-[11px] font-medium text-muted-foreground">Responsável: {call.profiles?.nome}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                              {call.status}
                            </Badge>
                          </div>

                          {call.resultado && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/30 w-fit text-xs font-medium text-muted-foreground mb-3">
                              <ChevronRight className="h-3 w-3" />
                              Resultado: <span className="text-foreground capitalize">{call.resultado.replace(/_/g, " ")}</span>
                            </div>
                          )}

                          {call.notas && (
                            <div className="text-xs text-muted-foreground bg-white/50 p-2 rounded border border-border/40 italic">
                              "{call.notas}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>

              {/* Action Footer */}
              <div className="p-6 border-t border-border bg-muted/5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleToggleContatado}
                    variant={(lead as any).contatado ? "outline" : "default"}
                    className={cn(
                      "w-full gap-2 h-11 font-bold",
                      !(lead as any).contatado && "bg-success hover:bg-success/90 text-white shadow-sm"
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {(lead as any).contatado ? "Desmarcar Contato" : "Confirmar Contato"}
                  </Button>
                  <Button
                    onClick={() => setRegistrarVendaOpen(true)}
                    className="w-full gap-2 h-11 font-bold shadow-sm"
                  >
                    <DollarSign className="h-4 w-4" />
                    Registrar Venda
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={handleArchive}
                    variant="outline"
                    className="flex-1 gap-1 text-[11px] font-bold uppercase h-9"
                  >
                    {lead.arquivado ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                    {lead.arquivado ? "Ativar" : "Arquivar"}
                  </Button>
                  <Button
                    onClick={() => setEditDialogOpen(true)}
                    variant="outline"
                    className="flex-1 gap-1 text-[11px] font-bold uppercase h-9"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => setDeleteDialogOpen(true)}
                    variant="ghost"
                    className="h-9 gap-1 text-[11px] font-bold uppercase text-danger hover:bg-danger/5 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </Button>
                </div>
              </div>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      <LeadDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} lead={lead} />
      <AgendarCallDialog open={agendarCallOpen} onOpenChange={setAgendarCallOpen} lead={lead} />
      <RegistrarVendaDialog open={registrarVendaOpen} onOpenChange={setRegistrarVendaOpen} lead={lead} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-lg border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lead Permanentemente?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta ação removerá todos os dados, vendas e históricos de "{lead.nome}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-danger text-white hover:bg-danger/90 rounded-md">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
