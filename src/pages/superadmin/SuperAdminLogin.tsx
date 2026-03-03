import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres")
});
const SuperAdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const {
    signIn
  } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validation = loginSchema.safeParse({
        email,
        password
      });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }
      const {
        error
      } = await signIn(email, password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou senha incorretos");
        } else {
          toast.error("Erro ao fazer login: " + error.message);
        }
        return;
      }

      // Verificar se é super admin
      const {
        data: roles
      } = await supabase.from("user_roles").select("role").eq("user_id", (await supabase.auth.getUser()).data.user?.id);
      const isSuperAdmin = roles?.some(r => r.role === "super_admin");
      if (!isSuperAdmin) {
        await supabase.auth.signOut();
        toast.error("Acesso negado. Esta área é restrita a super administradores.");
        return;
      }
      toast.success("Login realizado com sucesso!");
      navigate("/superadmin/dashboard");
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#111827]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{
        animationDuration: '10s'
      }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{
        animationDuration: '12s',
        animationDelay: '1s'
      }} />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        <div className="rounded-2xl shadow-2xl p-8 border border-primary bg-primary-hover">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img alt="HighLeads Logo" className="h-16 w-auto" src="/lovable-uploads/ce724086-b62d-4fe1-b0ba-5fb6acb73489.png" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Super Admin</h1>
            <p className="text-primary-foreground">Acesso Restrito</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} className="mt-1" />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} className="mt-1" />
            </div>

            <Button type="submit" className="w-full btn-premium" disabled={loading}>
              {loading ? "Aguarde..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>;
};
export default SuperAdminLogin;