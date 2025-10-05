import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HabitStreakCalendar } from "./HabitStreakCalendar";
import { StreakStats } from "./StreakStats";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check, Trash2 } from "lucide-react";
import { subDays, startOfDay, isSameDay } from "date-fns";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion } from "framer-motion";
import { useSound } from "@/hooks/use-sound";
import { CompletionConfetti } from "./CompletionConfetti";
import { XPGainAnimation } from "./XPGainAnimation";
import { StreakMilestone } from "./StreakMilestone";

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
  onHabitDeleted?: () => void;
  todayCompleted: boolean;
}

export const HabitDetailDialog = ({ 
  habit, 
  open, 
  onOpenChange, 
  onHabitCompleted,
  onHabitDeleted,
  todayCompleted 
}: HabitDetailDialogProps) => {
  const [viewDays, setViewDays] = useState<7 | 16 | 30>(30);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [streak, setStreak] = useState<Streak>({ current_count: 0, best_count: 0 });
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const { play } = useSound();

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
      const soundMap = { 
        easy: 'complete' as const, 
        medium: 'complete-medium' as const, 
        hard: 'complete-hard' as const 
      };

      const { error } = await supabase
        .from('habit_logs')
        .insert({
          habit_id: habit.id,
          xp_earned: xp,
        });

      if (error) throw error;

      // Trigger celebrations
      play(soundMap[habit.difficulty]);
      setShowConfetti(true);
      setShowXP(true);
      
      // Vibrate on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 100, 50]);
      }

      toast({
        title: "Habit completed! 🎉",
        description: `+${xp} XP earned`,
      });

      onHabitCompleted();
      await fetchHabitData();
      
      // Check for streak milestones
      const newStreak = (streak?.current_count || 0) + 1;
      if ([7, 30, 100].includes(newStreak)) {
        setTimeout(() => {
          play('streak-milestone');
          setShowMilestone(true);
        }, 1500);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
      setTimeout(() => {
        setShowConfetti(false);
      }, 2000);
    }
  };

  const handleDelete = async () => {
    if (!habit) return;

    try {
      const { error } = await supabase
        .from("habits")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", habit.id);

      if (error) throw error;

      toast({
        title: "Moved to Trash",
        description: `"${habit.title}" will be deleted in 30 days. Restore from Trash tab.`,
      });

      setDeleteDialogOpen(false);
      onOpenChange(false);
      if (onHabitDeleted) onHabitDeleted();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
            <motion.div
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
            >
              <Button
                onClick={handleComplete}
                disabled={completing}
                className="w-full relative overflow-hidden"
                size="lg"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6 }}
                />
                {completing ? (
                  "Completing..."
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Complete Today
                  </>
                )}
              </Button>
            </motion.div>
          )}

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                {advancedOpen ? "Hide" : "Show"} Advanced Options
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5">
                <h4 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Deleting moves this habit to Trash. You can restore it within 30 days.
                </p>
                <Button
                  onClick={() => setDeleteDialogOpen(true)}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Habit
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        habitName={habit?.title || ""}
        currentStreak={streak.current_count}
        bestStreak={streak.best_count}
        totalLogs={logs.length}
      />

      <CompletionConfetti 
        show={showConfetti} 
        intensity={habit?.difficulty === 'hard' ? 'high' : habit?.difficulty === 'medium' ? 'medium' : 'low'} 
      />
      <XPGainAnimation 
        show={showXP} 
        xp={habit ? { easy: 10, medium: 15, hard: 20 }[habit.difficulty] : 0} 
        onComplete={() => setShowXP(false)}
      />
      <StreakMilestone
        show={showMilestone}
        streakCount={(streak?.current_count || 0) + 1}
        onClose={() => setShowMilestone(false)}
      />
    </Dialog>
  );
};
