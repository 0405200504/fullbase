import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError("Sessão de checkout não encontrada");
        setLoading(false);
        return;
      }

      try {
        // Aguardar alguns segundos para o webhook processar
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verificar se a subscription foi criada
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/auth");
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('account_id')
          .eq('id', user.id)
          .single();

        if (!profile) {
          throw new Error("Perfil não encontrado");
        }

        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('account_id', profile.account_id)
          .single();

        if (!subscription) {
          throw new Error("Assinatura não encontrada. Por favor, contate o suporte.");
        }

        setLoading(false);
      } catch (err: any) {
        console.error("Error verifying payment:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg font-medium">Verificando seu pagamento...</p>
            <p className="text-sm text-muted-foreground">
              Isso pode levar alguns segundos
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">
              Erro na Verificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate("/pricing")} className="w-full">
              Voltar para Planos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-success/10 rounded-full w-fit">
            <CheckCircle2 className="h-12 w-12 text-success" />
          </div>
          <CardTitle className="text-2xl">Pagamento Confirmado!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Sua assinatura foi ativada com sucesso
            </p>
            <p className="text-muted-foreground">
              Bem-vindo ao HighLeads! Você já pode começar a usar todas as funcionalidades do seu plano.
            </p>
          </div>

          <div className="space-y-2">
            <Button onClick={() => navigate("/")} className="w-full" size="lg">
              Acessar Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/configuracoes")}
              className="w-full"
            >
              Ver Configurações
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Um email de confirmação foi enviado para você com todos os detalhes da sua assinatura.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutSuccess;
