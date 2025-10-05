import { format, subDays, startOfDay, isSameDay } from "date-fns";
import { Check, X } from "lucide-react";
import { useUserTimezone } from "@/hooks/use-user-timezone";
import { convertToUserTimezone } from "@/lib/timezone-utils";

interface HabitLog {
  completed_at: string;
}

interface HabitStreakCalendarProps {
  logs: HabitLog[];
  viewDays: 7 | 16 | 30;
}

export const HabitStreakCalendar = ({ logs, viewDays }: HabitStreakCalendarProps) => {
  const { timezone } = useUserTimezone();
  const today = startOfDay(convertToUserTimezone(new Date(), timezone));
  
  const days = Array.from({ length: viewDays }, (_, i) => {
    const date = subDays(today, viewDays - 1 - i);
    const hasLog = logs.some(log => {
      const logDate = convertToUserTimezone(log.completed_at, timezone);
      return isSameDay(logDate, date);
    });
    const isToday = isSameDay(date, today);
    
    return {
      date,
      dateStr: format(date, 'd'),
      dayOfWeek: format(date, 'EEE').charAt(0),
      completed: hasLog,
      isToday,
    };
  });

  const gridCols = viewDays === 7 ? "grid-cols-7" : viewDays === 16 ? "grid-cols-8" : "grid-cols-7";

  return (
    <div className="space-y-2">
      <div className={`grid ${gridCols} gap-2`}>
        {days.map((day, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1">
            {idx % 7 === 0 && viewDays > 7 && (
              <span className="text-xs text-muted-foreground mb-1">{day.dayOfWeek}</span>
            )}
            {viewDays === 7 && idx === 0 && (
              <span className="text-xs text-muted-foreground mb-1">{day.dayOfWeek}</span>
            )}
            <div
              className={`
                relative w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium
                transition-all duration-200
                ${day.completed 
                  ? "bg-success text-white shadow-glow-success" 
                  : day.isToday
                  ? "bg-card border-2 border-primary text-foreground animate-pulse-glow"
                  : "bg-card/50 text-muted-foreground border border-border/50"
                }
              `}
            >
              {day.completed ? (
                <Check className="w-5 h-5" />
              ) : day.isToday ? (
                <span>{day.dateStr}</span>
              ) : (
                <X className="w-4 h-4 opacity-30" />
              )}
            </div>
            {viewDays === 7 && (
              <span className="text-xs text-muted-foreground">{day.dayOfWeek}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
