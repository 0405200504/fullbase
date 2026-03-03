import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, DollarSign, Target, Award, PhoneCall, Mail, User as UserIcon, Edit, Camera, MapPin, Calendar, Briefcase } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";
import { formatCurrency } from "@/lib/dateUtils";
import { useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const MyProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Mutation para upload de foto
  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Upload para o storage (se tiver bucket configurado)
      // Por enquanto, vamos simular com base64
      const reader = new FileReader();
      return new Promise<string>((resolve, reject) => {
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          
          // Atualizar o perfil com a URL da foto
          const { error } = await supabase
            .from("profiles")
            .update({ foto_url: base64 })
            .eq("id", user.id);

          if (error) {
            reject(error);
          } else {
            resolve(base64);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile", user?.id] });
      toast.success("Foto atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar foto: " + error.message);
    },
  });

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo e tamanho
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor, selecione uma imagem válida");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem muito grande. Tamanho máximo: 5MB");
        return;
      }
      uploadPhoto.mutate(file);
    }
  };

  // Buscar todos os leads da conta (não apenas do usuário)
  const { data: allLeads = [] } = useQuery({
    queryKey: ["all-leads-profile", profile?.account_id],
    queryFn: async () => {
      if (!profile?.account_id) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*, etapas_funil(nome, cor), produtos(nome)")
        .eq("account_id", profile.account_id)
        .eq("arquivado", false);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.account_id,
  });

  // Buscar todas as vendas da conta (não apenas do usuário)
  const { data: vendas = [] } = useQuery({
    queryKey: ["all-vendas-profile", profile?.account_id],
    queryFn: async () => {
      if (!profile?.account_id) return [];
      const { data, error } = await supabase
        .from("vendas")
        .select("*, leads(nome), produtos(nome)")
        .eq("account_id", profile.account_id)
        .eq("reembolsada", false)
        .order("data_fechamento", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.account_id,
  });

  // Buscar todas as calls da conta
  const { data: allCalls = [] } = useQuery({
    queryKey: ["all-calls-profile", profile?.account_id],
    queryFn: async () => {
      if (!profile?.account_id) return [];
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .eq("account_id", profile.account_id)
        .eq("arquivado", false);

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.account_id,
  });

  // Para compatibilidade com o código existente
  const leadsAsSDR = allLeads;

  // Dados de evolução temporal da plataforma completa
  const platformEvolutionData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const leadsNoMes = allLeads.filter((l: any) => {
        const leadDate = new Date(l.created_at);
        return leadDate.getMonth() === date.getMonth() && 
               leadDate.getFullYear() === date.getFullYear();
      });
      
      const callsNoMes = allCalls.filter((c: any) => {
        const callDate = new Date(c.data_hora_agendada);
        return callDate.getMonth() === date.getMonth() && 
               callDate.getFullYear() === date.getFullYear();
      });
      
      const vendasNoMes = vendas.filter((v: any) => {
        const vendaDate = new Date(v.data_fechamento);
        return vendaDate.getMonth() === date.getMonth() && 
               vendaDate.getFullYear() === date.getFullYear();
      });
      
      const faturamentoMes = vendasNoMes.reduce((sum: number, v: any) => sum + v.valor_final, 0);
      const taxaConversao = leadsNoMes.length > 0 ? (vendasNoMes.length / leadsNoMes.length * 100) : 0;
      
      months.push({
        mes: monthKey,
        leads: leadsNoMes.length,
        calls: callsNoMes.length,
        vendas: vendasNoMes.length,
        faturamento: faturamentoMes,
        taxaConversao,
      });
    }
    
    return months;
  }, [allLeads, allCalls, vendas]);

  // Para compatibilidade com código existente
  const sdrEvolutionData = platformEvolutionData;
  const closerEvolutionData = platformEvolutionData;

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div>Perfil não encontrado</div>;
  }

  const isSDR = profile.funcao === "sdr" || profile.funcao === "admin";
  const isCloser = profile.funcao === "closer" || profile.funcao === "admin";

  // Métricas SDR
  const callsAgendadas = leadsAsSDR.filter((l: any) => l.data_agendamento_call).length;
  const taxaAgendamento = leadsAsSDR.length > 0
    ? ((callsAgendadas / leadsAsSDR.length) * 100).toFixed(1)
    : "0";

  // Métricas Closer
  const totalFaturamento = vendas.reduce((sum: number, v: any) => sum + v.valor_final, 0);
  const ticketMedio = vendas.length > 0 ? totalFaturamento / vendas.length : 0;

  const calcularTendencia = (data: number[]): number => {
    if (data.length < 2) return 0;
    const ultimo = data[data.length - 1];
    const penultimo = data[data.length - 2];
    if (penultimo === 0) return 0;
    return parseFloat(((ultimo - penultimo) / penultimo * 100).toFixed(1));
  };

  const tendenciaLeads = calcularTendencia(sdrEvolutionData.map(d => d.leads));
  const tendenciaCalls = calcularTendencia(sdrEvolutionData.map(d => d.calls));
  const tendenciaVendas = calcularTendencia(closerEvolutionData.map(d => d.vendas));
  const tendenciaFaturamento = calcularTendencia(closerEvolutionData.map(d => d.faturamento));

  const iniciais = profile.nome
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header estilo Instagram */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-primary/5 rounded-2xl p-8 shadow-lg border border-primary/10">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Avatar grande estilo Instagram com upload */}
          <div className="relative group">
            <Avatar className="h-32 w-32 border-4 border-primary shadow-xl">
              <AvatarImage src={profile.foto_url} />
              <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                {iniciais}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-0 right-0 h-10 w-10 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handlePhotoClick}
              disabled={uploadPhoto.isPending}
            >
              <Camera className="h-5 w-5" />
            </Button>
          </div>

          {/* Informações do perfil */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <h1 className="text-4xl font-bold">{profile.nome}</h1>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/configuracoes")}
                className="h-8 w-8"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserIcon className="h-4 w-4" />
                <span className="font-medium capitalize">{profile.funcao}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{profile.email}</span>
              </div>
              {profile.telefone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <PhoneCall className="h-4 w-4" />
                  <span>{profile.telefone}</span>
                </div>
              )}
            </div>

            {/* Stats rápidas estilo Instagram - Dados da plataforma */}
            <div className="flex items-center justify-center md:justify-start gap-6 pt-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{allLeads.length}</p>
                <p className="text-xs text-muted-foreground">Leads</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{allCalls.length}</p>
                <p className="text-xs text-muted-foreground">Calls</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{vendas.length}</p>
                <p className="text-xs text-muted-foreground">Vendas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalFaturamento)}</p>
                <p className="text-xs text-muted-foreground">Faturamento</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card de Informações Detalhadas */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">Informações Detalhadas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{profile.email}</p>
              </div>
            </div>

            {profile.telefone && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-lg bg-success/10">
                  <PhoneCall className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="text-sm font-medium">{profile.telefone}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-lg bg-warning/10">
                <Briefcase className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Função</p>
                <p className="text-sm font-medium capitalize">{profile.funcao}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-lg bg-info/10">
                <Calendar className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Membro desde</p>
                <p className="text-sm font-medium">
                  {new Date(profile.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <Button 
              onClick={() => navigate("/configuracoes")}
              variant="outline"
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar Informações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Métricas da Plataforma */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium mb-2 text-muted-foreground">Total de Leads</p>
              <p className="text-3xl font-bold tracking-tight">{allLeads.length}</p>
              <p className={`text-sm font-medium mt-2 ${tendenciaLeads >= 0 ? 'text-success' : 'text-danger'}`}>
                {tendenciaLeads >= 0 ? '↑' : '↓'} {Math.abs(tendenciaLeads)}% vs mês anterior
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <Target className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium mb-2 text-muted-foreground">Total de Calls</p>
              <p className="text-3xl font-bold tracking-tight">{allCalls.length}</p>
              <p className={`text-sm font-medium mt-2 ${tendenciaCalls >= 0 ? 'text-success' : 'text-danger'}`}>
                {tendenciaCalls >= 0 ? '↑' : '↓'} {Math.abs(tendenciaCalls)}% vs mês anterior
              </p>
            </div>
            <div className="p-3 rounded-lg bg-success/10">
              <PhoneCall className="h-6 w-6 text-success" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium mb-2 text-muted-foreground">Total de Vendas</p>
              <p className="text-3xl font-bold tracking-tight">{vendas.length}</p>
              <p className={`text-sm font-medium mt-2 ${tendenciaVendas >= 0 ? 'text-success' : 'text-danger'}`}>
                {tendenciaVendas >= 0 ? '↑' : '↓'} {Math.abs(tendenciaVendas)}% vs mês anterior
              </p>
            </div>
            <div className="p-3 rounded-lg bg-warning/10">
              <Award className="h-6 w-6 text-warning" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-success to-success/80 rounded-xl p-6 shadow-lg text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium mb-2 opacity-90">Faturamento Total</p>
              <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalFaturamento)}</p>
              <p className="text-sm font-medium mt-2">
                {tendenciaFaturamento >= 0 ? '↑' : '↓'} {Math.abs(tendenciaFaturamento)}% vs mês anterior
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white/20">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos da Plataforma */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl shadow-md p-6 border border-border">
          <h3 className="text-lg font-semibold mb-4">Evolução de Leads, Calls e Vendas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={platformEvolutionData}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="leads"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorLeads)"
                strokeWidth={2}
                name="Leads"
              />
              <Area
                type="monotone"
                dataKey="calls"
                stroke="hsl(var(--success))"
                fillOpacity={1}
                fill="url(#colorCalls)"
                strokeWidth={2}
                name="Calls"
              />
              <Area
                type="monotone"
                dataKey="vendas"
                stroke="hsl(var(--warning))"
                fillOpacity={1}
                fill="url(#colorVendas)"
                strokeWidth={2}
                name="Vendas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl shadow-md p-6 border border-border">
          <h3 className="text-lg font-semibold mb-4">Evolução do Faturamento</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={platformEvolutionData}>
              <defs>
                <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
              />
              <Area
                type="monotone"
                dataKey="faturamento"
                stroke="hsl(var(--success))"
                fillOpacity={1}
                fill="url(#colorFaturamento)"
                strokeWidth={2}
                name="Faturamento"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl shadow-md p-6 border border-border">
          <h3 className="text-lg font-semibold mb-4">Taxa de Conversão (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={platformEvolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Taxa de Conversão']}
              />
              <Line
                type="monotone"
                dataKey="taxaConversao"
                stroke="hsl(var(--success))"
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--success))', r: 5 }}
                activeDot={{ r: 7 }}
                name="Taxa de Conversão"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl shadow-md p-6 border border-border">
          <h3 className="text-lg font-semibold mb-4">Vendas por Mês</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={platformEvolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="vendas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Vendas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default MyProfile;
