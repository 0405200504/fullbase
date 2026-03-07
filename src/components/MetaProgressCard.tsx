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
    <div className={`bg-card rounded-xl p-5 shadow-sm hover:shadow-md transition-all border ${status.borderColor} relative overflow-hidden group`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{titulo}</p>
            <Badge variant="outline" className={`${status.color} ${status.bgColor} border-current text-[10px] font-bold px-1.5 h-5`}>
              {status.label}
            </Badge>
          </div>
          {subtitulo && <p className="text-[11px] text-muted-foreground/60 mt-1 italic">{subtitulo}</p>}
          <p className="text-2xl font-bold tracking-tight mt-1">
            R$ {valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest">Meta {periodo}</p>
          <p className="text-sm font-bold text-foreground/80">
            R$ {valorMeta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <Progress
          value={progressoCapped}
          className={`h-1.5 ${acimaDaMeta ? 'bg-success/20' : 'bg-secondary'}`}
        />

        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold ${status.color}`}>
            {progresso.toFixed(1)}% concluído
          </span>

          {progressoEsperado !== undefined && (
            <span className="text-[10px] font-medium text-muted-foreground">
              Projeção: R$ {progressoEsperado.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
