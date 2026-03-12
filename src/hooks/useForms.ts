import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useImpersonate } from "@/contexts/ImpersonateContext";
import { toast } from "sonner";
import type { LeadQualification } from "@/types/formBuilder";

export interface FormData {
  id: string;
  account_id: string;
  slug: string;
  title: string;
  theme: { bgColor: string; textColor: string; buttonColor: string; buttonBorderColor?: string; buttonShadow?: boolean; buttonOutline?: boolean; textShadow?: boolean };
  logo: { url: string; position: string } | null;
  background_image: string | null;
  questions: any[];
  thank_you_screen: { text: string; videoUrl?: string; redirectUrl?: string; ctaText?: string };
  field_mappings: any[];
  lead_qualification: LeadQualification | null;
  webhook_url: string | null;
  active: boolean;
  views_count: number;
  submissions_count: number;
  created_at: string;
  updated_at: string;
}

export const useForms = () => {
  const { effectiveAccountId } = useImpersonate();

  return useQuery({
    queryKey: ["forms", effectiveAccountId],
    queryFn: async () => {
      if (!effectiveAccountId) return [];
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("account_id", effectiveAccountId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FormData[];
    },
    enabled: !!effectiveAccountId,
  });
};

export const useFormBySlug = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["form-by-slug", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("slug", slug)
        .eq("active", true)
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as FormData;
    },
    enabled: !!slug,
  });
};

export const useFormById = (id: string | null) => {
  return useQuery({
    queryKey: ["form-by-id", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as FormData;
    },
    enabled: !!id,
  });
};

export const useCreateForm = () => {
  const queryClient = useQueryClient();
  const { effectiveAccountId } = useImpersonate();

  return useMutation({
    mutationFn: async (form: { title: string; slug: string }) => {
      if (!effectiveAccountId) throw new Error("No account");
      const { data, error } = await supabase
        .from("forms")
        .insert({
          account_id: effectiveAccountId,
          title: form.title,
          slug: form.slug,
          theme: { bgColor: "#ffffff", textColor: "#171717", buttonColor: "#4285f4" },
          questions: [],
          thank_you_screen: { text: "Obrigado por responder! 🎉", ctaText: "Voltar" },
          field_mappings: [],
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      toast.success("Formulário criado!");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useUpdateForm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("forms")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      queryClient.invalidateQueries({ queryKey: ["form-by-id", data.id] });
      queryClient.invalidateQueries({ queryKey: ["form-by-slug", data.slug] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteForms = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("forms")
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      toast.success("Formulário(s) removido(s)!");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useDeleteFormResponse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("form_responses")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["form-responses"] });
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      toast.success("Resposta excluída!");
    },
    onError: (e: any) => toast.error(e.message),
  });
};

export const useSubmitFormResponse = () => {
  return useMutation({
    mutationFn: async (payload: {
      form_id: string;
      account_id: string;
      answers: any[];
      mapped_data: Record<string, string>;
      metadata?: Record<string, any>;
      lead_qualification?: LeadQualification | null;
      webhook_url?: string | null;
      response_id?: string | null; // Added for updates
    }) => {
      let response;
      let error;

      if (payload.response_id) {
        const { data, error: updateError } = await supabase
          .from("form_responses")
          .update({
            answers: payload.answers as any,
            mapped_data: payload.mapped_data as any,
            metadata: (payload.metadata || {}) as any,
          } as any)
          .eq("id", payload.response_id)
          .select()
          .single();
        response = data;
        error = updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from("form_responses")
          .insert({
            form_id: payload.form_id,
            account_id: payload.account_id,
            answers: payload.answers as any,
            mapped_data: payload.mapped_data as any,
            metadata: (payload.metadata || {}) as any,
          } as any)
          .select()
          .single();
        response = data;
        error = insertError;
      }

      if (error) throw error;

      const md = payload.mapped_data;
      const hasNome = !!(md.nome && md.nome.trim());
      const hasTelefone = !!(md.telefone && md.telefone.trim());

      let linkedLeadId: string | null = (response as any)?.lead_id || null;

      // Only create/update lead if we have name and phone, AND we haven't already linked a lead for this response
      // or if we want to ensure information is synced. 
      // The RPC should ideally be idempotent.
      if (hasNome && hasTelefone) {
        const parseNullableNumber = (value?: string | null) => {
          if (!value) return null;
          const strVal = String(value).replace(/[^\d.,]/g, "").replace(",", ".");
          const parsed = parseFloat(strVal);
          return Number.isFinite(parsed) ? parsed : null;
        };

        const { data: leadId, error: rpcError } = await supabase.rpc(
          "create_lead_from_form" as any,
          {
            p_account_id: payload.account_id,
            p_form_id: payload.form_id,
            p_nome: md.nome,
            p_telefone: md.telefone,
            p_email: md.email || null,
            p_fonte_trafego: md.fonte_trafego || "Formulário",
            p_renda_mensal: parseNullableNumber(md.renda_mensal),
            p_investimento_disponivel: parseNullableNumber(md.investimento_disponivel),
            p_dificuldades: md.dificuldades || null,
          }
        );

        if (rpcError) {
          console.error("RPC Error:", rpcError);
        } else if (leadId) {
          linkedLeadId = leadId;
          await supabase
            .from("form_responses")
            .update({ lead_id: leadId } as any)
            .eq("id", (response as any).id);
        }
      }

      // Trigger webhook if configured
      if (payload.webhook_url) {
        try {
          fetch(payload.webhook_url, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              form_id: payload.form_id,
              response_id: (response as any).id,
              lead_id: linkedLeadId,
              answers: payload.answers,
              mapped_data: md,
              metadata: payload.metadata
            })
          }).catch(err => console.error("Webhook Error:", err));
        } catch (e) {
          console.error("Failed to trigger webhook", e);
        }
      }

      return {
        ...(response as any),
        lead_id: linkedLeadId ?? (response as any)?.lead_id ?? null,
      };
    },
  });
};

export const useFormResponses = (formId: string | null) => {
  return useQuery({
    queryKey: ["form-responses", formId],
    queryFn: async () => {
      if (!formId) return [];
      const { data, error } = await supabase
        .from("form_responses")
        .select("*")
        .eq("form_id", formId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!formId,
  });
};

export const useAllFormResponses = () => {
  const { effectiveAccountId } = useImpersonate();

  return useQuery({
    queryKey: ["all-form-responses", effectiveAccountId],
    queryFn: async () => {
      if (!effectiveAccountId) return [];
      const { data, error } = await supabase
        .from("form_responses")
        .select("form_id, created_at")
        .eq("account_id", effectiveAccountId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveAccountId,
  });
};