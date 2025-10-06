import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateHabitDialog } from "@/components/CreateHabitDialog";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { HabitCard } from "@/components/HabitCard";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { HabitCardSkeleton } from "@/components/skeletons/HabitCardSkeleton";
import { TaskCardSkeleton } from "@/components/skeletons/TaskCardSkeleton";

import { TodayProgressRing } from "@/components/TodayProgressRing";
import { DashboardBanner } from "@/components/DashboardBanner";
import { CelebrationPortal } from "@/components/CelebrationPortal";
import { LogOut, Zap, Flame, CheckCircle2, Trophy, Users, Trash2, ListTodo, Clock, Sparkles, Bell, User, BarChart3 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { celebrationEvents, CelebrationType, CelebrationDetail } from "@/lib/celebrationEvents";
import { useUserTimezone } from "@/hooks/use-user-timezone";
import { getStartOfTodayInTimezone, convertToUserTimezone } from "@/lib/timezone-utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableHabitCard } from "@/components/SortableHabitCard";
import { SortableTaskCard } from "@/components/SortableTaskCard";
import { isToday, isPast } from "date-fns";
import { Lightbulb } from "lucide-react";
import { QuickPicksSection } from "@/components/QuickPicksSection";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { NotificationsList } from "@/components/NotificationsList";
import { NotificationSettings } from "@/components/NotificationSettings";
import { Badge } from "@/components/ui/badge";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";

export default function Dashboard() {
  const navigate = useNavigate();
  const { timezone } = useUserTimezone();
  const isMobile = useIsMobile();
  
  // Basic state management (production-safe)
  const [user, setUser] = useState<any>(null);
  const [habits, setHabits] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [streaks, setStreaks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [socialEvents, setSocialEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todaysLogs, setTodaysLogs] = useState<any[]>([]);
  
  const [contentType, setContentType] = useState<"habits" | "tasks">("habits");
  const [viewMode, setViewMode] = useState<"active" | "trash" | "analytics">("active");
  const [showAllDoneBanner, setShowAllDoneBanner] = useState(false);
  
  const [celebrationData, setCelebrationData] = useState<CelebrationDetail | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  
  // Task-specific state
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  // Get current day of week (0 = Sunday, 6 = Saturday) for filtering habits scheduled today
  const today = new Date().getDay();
  
  // Filter habits scheduled for today
  const habitsScheduledToday = habits.filter(h => 
    h.schedule_days && Array.isArray(h.schedule_days) && h.schedule_days.includes(today)
  );
  
  const completedToday = todaysLogs.length;
  const totalHabits = habitsScheduledToday.length;
  const completionRate = totalHabits > 0 ? (completedToday / totalHabits) * 100 : 0;

  // Load user and data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Auth error:', error);
          navigate('/auth');
          return;
        }
        if (user) {
          setUser(user);
          await loadDashboardData(user.id);
        } else {
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error loading user:', error);
        navigate('/auth');
      }
    };

    loadUser();
  }, [navigate]);

  // Load dashboard data
  const loadDashboardData = async (userId: string) => {
    if (!userId) {
      console.error('No user ID provided to loadDashboardData');
      return;
    }
    
    try {
      setLoading(true);
      
      // Load habits
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });
      
      if (habitsError) {
        console.error('Error loading habits:', habitsError);
        throw habitsError;
      }
      setHabits(habitsData || []);

      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });
      
      if (tasksError) {
        console.error('Error loading tasks:', tasksError);
        throw tasksError;
      }
      setTasks(tasksData || []);
      setAllTasks(tasksData || []);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) throw profileError;
      setProfile(profileData);

      // Load streaks
      const { data: streaksData, error: streaksError } = await supabase
        .from('streaks')
        .select('*, habits!inner(user_id)')
        .eq('habits.user_id', userId);
      
      if (streaksError) throw streaksError;
      setStreaks(streaksData || []);

      // Load notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (notificationsError) throw notificationsError;
      setNotifications(notificationsData || []);
      setUnreadCount(notificationsData?.filter(n => !n.read)?.length || 0);

      // Load social events
      const { data: socialEventsData, error: socialEventsError } = await supabase
        .from('social_events')
        .select('*, profiles!inner(display_name, avatar_url, privacy_level)')
        .or(`user_id.eq.${userId},profiles.privacy_level.eq.public`)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (socialEventsError) throw socialEventsError;
      setSocialEvents(socialEventsData || []);

      // Load today's logs
      const startOfToday = getStartOfTodayInTimezone(timezone);
      const { data: logsData, error: logsError } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startOfToday.toISOString());
      
      if (logsError) {
        console.error('Error loading logs:', logsError);
        // Don't throw error for logs, just set empty array
        setTodaysLogs([]);
      } else {
        setTodaysLogs(logsData || []);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error loading data",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    const habitsChannel = supabase
      .channel('habits-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'habits', filter: `user_id=eq.${user.id}` },
        () => {
          loadDashboardData(user.id);
        }
      )
      .subscribe();

    const tasksChannel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` },
        () => {
          loadDashboardData(user.id);
        }
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          loadDashboardData(user.id);
        }
      )
      .subscribe();

    return () => {
      habitsChannel.unsubscribe();
      tasksChannel.unsubscribe();
      notificationsChannel.unsubscribe();
    };
  }, [user?.id, timezone]);

  // Handle habit completion
  const handleHabitComplete = async (habitId: string) => {
    try {
      const { error } = await supabase
        .from('habit_logs')
        .insert({
          habit_id: habitId,
          user_id: user.id,
          completed_at: new Date().toISOString()
        });

      if (error) throw error;

      // Refresh data
      await loadDashboardData(user.id);
      
      toast({
        title: "Habit completed! 🎉",
        description: "Great job keeping your streak alive!",
      });
    } catch (error) {
      console.error('Error completing habit:', error);
      toast({
        title: "Error",
        description: "Failed to complete habit. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle task completion
  const handleTaskComplete = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', taskId);

      if (error) throw error;

      // Refresh data
      await loadDashboardData(user.id);
      
      toast({
        title: "Task completed! ✅",
        description: "One more task off your list!",
      });
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
    await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Filter data based on view mode
  const filteredHabits = useMemo(() => {
    if (viewMode === 'trash') {
      return habits.filter(h => h.deleted_at !== null);
    }
    return habits.filter(h => h.deleted_at === null);
  }, [habits, viewMode]);

  const filteredTasks = useMemo(() => {
    if (viewMode === 'trash') {
      return tasks.filter(t => t.deleted_at !== null);
    }
    return tasks.filter(t => t.deleted_at === null);
  }, [tasks, viewMode]);

  // Calculate stats
  const totalXP = profile?.total_xp || 0;
  const activeStreaks = streaks.filter(s => s.current_streak > 0).length;
  const completedTasks = tasks.filter(t => t.completed_at !== null).length;
  const totalTasks = tasks.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="flex gap-2">
              <div className="h-10 w-10 bg-muted animate-pulse rounded" />
              <div className="h-10 w-10 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <HabitCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome back, {profile?.display_name || user?.email}! 👋
              </h1>
              <p className="text-muted-foreground">Keep building those streaks!</p>
            </div>
            <div className="flex items-center gap-2">
              <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Notifications</SheetTitle>
                    <SheetDescription>
                      Stay updated with your progress
                    </SheetDescription>
                  </SheetHeader>
                  <Tabs defaultValue="notifications" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="notifications">Alerts</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="notifications" className="mt-4">
                      <NotificationsList 
                        notifications={notifications}
                        onNotificationRead={() => loadDashboardData(user.id)}
                      />
                    </TabsContent>
                    <TabsContent value="settings" className="mt-4">
                      <NotificationSettings />
                    </TabsContent>
                  </Tabs>
                </SheetContent>
              </Sheet>

              <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Profile</SheetTitle>
                    <SheetDescription>
                      Manage your account settings
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4">
                    <ProfileEditForm 
                      profile={profile}
                      onProfileUpdate={() => loadDashboardData(user.id)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Home
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/ai-assistant')}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Magic
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/leaderboard')}
              className="flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" />
              Ranks
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/friends')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Friends
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotificationsOpen(true)}
              className="flex items-center gap-2"
            >
              <Bell className="h-4 w-4" />
              Alerts
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between mb-6">
          <Tabs value={contentType} onValueChange={(value) => setContentType(value as "habits" | "tasks")}>
            <TabsList>
              <TabsTrigger value="habits" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
              Habits
            </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
              Tasks
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

          <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
              size="sm"
              onClick={() => setSuggestionsOpen(true)}
              className="flex items-center gap-2"
                  >
              <Lightbulb className="h-4 w-4" />
              Try this
                  </Button>
            <CreateHabitDialog onHabitCreated={() => loadDashboardData(user.id)} />
                </div>
            </div>

        {/* View Mode Tabs */}
        <div className="flex items-center justify-between mb-6">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "active" | "trash" | "analytics")}>
            <TabsList>
                <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="trash" className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Trash
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              </TabsList>
            </Tabs>
        </div>

        {/* Content */}
        {viewMode === 'analytics' ? (
          <AnalyticsDashboard 
            habits={habits}
            tasks={tasks}
            streaks={streaks}
            profile={profile}
          />
        ) : (
          <div className="space-y-6">
            {contentType === 'habits' ? (
              <div className="space-y-4">
                {filteredHabits.length === 0 ? (
                  <Card className="p-8 text-center">
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">No habits yet</h3>
                      <p className="text-muted-foreground">
                          {viewMode === 'trash' 
                            ? "No deleted habits found" 
                            : "Create your first habit to get started!"
                          }
                        </p>
                      </div>
                      {viewMode === 'active' && (
                        <CreateHabitDialog onHabitCreated={() => loadDashboardData(user.id)} />
                      )}
                    </div>
                  </Card>
                ) : (
                  <DndContext
                    sensors={useSensors(
                      useSensor(PointerSensor),
                      useSensor(KeyboardSensor, {
                        coordinateGetter: sortableKeyboardCoordinates,
                      })
                    )}
                    collisionDetection={closestCenter}
                    onDragEnd={(event: DragEndEvent) => {
                      const { active, over } = event;
                      if (active.id !== over?.id) {
                        const oldIndex = filteredHabits.findIndex((item) => item.id === active.id);
                        const newIndex = filteredHabits.findIndex((item) => item.id === over?.id);
                        const newHabits = arrayMove(filteredHabits, oldIndex, newIndex);
                        // Update order in database
                        newHabits.forEach((habit, index) => {
                          supabase
                            .from('habits')
                            .update({ order_index: index })
                            .eq('id', habit.id);
                        });
                      }
                    }}
                  >
                    <SortableContext items={filteredHabits.map(h => h.id)} strategy={verticalListSortingStrategy}>
                      {filteredHabits.map((habit) => (
                        <SortableHabitCard
                          key={habit.id}
                          habit={habit}
                          onComplete={() => handleHabitComplete(habit.id)}
                          onUpdate={() => loadDashboardData(user.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
                  </div>
                ) : (
              <div className="space-y-4">
                {filteredTasks.length === 0 ? (
                  <Card className="p-8 text-center">
                    <div className="space-y-4">
                      <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <ListTodo className="h-8 w-8 text-muted-foreground" />
                        </div>
                      <div>
                        <h3 className="text-lg font-semibold">No tasks yet</h3>
                        <p className="text-muted-foreground">
                          {viewMode === 'trash' 
                            ? "No deleted tasks found" 
                            : "Create your first task to get started!"
                          }
                        </p>
                      </div>
                      {viewMode === 'active' && (
                        <CreateTaskDialog onTaskCreated={() => loadDashboardData(user.id)} />
                      )}
                    </div>
                  </Card>
                ) : (
                  <DndContext
                    sensors={useSensors(
                      useSensor(PointerSensor),
                      useSensor(KeyboardSensor, {
                        coordinateGetter: sortableKeyboardCoordinates,
                      })
                    )}
                    collisionDetection={closestCenter}
                    onDragEnd={(event: DragEndEvent) => {
                      const { active, over } = event;
                      if (active.id !== over?.id) {
                        const oldIndex = filteredTasks.findIndex((item) => item.id === active.id);
                        const newIndex = filteredTasks.findIndex((item) => item.id === over?.id);
                        const newTasks = arrayMove(filteredTasks, oldIndex, newIndex);
                        // Update order in database
                        newTasks.forEach((task, index) => {
                          supabase
                            .from('tasks')
                            .update({ order_index: index })
                            .eq('id', task.id);
                        });
                      }
                    }}
                  >
                    <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {filteredTasks.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          onComplete={() => handleTaskComplete(task.id)}
                          onUpdate={() => loadDashboardData(user.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )}
                    </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Zap className="h-6 w-6 text-primary" />
                  </div>
                    <div>
                <p className="text-2xl font-bold">{totalXP}</p>
                <p className="text-sm text-muted-foreground">Total XP</p>
                    </div>
                  </div>
                </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
                    <div>
                <p className="text-2xl font-bold">{activeStreaks}</p>
                <p className="text-sm text-muted-foreground">Active Streaks</p>
                    </div>
                  </div>
                </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
                    <div>
                <p className="text-2xl font-bold">{completedTasks}/{totalTasks}</p>
                <p className="text-sm text-muted-foreground">Tasks Done</p>
                    </div>
                  </div>
                </Card>
              </div>
      </div>

      {/* Quick Picks Modal */}
        <Sheet open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle>Quick Picks</SheetTitle>
            <SheetDescription>
              AI-powered habit suggestions for you
            </SheetDescription>
          </SheetHeader>
          <QuickPicksSection onHabitCreated={() => {
            setSuggestionsOpen(false);
            loadDashboardData(user.id);
          }} />
        </SheetContent>
      </Sheet>

      {/* Celebration Portal */}
      <CelebrationPortal
        celebration={celebrationData}
        onComplete={() => setCelebrationData(null)}
      />
    </div>
  );
}
