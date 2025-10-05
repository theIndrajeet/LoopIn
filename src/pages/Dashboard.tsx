import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateHabitDialog } from "@/components/CreateHabitDialog";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { HabitCard } from "@/components/HabitCard";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { FloatingSuggestionFAB } from "@/components/FloatingSuggestionFAB";
import { TodayProgressRing } from "@/components/TodayProgressRing";
import { DashboardBanner } from "@/components/DashboardBanner";
import { CelebrationPortal } from "@/components/CelebrationPortal";
import { LogOut, Zap, Flame, CheckCircle2, Trophy, Users, Archive, Trash2, ListTodo, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { celebrationEvents, CelebrationType, CelebrationDetail } from "@/lib/celebrationEvents";
import { useEffect as useEffectForCelebrations, useState as useStateForCelebrations } from "react";
import { useUserTimezone } from "@/hooks/use-user-timezone";
import { getStartOfTodayInTimezone, convertToUserTimezone } from "@/lib/timezone-utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableHabitCard } from "@/components/SortableHabitCard";
import { SortableTaskCard } from "@/components/SortableTaskCard";
import { isToday, isPast } from "date-fns";

export default function Dashboard() {
  const navigate = useNavigate();
  const { timezone } = useUserTimezone();
  const [habits, setHabits] = useState<any[]>([]);
  const [todaysLogs, setTodaysLogs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [streaks, setStreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentType, setContentType] = useState<"habits" | "tasks">("habits");
  const [viewMode, setViewMode] = useState<"active" | "archived" | "trash">("active");
  const [showAllDoneBanner, setShowAllDoneBanner] = useState(false);
  const [showFAB, setShowFAB] = useState(false);
  const [celebrationData, setCelebrationData] = useStateForCelebrations<CelebrationDetail | null>(null);
  
  // Task-specific state
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  const completedToday = todaysLogs.length;
  const totalHabits = habits.length;
  const totalStreaks = streaks.reduce((sum, s) => sum + s.current_count, 0);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, [viewMode, contentType]);
  
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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

      if (contentType === "habits") {
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

        // Get start of today in user's timezone for accurate "today" filtering
        const startOfToday = getStartOfTodayInTimezone(timezone);

        const [habitsResult, logsResult, profileResult, streaksResult] = await Promise.all([
          habitsQuery,
          supabase
            .from("habit_logs")
            .select("habit_id")
            .gte("completed_at", startOfToday),
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("streaks").select("*"),
        ]);

        if (habitsResult.data) setHabits(habitsResult.data);
        if (logsResult.data) setTodaysLogs(logsResult.data);
        if (profileResult.data) setProfile(profileResult.data);
        if (streaksResult.data) setStreaks(streaksResult.data);
      } else {
        // Fetch tasks
        let tasksQuery = supabase.from("tasks").select("*").eq("user_id", user.id);

        if (viewMode === "active") {
          tasksQuery = tasksQuery
            .eq("completed", false)
            .is("deleted_at", null)
            .order('order_index', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true });
        } else if (viewMode === "archived") {
          tasksQuery = tasksQuery.eq("completed", true).is("deleted_at", null);
        } else if (viewMode === "trash") {
          tasksQuery = tasksQuery.not("deleted_at", "is", null);
        }

        const [tasksResult, profileResult] = await Promise.all([
          tasksQuery,
          supabase.from("profiles").select("*").eq("id", user.id).single(),
        ]);

        if (tasksResult.data) setTasks(tasksResult.data);
        if (profileResult.data) setProfile(profileResult.data);
      }
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

    if (contentType === "habits") {
      const oldIndex = habits.findIndex((h) => h.id === active.id);
      const newIndex = habits.findIndex((h) => h.id === over.id);

      const newHabits = arrayMove(habits, oldIndex, newIndex);
      setHabits(newHabits);

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
    } else {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);

      const newTasks = arrayMove(tasks, oldIndex, newIndex);
      setTasks(newTasks);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const updates = newTasks.map((task, index) => ({
          id: task.id,
          order_index: index,
        }));

        for (const update of updates) {
          await supabase
            .from('tasks')
            .update({ order_index: update.order_index })
            .eq('id', update.id);
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to save task order",
          variant: "destructive",
        });
      }
    }
  };

  // Task stats calculations
  const tasksDueToday = tasks.filter(t => t.due_date && isToday(new Date(t.due_date)) && !t.completed).length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.filter(t => !t.completed).length;
  const overdueTasks = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && !t.completed).length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / (completedTasks + totalTasks)) * 100) : 0;

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

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="col-span-1 p-3 sm:p-6 bg-card border-border hover:border-primary transition-colors">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl sm:text-3xl font-bold text-foreground">{profile?.total_xp || 0}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total XP</p>
              </div>
            </div>
          </Card>

          <Card className="col-span-1 p-3 sm:p-6 bg-card border-border hover:border-primary transition-colors">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-gold/20 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 sm:w-6 sm:h-6 text-gold" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl sm:text-3xl font-bold text-foreground">{totalStreaks}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Active Streaks</p>
              </div>
            </div>
          </Card>

          <Card className="col-span-2 sm:col-span-1 p-3 sm:p-6 bg-card border-border hover:border-primary transition-colors flex items-center justify-center">
            <TodayProgressRing completed={completedToday} total={totalHabits} />
          </Card>
        </div>

        {/* Content Type Tabs (Habits/Tasks) */}
        <Tabs value={contentType} onValueChange={(v) => setContentType(v as typeof contentType)} className="mb-6">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="habits" className="flex-1 sm:flex-none">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Habits
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1 sm:flex-none">
              <ListTodo className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="habits" className="mt-6">
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
                        Archived {convertToUserTimezone(habit.archived_at, timezone).toLocaleDateString()}
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

            {viewMode === "active" && (
              <FloatingSuggestionFAB habitCount={habits.length} onHabitCreated={fetchData} />
            )}
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Your Tasks</h2>
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="hidden sm:block">
                  <TabsList>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="archived">
                      <Archive className="w-4 h-4 mr-1" />
                      Completed
                    </TabsTrigger>
                    <TabsTrigger value="trash">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Trash
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {viewMode === "active" && <CreateTaskDialog onTaskCreated={fetchData} />}
            </div>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="sm:hidden mb-4">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="archived">Completed</TabsTrigger>
                <TabsTrigger value="trash">Trash</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Task Stats */}
            {viewMode === "active" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{tasksDueToday}</p>
                      <p className="text-xs text-muted-foreground">Due Today</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{taskCompletionRate}%</p>
                      <p className="text-xs text-muted-foreground">Completion</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{totalTasks}</p>
                      <p className="text-xs text-muted-foreground">Active</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-card border-border">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold text-foreground">{overdueTasks}</p>
                      <p className="text-xs text-muted-foreground">Overdue</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {viewMode === "active" && (
              <>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="grid grid-cols-1 gap-3 sm:gap-4 animate-fade-in">
                      {tasks.map((task, idx) => (
                        <SortableTaskCard
                          key={task.id}
                          id={task.id}
                          task={task}
                          onComplete={async () => {
                            await supabase.from("tasks").update({ 
                              completed: true, 
                              completed_at: new Date().toISOString() 
                            }).eq("id", task.id);
                            fetchData();
                            toast({ title: "Task completed!" });
                          }}
                          onDelete={async () => {
                            await supabase.from("tasks").update({ 
                              deleted_at: new Date().toISOString() 
                            }).eq("id", task.id);
                            fetchData();
                            toast({ title: "Task moved to trash" });
                          }}
                          onClick={() => {
                            setSelectedTask(task);
                            setTaskDetailOpen(true);
                          }}
                          style={{ animationDelay: `${idx * 50}ms` }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {tasks.length === 0 && (
                  <div className="text-center py-12">
                    <ListTodo className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-xl font-medium mb-2 text-foreground">
                      No tasks yet!
                    </p>
                    <p className="text-muted-foreground mb-6">
                      Create your first task to get organized.
                    </p>
                    <CreateTaskDialog onTaskCreated={fetchData} />
                  </div>
                )}
              </>
            )}

            {viewMode === "archived" && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 animate-fade-in">
                  {tasks.map((task, idx) => (
                    <Card key={task.id} className="p-4 bg-card/50 border border-border cursor-pointer hover:shadow-md transition-shadow" 
                      style={{ animationDelay: `${idx * 50}ms` }}
                      onClick={() => {
                        setSelectedTask(task);
                        setTaskDetailOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1 text-muted-foreground line-through">{task.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            Completed {task.completed_at && new Date(task.completed_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {tasks.length === 0 && (
                  <div className="text-center py-12">
                    <Archive className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No completed tasks.</p>
                  </div>
                )}
              </>
            )}

            {viewMode === "trash" && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:gap-4 animate-fade-in">
                  {tasks.map((task, idx) => (
                    <Card key={task.id} className="p-4 bg-destructive/10 border border-destructive/20" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1 text-muted-foreground line-through">{task.title}</h3>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={async () => {
                            await supabase.from("tasks").update({ deleted_at: null }).eq("id", task.id);
                            fetchData();
                            toast({ title: "Task restored" });
                          }}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          Restore
                        </Button>
                        <Button
                          onClick={async () => {
                            if (confirm(`Permanently delete "${task.title}"? This cannot be undone.`)) {
                              await supabase.from("tasks").delete().eq("id", task.id);
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
                  ))}
                </div>

                {tasks.length === 0 && (
                  <div className="text-center py-12">
                    <Trash2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Trash is empty.</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TaskDetailDialog
        task={selectedTask}
        open={taskDetailOpen}
        onOpenChange={setTaskDetailOpen}
        onTaskUpdated={fetchData}
      />
      
      <CelebrationPortal
        show={!!celebrationData}
        type={celebrationData?.type || 'first_completion'}
        meta={celebrationData?.meta}
        onDismiss={() => setCelebrationData(null)}
      />
    </div>
  );
}
