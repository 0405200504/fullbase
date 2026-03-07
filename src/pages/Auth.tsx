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
      <div className="min-h-screen flex items-center justify-center p-6 bg-background transition-colors duration-300">
        {/* Subtle decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.05] dark:opacity-[0.02]">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(hsl(var(--foreground))_1px,transparent_1px)] [background-size:32px_32px]" />
        </div>

        <div className="w-full max-w-[440px] relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-10 text-center gap-3">
            <div className="flex items-center justify-center">
              <img src="/images/fullbase_logo.png" alt="FullBase Logo" className="h-[48px] w-[48px] object-contain brightness-0 invert" />
            </div>
            <h2 className="text-3xl font-[900] tracking-tighter text-foreground uppercase leading-none">
              Full<span className="text-primary italic">Base</span>
            </h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">Sua central de leads profissional.</p>
          </div>

          {/* Solid Card */}
          <div className="bg-card rounded-[32px] border border-border/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-10 backdrop-blur-sm transition-colors duration-300">
            <div className="mb-8">
              <h1 className="text-xl font-bold text-foreground">
                {isLogin ? "Acessar Plataforma" : "Criar Nova Conta"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isLogin ? "Insira suas credenciais corporativas." : "Junte-se a milhares de closers no FullBase."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <Label htmlFor="nome" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nome Completo</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/40" />
                    <Input id="nome" type="text" value={nome} onChange={e => setNome(e.target.value)} required disabled={loading} className="pl-10 h-11 border-border/60 focus:ring-primary/20 bg-muted/20" placeholder="Ex: João Silva" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">E-mail Corporativo</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/40" />
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} className="pl-10 h-11 border-border/60 focus:ring-primary/20 bg-muted/20" placeholder="voce@empresa.com" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Senha</Label>
                  {isLogin && (
                    <button type="button" onClick={handleForgotPassword} className="text-[11px] font-bold text-primary hover:underline" disabled={loading}>
                      Recuperar
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/40" />
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} className="pl-10 h-11 border-border/60 focus:ring-primary/20 bg-muted/20" placeholder="••••••••" />
                </div>
                {!isLogin && <PasswordStrengthIndicator password={password} />}
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl text-sm font-bold h-12 mt-4 bg-primary hover:bg-primary/90 text-white transition-all shadow-lg shadow-primary/20 gap-2"
                disabled={loading || (!isLogin && password && validatePasswordStrength(password).score < 5)}
              >
                {loading ? "Processando..." : isLogin ? "Fazer Login" : "Criar Conta"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <div className="relative my-8 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60"></div>
              </div>
              <span className="relative px-4 bg-card text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ou continue com</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="rounded-xl border-border/60 h-11 text-xs font-bold gap-2 text-muted-foreground hover:bg-muted/30" disabled>
                <Chrome className="h-4 w-4" />
                Google
              </Button>
              <Button variant="outline" className="rounded-xl border-border/60 h-11 text-xs font-bold gap-2 text-muted-foreground hover:bg-muted/30" disabled>
                <Github className="h-4 w-4" />
                GitHub
              </Button>
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground font-medium">
              {isLogin ? "Não possui uma licença?" : "Já possui acesso?"}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-1 text-primary font-bold hover:underline"
                disabled={loading}
              >
                {isLogin ? "Solicitar Agora" : "Fazer Login"}
              </button>
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest px-4">
            <span>© {new Date().getFullYear()} FullBase System</span>
            <div className="flex gap-4">
              <button onClick={() => navigate("/pricing")} className="hover:text-primary transition-colors">Planos</button>
              <button onClick={() => navigate("/superadmin/login")} className="hover:text-primary transition-colors">Admin</button>
            </div>
          </div>
        </div>
      </div>

      {showOnboarding && <OnboardingModal open={showOnboarding} userId={newUserId} nome={nome} email={email} />}
    </>
  );
};

export default Auth;
