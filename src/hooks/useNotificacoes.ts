import { useMemo } from "react";
import { useLeads } from "./useLeads";
import { useEtapasFunil } from "./useEtapasFunil";
import { useMetas, calcularProgressoMeta } from "./useMetas";
import { useVendas } from "./useVendas";

export interface Notificacao {
  id: string;
  tipo: "follow_up" | "meta_diaria" | "meta_semanal" | "meta_mensal";
  titulo: string;
  descricao: string;
  prioridade: "alta" | "media" | "baixa";
  data: Date;
  leadId?: string;
}

export const useNotificacoes = () => {
  const { data: leads = [] } = useLeads(false);
  const { data: etapas = [] } = useEtapasFunil();
  const { data: metas = [] } = useMetas();
  
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0];
  const inicioHoje = hoje.toISOString().split('T')[0];
  const fimHoje = hoje.toISOString().split('T')[0];
  
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - hoje.getDay());
  const inicioSemanaStr = inicioSemana.toISOString().split('T')[0];
  const fimSemanaStr = hoje.toISOString().split('T')[0];
  
  const { data: vendasMes = [] } = useVendas(inicioMes, fimMes);
  const { data: vendasHoje = [] } = useVendas(inicioHoje, fimHoje);
  const { data: vendasSemana = [] } = useVendas(inicioSemanaStr, fimSemanaStr);
  
  const faturamentoMensal = vendasMes.reduce((sum, v) => sum + v.valor_final, 0);
  const faturamentoHoje = vendasHoje.reduce((sum, v) => sum + v.valor_final, 0);
  const faturamentoSemana = vendasSemana.reduce((sum, v) => sum + v.valor_final, 0);
  const metaAtual = metas[0];
  const progressoMeta = metaAtual ? calcularProgressoMeta(metaAtual, faturamentoMensal, faturamentoHoje, faturamentoSemana) : null;

  const notificacoes = useMemo(() => {
    const notifs: Notificacao[] = [];
    const agora = new Date();

    // Verificar leads que precisam de follow-up
    leads.forEach((lead) => {
      const etapa = etapas.find((e) => e.id === lead.etapa_id);
      if (!etapa) return;

      const ultimaMovimentacao = new Date(lead.ultima_movimentacao);
      const diferencaDias = Math.floor(
        (agora.getTime() - ultimaMovimentacao.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diferencaDias >= etapa.prazo_alerta_dias) {
        const diasParado = diferencaDias;
        notifs.push({
          id: `follow-up-${lead.id}`,
          tipo: "follow_up",
          titulo: `Follow-up urgente: ${lead.nome}`,
          descricao: `Lead parado há ${diasParado} dias na etapa "${etapa.nome}"`,
          prioridade: diasParado >= etapa.prazo_alerta_dias + 3 ? "alta" : "media",
          data: ultimaMovimentacao,
          leadId: lead.id,
        });
      }
    });

    // Verificar metas
    if (progressoMeta) {
      const hojeEDiaUtil = metaAtual && metaAtual.dias_trabalho.includes(agora.getDay());

      // Meta diária (alertar se estiver abaixo de 80% do esperado)
      if (hojeEDiaUtil && progressoMeta.faturamentoDiario < progressoMeta.metaDiaria * 0.8) {
        notifs.push({
          id: "meta-diaria",
          tipo: "meta_diaria",
          titulo: "Meta diária abaixo do esperado",
          descricao: `Faturamento hoje: R$ ${progressoMeta.faturamentoDiario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / Meta: R$ ${progressoMeta.metaDiaria.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          prioridade: progressoMeta.faturamentoDiario < progressoMeta.metaDiaria * 0.5 ? "alta" : "media",
          data: agora,
        });
      }

      // Meta semanal (alertar se estiver abaixo de 75% do esperado)
      if (faturamentoSemana < progressoMeta.progressoEsperadoSemana * 0.75) {
        notifs.push({
          id: "meta-semanal",
          tipo: "meta_semanal",
          titulo: "Meta semanal em risco",
          descricao: `Faturamento: R$ ${faturamentoSemana.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / Esperado: R$ ${progressoMeta.progressoEsperadoSemana.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          prioridade: "media",
          data: agora,
        });
      }

      // Meta mensal (alertar se estiver abaixo de 70% do esperado)
      if (faturamentoMensal < progressoMeta.progressoEsperadoMes * 0.7) {
        notifs.push({
          id: "meta-mensal",
          tipo: "meta_mensal",
          titulo: "Meta mensal crítica",
          descricao: `Faturamento: R$ ${faturamentoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / Esperado: R$ ${progressoMeta.progressoEsperadoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          prioridade: faturamentoMensal < progressoMeta.progressoEsperadoMes * 0.5 ? "alta" : "media",
          data: agora,
        });
      }
    }

    // Ordenar por prioridade
    return notifs.sort((a, b) => {
      const prioridadeOrdem = { alta: 0, media: 1, baixa: 2 };
      return prioridadeOrdem[a.prioridade] - prioridadeOrdem[b.prioridade];
    });
  }, [leads, etapas, progressoMeta, faturamentoMensal, faturamentoSemana, metaAtual]);

  return {
    notificacoes,
    totalNaoLidas: notificacoes.length,
    notificacoesAlta: notificacoes.filter((n) => n.prioridade === "alta").length,
  };
};
