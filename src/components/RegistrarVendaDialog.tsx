import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Lead } from "@/hooks/useLeads";
import { useProdutos } from "@/hooks/useProdutos";
import { useProfiles } from "@/hooks/useProfiles";
import { useImpersonate } from "@/contexts/ImpersonateContext";

interface RegistrarVendaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
}

export const RegistrarVendaDialog = ({ open, onOpenChange, lead }: RegistrarVendaDialogProps) => {
  const [formData, setFormData] = useState({
    valor_final: "",
    closer_id: "",
    metodo_pagamento: "pix" as "pix" | "cartao" | "boleto" | "transferencia",
    data_fechamento: new Date().toISOString().split('T')[0],
    observacao: "",
  });

  const { effectiveAccountId } = useImpersonate();
  const queryClient = useQueryClient();
  const { data: produtos = [] } = useProdutos();
  const { data: closers = [] } = useProfiles("closer");

  useEffect(() => {
    if (lead && open) {
      setFormData({
        valor_final: lead.valor_proposta?.toString() || "",
        closer_id: lead.closer_id || "",
        metodo_pagamento: "pix",
        data_fechamento: new Date().toISOString().split('T')[0],
        observacao: "",
      });
    }
  }, [lead, open]);

  const registrarVenda = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!lead) throw new Error("Lead não selecionado");

      if (!effectiveAccountId) throw new Error("Unable to determine user account");

      // Registrar venda
      const { error: vendaError } = await supabase.from("vendas").insert([{
        lead_id: lead.id,
        produto_id: lead.produto_id,
        closer_id: data.closer_id,
        valor_final: parseFloat(data.valor_final),
        metodo_pagamento: data.metodo_pagamento,
        data_fechamento: data.data_fechamento,
        observacao: data.observacao || null,
        account_id: effectiveAccountId,
      }]);

      if (vendaError) throw vendaError;

      // Arquivar o lead
      const { error: leadError } = await supabase
        .from("leads")
        .update({ arquivado: true, data_arquivamento: new Date().toISOString() })
        .eq("id", lead.id);

      if (leadError) throw leadError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Venda registrada com sucesso!");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Erro ao registrar venda: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registrarVenda.mutate(formData);
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Venda</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Lead</Label>
            <Input value={lead.nome} disabled />
          </div>

          <div>
            <Label>Produto</Label>
            <Input value={lead.produtos?.nome || "Sem produto"} disabled />
          </div>

          <div>
            <Label htmlFor="closer_id">Closer *</Label>
            <Select
              value={formData.closer_id}
              onValueChange={(value) => setFormData({ ...formData, closer_id: value })}
              required
            >
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

          <div>
            <Label htmlFor="valor_final">Valor Final (R$) *</Label>
            <Input
              id="valor_final"
              type="number"
              step="0.01"
              value={formData.valor_final}
              onChange={(e) => setFormData({ ...formData, valor_final: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="metodo_pagamento">Método de Pagamento *</Label>
            <Select
              value={formData.metodo_pagamento}
              onValueChange={(value: any) => setFormData({ ...formData, metodo_pagamento: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="data_fechamento">Data de Fechamento *</Label>
            <Input
              id="data_fechamento"
              type="date"
              value={formData.data_fechamento}
              onChange={(e) => setFormData({ ...formData, data_fechamento: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="observacao">Observações</Label>
            <Textarea
              id="observacao"
              value={formData.observacao}
              onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              placeholder="Adicione observações sobre a venda..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-success">
              Confirmar Venda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
