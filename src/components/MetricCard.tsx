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
      <div className="rounded-lg bg-primary text-primary-foreground p-6 shadow-sm border border-primary/20 transition-all hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-primary-foreground/70 mb-2">{label}</p>
            <p className="text-4xl font-extrabold tracking-tight">{value}</p>
            {trend && (
              <p className="text-xs font-medium mt-2 text-primary-foreground/90 flex items-center gap-1">
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </p>
            )}
          </div>
          <div>
            <Icon className="w-5 h-5 text-primary-foreground/80 opacity-60" strokeWidth={1.25} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="metric-card bg-card rounded-md border-b-[3px] border-l-0 border-r-0 border-t-0 p-6 shadow-sm hover:border-b-primary hover:shadow transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[13px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">{value}</p>
            {trend && (
              <span className={`text-[11px] font-bold flex items-center gap-0.5 ${trend.isPositive ? 'text-success' : 'text-danger'}`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
        </div>
        <div>
          <Icon className="w-6 h-6 text-muted-foreground/40 group-hover:text-foreground transition-colors" strokeWidth={1.25} />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
