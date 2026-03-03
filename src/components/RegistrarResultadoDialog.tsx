import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useUpdateCall, type Call } from "@/hooks/useCalls";
import { useUpdateLead } from "@/hooks/useLeads";
import { useCreateCall } from "@/hooks/useCalls";
import { useEtapasFunil } from "@/hooks/useEtapasFunil";

interface RegistrarResultadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call?: Call | null;
  onVendaRealizada?: () => void;
}

export const RegistrarResultadoDialog = ({
  open,
  onOpenChange,
  call,
  onVendaRealizada,
}: RegistrarResultadoDialogProps) => {
  const [status, setStatus] = useState<string>("");
  const [resultado, setResultado] = useState<string>("");
  const [proximaAcao, setProximaAcao] = useState<string>("");
  const [diasFollowUp, setDiasFollowUp] = useState<string>("3");
  const [dataNovaCall, setDataNovaCall] = useState<Date>();
  const [horaNovaCall, setHoraNovaCall] = useState("14:00");
  const [notas, setNotas] = useState("");

  const updateCall = useUpdateCall();
  const updateLead = useUpdateLead();
  const createCall = useCreateCall();
  const { data: etapas = [] } = useEtapasFunil();

  useEffect(() => {
    if (call) {
      setNotas(call.notas || "");
    }
  }, [call]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!call) return;

    // Atualizar a call atual
    await updateCall.mutateAsync({
      id: call.id,
      status: status as any,
      resultado: resultado as any || undefined,
      proxima_acao: proximaAcao as any || undefined,
      dias_follow_up: proximaAcao === "follow_up_dias" ? parseInt(diasFollowUp) : undefined,
      notas,
    });

    // Se for venda realizada, mover lead para "Fechamento"
    if (resultado === "venda_realizada") {
      const etapaFechamento = etapas.find((e) => e.nome.toLowerCase().includes("fechamento"));
      if (etapaFechamento) {
        await updateLead.mutateAsync({
          id: call.lead_id,
          etapa_id: etapaFechamento.id,
        });
      }
      
      // Abrir modal de venda
      if (onVendaRealizada) {
        onVendaRealizada();
      }
    }

    // Se for mover para lixeira, arquivar o lead
    if (proximaAcao === "mover_lixeira") {
      await updateLead.mutateAsync({
        id: call.lead_id,
        arquivado: true,
      });
    }

    // Se for agendar nova call, criar nova call
    if (proximaAcao === "agendar_nova_call" && dataNovaCall) {
      const dataHora = new Date(dataNovaCall);
      const [hours, minutes] = horaNovaCall.split(":");
      dataHora.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await createCall.mutateAsync({
        lead_id: call.lead_id,
        closer_id: call.closer_id,
        data_hora_agendada: dataHora.toISOString(),
      });
    }

    // Resetar form
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setStatus("");
    setResultado("");
    setProximaAcao("");
    setDiasFollowUp("3");
    setDataNovaCall(undefined);
    setHoraNovaCall("14:00");
    setNotas("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Registrar Resultado da Call</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Lead</Label>
            <div className="mt-1 p-2 bg-muted rounded-md">
              <p className="font-medium">{call?.leads?.nome}</p>
              {call?.data_hora_agendada && (
                <p className="text-sm text-muted-foreground">
                  {format(new Date(call.data_hora_agendada), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status da Call *</Label>
            <Select value={status} onValueChange={setStatus} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="concluida">Compareceu</SelectItem>
                <SelectItem value="no_show">No-Show</SelectItem>
                <SelectItem value="cancelada">Cancelada pelo Lead</SelectItem>
                <SelectItem value="remarcada">Remarcada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === "concluida" && (
            <div className="space-y-2">
              <Label>Resultado *</Label>
              <Select value={resultado} onValueChange={setResultado} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venda_realizada">Venda Realizada</SelectItem>
                  <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                  <SelectItem value="follow_up">Necessita Follow-up</SelectItem>
                  <SelectItem value="nao_qualificado">Não Qualificado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {resultado && (
            <div className="space-y-2">
              <Label>Próxima Ação *</Label>
              <Select value={proximaAcao} onValueChange={setProximaAcao} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a próxima ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendar_nova_call">Agendar Nova Call</SelectItem>
                  <SelectItem value="enviar_proposta">Enviar Proposta</SelectItem>
                  <SelectItem value="follow_up_dias">Follow-up em X dias</SelectItem>
                  <SelectItem value="mover_lixeira">Mover para Lixeira</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {proximaAcao === "agendar_nova_call" && (
            <>
              <div className="space-y-2">
                <Label>Data da Nova Call *</Label>
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataNovaCall && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataNovaCall ? format(dataNovaCall, "dd/MM/yyyy") : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataNovaCall}
                      onSelect={setDataNovaCall}
                      disabled={(date) => startOfDay(date) < startOfDay(new Date())}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Horário</Label>
                <Select value={horaNovaCall} onValueChange={setHoraNovaCall}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 16 }, (_, i) => i + 8).map((hour) => (
                  <SelectItem key={hour} value={`${hour.toString().padStart(2, "0")}:00`}>
                    {hour.toString().padStart(2, "0")}:00
                  </SelectItem>
                ))}
              </SelectContent>
                </Select>
              </div>
            </>
          )}

          {proximaAcao === "follow_up_dias" && (
            <div className="space-y-2">
              <Label htmlFor="dias">Quantidade de Dias</Label>
              <Input
                id="dias"
                type="number"
                min="1"
                max="30"
                value={diasFollowUp}
                onChange={(e) => setDiasFollowUp(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notas">Notas da Call</Label>
            <Textarea
              id="notas"
              placeholder="Descreva o que foi discutido, objeções, pontos de dor..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!status || (status === "concluida" && !resultado)}>
              Salvar Resultado
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
