import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateHabitDialog } from "@/components/CreateHabitDialog";
import { HabitCard } from "@/components/HabitCard";
import { LogOut, Zap, Flame, CheckCircle2, Trophy, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const [habits, setHabits] = useState<any[]>([]);
  const [todaysLogs, setTodaysLogs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [streaks, setStreaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

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

      const [habitsResult, logsResult, profileResult, streaksResult] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true),
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const completedToday = todaysLogs.length;
  const totalHabits = habits.length;
  const totalStreaks = streaks.reduce((sum, s) => sum + s.current_count, 0);

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

          <Card className="p-4 sm:p-6 bg-card border-border hover:border-primary transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {completedToday}/{totalHabits}
                </p>
                <p className="text-sm text-muted-foreground">Completed Today</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Your Habits</h2>
          <CreateHabitDialog onHabitCreated={fetchData} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-fade-in">
          {habits.map((habit, idx) => (
            <div key={habit.id} style={{ animationDelay: `${idx * 50}ms` }}>
              <HabitCard
                habit={habit}
                isCompletedToday={todaysLogs.some((log) => log.habit_id === habit.id)}
                onComplete={fetchData}
              />
            </div>
          ))}
        </div>

        {habits.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No habits yet. Create your first one to get started!
            </p>
            <CreateHabitDialog onHabitCreated={fetchData} />
          </div>
        )}
      </div>
    </div>
  );
}
