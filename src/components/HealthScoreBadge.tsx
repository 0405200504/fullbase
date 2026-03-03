import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HealthScoreBadgeProps {
  score: number;
  showLabel?: boolean;
}

export const HealthScoreBadge = ({ score, showLabel = true }: HealthScoreBadgeProps) => {
  const getScoreLabel = (score: number) => {
    if (score >= 70) return "Saudável";
    if (score >= 40) return "Atenção";
    return "Risco";
  };

  const label = getScoreLabel(score);

  return (
    <Badge
      className={cn(
        "font-semibold rounded-full px-3 py-1",
        score >= 70 && "bg-green-100 text-green-800 hover:bg-green-100",
        score >= 40 && score < 70 && "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
        score < 40 && "bg-red-100 text-red-800 hover:bg-red-100"
      )}
    >
      {score}
      {showLabel && ` • ${label}`}
    </Badge>
  );
};
