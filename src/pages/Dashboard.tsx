import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { HabitCard } from "@/components/HabitCard";
import { CreateHabitDialog } from "@/components/CreateHabitDialog";
import { LogOut, User, Zap, Flame } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Habit {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
}

interface Streak {
  habit_id: string;
  current_count: number;
  best_count: number;
  last_completed_date: string | null;
}

interface HabitLog {
  habit_id: string;
  completed_at: string;
}

const Dashboard = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // Fetch habits
      const { data: habitsData } = await supabase
        .from("habits")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      setHabits(habitsData || []);

      // Fetch streaks
      const { data: streaksData } = await supabase
        .from("streaks")
        .select("*");
      setStreaks(streaksData || []);

      // Fetch today's logs
      const today = new Date().toISOString().split('T')[0];
      const { data: logsData } = await supabase
        .from("habit_logs")
        .select("habit_id, completed_at")
        .gte("completed_at", `${today}T00:00:00`)
        .lte("completed_at", `${today}T23:59:59`);
      setLogs(logsData || []);

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const totalXP = profile?.total_xp || 0;
  const totalStreaks = streaks.reduce((sum, s) => sum + s.current_count, 0);
  const completedToday = logs.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-2xl font-semibold text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-hero rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Loop Level</h1>
                <p className="text-sm text-muted-foreground">
                  Hey, {profile?.display_name || "there"}!
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut} size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-gradient-hero text-white py-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Zap className="w-5 h-5" />
                <p className="text-3xl font-bold">{totalXP}</p>
              </div>
              <p className="text-sm opacity-90">Total XP</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Flame className="w-5 h-5" />
                <p className="text-3xl font-bold">{totalStreaks}</p>
              </div>
              <p className="text-sm opacity-90">Total Streaks</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{completedToday}</p>
              <p className="text-sm opacity-90">Done Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Today's Habits</h2>
            <p className="text-muted-foreground">
              {habits.length === 0
                ? "Create your first habit to get started!"
                : `${completedToday} of ${habits.length} completed`}
            </p>
          </div>
          <CreateHabitDialog onHabitCreated={fetchData} />
        </div>

        {habits.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-muted rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <Zap className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">No habits yet</h3>
            <p className="text-muted-foreground mb-6">
              Start building better habits today!
            </p>
            <CreateHabitDialog onHabitCreated={fetchData} />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {habits.map((habit) => {
              const streak = streaks.find((s) => s.habit_id === habit.id);
              const isCompletedToday = logs.some((log) => log.habit_id === habit.id);

              return (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  streak={streak || null}
                  isCompletedToday={isCompletedToday}
                  onComplete={fetchData}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
