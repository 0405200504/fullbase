import { useState, useEffect } from "react";
import { useUpdatePlan } from "@/hooks/usePlans";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface EditPlanDialogProps {
  plan: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditPlanDialog = ({ plan, open, onOpenChange }: EditPlanDialogProps) => {
  const updatePlan = useUpdatePlan();
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    display_name: "",
    description: "",
    price_monthly: 0,
    price_yearly: 0,
    max_users: 1,
    max_leads: 25,
    history_days: 15,
    has_export: false,
    has_priority_support: false,
    active: true,
    is_popular: false,
    stripe_product_id: "",
    stripe_price_id_monthly: "",
    stripe_price_id_yearly: "",
  });

  useEffect(() => {
    if (plan) {
      setFormData({
        id: plan.id,
        name: plan.name,
        display_name: plan.display_name,
        description: plan.description || "",
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        max_users: plan.max_users,
        max_leads: plan.max_leads,
        history_days: plan.history_days,
        has_export: plan.has_export,
        has_priority_support: plan.has_priority_support,
        active: plan.active,
        is_popular: plan.is_popular,
        stripe_product_id: plan.stripe_product_id || "",
        stripe_price_id_monthly: plan.stripe_price_id_monthly || "",
        stripe_price_id_yearly: plan.stripe_price_id_yearly || "",
      });
    }
  }, [plan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlan.mutate(formData, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Plano</DialogTitle>
          <DialogDescription>
            Atualize os dados do plano de assinatura
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Interno*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">Nome de Exibição*</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_monthly">Preço Mensal (R$)*</Label>
              <Input
                id="price_monthly"
                type="number"
                step="0.01"
                value={formData.price_monthly}
                onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_yearly">Preço Anual (R$)*</Label>
              <Input
                id="price_yearly"
                type="number"
                step="0.01"
                value={formData.price_yearly}
                onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_users">Máx. Usuários*</Label>
              <Input
                id="max_users"
                type="number"
                value={formData.max_users}
                onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_leads">Máx. Leads*</Label>
              <Input
                id="max_leads"
                type="number"
                value={formData.max_leads}
                onChange={(e) => setFormData({ ...formData, max_leads: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="history_days">Dias de Histórico*</Label>
              <Input
                id="history_days"
                type="number"
                value={formData.history_days}
                onChange={(e) => setFormData({ ...formData, history_days: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label htmlFor="has_export">Permitir Exportação</Label>
              <Switch
                id="has_export"
                checked={formData.has_export}
                onCheckedChange={(checked) => setFormData({ ...formData, has_export: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="has_priority_support">Suporte Prioritário</Label>
              <Switch
                id="has_priority_support"
                checked={formData.has_priority_support}
                onCheckedChange={(checked) => setFormData({ ...formData, has_priority_support: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Plano Ativo</Label>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_popular">Marcar como Popular</Label>
              <Switch
                id="is_popular"
                checked={formData.is_popular}
                onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-medium">Integração Stripe (Opcional)</h4>
            <div className="space-y-2">
              <Label htmlFor="stripe_product_id">Stripe Product ID</Label>
              <Input
                id="stripe_product_id"
                value={formData.stripe_product_id}
                onChange={(e) => setFormData({ ...formData, stripe_product_id: e.target.value })}
                placeholder="prod_xxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe_price_id_monthly">Stripe Price ID (Mensal)</Label>
              <Input
                id="stripe_price_id_monthly"
                value={formData.stripe_price_id_monthly}
                onChange={(e) => setFormData({ ...formData, stripe_price_id_monthly: e.target.value })}
                placeholder="price_xxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripe_price_id_yearly">Stripe Price ID (Anual)</Label>
              <Input
                id="stripe_price_id_yearly"
                value={formData.stripe_price_id_yearly}
                onChange={(e) => setFormData({ ...formData, stripe_price_id_yearly: e.target.value })}
                placeholder="price_xxx"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updatePlan.isPending}>
              {updatePlan.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
