import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface RegistrarReembolsoDialogProps {
  venda: {
    id: string;
    lead_id: string;
    valor_final: number;
    leads: { nome: string } | null;
    produtos: { nome: string } | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RegistrarReembolsoDialog = ({ venda, open, onOpenChange }: RegistrarReembolsoDialogProps) => {
  const [motivo, setMotivo] = useState("");
  const queryClient = useQueryClient();

  const registrarReembolso = useMutation({
    mutationFn: async () => {
      const agoraIso = new Date().toISOString();

      const { error } = await supabase
        .from("vendas")
        .update({
          reembolsada: true,
          data_reembolso: agoraIso,
          motivo_reembolso: motivo.trim(),
        })
        .eq("id", venda.id);

      if (error) throw error;

      // Ao reembolsar, arquivar automaticamente o lead (lixeira)
      const { error: leadError } = await supabase
        .from("leads")
        .update({
          arquivado: true,
          data_arquivamento: agoraIso,
        })
        .eq("id", venda.lead_id);

      if (leadError) throw leadError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["vendas-closer"] });
      toast.success("Reembolso registrado com sucesso!");
      onOpenChange(false);
      setMotivo("");
    },
    onError: (error: any) => {
      toast.error("Erro ao registrar reembolso: " + error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Registrar Reembolso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium">{venda.leads?.nome}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Produto:</span>
              <span className="font-medium">{venda.produtos?.nome}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-medium text-destructive">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(venda.valor_final)}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="motivo">Motivo do Reembolso *</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo do reembolso..."
              className="min-h-[100px] mt-2"
              required
            />
          </div>

          <div className="text-sm text-muted-foreground bg-warning/10 p-3 rounded-lg border border-warning/20">
            <p className="font-medium text-warning">⚠️ Atenção:</p>
            <p className="mt-1">
              Esta ação irá marcar a venda como reembolsada e atualizará automaticamente todas as métricas e relatórios do sistema.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => registrarReembolso.mutate()}
            disabled={registrarReembolso.isPending || !motivo.trim()}
          >
            {registrarReembolso.isPending ? "Processando..." : "Confirmar Reembolso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrarReembolsoDialog;
