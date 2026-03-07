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
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { validatePasswordStrength } from "@/lib/passwordValidation";
import { ShieldCheck, ArrowRight, Github, Chrome, Mail, Lock, User as UserIcon } from "lucide-react";

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
    // eslint-disable-next-line no-useless-escape
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
          // Allow super_admins to log in as regular users as requested
          const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
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
            navigate(`/`);
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
      <div className="light min-h-screen flex items-center justify-center p-6 bg-background transition-colors duration-300">
        <div className="w-full max-w-[420px] relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-10 text-center">
            <img src="/images/fullbase_logo.png" alt="FullBase Logo" className="h-10 w-auto object-contain transition-all duration-500 hover:scale-105" />
          </div>

          {/* Solid Card */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-8 md:p-10 transition-all duration-300">
            <div className="mb-8 text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {isLogin ? "Acesse sua conta" : "Crie sua conta"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Bem-vindo de volta ao FullBase" : "Comece a gerenciar seus leads"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="nome" className="text-xs font-semibold text-foreground">Nome Completo</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="nome" type="text" value={nome} onChange={e => setNome(e.target.value)} required disabled={loading} className="pl-10 h-10 border-border bg-background focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 rounded-md shadow-sm transition-all" placeholder="Ex: João Silva" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">E-mail corporativo</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} className="pl-10 h-10 border-border bg-background focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 rounded-md shadow-sm transition-all" placeholder="voce@empresa.com" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-xs font-semibold text-foreground">Senha</Label>
                  {isLogin && (
                    <button type="button" onClick={handleForgotPassword} className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors" disabled={loading}>
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} className="pl-10 h-10 border-border bg-background focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 rounded-md shadow-sm transition-all" placeholder="••••••••" />
                </div>
                {!isLogin && <PasswordStrengthIndicator password={password} />}
              </div>

              <Button
                type="submit"
                className="w-full rounded-md text-[13px] font-medium h-10 mt-6 bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm"
                disabled={loading || (!isLogin && password && validatePasswordStrength(password).score < 5)}
              >
                {loading ? "Processando..." : isLogin ? "Entrar" : "Criar Conta"}
              </Button>
            </form>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <span className="relative px-3 bg-card text-xs text-muted-foreground">Ou continue com</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="rounded-md border-border h-10 text-[13px] font-medium gap-2 text-foreground shadow-sm bg-background" disabled>
                <Chrome className="h-4 w-4" />
                Google
              </Button>
              <Button variant="outline" className="rounded-md border-border h-10 text-[13px] font-medium gap-2 text-foreground shadow-sm bg-background" disabled>
                <Github className="h-4 w-4" />
                GitHub
              </Button>
            </div>

            <p className="mt-6 text-center text-[13px] text-muted-foreground">
              {isLogin ? "Ainda não possui uma conta?" : "Já possui conta?"}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-1 text-foreground font-medium hover:text-primary transition-colors"
                disabled={loading}
              >
                {isLogin ? "Criar conta" : "Fazer login"}
              </button>
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between text-[11px] font-medium text-muted-foreground px-2">
            <span>© {new Date().getFullYear()} FullBase</span>
            <div className="flex gap-4">

              <button onClick={() => navigate("/superadmin/login")} className="hover:text-foreground transition-colors">Administração</button>
            </div>
          </div>
        </div>
      </div>

      {showOnboarding && <OnboardingModal open={showOnboarding} userId={newUserId} nome={nome} email={email} />}
    </>
  );
};

export default Auth;
