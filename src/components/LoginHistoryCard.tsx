import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Monitor, Smartphone, Tablet, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LoginHistoryEntry {
  id: string;
  login_time: string;
  ip_address: string;
  user_agent: string;
  device_info: any;
  location_info: any;
  success: boolean;
  failure_reason: string | null;
}

export const LoginHistoryCard = () => {
  const { data: loginHistory, isLoading } = useQuery({
    queryKey: ["login-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_history")
        .select("*")
        .order("login_time", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as LoginHistoryEntry[];
    },
  });

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Logins</CardTitle>
          <CardDescription>Carregando histórico...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Logins e Atividades</CardTitle>
        <CardDescription>
          Últimas {loginHistory?.length || 0} tentativas de login na sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {loginHistory && loginHistory.length > 0 ? (
            <div className="space-y-3">
              {loginHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getDeviceIcon(entry.device_info?.device_type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {entry.device_info?.browser || "Navegador desconhecido"}
                          </span>
                          <span className="text-muted-foreground">em</span>
                          <span className="font-medium">
                            {entry.device_info?.os || "SO desconhecido"}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(entry.login_time), "PPpp", { locale: ptBR })}
                        </div>

                        {entry.location_info && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {entry.location_info.city && entry.location_info.region
                              ? `${entry.location_info.city}, ${entry.location_info.region}, ${entry.location_info.country_name}`
                              : entry.location_info.country_name || "Localização desconhecida"}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          IP: {entry.ip_address}
                        </div>
                      </div>
                    </div>

                    <Badge variant={entry.success ? "default" : "destructive"}>
                      {entry.success ? "Sucesso" : "Falha"}
                    </Badge>
                  </div>

                  {!entry.success && entry.failure_reason && (
                    <div className="mt-2 text-sm text-destructive">
                      Motivo: {entry.failure_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum histórico de login encontrado
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
