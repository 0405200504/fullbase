import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Lock, Bell, History, ShieldCheck, Mail, Smartphone, KeyRound } from "lucide-react";
import { LoginHistoryCard } from "@/components/LoginHistoryCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const Configuracoes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profileData, setProfileData] = useState({
    nome: "",
    telefone: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfileData({
        nome: data.nome || "",
        telefone: data.telefone || "",
      });
      return data;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async (data: typeof profileData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("profiles")
        .update({
          nome: data.nome,
          telefone: data.telefone || null,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({ title: "Perfil atualizado com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePassword = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      if (data.newPassword !== data.confirmPassword) {
        throw new Error("As senhas não coincidem");
      }
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Senha alterada com sucesso!" });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Configurações do Sistema</h1>
        <p className="text-muted-foreground">Gerencie sua identidade, segurança e preferências de conta.</p>
      </div>

      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList className="bg-muted/50 p-1.5 h-12 border border-border/40 gap-1 rounded-xl">
          <TabsTrigger value="perfil" className="tab-trigger-clean gap-2 px-6">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="tab-trigger-clean gap-2 px-6">
            <ShieldCheck className="h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="tab-trigger-clean gap-2 px-6">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="historico" className="tab-trigger-clean gap-2 px-6">
            <History className="h-4 w-4" />
            Acessos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="space-y-6 outline-none">
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/40 pb-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">Informações Pessoais</CardTitle>
              </div>
              <CardDescription>
                Seus dados básicos de identificação na plataforma FullBase.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Endereço de E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
                    <Input id="email" value={user?.email || ""} disabled className="pl-10 bg-muted/30 border-border/60" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      id="nome"
                      value={profileData.nome}
                      onChange={(e) => setProfileData({ ...profileData, nome: e.target.value })}
                      className="pl-10 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Telefone / WhatsApp</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      id="telefone"
                      value={profileData.telefone}
                      onChange={(e) => setProfileData({ ...profileData, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="pl-10 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-border/40" />

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => updateProfile.mutate(profileData)}
                  className="bg-primary hover:bg-primary/90 font-bold px-8 h-11"
                >
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca" className="space-y-6 outline-none">
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/40 pb-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-lg bg-danger/10 text-danger">
                  <KeyRound className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">Alteração de Senha</CardTitle>
              </div>
              <CardDescription>
                Mantenha sua conta protegida com uma senha forte e complexa.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => updatePassword.mutate(passwordData)}
                  className="bg-danger hover:bg-danger/90 text-white font-bold px-8 h-11"
                >
                  Atualizar Senha
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes" className="outline-none">
          <Card className="border-border/60 border-dashed bg-muted/5 min-h-[300px] flex flex-col items-center justify-center text-center p-12">
            <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <CardTitle className="text-lg text-muted-foreground/60 mb-2">Central de Notificações</CardTitle>
            <CardDescription className="max-w-[300px]">
              Estamos trabalhando em um sistema de alertas em tempo real. Fique atento às novidades.
            </CardDescription>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="outline-none">
          <LoginHistoryCard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;