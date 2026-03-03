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
      <div className="rounded-xl bg-primary text-primary-foreground p-4 md:p-5 apple-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-primary-foreground/70 mb-2">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {trend && (
              <p className="text-[12px] font-medium mt-2 text-primary-foreground/80">
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </p>
            )}
          </div>
          <div className="p-2 rounded-lg bg-primary-foreground/15">
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="metric-card group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="metric-label mb-2">{label}</p>
          <p className="metric-value text-foreground">{value}</p>
          {trend && (
            <p className={`text-[12px] font-medium mt-2 ${trend.isPositive ? 'text-success' : 'text-danger'}`}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-muted/50">
          <Icon className="w-4 h-4 text-muted-foreground/60" />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
