import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { CreditCard, Calendar, Users, Database, TrendingUp, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Subscription = () => {
  const navigate = useNavigate();
  const { subscription, plans, isLoading, cancelSubscription } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentPlan = subscription?.plans || plans?.find(p => p.name === "free");
  const isFreePlan = currentPlan?.name === "free";
  const isCanceled = subscription?.status === "canceled";

  const getStatusBadge = () => {
    if (!subscription) {
      return <Badge variant="secondary">Plano Gratuito</Badge>;
    }

    switch (subscription.status) {
      case "active":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Ativo</Badge>;
      case "canceled":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      case "past_due":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Pagamento Pendente</Badge>;
      default:
        return <Badge variant="secondary">{subscription.status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-4xl font-bold mb-2">Assinatura</h1>
        <p className="text-muted-foreground">Gerencie seu plano e assinatura</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Plano Atual</CardTitle>
                <CardDescription>
                  {currentPlan?.display_name} - {isFreePlan ? "Gratuito" : `R$ ${subscription?.billing_cycle === "yearly" ? currentPlan?.price_yearly : currentPlan?.price_monthly}/${subscription?.billing_cycle === "yearly" ? "ano" : "mês"}`}
                </CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Usuários</p>
                <p className="text-2xl font-bold">{currentPlan?.max_users === 999 ? "Ilimitado" : currentPlan?.max_users}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
              <Database className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Leads</p>
                <p className="text-2xl font-bold">{currentPlan?.max_leads === 999999 ? "Ilimitado" : currentPlan?.max_leads}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Histórico</p>
                <p className="text-2xl font-bold">{currentPlan?.history_days} dias</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Suporte</p>
                <p className="text-lg font-bold">{currentPlan?.has_priority_support ? "Prioritário" : "Padrão"}</p>
              </div>
            </div>
          </div>

          {/* Subscription Info */}
          {subscription && !isFreePlan && (
            <div className="space-y-3 p-4 rounded-lg border bg-muted/50">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ciclo de Pagamento</span>
                <span className="font-medium">{subscription.billing_cycle === "yearly" ? "Anual" : "Mensal"}</span>
              </div>
              
              {subscription.current_period_end && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {isCanceled ? "Expira em" : "Próxima Renovação"}
                  </span>
                  <span className="font-medium">
                    {format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}

              {subscription.stripe_customer_id && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">ID do Cliente</span>
                  <span className="font-mono text-sm">{subscription.stripe_customer_id}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isFreePlan ? (
              <Button onClick={() => navigate("/pricing")} className="w-full md:w-auto">
                Fazer Upgrade
              </Button>
            ) : (
              <>
                <Button onClick={() => navigate("/pricing")} variant="outline" className="w-full md:w-auto">
                  {subscription?.status === "active" ? "Mudar Plano" : "Ver Planos"}
                </Button>
                
                {subscription?.status === "active" && subscription?.stripe_customer_id && (
                  <>
                    <Button 
                      onClick={async () => {
                        try {
                          const { data, error } = await supabase.functions.invoke("create-customer-portal");
                          if (error) throw error;
                          if (data.url) {
                            window.location.href = data.url;
                          }
                        } catch (error: any) {
                          toast.error("Erro ao abrir portal: " + error.message);
                        }
                      }}
                      variant="secondary"
                      className="w-full md:w-auto"
                    >
                      Gerenciar Pagamento
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full md:w-auto">
                          Cancelar Assinatura
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Ao cancelar sua assinatura, você perderá acesso aos recursos premium ao final do período atual.
                            Seus dados serão mantidos e você poderá reativar sua assinatura a qualquer momento.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => cancelSubscription.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Confirmar Cancelamento
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Features List */}
      {currentPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Recursos do Plano</CardTitle>
            <CardDescription>Veja tudo que está incluído no seu plano atual</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span>Até {currentPlan.max_users === 999 ? "usuários ilimitados" : `${currentPlan.max_users} usuários`}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span>Até {currentPlan.max_leads === 999999 ? "leads ilimitados" : `${currentPlan.max_leads} leads`}</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span>Histórico de {currentPlan.history_days} dias</span>
              </li>
              {currentPlan.has_export && (
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Exportação de dados</span>
                </li>
              )}
              {currentPlan.has_priority_support && (
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>Suporte prioritário</span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Subscription;
