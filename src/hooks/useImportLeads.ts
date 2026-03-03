import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MappedLead {
  nome: string;
  telefone: string;
  email?: string | null;
  produto_nome?: string | null;
  valor_proposta?: number | null;
  etapa_nome?: string | null;
  sdr_nome?: string | null;
  fonte_trafego?: string | null;
  renda_mensal?: number | null;
  investimento_disponivel?: number | null;
  dificuldades?: string | null;
}

interface LookupData {
  produtos: Array<{ id: string; nome: string }>;
  etapas: Array<{ id: string; nome: string; ordem: number }>;
  sdrs: Array<{ id: string; nome: string }>;
}

export const useImportLeads = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leads, lookupData }: { leads: MappedLead[]; lookupData: LookupData }) => {
      // Get account_id for the current user
      const { data: accountId, error: accountError } = await supabase.rpc("get_user_account_id");
      if (accountError) throw accountError;
      if (!accountId) throw new Error("Unable to determine user account");

      // Verificar limite do plano usando função can_add_lead antes de importar
      const { data: canAdd, error: checkError } = await supabase
        .rpc("can_add_lead", { p_account_id: accountId });

      if (checkError) throw checkError;
      
      if (!canAdd) {
        throw new Error("Limite de leads atingido para o plano atual. Faça upgrade do plano para adicionar mais leads.");
      }

      // Contar leads que serão criados (não existentes)
      let newLeadsCount = 0;
      for (const lead of leads) {
        const { data: existingLead } = await supabase
          .from("leads")
          .select("id")
          .eq("telefone", lead.telefone)
          .eq("account_id", accountId)
          .maybeSingle();
        
        if (!existingLead) newLeadsCount++;
      }

      // Obter plano para verificar espaço disponível
      const { data: planData } = await supabase
        .rpc("get_account_plan", { p_account_id: accountId });
      const maxLeads = (planData as any)?.max_leads || 25;

      const { count: currentLeadsCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("arquivado", false);

      const availableSlots = maxLeads - (currentLeadsCount || 0);

      if (newLeadsCount > availableSlots) {
        throw new Error(`Você pode importar apenas ${availableSlots} leads novos. Seu plano permite até ${maxLeads} leads. Faça upgrade para adicionar mais.`);
      }

      // Get the first stage (ordem = 1) as default for leads without stage
      const firstStage = lookupData.etapas.find(e => e.ordem === 1) || lookupData.etapas[0];
      if (!firstStage) throw new Error("Nenhuma etapa encontrada no funil");

      let imported = 0;
      let updated = 0;
      let errors: string[] = [];

      for (const lead of leads) {
        try {
          // Convert names to IDs
          let produto_id = null;
          let etapa_id = null;
          let sdr_id = null;

          if (lead.produto_nome) {
            const produto = lookupData.produtos.find(
              p => p.nome.toLowerCase().trim() === lead.produto_nome?.toLowerCase().trim()
            );
            produto_id = produto?.id || null;
          }

          if (lead.etapa_nome) {
            const etapa = lookupData.etapas.find(
              e => e.nome.toLowerCase().trim() === lead.etapa_nome?.toLowerCase().trim()
            );
            etapa_id = etapa?.id || firstStage.id; // Use first stage if not found
          } else {
            etapa_id = firstStage.id; // Default to first stage
          }

          if (lead.sdr_nome) {
            const sdr = lookupData.sdrs.find(
              s => s.nome.toLowerCase().trim() === lead.sdr_nome?.toLowerCase().trim()
            );
            sdr_id = sdr?.id || null;
          }

          // Check if lead exists by phone
          const { data: existingLead } = await supabase
            .from("leads")
            .select("id")
            .eq("telefone", lead.telefone)
            .eq("account_id", accountId)
            .maybeSingle();

          if (existingLead) {
            // Update existing lead
            const { error: updateError } = await supabase
              .from("leads")
              .update({
                nome: lead.nome,
                email: lead.email,
                produto_id,
                valor_proposta: lead.valor_proposta,
                etapa_id,
                sdr_id,
                fonte_trafego: lead.fonte_trafego,
                renda_mensal: lead.renda_mensal,
                investimento_disponivel: lead.investimento_disponivel,
                dificuldades: lead.dificuldades,
              })
              .eq("id", existingLead.id);

            if (updateError) throw updateError;
            updated++;
          } else {
            // Insert new lead
            const { error: insertError } = await supabase
              .from("leads")
              .insert([{
                nome: lead.nome,
                telefone: lead.telefone,
                email: lead.email,
                produto_id,
                valor_proposta: lead.valor_proposta,
                etapa_id,
                sdr_id,
                fonte_trafego: lead.fonte_trafego,
                renda_mensal: lead.renda_mensal,
                investimento_disponivel: lead.investimento_disponivel,
                dificuldades: lead.dificuldades,
                account_id: accountId
              }]);

            if (insertError) throw insertError;
            imported++;
          }
        } catch (error: any) {
          errors.push(`${lead.nome} (${lead.telefone}): ${error.message}`);
        }
      }

      return { imported, updated, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      
      if (result.errors.length === 0) {
        toast.success(
          `Importação concluída! ${result.imported} leads criados, ${result.updated} atualizados.`
        );
      } else {
        toast.warning(
          `Importação parcial: ${result.imported} criados, ${result.updated} atualizados. ${result.errors.length} erros.`,
          {
            description: result.errors.slice(0, 3).join(", "),
          }
        );
      }
    },
    onError: (error: Error) => {
      toast.error("Erro ao importar leads: " + error.message);
    },
  });
};
