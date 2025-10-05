import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Flame, Archive, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { HabitDetailDialog } from "./HabitDetailDialog";
import { subDays, startOfDay, isSameDay } from "date-fns";
import { motion } from "framer-motion";
import { useSound } from "@/hooks/use-sound";
import { CompletionConfetti } from "./CompletionConfetti";
import { XPGainAnimation } from "./XPGainAnimation";
import { StreakMilestone } from "./StreakMilestone";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HabitCardProps {
  habit: any;
  isCompletedToday: boolean;
  onComplete: () => void;
  onArchive?: (habitId: string) => void;
}

export const HabitCard = ({ habit, isCompletedToday, onComplete, onArchive }: HabitCardProps) => {
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [streak, setStreak] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [archiving, setArchiving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [completionRate, setCompletionRate] = useState<number | null>(null);
  const [lastLogId, setLastLogId] = useState<string | null>(null);
  const [isAtRisk, setIsAtRisk] = useState(false);
  const { play } = useSound();

  useEffect(() => {
    fetchStreakData();
    fetchCompletionRate();
    checkAtRisk();
  }, [habit.id, isCompletedToday]);

  const checkAtRisk = () => {
    const currentHour = new Date().getHours();
    setIsAtRisk(currentHour >= 18 && !isCompletedToday);
  };

  const fetchCompletionRate = async () => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const { data } = await supabase
      .from("habit_logs")
      .select("completed_at")
      .eq("habit_id", habit.id)
      .gte("completed_at", thirtyDaysAgo.toISOString());
    
    if (data) {
      const rate = Math.round((data.length / 30) * 100);
      setCompletionRate(rate);
    }
  };

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

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const xpMap = { easy: 10, medium: 15, hard: 20 };
      const xp = xpMap[habit.difficulty as keyof typeof xpMap];
      const soundMap = { 
        easy: 'complete' as const, 
        medium: 'complete-medium' as const, 
        hard: 'complete-hard' as const 
      };

      const { data, error } = await supabase
        .from("habit_logs")
        .insert({
          habit_id: habit.id,
          xp_earned: xp,
        })
        .select()
        .single();

      if (error) throw error;

      // Store log ID for undo
      if (data) setLastLogId(data.id);

      // Trigger celebrations
      play(soundMap[habit.difficulty as keyof typeof soundMap]);
      setShowConfetti(true);
      setShowXP(true);
      
      // Vibrate on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 100, 50]);
      }

      // Track analytics
      await supabase.from("suggestion_events").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        suggestion_type: "habit_action",
        action: "habit_complete",
        suggestion_id: habit.id,
        metadata: { source: "tap", xp_awarded: xp }
      });

      const { dismiss } = toast({
        title: "Marked done. Undo?",
        duration: 5000,
        action: (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await handleUndo(data.id, xp);
              dismiss();
            }}
          >
            Undo
          </Button>
        ),
      });

      onComplete();
      await fetchStreakData();
      
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
      setLoading(false);
      setTimeout(() => {
        setShowConfetti(false);
      }, 2000);
    }
  };

  const handleUndo = async (logId: string, xp: number) => {
    try {
      // Delete the log
      const { error: deleteError } = await supabase
        .from("habit_logs")
        .delete()
        .eq("id", logId);

      if (deleteError) throw deleteError;

      // Revert XP
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("total_xp")
          .eq("id", user.id)
          .single();

        const { error: xpError } = await supabase
          .from("profiles")
          .update({ total_xp: (profileData?.total_xp || 0) - xp })
          .eq("id", user.id);
        
        if (xpError) throw xpError;
      }

      // Track undo event
      await supabase.from("suggestion_events").insert({
        user_id: user?.id,
        suggestion_type: "habit_action",
        action: "habit_undo",
        suggestion_id: habit.id,
      });

      toast({
        title: "Undone",
        description: "Completion reversed",
      });

      setLastLogId(null);
      onComplete();
      await fetchStreakData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setArchiving(true);
    
    try {
      const { error } = await supabase
        .from("habits")
        .update({ 
          active: false, 
          archived_at: new Date().toISOString() 
        })
        .eq("id", habit.id);

      if (error) throw error;

      toast({
        title: "Habit archived",
        description: `"${habit.title}" archived. Streak ended. Restore from Archived tab within 30 days.`,
      });

      setTimeout(() => {
        if (onArchive) onArchive(habit.id);
      }, 100);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setArchiving(false);
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
            <div className="flex items-center gap-2 flex-wrap">
              {streak && streak.current_count > 0 && (
                <div className="flex items-center gap-1 text-gold">
                  <Flame className="w-4 h-4" />
                  <span className="text-sm font-medium">{streak.current_count}</span>
                </div>
              )}
              {isAtRisk && (
                <Badge variant="destructive" className="text-xs">
                  Streak at risk
                </Badge>
              )}
              {completionRate !== null && (
                <span className="text-xs text-muted-foreground">
                  Last 30 days: {completionRate}%
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${difficultyColors[habit.difficulty as keyof typeof difficultyColors]} text-xs`}>
              {habit.difficulty}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleArchive} disabled={archiving}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
          <motion.div
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
          >
            <Button
              onClick={handleComplete}
              disabled={isCompletedToday || loading}
              variant={isCompletedToday ? "secondary" : "default"}
              size="sm"
              className="relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
              {isCompletedToday ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Done
                </>
              ) : (
                "Complete"
              )}
            </Button>
          </motion.div>
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
        onHabitDeleted={onComplete}
        todayCompleted={isCompletedToday}
      />

      <CompletionConfetti 
        show={showConfetti} 
        intensity={habit.difficulty === 'hard' ? 'high' : habit.difficulty === 'medium' ? 'medium' : 'low'} 
      />
      <XPGainAnimation 
        show={showXP} 
        xp={xpMap[habit.difficulty as keyof typeof xpMap]} 
        onComplete={() => setShowXP(false)}
      />
      <StreakMilestone
        show={showMilestone}
        streakCount={(streak?.current_count || 0) + 1}
        onClose={() => setShowMilestone(false)}
      />
    </>
  );
};
