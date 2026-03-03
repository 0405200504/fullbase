import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, Calendar, User, Edit, Trash2, Archive, ArchiveRestore, Clock, DollarSign, Star, TrendingUp, AlertCircle, FileText, CheckCircle2, MessageSquare } from "lucide-react";
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

  // Fetch form responses linked to this lead
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-2xl flex items-center gap-2 flex-wrap">
                {lead.nome}
                {lead.is_mql && (
                  <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    MQL
                  </Badge>
                )}
                {(lead as any).contatado ? (
                  <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Contatado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                    Aguardando contato
                  </Badge>
                )}
              </SheetTitle>
              <Button
                variant={lead.is_mql ? "outline" : "default"}
                size="sm"
                onClick={handleToggleMQL}
                className={lead.is_mql ? "" : "bg-amber-500 hover:bg-amber-600 text-white"}
              >
                <Star className={`h-4 w-4 ${lead.is_mql ? "" : "fill-current"}`} />
              </Button>
            </div>
          </SheetHeader>

          <Tabs defaultValue="detalhes" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
              <TabsTrigger value="formulario">Formulário</TabsTrigger>
              <TabsTrigger value="calls">Calls</TabsTrigger>
            </TabsList>

            <TabsContent value="detalhes" className="space-y-6 mt-4">
              {/* Status e Valor */}
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-sm">
                  {lead.etapas_funil?.nome || "Sem etapa"}
                </Badge>
                {lead.valor_proposta && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-success">
                      R$ {lead.valor_proposta.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {lead.produtos?.nome}
                    </p>
                  </div>
                )}
              </div>

              {/* Contato */}
              <div className="space-y-3">
                <h3 className="font-semibold">Contato</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.telefone}</span>
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Informações de Qualificação */}
              {(lead.renda_mensal || lead.investimento_disponivel || lead.dificuldades) && (
                <div className="space-y-3 bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <TrendingUp className="h-4 w-4" />
                    Informações de Qualificação
                  </h3>
                  <div className="space-y-3 text-sm">
                    {lead.renda_mensal && (
                      <div>
                        <p className="text-muted-foreground">Renda/Faturamento Mensal</p>
                        <p className="font-medium text-success">
                          R$ {lead.renda_mensal.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                    {lead.investimento_disponivel && (
                      <div>
                        <p className="text-muted-foreground">Investimento Disponível</p>
                        <p className="font-medium text-success">
                          R$ {lead.investimento_disponivel.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                    {lead.dificuldades && (
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Dificuldades/Gargalos
                        </p>
                        <p className="font-medium whitespace-pre-wrap">{lead.dificuldades}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Informações Adicionais */}
              <div className="space-y-3">
                <h3 className="font-semibold">Informações</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {lead.fonte_trafego && (
                    <div>
                      <p className="text-muted-foreground">Fonte de Tráfego</p>
                      <p className="font-medium">{lead.fonte_trafego}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Data de Criação</p>
                    <p className="font-medium">
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Follow-ups Realizados</p>
                    <p className="font-medium">{lead.contador_followups}</p>
                  </div>
                </div>
              </div>

              {/* Equipe Responsável */}
              <div className="space-y-3">
                <h3 className="font-semibold">Equipe</h3>
                <div className="space-y-2">
                  {lead.sdr_profile && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">SDR:</span>
                      <span className="font-medium">{lead.sdr_profile.nome}</span>
                    </div>
                  )}
                  {lead.closer_profile && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Closer:</span>
                      <span className="font-medium">{lead.closer_profile.nome}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Anotações do SDR */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Anotações do SDR
                </h3>
                <Textarea
                  value={observacoesSdr}
                  onChange={(e) => setObservacoesSdr(e.target.value)}
                  placeholder="Adicione informações úteis para o closer..."
                  className="min-h-[80px] resize-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveObservacoes}
                  disabled={savingNotes || observacoesSdr === ((lead as any)?.observacoes_sdr || "")}
                >
                  {savingNotes ? "Salvando..." : "Salvar anotações"}
                </Button>
              </div>

              {/* Ações */}
              <div className="space-y-2 pt-4 border-t">
                <Button
                  onClick={handleToggleContatado}
                  variant={(lead as any).contatado ? "outline" : "default"}
                  className={`w-full gap-2 ${!(lead as any).contatado ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {(lead as any).contatado ? "Desmarcar Contato" : "Marcar como Contatado"}
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setAgendarCallOpen(true)}
                    className="flex-1 gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Agendar Call
                  </Button>
                  <Button
                    onClick={() => setRegistrarVendaOpen(true)}
                    className="flex-1 gap-2 btn-success"
                  >
                    <DollarSign className="h-4 w-4" />
                    Registrar Venda
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => setEditDialogOpen(true)}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    onClick={handleArchive}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    {lead.arquivado ? (
                      <>
                        <ArchiveRestore className="h-4 w-4" />
                        Restaurar
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4" />
                        Arquivar
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setDeleteDialogOpen(true)}
                    variant="outline"
                    className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="formulario" className="space-y-4 mt-4">
              {formResponses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma resposta de formulário vinculada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formResponses.map((fr: any) => (
                    <div key={fr.id} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{fr.forms?.title || "Formulário"}</h4>
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(fr.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>

                      {/* Mapped data */}
                      {fr.mapped_data && Object.keys(fr.mapped_data).length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Dados Mapeados</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {Object.entries(fr.mapped_data as Record<string, string>).map(([key, value]) => (
                              <div key={key} className="bg-muted/30 rounded-md px-3 py-1.5">
                                <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                                <p className="font-medium text-[13px]">{value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Raw answers */}
                      {fr.answers && (fr.answers as any[]).length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Respostas Completas</p>
                          <div className="space-y-2 text-sm">
                            {(fr.answers as any[]).map((a: any, i: number) => (
                              <div key={i} className="border-l-2 border-primary/30 pl-3">
                                <p className="text-[11px] text-muted-foreground">Pergunta {i + 1}</p>
                                <p className="font-medium">{typeof a.value === "string" ? a.value : Array.isArray(a.value) ? (a.value as string[]).join(", ") : String(a.value || "—")}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="calls" className="space-y-4 mt-4">
              {calls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma call registrada</p>
                  <Button
                    onClick={() => setAgendarCallOpen(true)}
                    variant="outline"
                    className="mt-4 gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Agendar Primeira Call
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {calls.map((call) => (
                    <div
                      key={call.id}
                      className="p-4 border border-border rounded-lg bg-muted/20"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">
                            {format(new Date(call.data_hora_agendada), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {call.profiles?.nome}
                          </p>
                        </div>
                        <Badge variant="outline">{call.status}</Badge>
                      </div>
                      
                      {call.resultado && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">Resultado: </span>
                          <span className="font-medium">{call.resultado.replace(/_/g, " ")}</span>
                        </div>
                      )}
                      
                      {call.notas && (
                        <div className="mt-2">
                          <Separator className="my-2" />
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {call.notas}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <LeadDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        lead={lead}
      />

      <AgendarCallDialog
        open={agendarCallOpen}
        onOpenChange={setAgendarCallOpen}
        lead={lead}
      />

      <RegistrarVendaDialog
        open={registrarVendaOpen}
        onOpenChange={setRegistrarVendaOpen}
        lead={lead}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o lead "{lead.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
