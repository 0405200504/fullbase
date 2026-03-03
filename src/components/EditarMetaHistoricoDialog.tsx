import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUpdateMeta } from "@/hooks/useMetas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

interface MetaHistorico {
  id: string;
  nome: string;
  valor_mensal: number;
  mes: number;
  ano: number;
  start_date: string;
  end_date: string;
  dias_trabalho?: number[];
}

interface EditarMetaHistoricoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: MetaHistorico | null;
}

export const EditarMetaHistoricoDialog = ({ open, onOpenChange, meta }: EditarMetaHistoricoDialogProps) => {
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [formData, setFormData] = useState({
    nome: "",
    valor_mensal: ""
  });

  const updateMeta = useUpdateMeta();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && meta) {
      setFormData({
        nome: meta.nome,
        valor_mensal: meta.valor_mensal.toString(),
      });
      setDiasSemana(meta.dias_trabalho || [1, 2, 3, 4, 5]);
      setStartDate(new Date(meta.start_date));
      setEndDate(new Date(meta.end_date));
    }
  }, [open, meta]);

  const toggleDiaSemana = (dia: number) => {
    setDiasSemana((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!meta || !startDate || !endDate) {
      toast.error("Dados incompletos");
      return;
    }
    
    try {
      await updateMeta.mutateAsync({
        id: meta.id,
        nome: formData.nome,
        valor_mensal: parseFloat(formData.valor_mensal),
        mes: startDate.getMonth() + 1,
        ano: startDate.getFullYear(),
        dias_trabalho: diasSemana,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
      });

      queryClient.invalidateQueries({ queryKey: ["metas-historico"] });
      toast.success("Meta atualizada com sucesso!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao atualizar meta:", error);
      toast.error("Erro ao atualizar meta");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Meta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome da Meta</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Data de Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="valor">Valor da Meta (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              value={formData.valor_mensal}
              onChange={(e) => setFormData({ ...formData, valor_mensal: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Dias de Trabalho</Label>
            <div className="flex gap-2">
              {[
                { dia: 0, label: "D" },
                { dia: 1, label: "S" },
                { dia: 2, label: "T" },
                { dia: 3, label: "Q" },
                { dia: 4, label: "Q" },
                { dia: 5, label: "S" },
                { dia: 6, label: "S" },
              ].map(({ dia, label }) => (
                <div key={dia} className="flex items-center gap-1">
                  <Checkbox
                    id={`dia-edit-${dia}`}
                    checked={diasSemana.includes(dia)}
                    onCheckedChange={() => toggleDiaSemana(dia)}
                  />
                  <Label htmlFor={`dia-edit-${dia}`} className="text-xs cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMeta.isPending}>
              {updateMeta.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
