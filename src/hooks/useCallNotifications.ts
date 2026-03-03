import { useEffect, useState } from "react";
import { useCalls } from "./useCalls";
import { differenceInMinutes, parseISO, isFuture } from "date-fns";
import { toast } from "sonner";

export const useCallNotifications = () => {
  const [notifiedCalls, setNotifiedCalls] = useState<Set<string>>(new Set());
  
  // Buscar calls das próximas 2 horas
  const hoje = new Date();
  const duasHorasDepois = new Date(hoje.getTime() + 2 * 60 * 60 * 1000);
  
  const { data: calls = [] } = useCalls({
    dataInicio: hoje.toISOString(),
    dataFim: duasHorasDepois.toISOString(),
    status: "agendada",
  });

  useEffect(() => {
    const checkCalls = () => {
      const agora = new Date();
      
      calls.forEach((call) => {
        if (notifiedCalls.has(call.id)) return;
        
        const dataHoraCall = parseISO(call.data_hora_agendada);
        
        // Verificar se é futuro
        if (!isFuture(dataHoraCall)) return;
        
        const minutosAte = differenceInMinutes(dataHoraCall, agora);
        
        // Notificar 15 minutos antes
        if (minutosAte <= 15 && minutosAte > 0) {
          toast.warning(`Call em ${minutosAte} minutos!`, {
            description: `Call com ${call.leads?.nome || 'lead'} às ${new Date(call.data_hora_agendada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            duration: 10000,
          });
          
          setNotifiedCalls((prev) => new Set([...prev, call.id]));
        }
      });
    };

    // Verificar a cada minuto
    const interval = setInterval(checkCalls, 60000);
    checkCalls(); // Verificar imediatamente

    return () => clearInterval(interval);
  }, [calls, notifiedCalls]);

  return { upcomingCalls: calls };
};
