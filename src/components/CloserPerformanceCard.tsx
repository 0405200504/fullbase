import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Phone, DollarSign, TrendingUp, Target } from "lucide-react";
import { formatCurrency } from "@/lib/dateUtils";

interface CloserPerformanceCardProps {
  closer: {
    id: string;
    nome: string;
    foto_url?: string | null;
  };
  metrics: {
    totalCalls: number;
    callsConcluidas: number;
    totalVendas: number;
    valorTotal: number;
    valorMedio: number;
    taxaConversao: number;
  };
}

export const CloserPerformanceCard = ({ closer, metrics }: CloserPerformanceCardProps) => {
  const iniciais = closer.nome
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {iniciais}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{closer.nome}</CardTitle>
            <p className="text-sm text-muted-foreground">Closer</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Taxa de Conversão */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-medium">Taxa de Conversão</span>
            </div>
            <span className="font-bold">{metrics.taxaConversao.toFixed(1)}%</span>
          </div>
          <Progress value={metrics.taxaConversao} className="h-2" />
        </div>

        {/* Calls Realizadas */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Calls</span>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{metrics.callsConcluidas}</p>
            <p className="text-xs text-muted-foreground">de {metrics.totalCalls}</p>
          </div>
        </div>

        {/* Vendas */}
        <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-sm font-medium">Vendas</span>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-success">{metrics.totalVendas}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(metrics.valorTotal)}</p>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Ticket Médio</span>
          </div>
          <p className="text-lg font-bold text-primary">
            {formatCurrency(metrics.valorMedio)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
