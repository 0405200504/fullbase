import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, PartyPopper, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(13);
  const [error, setError] = useState<string | null>(null);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (loading) {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev;
          return prev + Math.floor(Math.random() * 10);
        });
      }, 500);
      return () => clearInterval(timer);
    }
  }, [loading]);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError("Sessão de checkout não encontrada");
        setLoading(false);
        return;
      }

      try {
        // Aguardar o tempo da barra de progresso se sentir real
        await new Promise(resolve => setTimeout(resolve, 3500));

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
          throw new Error("Sua assinatura está sendo processada. Se não for ativada em 5 minutos, contate o suporte.");
        }

        setProgress(100);
        setTimeout(() => setLoading(false), 500);
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-6">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary animate-pulse">
              <Zap className="h-8 w-8 fill-current" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Sintonizando sua conta...</h2>
            <p className="text-muted-foreground text-sm">Estamos finalizando a ativação do seu acesso ao FullBase.</p>
          </div>

          <div className="space-y-2">
            <Progress value={progress} className="h-2 bg-muted border border-border/40" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{progress}% Concluído</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
        <Card className="w-full max-w-md border-border/60 shadow-xl overflow-hidden">
          <CardHeader className="bg-danger/5 border-b border-danger/10 text-center pb-8">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center text-danger">
              <Zap className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl text-foreground">Quase lá!</CardTitle>
            <p className="text-sm text-muted-foreground">Houve um detalhe no processamento do seu pagamento.</p>
          </CardHeader>
          <CardContent className="p-8 space-y-6 text-center">
            <div className="p-4 bg-muted/30 rounded-lg border border-border/40 text-sm text-muted-foreground italic">
              "{error}"
            </div>
            <Button onClick={() => navigate("/")} className="w-full h-12 font-bold bg-foreground hover:bg-foreground/90">
              Ir para o Dashboard e contatar suporte
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <Card className="w-full max-w-lg border-border/60 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/50 to-primary" />

        <CardHeader className="text-center pt-12 pb-8">
          <div className="mx-auto mb-6 p-4 bg-success/10 rounded-2xl w-fit relative">
            <CheckCircle2 className="h-12 w-12 text-success" />
            <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm">
              <PartyPopper className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black tracking-tighter text-foreground">Seja bem-vindo ao FullBase!</CardTitle>
          <p className="text-muted-foreground mt-2 max-w-[320px] mx-auto">Sua jornada rumo à alta performance em vendas começa agora.</p>
        </CardHeader>

        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-xl border border-border/40 flex flex-col items-center text-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status do Plano</p>
              <p className="text-sm font-bold text-foreground">Ativo e Vitalício</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl border border-border/40 flex flex-col items-center text-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Acesso</p>
              <p className="text-sm font-bold text-foreground">Liberado Imediato</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => navigate("/")}
              className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2"
            >
              Começar Agora
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/configuracoes")}
              className="w-full h-12 font-bold text-muted-foreground hover:text-foreground border-border/60"
            >
              Configurar meu Perfil
            </Button>
          </div>

          <div className="pt-4 border-t border-border/40">
            <p className="text-[11px] text-center text-muted-foreground/60 leading-relaxed px-6">
              Enviamos um recibo detalhado para o seu e-mail. Se precisar de ajuda, nosso suporte técnico está à sua disposição.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Background decoration */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
    </div>
  );
};

export default CheckoutSuccess;
