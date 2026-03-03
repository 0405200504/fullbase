import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonate } from "@/contexts/ImpersonateContext";

export interface Meta {
  id: string;
  nome: string;
  valor_mensal: number;
  mes: number;
  ano: number;
  dias_trabalho: number[];
  ativo: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
}

export const useMetas = () => {
  const { effectiveAccountId, isImpersonating } = useImpersonate();
  
  return useQuery({
    queryKey: ["metas", effectiveAccountId],
    queryFn: async () => {
      if (!effectiveAccountId) return [];
      
      const hoje = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("metas")
        .select("*")
        .eq("account_id", effectiveAccountId)
        .eq("ativo", true)
        .lte("start_date", hoje)
        .gte("end_date", hoje)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Meta[];
    },
    enabled: !!effectiveAccountId,
    // Refetch em tempo real quando em modo impersonate
    refetchInterval: isImpersonating ? 3000 : false,
  });
};

export const useCreateMeta = () => {
  const queryClient = useQueryClient();
  const { effectiveAccountId } = useImpersonate();
  
  return useMutation({
    mutationFn: async (meta: Omit<Meta, "id" | "created_at" | "updated_at" | "ativo">) => {
      if (!effectiveAccountId) {
        throw new Error("Não foi possível identificar a conta.");
      }

      // Desativar metas anteriores do mesmo mês/ano para essa conta
      await supabase
        .from("metas")
        .update({ ativo: false })
        .eq("mes", meta.mes)
        .eq("ano", meta.ano)
        .eq("account_id", effectiveAccountId);

      // Criar nova meta ativa para a conta atual
      const { data, error } = await supabase
        .from("metas")
        .insert([{ ...meta, ativo: true, account_id: effectiveAccountId }])
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas"] });
    },
  });
};

export const useUpdateMeta = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...meta }: Partial<Meta> & { id: string }) => {
      const { data, error } = await supabase
        .from("metas")
        .update(meta)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas"] });
    },
  });
};

export const useDeleteMeta = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("metas")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metas"] });
      queryClient.invalidateQueries({ queryKey: ["metas-historico"] });
    },
  });
};

// Função auxiliar para calcular metas com redistribuição automática
export const calcularProgressoMeta = (meta: Meta, faturamentoMensal: number, faturamentoDiarioAtual: number, faturamentoSemanalAtual: number) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const dataInicio = new Date(meta.start_date);
  dataInicio.setHours(0, 0, 0, 0);
  
  const dataFim = new Date(meta.end_date);
  dataFim.setHours(23, 59, 59, 999);
  
  // Contar dias úteis no período da meta (start_date até end_date)
  let diasUteisNoMes = 0;
  let diasUteisDecorridos = 0;
  let diasUteisRestantes = 0;
  
  const dataAtual = new Date(dataInicio);
  while (dataAtual <= dataFim) {
    const diaSemana = dataAtual.getDay();
    if (meta.dias_trabalho.includes(diaSemana)) {
      diasUteisNoMes++;
      
      if (dataAtual < hoje) {
        diasUteisDecorridos++;
      } else {
        diasUteisRestantes++;
      }
    }
    dataAtual.setDate(dataAtual.getDate() + 1);
  }
  
  // Calcular dias úteis na semana atual (dentro do período da meta)
  const inicioDaSemana = new Date(hoje);
  inicioDaSemana.setDate(hoje.getDate() - hoje.getDay());
  inicioDaSemana.setHours(0, 0, 0, 0);
  
  const fimDaSemana = new Date(inicioDaSemana);
  fimDaSemana.setDate(inicioDaSemana.getDate() + 6);
  fimDaSemana.setHours(23, 59, 59, 999);
  
  // Ajustar semana para não ultrapassar os limites da meta
  const inicioSemanaAjustado = inicioDaSemana < dataInicio ? dataInicio : inicioDaSemana;
  const fimSemanaAjustado = fimDaSemana > dataFim ? dataFim : fimDaSemana;
  
  let diasUteisSemana = 0;
  let diasUteisDecorridosSemana = 0;
  let diasUteisRestantesSemana = 0;
  
  const dataAtualSemana = new Date(inicioSemanaAjustado);
  while (dataAtualSemana <= fimSemanaAjustado) {
    if (meta.dias_trabalho.includes(dataAtualSemana.getDay())) {
      diasUteisSemana++;
      if (dataAtualSemana < hoje) {
        diasUteisDecorridosSemana++;
      } else {
        diasUteisRestantesSemana++;
      }
    }
    dataAtualSemana.setDate(dataAtualSemana.getDate() + 1);
  }
  
  // REDISTRIBUIÇÃO AUTOMÁTICA
  // Calcular o valor pendente (quanto falta para atingir meta até agora)
  const metaEsperadaAteHoje = diasUteisDecorridos > 0 
    ? (meta.valor_mensal / diasUteisNoMes) * diasUteisDecorridos 
    : 0;
  const valorPendente = Math.max(0, metaEsperadaAteHoje - faturamentoMensal);

  // Quanto falta para bater a meta do mês (independente do esperado até hoje)
  const valorFaltanteMes = Math.max(0, meta.valor_mensal - faturamentoMensal);
  
  // Redistribuir o valor faltante nos dias úteis restantes
  const metaDiariaRedistribuida = diasUteisRestantes > 0 
    ? valorFaltanteMes / diasUteisRestantes
    : 0;
  
  const metaDiariaOriginal = diasUteisNoMes > 0 ? meta.valor_mensal / diasUteisNoMes : 0;
  
  // A meta diária exibida é a redistribuída se houver pendências, senão é a original
  const metaDiaria = diasUteisRestantes > 0 ? metaDiariaRedistribuida : metaDiariaOriginal;
  
  // Meta semanal bruta: dias úteis já passados na semana com meta original
  // + dias úteis restantes na semana com meta diária atual (redistribuída)
  const metaSemanalBruta = diasUteisSemana > 0 
    ? (metaDiariaOriginal * diasUteisDecorridosSemana) + (metaDiaria * diasUteisRestantesSemana)
    : 0;

  // Nunca pode faltar mais na semana do que falta no mês
  const metaSemanal = Math.min(valorFaltanteMes, metaSemanalBruta);
  
  // Progresso esperado até agora (com base na meta original, não redistribuída)
  const progressoEsperadoMes = diasUteisDecorridos * metaDiariaOriginal;
  const progressoEsperadoSemana = diasUteisDecorridosSemana * metaDiariaOriginal;
  
  return {
    metaDiaria,
    metaDiariaOriginal,
    metaDiariaRedistribuida,
    valorPendente,
    metaSemanal,
    metaMensal: meta.valor_mensal,
    faturamentoDiario: faturamentoDiarioAtual,
    faturamentoSemanal: faturamentoSemanalAtual,
    faturamentoMensal: faturamentoMensal,
    progressoDiario: metaDiaria > 0 ? (faturamentoDiarioAtual / metaDiaria) * 100 : 0,
    progressoSemanal: metaSemanal > 0 ? (faturamentoSemanalAtual / metaSemanal) * 100 : 0,
    progressoMensal: meta.valor_mensal > 0 ? (faturamentoMensal / meta.valor_mensal) * 100 : 0,
    diasUteisNoMes,
    diasUteisDecorridos,
    diasUteisRestantes,
    progressoEsperadoMes,
    progressoEsperadoSemana,
  };
};