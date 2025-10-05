import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateHabitDialog } from "@/components/CreateHabitDialog";
import { HabitCard } from "@/components/HabitCard";
import { FloatingSuggestionFAB } from "@/components/FloatingSuggestionFAB";
import { TodayProgressRing } from "@/components/TodayProgressRing";
import { DashboardBanner } from "@/components/DashboardBanner";
import { CelebrationPortal } from "@/components/CelebrationPortal";
import { LogOut, Zap, Flame, CheckCircle2, Trophy, Users, Archive, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { celebrationEvents, CelebrationType, CelebrationDetail } from "@/lib/celebrationEvents";
import { useEffect as useEffectForCelebrations, useState as useStateForCelebrations } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableHabitCard } from "@/components/SortableHabitCard";

export default function Dashboard() {
  const navigate = useNavigate();
  const [habits, setHabits] = useState<any[]>([]);
  const [todaysLogs, setTodaysLogs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [streaks, setStreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"active" | "archived" | "trash">("active");
  const [showAllDoneBanner, setShowAllDoneBanner] = useState(false);
  const [showFAB, setShowFAB] = useState(false);
  const [celebrationData, setCelebrationData] = useStateForCelebrations<CelebrationDetail | null>(null);

  const completedToday = todaysLogs.length;
  const totalHabits = habits.length;
  const totalStreaks = streaks.reduce((sum, s) => sum + s.current_count, 0);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, [viewMode]);
  
  useEffectForCelebrations(() => {
    const handleCelebration = (event: Event) => {
      const customEvent = event as CustomEvent<CelebrationDetail>;
      setCelebrationData(customEvent.detail);
    };
    
    celebrationEvents.addEventListener('celebrate', handleCelebration);
    return () => celebrationEvents.removeEventListener('celebrate', handleCelebration);
  }, []);

  useEffect(() => {
    if (viewMode === "active" && habits.length > 0 && completedToday === totalHabits && totalHabits > 0) {
      const hasShownBanner = sessionStorage.getItem("all_done_banner_shown");
      if (!hasShownBanner) {
        setShowAllDoneBanner(true);
        sessionStorage.setItem("all_done_banner_shown", "true");
      }
    }
  }, [completedToday, totalHabits, habits.length, viewMode]);

  useEffect(() => {
    if (showAllDoneBanner) {
      toast({
        title: "All done today! 🎉",
        description: "Add one for tomorrow?",
        duration: 7000,
      });
      setShowAllDoneBanner(false);
    }
  }, [showAllDoneBanner]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let habitsQuery = supabase.from("habits").select("*").eq("user_id", user.id);

      if (viewMode === "active") {
        habitsQuery = habitsQuery
          .eq("active", true)
          .is("archived_at", null)
          .is("deleted_at", null)
          .order('order_index', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true });
      } else if (viewMode === "archived") {
        habitsQuery = habitsQuery.eq("active", false).not("archived_at", "is", null).is("deleted_at", null);
      } else if (viewMode === "trash") {
        habitsQuery = habitsQuery.not("deleted_at", "is", null);
      }

      const [habitsResult, logsResult, profileResult, streaksResult] = await Promise.all([
        habitsQuery,
        supabase
          .from("habit_logs")
          .select("habit_id")
          .gte("completed_at", new Date().toISOString().split("T")[0]),
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("streaks").select("*"),
      ]);

      if (habitsResult.data) setHabits(habitsResult.data);
      if (logsResult.data) setTodaysLogs(logsResult.data);
      if (profileResult.data) setProfile(profileResult.data);
      if (streaksResult.data) setStreaks(streaksResult.data);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = habits.findIndex((h) => h.id === active.id);
    const newIndex = habits.findIndex((h) => h.id === over.id);

    const newHabits = arrayMove(habits, oldIndex, newIndex);
    setHabits(newHabits);

    // Update order_index for all habits
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = newHabits.map((habit, index) => ({
        id: habit.id,
        order_index: index,
      }));

      for (const update of updates) {
        await supabase
          .from('habits')
          .update({ order_index: update.order_index })
          .eq('id', update.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save habit order",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="container max-w-6xl mx-auto px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 text-foreground">
              Welcome back, {profile?.display_name || "there"}! 👋
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Keep building those streaks!
            </p>
          </div>
          <div className="hidden sm:flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/friends")}>
              <Users className="w-4 h-4 mr-2" />
              Friends
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/leaderboard")}>
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="p-4 sm:p-6 bg-card border-border hover:border-primary transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{profile?.total_xp || 0}</p>
                <p className="text-sm text-muted-foreground">Total XP</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-card border-border hover:border-primary transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gold/20 flex items-center justify-center">
                <Flame className="w-6 h-6 text-gold" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{totalStreaks}</p>
                <p className="text-sm text-muted-foreground">Active Streaks</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6 bg-card border-border hover:border-primary transition-colors flex items-center justify-center">
            <TodayProgressRing completed={completedToday} total={totalHabits} />
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">Your Habits</h2>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="hidden sm:block">
              <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="archived">
                  <Archive className="w-4 h-4 mr-1" />
                  Archived
                </TabsTrigger>
                <TabsTrigger value="trash">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Trash
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {viewMode === "active" && <CreateHabitDialog onHabitCreated={fetchData} />}
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="sm:hidden mb-4">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
            <TabsTrigger value="trash">Trash</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {viewMode === "active" && showAllDoneBanner && (
          <DashboardBanner onOpenSuggestions={() => setShowFAB(true)} />
        )}

        {viewMode === "active" && (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={habits.map(h => h.id)} strategy={verticalListSortingStrategy}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-fade-in">
                  {habits.map((habit, idx) => (
                    <SortableHabitCard
                      key={habit.id}
                      id={habit.id}
                      habit={habit}
                      isCompletedToday={todaysLogs.some((log) => log.habit_id === habit.id)}
                      onComplete={fetchData}
                      onArchive={fetchData}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {habits.length === 0 && (
              <div className="text-center py-12">
                <p className="text-xl font-medium mb-2 text-foreground">
                  Your first habit is the hardest—let's make it easy.
                </p>
                <p className="text-muted-foreground mb-6">
                  Start with one small habit and watch your progress grow.
                </p>
                <CreateHabitDialog onHabitCreated={fetchData} />
              </div>
            )}
          </>
        )}

        {viewMode === "archived" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-fade-in">
              {habits.map((habit, idx) => (
                <Card key={habit.id} className="p-4 sm:p-5 bg-card/50 border border-border" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1 text-muted-foreground">{habit.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        Archived {new Date(habit.archived_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      await supabase
                        .from("habits")
                        .update({ active: true, archived_at: null })
                        .eq("id", habit.id);
                      fetchData();
                      toast({ title: "Habit restored", description: "Habit is now active again." });
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Restore to Active
                  </Button>
                </Card>
              ))}
            </div>

            {habits.length === 0 && (
              <div className="text-center py-12">
                <Archive className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No archived habits.</p>
              </div>
            )}
          </>
        )}

        {viewMode === "trash" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-fade-in">
              {habits.map((habit, idx) => {
                const daysLeft = 30 - Math.floor((Date.now() - new Date(habit.deleted_at).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <Card key={habit.id} className="p-4 sm:p-5 bg-destructive/10 border border-destructive/20" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1 text-muted-foreground line-through">{habit.title}</h3>
                        <p className="text-xs text-destructive">
                          Deletes in {daysLeft} days
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          await supabase
                            .from("habits")
                            .update({ deleted_at: null, archived_at: new Date().toISOString() })
                            .eq("id", habit.id);
                          fetchData();
                          toast({ title: "Restored to Archived", description: "Habit moved to archived. Activate it to start tracking again." });
                        }}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        Restore
                      </Button>
                      <Button
                        onClick={async () => {
                          if (confirm(`Permanently delete "${habit.title}"? This cannot be undone.`)) {
                            await supabase.from("habits").delete().eq("id", habit.id);
                            fetchData();
                            toast({ title: "Permanently deleted", variant: "destructive" });
                          }
                        }}
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                      >
                        Delete Now
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {habits.length === 0 && (
              <div className="text-center py-12">
                <Trash2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Trash is empty.</p>
              </div>
            )}
          </>
        )}
      </div>

      {viewMode === "active" && (
        <FloatingSuggestionFAB habitCount={habits.length} onHabitCreated={fetchData} />
      )}
      
      <CelebrationPortal
        show={!!celebrationData}
        type={celebrationData?.type || 'first_completion'}
        meta={celebrationData?.meta}
        onDismiss={() => setCelebrationData(null)}
      />
    </div>
  );
}
