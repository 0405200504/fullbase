import { useEffect, useState } from "react";
import { useLeads } from "./useLeads";
import { useEtapasFunil } from "./useEtapasFunil";
import { differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";

export const useLeadStagnationNotifications = () => {
  const [notifiedLeads, setNotifiedLeads] = useState<Set<string>>(new Set());
  const { data: leads = [] } = useLeads(false); // Apenas não arquivados
  const { data: etapas = [] } = useEtapasFunil();

  useEffect(() => {
    const checkLeads = () => {
      const agora = new Date();
      
      leads.forEach((lead) => {
        if (notifiedLeads.has(lead.id)) return;
        if (!lead.ultima_movimentacao) return;
        
        const etapa = etapas.find((e) => e.id === lead.etapa_id);
        if (!etapa || !etapa.prazo_alerta_dias) return;
        
        const ultimaMovimentacao = parseISO(lead.ultima_movimentacao);
        const diasParado = differenceInDays(agora, ultimaMovimentacao);
        
        // Notificar se ultrapassou o prazo de alerta
        if (diasParado >= etapa.prazo_alerta_dias) {
          toast.error(`Lead parado há ${diasParado} dias!`, {
            description: `${lead.nome} está em "${etapa.nome}" há ${diasParado} dias`,
            duration: 15000,
            action: {
              label: "Ver lead",
              onClick: () => {
                // Abrir detalhes do lead
                window.location.href = `/pipeline`;
              },
            },
          });
          
          setNotifiedLeads((prev) => new Set([...prev, lead.id]));
        }
      });
    };

    // Verificar a cada 5 minutos
    const interval = setInterval(checkLeads, 5 * 60 * 1000);
    checkLeads(); // Verificar imediatamente

    return () => clearInterval(interval);
  }, [leads, etapas, notifiedLeads]);

  return { stalledLeads: leads.filter((lead) => notifiedLeads.has(lead.id)) };
};
