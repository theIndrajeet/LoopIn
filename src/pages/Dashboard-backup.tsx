import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateHabitDialog } from "@/components/CreateHabitDialog";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { HabitCard } from "@/components/HabitCard";
import { TaskCard } from "@/components/TaskCard";
import { LogOut, CheckCircle2, ListTodo, Bell, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationsList } from "@/components/NotificationsList";
import { NotificationSettings } from "@/components/NotificationSettings";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [contentType, setContentType] = useState<"habits" | "tasks">("habits");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchUnreadCount();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    } catch (error) {
      console.error("Auth error:", error);
      navigate("/auth");
    }
  };

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [habitsResult, tasksResult, profileResult] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true).is("deleted_at", null),
        supabase.from("tasks").select("*").eq("user_id", user.id).is("deleted_at", null),
        supabase.from("profiles").select("*").eq("id", user.id).single()
      ]);

      if (habitsResult.data) setHabits(habitsResult.data);
      if (tasksResult.data) setTasks(tasksResult.data);
      if (profileResult.data) setProfile(profileResult.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({title: "Failed to load dashboard data", variant: "destructive"});
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) return;
    
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleHabitCompletion = async (habitId: string, xp: number) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("habit_logs").insert({ 
        habit_id: habitId, 
        user_id: user.id, 
        xp_earned: xp 
      });

      if (error) {
        toast({title: "Failed to log habit completion.", variant: "destructive"});
        console.error("Error logging habit completion:", error);
      } else {
        toast({title: "Habit completed! XP earned."});
        fetchData();
      }
    } catch (error) {
      console.error("Habit completion error:", error);
      toast({title: "Failed to complete habit.", variant: "destructive"});
    }
  };

  const handleTaskCompletion = async (taskId: string, xp: number) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("tasks").update({ 
        completed_at: new Date().toISOString(), 
        xp_earned: xp 
      }).eq("id", taskId);

      if (error) {
        toast({title: "Failed to complete task.", variant: "destructive"});
        console.error("Error completing task:", error);
      } else {
        toast({title: "Task completed! XP earned."});
        fetchData();
      }
    } catch (error) {
      console.error("Task completion error:", error);
      toast({title: "Failed to complete task.", variant: "destructive"});
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
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

          <div className="flex items-center gap-2">
            <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Alerts</SheetTitle>
                </SheetHeader>
                <Tabs defaultValue="notifications" className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>
                  <TabsContent value="notifications" className="mt-4">
                    <NotificationsList onNotificationRead={fetchUnreadCount} />
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
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Profile</SheetTitle>
                </SheetHeader>
                <div className="py-6 space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name} />
                      <AvatarFallback className="text-lg">
                        {profile?.display_name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{profile?.display_name || "User"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {profile?.total_xp || 0} XP
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Content Type Tabs */}
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
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Your Habits</h2>
              <CreateHabitDialog onHabitCreated={fetchData} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  isCompletedToday={false}
                  onComplete={handleHabitCompletion}
                  onArchive={async () => {
                    await supabase.from("habits").update({ active: false, archived_at: new Date().toISOString() }).eq("id", habit.id);
                    fetchData();
                    toast({title: "Habit archived"});
                  }}
                  onDelete={async () => {
                    await supabase.from("habits").update({ deleted_at: new Date().toISOString() }).eq("id", habit.id);
                    fetchData();
                    toast({title: "Habit moved to trash"});
                  }}
                />
              ))}
              {habits.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-10">
                  <p className="text-lg mb-2">No habits yet!</p>
                  <p className="text-sm">Start by creating your first habit.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Your Tasks</h2>
              <CreateTaskDialog onTaskCreated={fetchData} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleTaskCompletion}
                  onEdit={() => {}}
                  onDelete={async () => {
                    if (confirm(`Permanently delete "${task.title}"? This cannot be undone.`)) {
                      await supabase.from("tasks").delete().eq("id", task.id);
                      fetchData();
                      toast({title: "Task permanently deleted", variant: "destructive"});
                    }
                  }}
                />
              ))}
              {tasks.length === 0 && (
                <div className="text-center text-muted-foreground py-10">
                  <p className="text-lg mb-2">No tasks yet!</p>
                  <p className="text-sm">Start by creating your first task.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
