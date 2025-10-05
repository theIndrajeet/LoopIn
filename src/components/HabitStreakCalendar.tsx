import { format, subDays, startOfDay, isSameDay, isAfter } from "date-fns";
import { Check } from "lucide-react";
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
    const isFuture = isAfter(date, today);
    
    return {
      date,
      dateStr: format(date, 'd'),
      dayOfWeek: format(date, 'EEE').charAt(0),
      completed: hasLog,
      isToday,
      isFuture,
    };
  }).filter(day => !day.isFuture);

  // Layout configurations
  const getLayout = () => {
    if (viewDays === 7) {
      return { cols: 7, showWeekLabels: false, rowSize: 7 };
    } else if (viewDays === 16) {
      return { cols: 8, showWeekLabels: true, rowSize: 8 };
    } else {
      return { cols: 7, showWeekLabels: true, rowSize: 7 };
    }
  };

  const layout = getLayout();
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="space-y-3">
      <div className="bg-background/30 backdrop-blur-sm rounded-xl p-3">
        {viewDays === 7 ? (
          // Single row layout for 7 days
          <div className="flex gap-1.5 justify-center">
            {days.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1.5">
                <div
                  className={`
                    relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
                    transition-all duration-300
                    ${day.completed 
                      ? "bg-success/90 text-white shadow-soft" 
                      : day.isToday
                      ? "bg-background ring-2 ring-primary/60 text-foreground animate-pulse"
                      : "bg-border/10 text-muted-foreground/40"
                    }
                  `}
                >
                  {day.completed ? (
                    <Check className="w-4 h-4" />
                  ) : day.isToday ? (
                    <span className="text-[10px] font-semibold">{day.dateStr}</span>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20" />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground/60 font-medium">{day.dayOfWeek}</span>
              </div>
            ))}
          </div>
        ) : (
          // Grid layout for 16 and 30 days
          <div className="flex gap-2">
            {layout.showWeekLabels && (
              <div className="flex flex-col justify-around py-1">
                {weekDays.map((day, idx) => (
                  <div key={idx} className="h-7 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground/50 font-medium w-4">{day}</span>
                  </div>
                ))}
              </div>
            )}
            <div className={`grid grid-cols-${layout.cols} gap-1.5 flex-1`}>
              {days.map((day, idx) => (
                <div key={idx} className="flex items-center justify-center">
                  <div
                    className={`
                      relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium
                      transition-all duration-300
                      ${day.completed 
                        ? "bg-success/90 text-white shadow-soft" 
                        : day.isToday
                        ? "bg-background ring-2 ring-primary/60 text-foreground animate-pulse"
                        : "bg-border/10 text-muted-foreground/40"
                      }
                    `}
                  >
                    {day.completed ? (
                      <Check className="w-4 h-4" />
                    ) : day.isToday ? (
                      <span className="text-[10px] font-semibold">{day.dateStr}</span>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
