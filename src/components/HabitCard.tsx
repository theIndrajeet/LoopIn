import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { HabitDetailDialog } from "./HabitDetailDialog";
import { subDays, startOfDay, isSameDay } from "date-fns";

interface HabitCardProps {
  habit: any;
  isCompletedToday: boolean;
  onComplete: () => void;
}

export const HabitCard = ({ habit, isCompletedToday, onComplete }: HabitCardProps) => {
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [streak, setStreak] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchStreakData();
  }, [habit.id]);

  const fetchStreakData = async () => {
    const [streakResult, logsResult] = await Promise.all([
      supabase.from("streaks").select("*").eq("habit_id", habit.id).single(),
      supabase
        .from("habit_logs")
        .select("completed_at")
        .eq("habit_id", habit.id)
        .gte("completed_at", subDays(new Date(), 7).toISOString())
        .order("completed_at", { ascending: false }),
    ]);

    if (streakResult.data) setStreak(streakResult.data);
    if (logsResult.data) setRecentLogs(logsResult.data);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const xpMap = { easy: 10, medium: 15, hard: 20 };
      const xp = xpMap[habit.difficulty as keyof typeof xpMap];

      const { error } = await supabase
        .from("habit_logs")
        .insert({
          habit_id: habit.id,
          xp_earned: xp,
        });

      if (error) throw error;

      toast({
        title: "Habit completed! 🎉",
        description: `+${xp} XP earned`,
      });

      onComplete();
      fetchStreakData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const difficultyColors = {
    easy: "text-success border-success/50",
    medium: "text-gold border-gold/50",
    hard: "text-primary border-primary/50",
  };

  const xpMap = { easy: 10, medium: 15, hard: 20 };

  const today = startOfDay(new Date());
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i);
    const hasLog = recentLogs.some(log => isSameDay(new Date(log.completed_at), date));
    return hasLog;
  });

  return (
    <>
      <Card
        onClick={() => setDialogOpen(true)}
        className="p-4 sm:p-5 bg-card border border-border hover:border-primary transition-all duration-200 active:scale-[0.98] sm:hover:scale-[1.02] hover:shadow-glow-primary cursor-pointer touch-manipulation"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1 text-foreground">{habit.title}</h3>
            <div className="flex items-center gap-2">
              {streak && streak.current_count > 0 && (
                <div className="flex items-center gap-1 text-gold">
                  <Flame className="w-4 h-4" />
                  <span className="text-sm font-medium">{streak.current_count}</span>
                </div>
              )}
            </div>
          </div>
          <Badge variant="outline" className={`${difficultyColors[habit.difficulty as keyof typeof difficultyColors]} text-xs`}>
            {habit.difficulty}
          </Badge>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 mb-4">
          {last7Days.map((completed, idx) => (
            <div
              key={idx}
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-colors ${
                completed ? "bg-success" : "bg-card border border-border/50"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            +{xpMap[habit.difficulty as keyof typeof xpMap]} XP
          </span>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleComplete();
            }}
            disabled={isCompletedToday || loading}
            variant={isCompletedToday ? "secondary" : "default"}
            size="sm"
          >
            {isCompletedToday ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Done
              </>
            ) : (
              "Complete"
            )}
          </Button>
        </div>
      </Card>

      <HabitDetailDialog
        habit={habit}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onHabitCompleted={() => {
          onComplete();
          fetchStreakData();
        }}
        todayCompleted={isCompletedToday}
      />
    </>
  );
};
