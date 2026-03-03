import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, Search } from "lucide-react";
import { useConversations, useMessages, useSendMessage, useMarkAsRead } from "@/hooks/useSupport";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

const Support = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const { data: conversations, refetch: refetchConversations } = useConversations();
  
  // Filtrar conversas com base no termo de busca
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    if (!searchTerm.trim()) return conversations;
    
    const term = searchTerm.toLowerCase();
    return conversations.filter((conv) => {
      const empresa = conv.account?.nome_empresa?.toLowerCase() || "";
      const email = conv.account?.owner?.email?.toLowerCase() || "";
      const nome = conv.account?.owner?.nome?.toLowerCase() || "";
      
      return empresa.includes(term) || email.includes(term) || nome.includes(term);
    });
  }, [conversations, searchTerm]);
  const { data: messages, refetch: refetchMessages } = useMessages(selectedConversation || undefined);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  // Realtime subscription para novas conversas e mensagens
  useEffect(() => {
    const conversationsChannel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          refetchConversations();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          refetchMessages();
          refetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [refetchConversations, refetchMessages]);

  // Realtime subscription for typing indicator on selected conversation
  useEffect(() => {
    if (!selectedConversation) {
      setIsTyping(false);
      return;
    }

    const channel = supabase
      .channel(`messages-${selectedConversation}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presences = Object.values(state).flat() as any[];
        const userTyping = presences.some((p: any) => p.role === 'user' && p.typing);
        setIsTyping(userTyping);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsTyping(false);
    };
  }, [selectedConversation]);

  // Scroll para o final quando novas mensagens chegarem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Marcar mensagens como lidas quando selecionar uma conversa
  useEffect(() => {
    if (selectedConversation) {
      markAsRead.mutate({ conversationId: selectedConversation, senderRole: "user" });
    }
  }, [selectedConversation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    // Send typing indicator
    if (channelRef.current && selectedConversation) {
      channelRef.current.track({ role: 'super_admin', typing: true });
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing indicator after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        if (channelRef.current) {
          channelRef.current.track({ role: 'super_admin', typing: false });
        }
      }, 2000);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedConversation) return;

    console.log("Super admin sending message:", { conversationId: selectedConversation, content: message });

    // Stop typing indicator
    if (channelRef.current) {
      channelRef.current.track({ role: 'super_admin', typing: false });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      await sendMessage.mutateAsync({
        conversationId: selectedConversation,
        content: message,
        senderRole: "super_admin",
      });
      setMessage("");
      console.log("Message sent successfully from super admin");
    } catch (error) {
      console.error("Erro ao enviar mensagem (super admin):", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedConv = conversations?.find((c) => c.id === selectedConversation);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Suporte</h1>
        <p className="text-muted-foreground">Gerencie as conversas de suporte dos usuários</p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Lista de Conversas */}
        <Card className="col-span-4 flex flex-col">
          <CardHeader className="space-y-4">
            <CardTitle>Conversas</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por empresa ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {filteredConversations?.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedConversation === conv.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="font-semibold">{conv.account?.nome_empresa}</p>
                      <p className="text-sm text-muted-foreground">
                        {conv.account?.owner?.nome}
                      </p>
                    </div>
                    {conv.unread_count && conv.unread_count > 0 && (
                      <Badge variant="destructive">{conv.unread_count}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.last_message || "Sem mensagens"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(conv.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              ))}
              {filteredConversations.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>
                    {searchTerm ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Janela de Chat */}
        <Card className="col-span-8 flex flex-col">
          {selectedConv ? (
            <>
              <CardHeader className="border-b">
                <div>
                  <CardTitle>{selectedConv.account?.nome_empresa}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedConv.account?.owner?.nome} • {selectedConv.account?.owner?.email}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender_role === "super_admin" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.sender_role === "super_admin"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {msg.sender_role === "user" && (
                            <p className="text-xs font-semibold mb-1">
                              {msg.sender?.nome || "Usuário"}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-end">
                      <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-[80%]">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-2 h-2 bg-primary-foreground/60 rounded-full animate-bounce"></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              </CardContent>

              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={message}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    disabled={sendMessage.isPending}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || sendMessage.isPending}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Selecione uma conversa para começar</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Support;
