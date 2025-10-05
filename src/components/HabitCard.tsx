import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface HabitCardProps {
  habit: {
    id: string;
    title: string;
    difficulty: "easy" | "medium" | "hard";
  };
  streak: {
    current_count: number;
    best_count: number;
  } | null;
  isCompletedToday: boolean;
  onComplete: () => void;
}

const difficultyConfig = {
  easy: { color: "text-green-600", bg: "bg-green-100", xp: 10 },
  medium: { color: "text-yellow-600", bg: "bg-yellow-100", xp: 15 },
  hard: { color: "text-red-600", bg: "bg-red-100", xp: 20 },
};

export const HabitCard = ({ habit, streak, isCompletedToday, onComplete }: HabitCardProps) => {
  const [completing, setCompleting] = useState(false);
  const config = difficultyConfig[habit.difficulty];

  const handleComplete = async () => {
    if (isCompletedToday) return;
    
    setCompleting(true);
    try {
      // Create completion log
      const { error: logError } = await supabase
        .from("habit_logs")
        .insert({
          habit_id: habit.id,
          xp_earned: config.xp,
        });

      if (logError) throw logError;

      // Update or create streak
      const today = new Date().toISOString().split('T')[0];
      
      if (streak) {
        const { error: streakError } = await supabase
          .from("streaks")
          .update({
            current_count: streak.current_count + 1,
            best_count: Math.max(streak.best_count, streak.current_count + 1),
            last_completed_date: today,
          })
          .eq("habit_id", habit.id);

        if (streakError) throw streakError;
      } else {
        const { error: streakError } = await supabase
          .from("streaks")
          .insert({
            habit_id: habit.id,
            current_count: 1,
            best_count: 1,
            last_completed_date: today,
          });

        if (streakError) throw streakError;
      }

      toast({
        title: "🎉 Habit completed!",
        description: `+${config.xp} XP earned! Keep the streak going!`,
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Card className="overflow-hidden shadow-card hover:shadow-glow transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{habit.title}</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.color} font-medium`}>
                {habit.difficulty}
              </span>
            </div>
            
            {streak && streak.current_count > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="font-semibold text-orange-600">
                  {streak.current_count} day streak
                </span>
                {streak.best_count > streak.current_count && (
                  <span className="text-muted-foreground">
                    (Best: {streak.best_count})
                  </span>
                )}
              </div>
            )}
          </div>

          <Button
            onClick={handleComplete}
            disabled={isCompletedToday || completing}
            size="lg"
            variant={isCompletedToday ? "outline" : "default"}
            className={isCompletedToday ? "cursor-default" : ""}
          >
            {isCompletedToday ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </Button>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          {isCompletedToday ? (
            <span className="text-primary font-medium">✓ Completed today</span>
          ) : (
            <span>Tap to complete and earn {config.xp} XP</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
