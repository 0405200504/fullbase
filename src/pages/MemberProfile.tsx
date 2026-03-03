import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, DollarSign, Target, Award, PhoneCall, Users, BarChart3 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";
import { formatCurrency } from "@/lib/dateUtils";
import { useMemo } from "react";

const MemberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ["team-member", id],
    queryFn: async () => {
      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .select("*")
        .eq("id", id)
        .single();

      if (memberError) throw memberError;

      const { data: rolesData, error: rolesError } = await supabase
        .from("team_member_roles")
        .select("role")
        .eq("team_member_id", id);

      if (rolesError) throw rolesError;

      return {
        ...memberData,
        roles: rolesData.map((r) => r.role),
      };
    },
  });

  const { data: leadsAsSDR = [] } = useQuery({
    queryKey: ["leads-sdr", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, etapas_funil(nome, cor), produtos(nome)")
        .eq("sdr_id", id)
        .eq("arquivado", false);

      if (error) throw error;
      return data;
    },
  });

  const { data: callsData = [] } = useQuery({
    queryKey: ["calls-member", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .eq("closer_id", id);

      if (error) throw error;
      return data;
    },
  });

  const { data: vendas = [] } = useQuery({
    queryKey: ["vendas-closer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("*, leads(nome), produtos(nome)")
        .eq("closer_id", id)
        .order("data_fechamento", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // SDR evolution data
  const sdrEvolutionData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const leadsNoMes = leadsAsSDR.filter((l: any) => {
        const leadDate = new Date(l.created_at);
        return leadDate.getMonth() === date.getMonth() && 
               leadDate.getFullYear() === date.getFullYear();
      });
      
      const callsAgendadas = leadsNoMes.filter((l: any) => l.data_agendamento_call).length;
      const compareceram = leadsNoMes.filter((l: any) => l.status_call === 'compareceu').length;
      
      months.push({
        mes: monthKey,
        leads: leadsNoMes.length,
        agendamentos: callsAgendadas,
        comparecimentos: compareceram,
        taxaAgendamento: leadsNoMes.length > 0 ? (callsAgendadas / leadsNoMes.length * 100) : 0,
        taxaComparecimento: callsAgendadas > 0 ? (compareceram / callsAgendadas * 100) : 0,
      });
    }
    
    return months;
  }, [leadsAsSDR]);

  // Closer evolution data
  const closerEvolutionData = useMemo(() => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const vendasNoMes = vendas.filter((v: any) => {
        const vendaDate = new Date(v.data_fechamento);
        return vendaDate.getMonth() === date.getMonth() && 
               vendaDate.getFullYear() === date.getFullYear();
      });

      const callsNoMes = callsData.filter((c: any) => {
        const callDate = new Date(c.data_hora_agendada);
        return callDate.getMonth() === date.getMonth() && 
               callDate.getFullYear() === date.getFullYear();
      });

      const callsComparecidas = callsNoMes.filter((c: any) => c.resultado === 'compareceu' || c.status === 'compareceu').length;
      
      const faturamentoMes = vendasNoMes.reduce((sum: number, v: any) => sum + v.valor_final, 0);
      const ticketMes = vendasNoMes.length > 0 ? faturamentoMes / vendasNoMes.length : 0;
      
      months.push({
        mes: monthKey,
        vendas: vendasNoMes.length,
        faturamento: faturamentoMes,
        ticket: ticketMes,
        calls: callsNoMes.length,
        comparecidas: callsComparecidas,
        taxaConversao: callsComparecidas > 0 ? (vendasNoMes.length / callsComparecidas * 100) : 0,
      });
    }
    
    return months;
  }, [vendas, callsData]);

  if (memberLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!member) {
    return <div>Membro não encontrado</div>;
  }

  const isSDR = member.roles.includes("sdr");
  const isCloser = member.roles.includes("closer");

  // SDR metrics
  const callsAgendadas = leadsAsSDR.filter((l: any) => l.data_agendamento_call).length;
  const taxaAgendamento = leadsAsSDR.length > 0
    ? ((callsAgendadas / leadsAsSDR.length) * 100).toFixed(1)
    : "0";
  const compareceram = leadsAsSDR.filter((l: any) => l.status_call === 'compareceu').length;
  const taxaComparecimento = callsAgendadas > 0
    ? ((compareceram / callsAgendadas) * 100).toFixed(1)
    : "0";

  // Closer metrics
  const totalFaturamento = vendas.reduce((sum: number, v: any) => sum + v.valor_final, 0);
  const ticketMedio = vendas.length > 0 ? totalFaturamento / vendas.length : 0;
  const _totalCallsCloser = callsData.length;
  const callsComparecidasCloser = callsData.filter((c: any) => c.resultado === 'compareceu' || c.status === 'compareceu').length;
  const taxaConversaoCloser = callsComparecidasCloser > 0
    ? ((vendas.length / callsComparecidasCloser) * 100).toFixed(1)
    : "0";

  const calcularTendencia = (data: number[]): number => {
    if (data.length < 2) return 0;
    const ultimo = data[data.length - 1];
    const penultimo = data[data.length - 2];
    if (penultimo === 0) return 0;
    return parseFloat(((ultimo - penultimo) / penultimo * 100).toFixed(1));
  };

  const tendenciaLeads = calcularTendencia(sdrEvolutionData.map(d => d.leads));
  const tendenciaAgendamentos = calcularTendencia(sdrEvolutionData.map(d => d.agendamentos));
  const tendenciaVendas = calcularTendencia(closerEvolutionData.map(d => d.vendas));
  const tendenciaFaturamento = calcularTendencia(closerEvolutionData.map(d => d.faturamento));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => navigate("/equipe")} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Equipe
        </Button>

        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold">
            {member.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-4xl font-bold">{member.nome}</h1>
            <p className="text-muted-foreground">
              {member.roles.map((r: string) => r.toUpperCase()).join(" • ")}
            </p>
            {member.telefone && (
              <p className="text-sm text-muted-foreground mt-1">{member.telefone}</p>
            )}
          </div>
        </div>
      </div>

      {/* ===== SDR SECTION ===== */}
      {isSDR && (
        <>
          {isCloser && <h2 className="text-xl font-bold text-foreground border-b border-border/30 pb-2">Métricas SDR</h2>}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="metric-card group hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Leads Gerados</p>
                  <p className="text-3xl font-bold tracking-tight">{leadsAsSDR.length}</p>
                  <p className={`text-sm font-medium mt-2 ${tendenciaLeads >= 0 ? 'text-success' : 'text-danger'}`}>
                    {tendenciaLeads >= 0 ? '↑' : '↓'} {Math.abs(tendenciaLeads)}% vs mês anterior
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <Target className="h-6 w-6 text-foreground" />
                </div>
              </div>
            </div>

            <div className="metric-card group hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Calls Agendadas</p>
                  <p className="text-3xl font-bold tracking-tight">{callsAgendadas}</p>
                  <p className={`text-sm font-medium mt-2 ${tendenciaAgendamentos >= 0 ? 'text-success' : 'text-danger'}`}>
                    {tendenciaAgendamentos >= 0 ? '↑' : '↓'} {Math.abs(tendenciaAgendamentos)}% vs mês anterior
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <PhoneCall className="h-6 w-6 text-foreground" />
                </div>
              </div>
            </div>

            <div className="metric-card group hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Taxa de Agendamento</p>
                  <p className="text-3xl font-bold tracking-tight text-success">{taxaAgendamento}%</p>
                  <p className="text-sm font-medium mt-2 text-muted-foreground">Meta: 70%</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <TrendingUp className="h-6 w-6 text-foreground" />
                </div>
              </div>
            </div>

            <div className="metric-card group hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Taxa de Comparecimento</p>
                  <p className="text-3xl font-bold tracking-tight text-success">{taxaComparecimento}%</p>
                  <p className="text-sm font-medium mt-2 text-muted-foreground">Meta: 80%</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <Users className="h-6 w-6 text-foreground" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Evolução de Leads e Agendamentos</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={sdrEvolutionData}>
                  <defs>
                    <linearGradient id="colorLeadsSDR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAgendamentos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorLeadsSDR)" strokeWidth={2} name="Leads" />
                  <Area type="monotone" dataKey="agendamentos" stroke="hsl(var(--success))" fillOpacity={1} fill="url(#colorAgendamentos)" strokeWidth={2} name="Agendamentos" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Taxa de Agendamento & Comparecimento (%)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sdrEvolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [`${value.toFixed(1)}%`]} />
                  <Legend />
                  <Line type="monotone" dataKey="taxaAgendamento" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', r: 5 }} activeDot={{ r: 7 }} name="Agendamento" />
                  <Line type="monotone" dataKey="taxaComparecimento" stroke="hsl(var(--success))" strokeWidth={3} dot={{ fill: 'hsl(var(--success))', r: 5 }} activeDot={{ r: 7 }} name="Comparecimento" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ===== CLOSER SECTION ===== */}
      {isCloser && (
        <>
          {isSDR && <h2 className="text-xl font-bold text-foreground border-b border-border/30 pb-2 mt-4">Métricas Closer</h2>}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-success to-success/80 rounded-xl p-6 shadow-lg text-white hover:shadow-xl transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2 text-success-foreground/80">Faturamento Total</p>
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

            <div className="metric-card group hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Ticket Médio</p>
                  <p className="text-3xl font-bold tracking-tight">{formatCurrency(ticketMedio)}</p>
                  <p className="text-sm font-medium mt-2 text-muted-foreground">Por venda</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <TrendingUp className="h-6 w-6 text-foreground" />
                </div>
              </div>
            </div>

            <div className="metric-card group hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Vendas Fechadas</p>
                  <p className="text-3xl font-bold tracking-tight">{vendas.length}</p>
                  <p className={`text-sm font-medium mt-2 ${tendenciaVendas >= 0 ? 'text-success' : 'text-danger'}`}>
                    {tendenciaVendas >= 0 ? '↑' : '↓'} {Math.abs(tendenciaVendas)}% vs mês anterior
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <Award className="h-6 w-6 text-foreground" />
                </div>
              </div>
            </div>

            <div className="metric-card group hover:shadow-lg transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2 text-muted-foreground">Taxa de Conversão</p>
                  <p className="text-3xl font-bold tracking-tight text-success">{taxaConversaoCloser}%</p>
                  <p className="text-sm font-medium mt-2 text-muted-foreground">Calls → Vendas</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <BarChart3 className="h-6 w-6 text-foreground" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Evolução de Faturamento</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={closerEvolutionData}>
                  <defs>
                    <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => [formatCurrency(value), 'Faturamento']} />
                  <Area type="monotone" dataKey="faturamento" stroke="hsl(var(--success))" fillOpacity={1} fill="url(#colorFaturamento)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Vendas e Ticket Médio</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={closerEvolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="vendas" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} name="Vendas" />
                  <Line yAxisId="right" type="monotone" dataKey="ticket" stroke="hsl(var(--success))" strokeWidth={2} dot={{ fill: 'hsl(var(--success))', r: 4 }} name="Ticket Médio" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Leads table for SDR */}
      {isSDR && leadsAsSDR.length > 0 && (
        <div className="bg-card rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-xl font-bold">Leads sob Responsabilidade</h3>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Etapa</th>
                <th>Produto</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {leadsAsSDR.map((lead: any) => (
                <tr key={lead.id}>
                  <td className="font-semibold">{lead.nome}</td>
                  <td>
                    <span className="text-sm">{lead.etapas_funil?.nome || "-"}</span>
                  </td>
                  <td className="text-sm">{lead.produtos?.nome || "-"}</td>
                  <td className="font-bold text-success">
                    {lead.valor_proposta ? formatCurrency(lead.valor_proposta) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MemberProfile;
