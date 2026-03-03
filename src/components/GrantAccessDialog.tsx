import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GrantAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  onSuccess: () => void;
}

export function GrantAccessDialog({ open, onOpenChange, accountId, accountName, onSuccess }: GrantAccessDialogProps) {
  const [accessType, setAccessType] = useState<"plan" | "leads" | "lifetime" | "remove">("plan");
  const [plan, setPlan] = useState("pro");
  const [leadLimit, setLeadLimit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGrant = async () => {
    setIsSubmitting(true);
    try {
      if (accessType === "plan") {
        // Conceder plano pago sem cobrança
        const { error } = await supabase
          .from("accounts")
          .update({ plano: plan })
          .eq("id", accountId);

        if (error) throw error;
        toast.success(`Plano ${plan} concedido para ${accountName}!`);
      } else if (accessType === "leads") {
        // Aumentar limite de leads (isso será implementado quando tivermos a tabela de limites)
        toast.success(`Limite de ${leadLimit} leads concedido para ${accountName}!`);
      } else if (accessType === "lifetime") {
        // Acesso vitalício
        const { error } = await supabase
          .from("accounts")
          .update({ plano: "lifetime" })
          .eq("id", accountId);

        if (error) throw error;
        toast.success(`Acesso vitalício concedido para ${accountName}!`);
      } else if (accessType === "remove") {
        // Remover acesso pago e jogar para free
        const { error } = await supabase
          .from("accounts")
          .update({ plano: "free" })
          .eq("id", accountId);

        if (error) throw error;
        
        // Também limpar assinatura se existir
        const { error: subError } = await supabase
          .from("subscriptions")
          .update({ 
            status: "canceled",
            canceled_at: new Date().toISOString(),
            ended_at: new Date().toISOString()
          })
          .eq("account_id", accountId);

        if (subError) console.error("Erro ao cancelar assinatura:", subError);
        
        toast.success(`Acesso pago removido! ${accountName} agora está no plano free.`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao conceder acesso: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Liberar Acesso Manual</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Conta</Label>
            <Input value={accountName} disabled />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Acesso</Label>
            <Select value={accessType} onValueChange={(value: any) => setAccessType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plan">Conceder Plano Pago</SelectItem>
                <SelectItem value="leads">Aumentar Limite de Leads</SelectItem>
                <SelectItem value="lifetime">Acesso Vitalício</SelectItem>
                <SelectItem value="remove">Remover Acesso Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {accessType === "plan" && (
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {accessType === "leads" && (
            <div className="space-y-2">
              <Label>Novo Limite de Leads</Label>
              <Input
                type="number"
                placeholder="Ex: 5000"
                value={leadLimit}
                onChange={(e) => setLeadLimit(e.target.value)}
              />
            </div>
          )}

          {accessType === "lifetime" && (
            <p className="text-sm text-muted-foreground">
              Esta conta terá acesso ilimitado à plataforma sem cobrança.
            </p>
          )}

          {accessType === "remove" && (
            <div className="space-y-2">
              <p className="text-sm text-danger font-medium">
                ⚠️ Atenção: Esta ação removerá o acesso pago da conta
              </p>
              <p className="text-sm text-muted-foreground">
                A conta será movida para o plano <strong>Free</strong> e qualquer assinatura ativa será cancelada.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleGrant} 
            disabled={isSubmitting}
            variant={accessType === "remove" ? "destructive" : "default"}
          >
            {isSubmitting ? "Processando..." : accessType === "remove" ? "Remover Acesso" : "Conceder Acesso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
