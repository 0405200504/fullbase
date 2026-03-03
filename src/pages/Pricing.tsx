import { useState, useEffect } from "react";
import { usePlans } from "@/hooks/usePlans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Rocket } from "lucide-react";
import { formatCurrency } from "@/lib/dateUtils";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Pricing = () => {
  const { data: plans, isLoading } = usePlans();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Auto checkout após signup
  useEffect(() => {
    const autoCheckout = searchParams.get("auto_checkout");
    const cycle = searchParams.get("cycle") as "monthly" | "yearly";

    if (autoCheckout && cycle) {
      setBillingCycle(cycle);
      // Pequeno delay para garantir que o componente está montado
      setTimeout(() => {
        handleSelectPlan(autoCheckout);
      }, 500);
    }
  }, [searchParams]);

  const handleSelectPlan = async (planId: string) => {
    try {
      setLoadingPlanId(planId);

      console.log('[PRICING] Plano selecionado:', planId);

      // Buscar o plano
      const plan = plans?.find(p => p.id === planId);
      if (!plan) {
        console.error('[PRICING] Plano não encontrado');
        toast.error("Plano não encontrado");
        return;
      }

      console.log('[PRICING] Detalhes do plano:', {
        name: plan.name,
        price_monthly: plan.price_monthly,
        stripe_price_id_monthly: plan.stripe_price_id_monthly,
        stripe_price_id_yearly: plan.stripe_price_id_yearly
      });

      // Se é plano free, apenas redirecionar para cadastro/login
      if (plan.price_monthly === 0) {
        console.log('[PRICING] Plano gratuito - redirecionando');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/auth?mode=signup");
        } else {
          toast.success("Você já está no plano gratuito!");
          navigate("/");
        }
        return;
      }

      // Verificar se há sessão ativa para planos pagos
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('[PRICING] Usuário não autenticado - redirecionando para cadastro');
        // Salvar plano selecionado e redirecionar para cadastro
        sessionStorage.setItem("selectedPlanId", planId);
        sessionStorage.setItem("selectedBillingCycle", billingCycle);
        toast.info("Faça login ou crie uma conta para continuar");
        navigate("/auth?mode=signup");
        return;
      }

      console.log('[PRICING] Usuário autenticado - iniciando checkout');
      // Se já está logado, iniciar checkout
      await initiateCheckout(planId);
    } catch (error: any) {
      console.error('[PRICING] Erro ao processar seleção:', error);
      toast.error("Erro ao processar: " + error.message);
    } finally {
      setLoadingPlanId(null);
    }
  };

  const initiateCheckout = async (planId: string) => {
    console.log('[PRICING] Iniciando checkout para plano:', planId);

    const plan = plans?.find(p => p.id === planId);
    if (!plan) {
      console.error('[PRICING] Plano não encontrado no initiateCheckout');
      return;
    }

    const priceId = billingCycle === "monthly"
      ? plan.stripe_price_id_monthly
      : plan.stripe_price_id_yearly;

    console.log('[PRICING] Price ID:', priceId, 'Billing Cycle:', billingCycle);

    if (!priceId) {
      console.error('[PRICING] Price ID não configurado para este plano');
      toast.error(
        "Este plano ainda não está disponível para compra online. " +
        "Os IDs do Stripe ainda não foram configurados. " +
        "Por favor, entre em contato com o suporte.",
        { duration: 5000 }
      );
      return;
    }

    try {
      console.log('[PRICING] Invocando edge function create-checkout');
      toast.loading("Redirecionando para o checkout...");

      // Criar checkout session via edge function
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, planId, billingCycle }
      });

      if (error) {
        console.error('[PRICING] Erro ao invocar edge function:', error);
        throw error;
      }

      console.log('[PRICING] Resposta da edge function:', data);

      if (data.url) {
        console.log('[PRICING] Redirecionando para:', data.url);
        toast.dismiss();
        window.location.href = data.url;
      } else {
        console.error('[PRICING] URL de checkout não retornada');
        toast.error("Erro ao criar sessão de checkout");
      }
    } catch (err: any) {
      console.error('[PRICING] Erro no checkout:', err);
      toast.dismiss();
      toast.error(err.message || "Erro ao iniciar checkout");
    }
  };

  const getPlanIcon = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes("free")) return Zap;
    if (name.includes("pro")) return Rocket;
    if (name.includes("enterprise")) return Crown;
    return Rocket;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activePlans = plans?.filter(p => p.active) || [];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Navigation Bar */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/lovable-uploads/highleads-logo-white.png" alt="HighLeads" className="h-8" />
            <span className="font-bold text-xl">HighLeads</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Login
            </Button>
            <Button onClick={() => navigate("/auth?mode=signup")}>
              Criar Conta
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-5xl font-bold tracking-tight">
            Planos e Preços
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Escolha o plano ideal para o seu negócio e comece a gerenciar seus leads de forma profissional
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Button
            variant={billingCycle === "monthly" ? "default" : "outline"}
            onClick={() => setBillingCycle("monthly")}
            size="lg"
          >
            Mensal
          </Button>
          <Button
            variant={billingCycle === "yearly" ? "default" : "outline"}
            onClick={() => setBillingCycle("yearly")}
            size="lg"
          >
            Anual
            <Badge className="ml-2 bg-success text-success-foreground">
              Economize até 20%
            </Badge>
          </Button>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
          {activePlans.map((plan) => {
            const Icon = getPlanIcon(plan.name);
            const price = billingCycle === "monthly" ? plan.price_monthly : plan.price_yearly;
            const monthlyEquivalent = billingCycle === "yearly" ? price / 12 : price;

            return (
              <Card
                key={plan.id}
                className={`flex flex-col relative border-2 bg-card/60 backdrop-blur-2xl transition-all duration-300 ${plan.is_popular
                    ? "border-primary shadow-[0_0_30px_rgba(143,255,0,0.15)] scale-105 z-10"
                    : "border-border/50 hover:border-primary/30 hover:shadow-lg"
                  }`}
              >
                {plan.is_popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold shadow-md">
                      Mais Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8 pt-8">
                  <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold">
                    {plan.display_name}
                  </CardTitle>
                  {plan.description && (
                    <CardDescription className="text-base mt-2">
                      {plan.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Pricing */}
                  <div className="text-center pb-6 border-b">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-bold">
                        {formatCurrency(monthlyEquivalent)}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    {billingCycle === "yearly" && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Cobrado anualmente: {formatCurrency(price)}
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>{plan.max_users === 999 ? "Ilimitados" : plan.max_users}</strong> usuários
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>{plan.max_leads === 999999 ? "Ilimitados" : plan.max_leads}</strong> leads
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>
                        Histórico de <strong>{plan.history_days} dias</strong>
                      </span>
                    </li>
                    {plan.has_export && (
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>Exportação de dados</span>
                      </li>
                    )}
                    {plan.has_priority_support && (
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>Suporte prioritário</span>
                      </li>
                    )}
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>Pipeline visual</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>Gestão de vendas</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>Relatórios e métricas</span>
                    </li>
                  </ul>

                  {/* CTA Button */}
                  <Button
                    className="w-full"
                    size="lg"
                    variant={plan.is_popular ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loadingPlanId === plan.id}
                  >
                    {loadingPlanId === plan.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Processando...
                      </>
                    ) : (
                      <>
                        {price === 0 ? "Começar Grátis" : "Assinar Agora"}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto relative z-10">
          <h2 className="text-3xl font-bold text-center mb-8">
            Perguntas Frequentes
          </h2>
          <div className="space-y-4">
            <Card className="bg-card/60 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Posso cancelar a qualquer momento?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Sim! Você pode cancelar sua assinatura a qualquer momento. Não há taxas de cancelamento e você continuará tendo acesso até o final do período pago.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/60 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Posso testar antes de comprar?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Sim! Oferecemos um plano gratuito para você experimentar a plataforma sem compromisso.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/60 backdrop-blur-xl border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Posso mudar de plano depois?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. As mudanças serão refletidas imediatamente.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
