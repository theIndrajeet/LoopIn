import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HabitStreakCalendar } from "./HabitStreakCalendar";
import { StreakStats } from "./StreakStats";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check } from "lucide-react";
import { subDays, startOfDay, isSameDay } from "date-fns";

interface Habit {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
}

interface HabitLog {
  completed_at: string;
}

interface Streak {
  current_count: number;
  best_count: number;
}

interface HabitDetailDialogProps {
  habit: Habit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHabitCompleted: () => void;
  todayCompleted: boolean;
}

export const HabitDetailDialog = ({ 
  habit, 
  open, 
  onOpenChange, 
  onHabitCompleted,
  todayCompleted 
}: HabitDetailDialogProps) => {
  const [viewDays, setViewDays] = useState<7 | 16 | 30>(30);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [streak, setStreak] = useState<Streak>({ current_count: 0, best_count: 0 });
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (open && habit) {
      fetchHabitData();
    }
  }, [open, habit]);

  const fetchHabitData = async () => {
    if (!habit) return;
    
    setLoading(true);
    try {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      
      const [logsResult, streakResult] = await Promise.all([
        supabase
          .from('habit_logs')
          .select('completed_at')
          .eq('habit_id', habit.id)
          .gte('completed_at', thirtyDaysAgo)
          .order('completed_at', { ascending: false }),
        supabase
          .from('streaks')
          .select('current_count, best_count')
          .eq('habit_id', habit.id)
          .single()
      ]);

      if (logsResult.data) setLogs(logsResult.data);
      if (streakResult.data) setStreak(streakResult.data);
    } catch (error: any) {
      console.error('Error fetching habit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!habit || todayCompleted) return;
    
    setCompleting(true);
    try {
      const xpMap = { easy: 10, medium: 15, hard: 20 };
      const xp = xpMap[habit.difficulty];

      const { error } = await supabase
        .from('habit_logs')
        .insert({
          habit_id: habit.id,
          xp_earned: xp,
        });

      if (error) throw error;

      toast({
        title: "Habit completed! 🎉",
        description: `+${xp} XP earned`,
      });

      onHabitCompleted();
      await fetchHabitData();
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

  const filteredLogs = logs.slice(0, viewDays);
  const completedInView = filteredLogs.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-popover border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{habit?.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Tabs value={viewDays.toString()} onValueChange={(v) => setViewDays(Number(v) as 7 | 16 | 30)}>
            <TabsList className="grid w-full grid-cols-3 bg-card">
              <TabsTrigger value="7">7 Days</TabsTrigger>
              <TabsTrigger value="16">16 Days</TabsTrigger>
              <TabsTrigger value="30">30 Days</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid md:grid-cols-[1fr,auto] gap-6">
            <div>
              {loading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <HabitStreakCalendar logs={filteredLogs} viewDays={viewDays} />
              )}
            </div>

            <div className="md:w-48">
              <StreakStats
                currentStreak={streak.current_count}
                bestStreak={streak.best_count}
                completionRate={{ completed: completedInView, total: viewDays }}
              />
            </div>
          </div>

          {!todayCompleted && (
            <Button
              onClick={handleComplete}
              disabled={completing}
              className="w-full"
              size="lg"
            >
              {completing ? (
                "Completing..."
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Complete Today
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
