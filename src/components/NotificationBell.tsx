import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

export const NotificationBell = () => {
  const { notificacoes, totalNaoLidas } = useNotificacoes();
  const navigate = useNavigate();

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case "alta":
        return "text-danger bg-danger/10";
      case "media":
        return "text-warning bg-warning/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const handleNotificationClick = (notif: any) => {
    if (notif.leadId) {
      navigate("/pipeline");
    } else if (notif.tipo.includes("meta")) {
      navigate("/");
    }
  };

  return (
    <Popover modal={false}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalNaoLidas > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-danger text-white text-xs rounded-full flex items-center justify-center font-semibold">
              {totalNaoLidas > 9 ? "9+" : totalNaoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-lg">Notificações</h3>
          {totalNaoLidas > 0 && (
            <p className="text-sm text-muted-foreground">
              Você tem {totalNaoLidas} {totalNaoLidas === 1 ? "notificação" : "notificações"}
            </p>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {notificacoes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notificacoes.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${getPrioridadeColor(notif.prioridade)}`}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm">{notif.titulo}</p>
                        <Badge
                          variant={notif.prioridade === "alta" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {notif.prioridade}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notif.descricao}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {notif.data.toLocaleDateString('pt-BR')} às {notif.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
