import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useProfiles } from "@/hooks/useProfiles";
import { useCreateCall } from "@/hooks/useCalls";
import { useLeads, useUpdateLead } from "@/hooks/useLeads";
import { useEtapasFunil } from "@/hooks/useEtapasFunil";
import type { Lead } from "@/hooks/useLeads";

interface AgendarCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
}

export const AgendarCallDialog = ({ open, onOpenChange, lead }: AgendarCallDialogProps) => {
  const [date, setDate] = useState<Date>();
  const [hora, setHora] = useState("14:00");
  const [horaInicio, setHoraInicio] = useState(8);
  const [horaFim, setHoraFim] = useState(20);
  const [closerId, setCloserId] = useState<string>("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [notas, setNotas] = useState("");

  const { data: closers = [] } = useProfiles("closer");
  const { data: allLeads = [] } = useLeads();
  const { data: etapas = [] } = useEtapasFunil();
  const createCall = useCreateCall();
  const updateLead = useUpdateLead();

  // Se um lead foi passado, usar ele automaticamente
  useEffect(() => {
    if (lead) {
      setSelectedLeadId(lead.id);
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const leadId = lead?.id || selectedLeadId;
    if (!leadId || !date || !closerId) {
      return;
    }

    const dataHora = new Date(date);
    const [hours, minutes] = hora.split(":");
    dataHora.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Encontrar etapa "Call Agendada"
    const etapaCallAgendada = etapas.find((e) => 
      e.nome.toLowerCase().includes("call") && e.nome.toLowerCase().includes("agendada")
    );

    try {
      // Criar a call
      await createCall.mutateAsync({
        lead_id: leadId,
        closer_id: closerId,
        data_hora_agendada: dataHora.toISOString(),
        notas: notas || undefined,
      });

      // Mover lead para etapa "Call Agendada" se encontrada
      if (etapaCallAgendada) {
        await updateLead.mutateAsync({
          id: leadId,
          etapa_id: etapaCallAgendada.id,
        });
      }

      onOpenChange(false);
      setDate(undefined);
      setHora("14:00");
      setCloserId("");
      setSelectedLeadId("");
      setNotas("");
    } catch (error) {
      console.error("Erro ao agendar call:", error);
    }
  };

  const horariosDisponiveis = Array.from(
    { length: horaFim - horaInicio + 1 },
    (_, i) => i + horaInicio
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Agendar Call</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {lead ? (
            <div>
              <Label>Lead</Label>
              <div className="mt-1 p-2 bg-muted rounded-md">
                <p className="font-medium">{lead.nome}</p>
                <p className="text-sm text-muted-foreground">{lead.produtos?.nome}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Selecione o Lead *</Label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um lead" />
                </SelectTrigger>
                <SelectContent>
                  {allLeads
                    .filter((l) => !l.arquivado)
                    .map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome} {l.produtos?.nome ? `- ${l.produtos.nome}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Data da Call</Label>
            <Popover modal={false}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => startOfDay(d) < startOfDay(new Date())}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Horário Inicial</Label>
              <Select value={horaInicio.toString()} onValueChange={(v) => setHoraInicio(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <SelectItem key={h} value={h.toString()}>
                      {h.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Horário Final</Label>
              <Select value={horaFim.toString()} onValueChange={(v) => setHoraFim(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <SelectItem key={h} value={h.toString()}>
                      {h.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hora">Horário da Call</Label>
            <Select value={hora} onValueChange={setHora}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {horariosDisponiveis.map((hour) => (
                  <SelectItem key={hour} value={`${hour.toString().padStart(2, "0")}:00`}>
                    {hour.toString().padStart(2, "0")}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Closer Responsável</Label>
            <Select value={closerId} onValueChange={setCloserId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o closer" />
              </SelectTrigger>
              <SelectContent>
                {closers.map((closer) => (
                  <SelectItem key={closer.id} value={closer.id}>
                    {closer.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea
              id="notas"
              placeholder="Observações sobre a call..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!date || !closerId || (!lead && !selectedLeadId)}>
              Agendar Call
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
