import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorClass?: string;
  highlight?: boolean;
}

const MetricCard = ({ label, value, icon: Icon, trend, colorClass: _colorClass, highlight = false }: MetricCardProps) => {
  if (highlight) {
    return (
      <div className="rounded-lg bg-primary text-primary-foreground p-6 shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80 mb-1">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {trend && (
              <p className="text-sm font-medium mt-2 text-primary-foreground/90 flex items-center gap-1">
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </p>
            )}
          </div>
          <div className="p-3 rounded-md bg-white/10">
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="metric-card group hover:border-primary/30">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="metric-label mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="metric-value">{value}</p>
            {trend && (
              <span className={`text-xs font-bold leading-none py-1 px-1.5 rounded-sm ${trend.isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
        </div>
        <div className="p-3 rounded-md bg-muted/50 group-hover:bg-primary/5 transition-colors">
          <Icon className="w-5 h-5 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
