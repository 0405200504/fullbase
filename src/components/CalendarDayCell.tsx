import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Call } from "@/hooks/useCalls";

const STATUS_CONFIG = {
  agendada: { color: "bg-blue-500/90 hover:bg-blue-600" },
  concluida: { color: "bg-green-500/90 hover:bg-green-600" },
  no_show: { color: "bg-red-500/90 hover:bg-red-600" },
  cancelada: { color: "bg-gray-500/90 hover:bg-gray-600" },
  remarcada: { color: "bg-yellow-500/90 hover:bg-yellow-600" },
};

interface CalendarDayCellProps {
  calls: Call[];
  onCallClick: (call: Call) => void;
}

export const CalendarDayCell = ({ calls, onCallClick }: CalendarDayCellProps) => {
  if (calls.length === 0) return null;

  return (
    <div className="space-y-1">
      {calls.map((call) => {
        const statusConfig = STATUS_CONFIG[call.status];
        const hora = format(new Date(call.data_hora_agendada), "HH:mm");
        
        return (
          <button
            key={call.id}
            onClick={(e) => {
              e.stopPropagation();
              onCallClick(call);
            }}
            className={cn(
              "w-full text-left px-2 py-1 rounded-md text-xs font-medium text-white transition-colors",
              statusConfig.color
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate">{call.leads?.nome}</span>
              <span className="text-[10px] opacity-90">{hora}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
