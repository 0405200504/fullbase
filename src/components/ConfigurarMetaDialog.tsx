import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, addMonths, addDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCreateMeta, useMetas } from "@/hooks/useMetas";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ConfigurarMetaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConfigurarMetaDialog = ({ open, onOpenChange }: ConfigurarMetaDialogProps) => {
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);
  const [periodo, setPeriodo] = useState<string>("este_mes");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [formData, setFormData] = useState({
    nome: "",
    valor_mensal: ""
  });

  const createMeta = useCreateMeta();
  const { data: metaAtual } = useMetas();
  const { toast } = useToast();

  useEffect(() => {
    if (open && metaAtual && metaAtual.length > 0) {
      const meta = metaAtual[0];
      setFormData({
        nome: meta.nome,
        valor_mensal: meta.valor_mensal.toString(),
      });
      setDiasSemana(meta.dias_trabalho);
      if (meta.start_date && meta.end_date) {
        setStartDate(new Date(meta.start_date));
        setEndDate(new Date(meta.end_date));
      }
    } else {
      const hoje = new Date();
      const nomeMes = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      setFormData({
        nome: nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1),
        valor_mensal: "",
      });
      setDiasSemana([1, 2, 3, 4, 5]);
      setPeriodo("este_mes");
      handlePeriodoChange("este_mes");
    }
  }, [open, metaAtual]);

  const handlePeriodoChange = (value: string) => {
    setPeriodo(value);
    const hoje = new Date();

    switch (value) {
      case "este_mes":
        setStartDate(startOfMonth(hoje));
        setEndDate(endOfMonth(hoje));
        break;
      case "proximo_mes":
        const proximoMes = addMonths(hoje, 1);
        setStartDate(startOfMonth(proximoMes));
        setEndDate(endOfMonth(proximoMes));
        break;
      case "30_dias":
        setStartDate(hoje);
        setEndDate(addDays(hoje, 30));
        break;
      case "60_dias":
        setStartDate(hoje);
        setEndDate(addDays(hoje, 60));
        break;
      case "personalizado":
        // Usuário vai escolher as datas manualmente
        break;
    }
  };

  const toggleDiaSemana = (dia: number) => {
    setDiasSemana((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast({
        title: "Erro",
        description: "Selecione o período da meta.",
        variant: "destructive"
      });
      return;
    }

    try {
      await createMeta.mutateAsync({
        nome: formData.nome,
        valor_mensal: parseFloat(formData.valor_mensal),
        mes: startDate.getMonth() + 1,
        ano: startDate.getFullYear(),
        dias_trabalho: diasSemana,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
      });

      toast({
        title: "Meta configurada com sucesso!",
        description: "Sua meta foi salva e já está ativa.",
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro detalhado ao criar meta:", error);

      let errorMessage = "Ocorreu um erro inesperado ao salvar sua meta.";

      if (error.message?.includes("new row violates row level security policy")) {
        errorMessage = "Erro de permissão: Você não tem autorização para criar metas para esta conta. Verifique seu nível de acesso ou modo de impersonação.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Erro ao configurar meta",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Meta</DialogTitle>
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

          <div>
            <Label htmlFor="periodo">Período da Meta</Label>
            <Select value={periodo} onValueChange={handlePeriodoChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="este_mes">Este Mês</SelectItem>
                <SelectItem value="proximo_mes">Próximo Mês</SelectItem>
                <SelectItem value="30_dias">Próximos 30 dias</SelectItem>
                <SelectItem value="60_dias">Próximos 60 dias</SelectItem>
                <SelectItem value="personalizado">Período Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodo === "personalizado" && (
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
          )}

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
                    id={`dia-${dia}`}
                    checked={diasSemana.includes(dia)}
                    onCheckedChange={() => toggleDiaSemana(dia)}
                  />
                  <Label htmlFor={`dia-${dia}`} className="text-xs cursor-pointer">
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
            <Button type="submit" disabled={createMeta.isPending}>
              {createMeta.isPending ? "Salvando..." : "Salvar Meta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
