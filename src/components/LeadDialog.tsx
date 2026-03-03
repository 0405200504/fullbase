import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateLead, useUpdateLead, Lead } from "@/hooks/useLeads";
import { useProdutos } from "@/hooks/useProdutos";
import { useEtapasFunil } from "@/hooks/useEtapasFunil";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePlanDialog } from "@/components/UpgradePlanDialog";
import { z } from "zod";
import { toast } from "sonner";

const leadSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  telefone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
}

export const LeadDialog = ({ open, onOpenChange, lead }: LeadDialogProps) => {
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    produto_id: "",
    valor_proposta: "",
    fonte_trafego: "",
    sdr_id: "",
    closer_id: "",
  });
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const { data: produtos } = useProdutos();
  const { data: etapas } = useEtapasFunil();
  const { data: sdrs } = useTeamMembers("sdr");
  const { data: closers } = useTeamMembers("closer");
  const { subscription } = useSubscription();

  useEffect(() => {
    if (lead) {
      setFormData({
        nome: lead.nome || "",
        telefone: lead.telefone || "",
        email: lead.email || "",
        produto_id: lead.produto_id || "",
        valor_proposta: lead.valor_proposta?.toString() || "",
        fonte_trafego: lead.fonte_trafego || "",
        sdr_id: lead.sdr_id || "",
        closer_id: lead.closer_id || "",
      });
    } else {
      setFormData({
        nome: "",
        telefone: "",
        email: "",
        produto_id: "",
        valor_proposta: "",
        fonte_trafego: "",
        sdr_id: "",
        closer_id: "",
      });
    }
  }, [lead, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validation = leadSchema.safeParse(formData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      const leadData = {
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email || null,
        valor_proposta: formData.valor_proposta ? parseFloat(formData.valor_proposta) : null,
        produto_id: formData.produto_id || null,
        fonte_trafego: formData.fonte_trafego || null,
        sdr_id: formData.sdr_id || null,
        closer_id: formData.closer_id || null,
        etapa_id: lead?.etapa_id || etapas?.[0]?.id || null,
      };

      console.log("Criando lead com dados:", leadData);

      if (lead) {
        await updateLead.mutateAsync({ id: lead.id, ...leadData });
        onOpenChange(false);
      } else {
        try {
          await createLead.mutateAsync(leadData);
          onOpenChange(false);
        } catch (error: any) {
          if (error.code === "LIMIT_REACHED" || error.message?.includes("Limite de leads atingido")) {
            setShowUpgradeDialog(true);
          } else {
            throw error;
          }
        }
      }
    } catch (error: any) {
      if (error.code !== "LIMIT_REACHED" && !error.message?.includes("Limite de leads atingido")) {
        console.error("Erro ao salvar lead:", error);
        toast.error("Erro ao salvar lead. Verifique os dados e tente novamente.");
      }
    }
  };

  const planName = subscription?.plans?.display_name || "Free";
  const maxLeads = subscription?.plans?.max_leads || 25;

  return (
    <>
      <UpgradePlanDialog 
        open={showUpgradeDialog} 
        onOpenChange={setShowUpgradeDialog}
        currentPlan={planName}
        maxLeads={maxLeads}
      />
      
      <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
        <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{lead ? "Editar Lead" : "Adicionar Novo Lead"}</DialogTitle>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="fonte_trafego">Fonte de Tráfego</Label>
            <Input
              id="fonte_trafego"
              placeholder="Ex: Instagram, Google Ads, Orgânico"
              value={formData.fonte_trafego}
              onChange={(e) => setFormData({ ...formData, fonte_trafego: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="produto_id">Produto</Label>
              <Select value={formData.produto_id} onValueChange={(value) => setFormData({ ...formData, produto_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {produtos?.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="valor_proposta">Valor (R$)</Label>
              <Input
                id="valor_proposta"
                type="number"
                step="0.01"
                value={formData.valor_proposta}
                onChange={(e) => setFormData({ ...formData, valor_proposta: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sdr_id">SDR Responsável</Label>
              <Select value={formData.sdr_id} onValueChange={(value) => setFormData({ ...formData, sdr_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {sdrs?.map((sdr) => (
                    <SelectItem key={sdr.id} value={sdr.id}>
                      {sdr.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="closer_id">Closer Responsável</Label>
              <Select value={formData.closer_id} onValueChange={(value) => setFormData({ ...formData, closer_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {closers?.map((closer) => (
                    <SelectItem key={closer.id} value={closer.id}>
                      {closer.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-premium">
              {lead ? "Salvar" : "Criar Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
};
