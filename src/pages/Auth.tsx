import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { OnboardingModal } from "@/components/OnboardingModal";
import { supabase } from "@/integrations/supabase/client";
import logoBlack from "@/assets/high-leads-logo.png";
import logoWhite from "@/assets/high-leads-logo-white.png";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { validatePasswordStrength } from "@/lib/passwordValidation";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres")
});

const signupSchema = z.object({
  email: z.string().email("Email inválido"),
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Deve conter pelo menos um número")
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, "Deve conter pelo menos um caractere especial")
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup") setIsLogin(false);
  }, [searchParams]);

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Por favor, digite seu email");
      return;
    }
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast.error("Erro ao enviar email: " + error.message);
      } else {
        toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          return;
        }
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email ou senha incorretos");
          } else {
            toast.error("Erro ao fazer login: " + error.message);
          }
          return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
          const isSuperAdmin = roles?.some(r => r.role === "super_admin");
          if (isSuperAdmin) {
            await supabase.auth.signOut();
            toast.error("Super administradores devem usar o login em /superadmin/login");
            return;
          }
        }
        toast.success("Login realizado com sucesso!");
        navigate("/");
      } else {
        const validation = signupSchema.safeParse({ email, password, nome });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          return;
        }
        const result = await signUp(email, password, nome);
        if (result.error) {
          if (result.error.message.includes("User already registered")) {
            toast.error("Este email já está cadastrado");
          } else {
            toast.error("Erro ao criar conta: " + result.error.message);
          }
          return;
        }
        if (result.userId) {
          const selectedPlanId = sessionStorage.getItem("selectedPlanId");
          const selectedBillingCycle = sessionStorage.getItem("selectedBillingCycle");
          if (selectedPlanId && selectedBillingCycle) {
            await signIn(email, password);
            sessionStorage.removeItem("selectedPlanId");
            sessionStorage.removeItem("selectedBillingCycle");
            navigate(`/pricing?auto_checkout=${selectedPlanId}&cycle=${selectedBillingCycle}`);
            return;
          }
          setNewUserId(result.userId);
          setShowOnboarding(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <div className="w-full max-w-[400px] relative z-10 animate-fade-in text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img alt="HighLeads" className="h-10 w-auto" src={logoWhite} />
          </div>

          {/* Card */}
          <div className="text-left bg-card/60 backdrop-blur-2xl rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] p-8 border border-border/50">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
              </h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                {isLogin ? "Entre com suas credenciais" : "Comece sua jornada no HighLeads"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <Label htmlFor="nome" className="text-[12px] font-medium">Nome Completo</Label>
                  <Input id="nome" type="text" value={nome} onChange={e => setNome(e.target.value)} required disabled={loading} className="mt-1" placeholder="Seu nome" />
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-[12px] font-medium">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} className="mt-1" placeholder="seu@email.com" />
              </div>

              <div>
                <Label htmlFor="password" className="text-[12px] font-medium">Senha</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} className="mt-1" placeholder="••••••••" />
                {!isLogin && <PasswordStrengthIndicator password={password} />}
              </div>

              <Button
                type="submit"
                className="w-full rounded-full text-[14px] h-12 mt-2"
                disabled={loading || (!isLogin && password && validatePasswordStrength(password).score < 5)}
              >
                {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar Conta"}
              </Button>
            </form>

            <div className="mt-5 space-y-3 text-center">
              {isLogin && (
                <button type="button" onClick={handleForgotPassword} className="text-[12px] text-muted-foreground hover:text-primary transition-colors block w-full" disabled={loading}>
                  Esqueceu a senha?
                </button>
              )}
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-[12px] text-muted-foreground hover:text-primary transition-colors" disabled={loading}>
                {isLogin ? (
                  <>Não tem conta? <span className="text-primary font-medium">Criar conta</span></>
                ) : (
                  <>Já tem conta? <span className="text-primary font-medium">Fazer login</span></>
                )}
              </button>
              {isLogin && (
                <div className="pt-3 border-t border-border/40 space-y-2">
                  <button type="button" onClick={() => navigate("/pricing")} className="text-[12px] text-muted-foreground hover:text-primary transition-colors w-full text-center">
                    Ver planos e preços →
                  </button>
                  <button type="button" onClick={() => navigate("/superadmin/login")} className="text-[12px] text-muted-foreground hover:text-primary transition-colors w-full text-center">
                    Acessar Painel Super Admin →
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-6">
            © {new Date().getFullYear()} HighLeads. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {showOnboarding && <OnboardingModal open={showOnboarding} userId={newUserId} nome={nome} email={email} />}
    </>
  );
};

export default Auth;
