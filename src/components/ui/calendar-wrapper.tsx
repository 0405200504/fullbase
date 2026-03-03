import { Calendar as CalendarPrimitive } from "@/components/ui/calendar";
import type { DayPickerDefaultProps, DayPickerMultipleProps, DayPickerRangeProps, DayPickerSingleProps } from "react-day-picker";

// Wrapper para evitar erros de tipo do TypeScript
export function CalendarWrapper(props: DayPickerDefaultProps | DayPickerMultipleProps | DayPickerRangeProps | DayPickerSingleProps) {
  // @ts-ignore
  return <CalendarPrimitive {...props} />;
}
