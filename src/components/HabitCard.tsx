import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, PanInfo } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Check, Flame, Archive, MoreVertical, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { HabitDetailDialog } from "./HabitDetailDialog";
import { subDays, startOfDay, isSameDay } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface HabitCardProps {
  habit: any;
  isCompletedToday: boolean;
  onComplete: () => void;
  onArchive?: (habitId: string) => void;
}

export const HabitCard = ({ habit, isCompletedToday, onComplete, onArchive }: HabitCardProps) => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [streak, setStreak] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [archiving, setArchiving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showXP, setShowXP] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [completionRate, setCompletionRate] = useState<number | null>(null);
  const [lastLogId, setLastLogId] = useState<string | null>(null);
  const [isAtRisk, setIsAtRisk] = useState(false);
  const [freezeTokens, setFreezeTokens] = useState(0);
  const [showFreezeDialog, setShowFreezeDialog] = useState(false);
  const { play } = useSound();

  useEffect(() => {
    fetchStreakData();
    fetchCompletionRate();
    checkAtRisk();
    fetchFreezeTokens();
  }, [habit.id, isCompletedToday]);

  const fetchFreezeTokens = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_preferences')
      .select('freeze_tokens_remaining')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setFreezeTokens(data.freeze_tokens_remaining || 0);
    }
  };

  const handleUseFreeze = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Decrement freeze tokens
      const { error: prefsError } = await supabase
        .from('user_preferences')
        .update({ freeze_tokens_remaining: freezeTokens - 1 })
        .eq('user_id', user.id);

      if (prefsError) throw prefsError;

      // Mark freeze used for this habit today
      const { error: streakError } = await supabase
        .from('streaks')
        .update({ freeze_used_on: new Date().toISOString().split('T')[0] })
        .eq('habit_id', habit.id);

      if (streakError) throw streakError;

      // Track event
      await supabase.from('suggestion_events').insert({
        user_id: user.id,
        suggestion_type: 'freeze_token',
        action: 'freeze_token_used',
        suggestion_id: habit.id,
      });

      toast({
        title: "Freeze used ❄️",
        description: `Streak protected! (${freezeTokens - 1} tokens remaining)`,
      });

      setShowFreezeDialog(false);
      setIsAtRisk(false);
      await fetchFreezeTokens();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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
      supabase.from("streaks").select("*").eq("habit_id", habit.id).maybeSingle(),
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

      // Insert social event and track analytics
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('social_events').insert({
          user_id: user.id,
          type: 'habit_completed',
          payload: { habit_title: habit.title }
        });
        
        await supabase.from("suggestion_events").insert({
          user_id: user.id,
          suggestion_type: "habit_action",
          action: "habit_complete",
          suggestion_id: habit.id,
          metadata: { source: "tap", xp_awarded: xp }
        });
      }

      // Instant celebration!
      play(soundMap[habit.difficulty as keyof typeof soundMap]);
      setShowConfetti(true);
      setShowXP(true);
      
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 100, 50]);
      }

      toast({
        title: "Habit completed! 🎉",
        description: `+${xp} XP earned`,
      });

      onComplete();
      await fetchStreakData();

      const newStreak = (streak?.current_count || 0) + 1;
      if ([7, 30, 100].includes(newStreak)) {
        setTimeout(async () => {
          play('streak-milestone');
          setShowMilestone(true);
          
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('social_events').insert({
              user_id: user.id,
              type: 'streak_milestone',
              payload: { habit_title: habit.title, streak_count: newStreak }
            });
          }
        }, 1500);
      }

      setLoading(false);
      
      setTimeout(() => {
        setShowConfetti(false);
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
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

  const handleDragEnd = async (event: any, info: PanInfo) => {
    if (!isMobile) return;
    
    const threshold = 64;
    if (info.offset.x > threshold && !isCompletedToday) {
      // Swipe right to complete
      handleComplete(event);
      if ('vibrate' in navigator) navigator.vibrate([30, 50]);
    } else if (info.offset.x < -threshold) {
      // Swipe left to archive
      if (streak?.current_count > 10) {
        toast({
          title: "High streak!",
          description: "Use the menu to archive habits with streaks > 10",
        });
      } else {
        handleArchive(event);
      }
    }
    setDragX(0);
  };

  const cardContent = (
    <div className="relative">
      {isMobile && dragX !== 0 && (
        <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
          {dragX > 24 && (
            <div className={`transition-opacity ${dragX > 64 ? 'opacity-100' : 'opacity-50'}`}>
              <Check className="w-6 h-6 text-success" />
            </div>
          )}
          {dragX < -24 && (
            <div className={`ml-auto transition-opacity ${dragX < -64 ? 'opacity-100' : 'opacity-50'}`}>
              <Archive className="w-6 h-6 text-destructive" />
            </div>
          )}
        </div>
      )}
      
      <Card
        onClick={() => !isMobile && setDialogOpen(true)}
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
                <Button variant="ghost" size="icon" className="h-8 w-8" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAtRisk && freezeTokens > 0 && (
                  <DropdownMenuItem onClick={() => setShowFreezeDialog(true)}>
                    <Shield className="h-4 w-4 mr-2" />
                    Use Freeze ({freezeTokens} left)
                  </DropdownMenuItem>
                )}
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
              type="button"
              onClick={handleComplete}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              disabled={isCompletedToday || loading}
              variant={isCompletedToday ? "secondary" : "default"}
              size="sm"
              className="relative overflow-hidden"
            >
              <motion.div
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
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
    </div>
  );

  return (
    <>
      {isMobile ? (
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDrag={(_, info) => setDragX(info.offset.x)}
          onDragEnd={handleDragEnd}
          onClick={() => Math.abs(dragX) < 8 && setDialogOpen(true)}
        >
          {cardContent}
        </motion.div>
      ) : (
        cardContent
      )}

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

      <AlertDialog open={showFreezeDialog} onOpenChange={setShowFreezeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Use a Freeze to protect today's streak?</AlertDialogTitle>
            <AlertDialogDescription>
              This will protect your {streak?.current_count || 0}-day streak from breaking today. You have {freezeTokens} freeze tokens remaining this month.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUseFreeze}>
              Use Freeze
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
