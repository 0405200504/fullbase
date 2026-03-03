import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Conversation {
  id: string;
  account_id: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  account?: {
    nome_empresa: string;
    owner?: {
      nome: string;
      email: string;
    };
  };
  unread_count?: number;
  last_message?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'user' | 'super_admin';
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    nome: string;
  };
}

// Hook para buscar conversas (para super admin)
export const useConversations = () => {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      // Usar função RPC para buscar conversas com dados do owner
      const { data, error } = await supabase
        .rpc("get_support_conversations");

      if (error) throw error;

      // Buscar contagem de mensagens não lidas e última mensagem para cada conversa
      const conversationsWithUnread = await Promise.all(
        (data || []).map(async (conv: any) => {
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("is_read", false)
            .eq("sender_role", "user");

          const { data: lastMessage } = await supabase
            .from("messages")
            .select("content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: conv.id,
            account_id: conv.account_id,
            status: conv.status,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
            account: {
              nome_empresa: conv.nome_empresa,
              owner: {
                nome: conv.owner_nome,
                email: conv.owner_email,
              },
            },
            unread_count: count || 0,
            last_message: lastMessage?.content || "",
          };
        })
      );

      return conversationsWithUnread as Conversation[];
    },
  });
};

// Hook para buscar a conversa do usuário atual
export const useMyConversation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["my-conversation", user?.id],
    queryFn: async () => {
      if (!user) {
        console.log("User not authenticated");
        return null;
      }

      console.log("Fetching conversation for user:", user.id);

      // Buscar account_id do usuário
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("account_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        throw profileError;
      }

      if (!profile) {
        console.error("Profile not found");
        return null;
      }

      console.log("Profile found:", profile);

      // Buscar ou criar conversa
      let { data: conversation, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("account_id", profile.account_id)
        .maybeSingle();

      console.log("Existing conversation:", conversation, "Error:", error);

      // Se não existe, criar uma nova
      if (!conversation) {
        console.log("Creating new conversation for account:", profile.account_id);
        const { data: newConv, error: createError } = await supabase
          .from("conversations")
          .insert([{ account_id: profile.account_id }])
          .select()
          .single();

        if (createError) {
          console.error("Error creating conversation:", createError);
          throw createError;
        }
        
        console.log("New conversation created:", newConv);
        conversation = newConv;
        
        // Invalidar queries para atualizar a lista de conversas
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }

      return conversation as Conversation;
    },
    enabled: !!user,
    retry: 1,
  });
};

// Hook para buscar mensagens de uma conversa
export const useMessages = (conversationId: string | undefined) => {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []) as Message[];
    },
    enabled: !!conversationId,
  });
};

// Hook para enviar mensagem
export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      senderRole,
    }: {
      conversationId: string;
      content: string;
      senderRole: "user" | "super_admin";
    }) => {
      if (!user) {
        console.error("User not authenticated");
        throw new Error("User not authenticated");
      }

      console.log("Sending message:", { conversationId, content, senderRole, userId: user.id });

      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            conversation_id: conversationId,
            sender_id: user.id,
            sender_role: senderRole,
            content,
            is_read: false,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        throw error;
      }

      console.log("Message sent successfully:", data);

      // Atualizar updated_at da conversa
      const { error: updateError } = await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      if (updateError) {
        console.error("Error updating conversation:", updateError);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["my-conversation"] });
    },
  });
};

// Hook para marcar mensagens como lidas
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      senderRole,
    }: {
      conversationId: string;
      senderRole: "user" | "super_admin";
    }) => {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .eq("sender_role", senderRole)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

// Hook para contar mensagens não lidas do usuário
export const useUnreadCount = () => {
  const { user } = useAuth();
  const { data: conversation } = useMyConversation();

  return useQuery({
    queryKey: ["unread-count", conversation?.id],
    queryFn: async () => {
      if (!conversation) return 0;

      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conversation.id)
        .eq("sender_role", "super_admin")
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user && !!conversation,
    refetchInterval: 5000, // Atualizar a cada 5 segundos
  });
};
