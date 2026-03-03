import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MetaProgressCardProps {
  titulo: string;
  valorAtual: number;
  valorMeta: number;
  periodo: "diário" | "semanal" | "mensal";
  progressoEsperado?: number;
  subtitulo?: string;
}

export const MetaProgressCard = ({
  titulo,
  valorAtual,
  valorMeta,
  periodo,
  progressoEsperado,
  subtitulo,
}: MetaProgressCardProps) => {
  const progresso = valorMeta > 0 ? (valorAtual / valorMeta) * 100 : 0;
  const progressoCapped = Math.min(progresso, 100);
  const acimaDaMeta = progresso >= 100;
  const acimaDoEsperado = progressoEsperado ? valorAtual >= progressoEsperado : false;
  
  // Determinar o status de performance
  const getPerformanceStatus = () => {
    if (acimaDaMeta) {
      return {
        icon: CheckCircle,
        color: "text-success",
        bgColor: "bg-success/10",
        label: "Meta Atingida",
        borderColor: "border-success/20"
      };
    }
    
    if (progressoEsperado !== undefined) {
      if (acimaDoEsperado) {
        return {
          icon: TrendingUp,
          color: "text-success",
          bgColor: "bg-success/10",
          label: "No Ritmo",
          borderColor: "border-success/20"
        };
      } else if (progresso >= 70) {
        return {
          icon: Activity,
          color: "text-warning",
          bgColor: "bg-warning/10",
          label: "Atenção Necessária",
          borderColor: "border-warning/20"
        };
      } else {
        return {
          icon: AlertTriangle,
          color: "text-destructive",
          bgColor: "bg-destructive/10",
          label: "Abaixo do Esperado",
          borderColor: "border-destructive/20"
        };
      }
    }
    
    return {
      icon: Activity,
      color: "text-primary",
      bgColor: "bg-primary/10",
      label: "Em Progresso",
      borderColor: "border-primary/20"
    };
  };
  
  const status = getPerformanceStatus();
  const StatusIcon = status.icon;

  return (
    <div className={`bg-card rounded-xl p-4 shadow-md hover:shadow-lg transition-all border-2 ${status.borderColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
            <Badge variant="outline" className={`${status.color} ${status.bgColor} border-current text-xs`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          {subtitulo && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitulo}</p>}
          <p className="text-lg font-bold mt-1">
            R$ {valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Meta {periodo}</p>
          <p className="text-sm font-semibold">
            R$ {valorMeta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Progress 
          value={progressoCapped} 
          className={`h-2.5 ${acimaDaMeta ? 'bg-success/20' : 'bg-muted'}`}
        />
        
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${status.color}`}>
            {progresso.toFixed(1)}%
          </span>
          
          {progressoEsperado !== undefined && (
            <span className="text-xs text-muted-foreground">
              Esperado: R$ {progressoEsperado.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
