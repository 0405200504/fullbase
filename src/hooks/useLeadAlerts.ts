import { useMemo } from "react";
import { Lead } from "./useLeads";
import { EtapaFunil } from "./useEtapasFunil";

export const useLeadAlerts = (leads: Lead[], etapas: EtapaFunil[]) => {
  return useMemo(() => {
    const now = new Date();
    const leadsComAlerta = leads.map((lead) => {
      const etapa = etapas.find((e) => e.id === lead.etapa_id);
      if (!etapa) return { ...lead, precisaFollowup: false, diasParado: 0 };

      const ultimaMovimentacao = new Date(lead.ultima_movimentacao);
      const diferencaDias = Math.floor(
        (now.getTime() - ultimaMovimentacao.getTime()) / (1000 * 60 * 60 * 24)
      );

      const precisaFollowup = diferencaDias >= etapa.prazo_alerta_dias;

      return {
        ...lead,
        precisaFollowup,
        diasParado: diferencaDias,
      };
    });

    return leadsComAlerta;
  }, [leads, etapas]);
};
