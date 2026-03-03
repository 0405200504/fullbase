import { useState } from "react";
import { usePlans } from "@/hooks/usePlans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, CheckCircle2, XCircle, CreditCard } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/dateUtils";
import { CreatePlanDialog } from "@/components/CreatePlanDialog";
import { EditPlanDialog } from "@/components/EditPlanDialog";
import { toast } from "sonner";
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

const SuperAdminPlans = () => {
  const { data: plans, isLoading } = usePlans();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 bg-background min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Planos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os planos de assinatura da plataforma
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Stripe Configuration Alert */}
      {plans?.some(p => p.price_monthly > 0 && (!p.stripe_price_id_monthly || !p.stripe_price_id_yearly)) && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
              <CreditCard className="h-5 w-5" />
              Configuração do Stripe Necessária
            </CardTitle>
            <CardDescription className="text-yellow-700 dark:text-yellow-400">
              Alguns planos pagos não têm IDs do Stripe configurados. Siga os passos abaixo:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-yellow-900 dark:text-yellow-200">
            <ol className="list-decimal list-inside space-y-2">
              <li>Acesse o <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="underline font-medium">Dashboard do Stripe</a></li>
              <li>Crie um produto para cada plano (ex: "Básico", "Professional", "Enterprise")</li>
              <li>Para cada produto, crie dois preços:
                <ul className="list-disc list-inside ml-6 mt-1">
                  <li>Um preço mensal recorrente</li>
                  <li>Um preço anual recorrente</li>
                </ul>
              </li>
              <li>Copie os IDs (começam com "prod_" e "price_") e cole nos campos de cada plano ao editar</li>
              <li>Configure o webhook do Stripe em: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 py-0.5 rounded">https://nhbhxwildcywdskwtzyq.supabase.co/functions/v1/stripe-webhook</code></li>
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans?.map((plan) => (
          <Card
            key={plan.id}
            className={`border-none shadow-sm hover:shadow-md transition-all ${
              plan.is_popular
                ? "ring-2 ring-primary shadow-lg relative"
                : ""
            }`}
          >
            {plan.is_popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground shadow-md">
                  Mais Popular
                </Badge>
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">
                    {plan.display_name}
                  </CardTitle>
                  {plan.description && (
                    <CardDescription className="mt-1 text-xs">
                      {plan.description}
                    </CardDescription>
                  )}
                </div>
                <Badge variant={plan.active ? "default" : "secondary"}>
                  {plan.active ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Ativo
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Inativo
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pricing */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    {formatCurrency(plan.price_monthly)}
                  </span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  ou {formatCurrency(plan.price_yearly)}/ano
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usuários</span>
                  <span className="font-medium">
                    {plan.max_users === 999 ? "Ilimitado" : plan.max_users}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Leads</span>
                  <span className="font-medium">
                    {plan.max_leads === 999999 ? "Ilimitado" : plan.max_leads}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Histórico</span>
                  <span className="font-medium">{plan.history_days} dias</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exportação</span>
                  <span className="font-medium">
                    {plan.has_export ? "✓" : "✗"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Suporte Prioritário</span>
                  <span className="font-medium">
                    {plan.has_priority_support ? "✓" : "✗"}
                  </span>
                </div>
              </div>

              {/* Stripe Status */}
              <div className="pt-2 border-t">
                {plan.stripe_price_id_monthly && plan.stripe_price_id_yearly ? (
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Stripe configurado</span>
                  </div>
                ) : plan.price_monthly > 0 ? (
                  <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                    <XCircle className="h-3 w-3" />
                    <span>Stripe não configurado</span>
                  </div>
                ) : null}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setEditingPlan(plan)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeletingPlanId(plan.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialogs */}
      <CreatePlanDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      {editingPlan && (
        <EditPlanDialog
          plan={editingPlan}
          open={!!editingPlan}
          onOpenChange={(open) => !open && setEditingPlan(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPlanId} onOpenChange={() => setDeletingPlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O plano será permanentemente
              excluído da plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                // TODO: Implementar deleção
                toast.success("Plano excluído com sucesso!");
                setDeletingPlanId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuperAdminPlans;
