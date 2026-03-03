import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, MessageCircle } from "lucide-react";
import { useMyConversation, useMessages, useSendMessage, useMarkAsRead, useUnreadCount } from "@/hooks/useSupport";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export const SupportChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const { toast } = useToast();

  const { data: conversation, isLoading: isLoadingConversation, error: conversationError } = useMyConversation();
  const { data: messages, refetch: refetchMessages } = useMessages(conversation?.id);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const { data: unreadCount } = useUnreadCount();

  // Debug logs
  useEffect(() => {
    console.log("Conversation:", conversation);
    console.log("Is Loading:", isLoadingConversation);
    console.log("Error:", conversationError);
  }, [conversation, isLoadingConversation, conversationError]);

  // Realtime subscription for messages and typing indicator
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`messages-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => {
          refetchMessages();
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presences = Object.values(state).flat() as any[];
        const adminTyping = presences.some((p: any) => p.role === 'super_admin' && p.typing);
        setIsTyping(adminTyping);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversation?.id, refetchMessages]);

  // Scroll para o final quando novas mensagens chegarem
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Marcar mensagens como lidas quando abrir o widget
  useEffect(() => {
    if (isOpen && conversation?.id) {
      markAsRead.mutate({ conversationId: conversation.id, senderRole: "super_admin" });
    }
  }, [isOpen, conversation?.id]);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    if (!conversation) {
      console.error("Conversa não disponível ainda");
      toast({
        title: "Erro",
        description: "Aguarde enquanto a conversa está sendo carregada...",
        variant: "destructive",
      });
      return;
    }

    console.log("Enviando mensagem:", { conversationId: conversation.id, content: message });

    try {
      await sendMessage.mutateAsync({
        conversationId: conversation.id,
        content: message,
        senderRole: "user",
      });
      setMessage("");
    } catch (error: any) {
      console.error("Erro ao enviar mensagem:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    // Send typing indicator
    if (channelRef.current && conversation?.id) {
      channelRef.current.track({ role: 'user', typing: true });
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing indicator after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.track({ role: 'user', typing: false });
        }
      }, 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount && unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive">
            {unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-2xl z-50 flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <CardTitle className="text-lg">Suporte HighLeads</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4">
          {isLoadingConversation ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Carregando conversa...</p>
            </div>
          ) : conversationError ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
              <p className="text-destructive text-center">Erro ao carregar conversa</p>
              <p className="text-xs text-muted-foreground text-center">{conversationError.message}</p>
            </div>
          ) : !conversation ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Iniciando conversa...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages && messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-sm">
                    Envie uma mensagem para iniciar a conversa com o suporte
                  </p>
                </div>
              )}
              {messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.sender_role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.sender_role === "super_admin" && (
                      <p className="text-xs font-semibold mb-1">Suporte</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 max-w-[80%]">
                    <p className="text-xs font-semibold mb-1">Suporte</p>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t p-4">
        <div className="flex gap-2 w-full">
          <Input
            placeholder="Digite sua mensagem..."
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={sendMessage.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessage.isPending || !conversation}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
