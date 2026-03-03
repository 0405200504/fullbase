import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEtapasFunil } from "./useEtapasFunil";

interface PerformanceMetrics {
  sdrPerformance: {
    id: string;
    nome: string;
    leadsGerados: number;
    callsAgendadas: number;
    comparecimentos: number;
    taxaAgendamento: string;
    taxaComparecimento: string;
  }[];
  closerPerformance: {
    id: string;
    nome: string;
    callsRealizadas: number;
    propostasEnviadas: number;
    vendasFechadas: number;
    faturamento: number;
    taxaConversao: string;
  }[];
}


export const usePerformance = (dataInicio: string, dataFim: string) => {
  const { data: etapas = [] } = useEtapasFunil();
  
  return useQuery({
    queryKey: ["performance", dataInicio, dataFim, etapas],
    queryFn: async (): Promise<PerformanceMetrics> => {
      // Buscar account_id do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .single();

      if (!profile?.account_id) throw new Error("No account found");

      // Buscar todos os dados necessários
      const [leadsRes, callsRes, vendasRes, membersRes, rolesRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, sdr_id, closer_id, etapa_id, created_at")
          .gte("created_at", dataInicio)
          .lte("created_at", dataFim),
        supabase
          .from("calls")
          .select("id, lead_id, closer_id, status, resultado, created_at")
          .eq("arquivado", false)
          .gte("created_at", dataInicio)
          .lte("created_at", dataFim),
        supabase
          .from("vendas")
          .select("id, closer_id, valor_final, lead_id, reembolsada")
          .eq("reembolsada", false)
          .gte("data_fechamento", dataInicio.split('T')[0])
          .lte("data_fechamento", dataFim.split('T')[0]),
        supabase
          .from("team_members")
          .select("*")
          .eq("account_id", profile.account_id),
        supabase
          .from("team_member_roles")
          .select("team_member_id, role"),
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (callsRes.error) throw callsRes.error;
      if (vendasRes.error) throw vendasRes.error;
      if (membersRes.error) throw membersRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const leads = leadsRes.data || [];
      const calls = callsRes.data || [];
      const vendas = vendasRes.data || [];
      const members = membersRes.data || [];
      const roles = rolesRes.data || [];

      // Mapear membros com suas roles
      const membersWithRoles = members.map((member) => ({
        ...member,
        roles: roles
          .filter((r) => r.team_member_id === member.id)
          .map((r) => r.role),
      }));

      // Calcular performance dos SDRs
      const sdrs = membersWithRoles.filter(
        (m) => m.roles.includes("sdr") || leads.some((l) => l.sdr_id === m.id)
      );
      
      const sdrPerformance = sdrs.map((sdr) => {
        const leadsDoSdr = leads.filter((l) => l.sdr_id === sdr.id);
        const leadIdsDoSdr = leadsDoSdr.map((l) => l.id);
        
        // Calls relacionadas aos leads deste SDR
        const callsDoSdr = calls.filter((c) => leadIdsDoSdr.includes(c.lead_id));
        
        // Vendas relacionadas aos leads deste SDR
        const vendasDoSdr = vendas.filter((v) => leadIdsDoSdr.includes(v.lead_id));
        
        // REGRA: Toda venda conta como lead, call agendada e comparecimento
        const leadsGerados = Math.max(leadsDoSdr.length, vendasDoSdr.length);
        const callsAgendadas = Math.max(callsDoSdr.length, vendasDoSdr.length);
        const comparecimentos = Math.max(
          callsDoSdr.filter((c) => c.status === "concluida").length,
          vendasDoSdr.length
        );
        
        const taxaAgendamento = leadsGerados > 0 
          ? ((callsAgendadas / leadsGerados) * 100).toFixed(1) 
          : "0.0";
        const taxaComparecimento = callsAgendadas > 0 
          ? ((comparecimentos / callsAgendadas) * 100).toFixed(1) 
          : "0.0";

        return {
          id: sdr.id,
          nome: sdr.nome,
          leadsGerados,
          callsAgendadas,
          comparecimentos,
          taxaAgendamento: taxaAgendamento + "%",
          taxaComparecimento: taxaComparecimento + "%",
        };
      });

      // Calcular performance dos Closers
      const closerIdsFromData = Array.from(
        new Set([
          ...calls.map((c: any) => c.closer_id),
          ...vendas.map((v: any) => v.closer_id),
        ])
      );

      const closers = membersWithRoles.filter(
        (m) => m.roles.includes("closer") || closerIdsFromData.includes(m.id)
      );
      
      const closerPerformance = closers.map((closer) => {
        const callsDoCloser = calls.filter((c) => c.closer_id === closer.id);
        const vendasDoCloser = vendas.filter((v) => v.closer_id === closer.id);
        
        // REGRA: Toda venda conta como call realizada
        const callsRealizadas = Math.max(
          callsDoCloser.filter((c) => c.status === "concluida").length,
          vendasDoCloser.length
        );
        
        // Propostas: leads que chegaram em etapas avançadas relacionados a este closer
        const etapaProposta = etapas.find(e => e.tipo_etapa === 'proposta');
        const etapaFechamento = etapas.find(e => e.tipo_etapa === 'fechamento');
        
        const leadsDoCloser = leads.filter(
          (l) => l.closer_id === closer.id || 
          vendas.some(v => v.lead_id === l.id && v.closer_id === closer.id)
        );
        
        const propostasEnviadas = leadsDoCloser.filter((l) =>
          l.etapa_id === etapaProposta?.id || l.etapa_id === etapaFechamento?.id
        ).length;
        
        const vendasFechadas = vendasDoCloser.length;
        const faturamento = vendasDoCloser.reduce(
          (sum, v) => sum + v.valor_final,
          0
        );

        const taxaConversao = callsRealizadas > 0 
          ? ((vendasFechadas / callsRealizadas) * 100).toFixed(1) 
          : "0.0";

        return {
          id: closer.id,
          nome: closer.nome,
          callsRealizadas,
          propostasEnviadas,
          vendasFechadas,
          faturamento,
          taxaConversao: taxaConversao + "%",
        };
      });

      return {
        sdrPerformance,
        closerPerformance,
      };
    },
    enabled: etapas.length > 0,
  });
};
