import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Users, 
  Calendar,
  Zap,
  Award,
  Activity,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';

interface UserStats {
  id: string;
  display_name: string;
  total_xp: number;
  level: number;
  active_habits: number;
  total_habits: number;
  completed_tasks: number;
  total_tasks: number;
  current_streaks: number;
  best_streaks: number;
  friends_count: number;
}

interface HabitAnalytics {
  habit_id: string;
  title: string;
  difficulty: string;
  current_streak: number;
  best_streak: number;
  total_completions: number;
  completions_last_7_days: number;
  completions_last_30_days: number;
  is_active_today: number;
}

interface ProductivityData {
  productivity_score: number;
  habit_completions: number;
  task_completions: number;
  active_days: number;
  total_days: number;
  completion_rate: number;
}

export const AnalyticsDashboard = () => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [habitAnalytics, setHabitAnalytics] = useState<HabitAnalytics[]>([]);
  const [productivityData, setProductivityData] = useState<ProductivityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user stats from materialized view
      const { data: statsData } = await supabase
        .from('user_stats_view')
        .select('*')
        .eq('id', user.id)
        .single();

      if (statsData) {
        setUserStats(statsData);
      }

      // Fetch habit analytics from materialized view
      const { data: habitsData } = await supabase
        .from('habit_analytics_view')
        .select('*')
        .eq('user_id', user.id)
        .order('current_streak', { ascending: false });

      if (habitsData) {
        setHabitAnalytics(habitsData);
      }

      // Fetch productivity data using database function
      const { data: productivityData } = await supabase
        .rpc('get_user_productivity_score', { user_id: user.id, days: 30 });

      if (productivityData) {
        setProductivityData(productivityData);
      }

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getLevelProgress = () => {
    if (!userStats) return 0;
    const currentLevelXp = userStats.level * 100;
    const nextLevelXp = (userStats.level + 1) * 100;
    const progress = ((userStats.total_xp - currentLevelXp) / 100) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Level</p>
                  <p className="text-2xl font-bold">{userStats?.level || 0}</p>
                </div>
                <Award className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="mt-2">
                <Progress value={getLevelProgress()} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {userStats?.total_xp || 0} XP
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Habits</p>
                  <p className="text-2xl font-bold">{userStats?.active_habits || 0}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground">
                {userStats?.total_habits || 0} total habits
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Streaks</p>
                  <p className="text-2xl font-bold">{userStats?.current_streaks || 0}</p>
                </div>
                <Zap className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-xs text-muted-foreground">
                Best: {userStats?.best_streaks || 0}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Friends</p>
                  <p className="text-2xl font-bold">{userStats?.friends_count || 0}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground">
                Social connections
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Productivity Score */}
      {productivityData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Productivity Score (Last 30 Days)
              </CardTitle>
              <CardDescription>
                Your overall productivity based on habit and task completions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Score</span>
                  <span className="text-2xl font-bold">{productivityData.productivity_score}%</span>
                </div>
                <Progress value={productivityData.productivity_score} className="h-3" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Habit Completions</p>
                    <p className="font-semibold">{productivityData.habit_completions}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Task Completions</p>
                    <p className="font-semibold">{productivityData.task_completions}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Active Days</p>
                    <p className="font-semibold">{productivityData.active_days}/{productivityData.total_days}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Completion Rate</p>
                    <p className="font-semibold">{productivityData.completion_rate}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Habit Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Habit Performance
            </CardTitle>
            <CardDescription>
              Detailed analytics for each of your habits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="streaks" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="streaks">Streaks</TabsTrigger>
                <TabsTrigger value="completions">Completions</TabsTrigger>
                <TabsTrigger value="recent">Recent Activity</TabsTrigger>
              </TabsList>
              
              <TabsContent value="streaks" className="space-y-4">
                {habitAnalytics.map((habit) => (
                  <div key={habit.habit_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{habit.title}</h3>
                        <Badge className={getDifficultyColor(habit.difficulty)}>
                          {habit.difficulty}
                        </Badge>
                        {habit.is_active_today === 1 && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Today
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Current: {habit.current_streak}</span>
                        <span>Best: {habit.best_streak}</span>
                        <span>Last: {habit.last_completed ? new Date(habit.last_completed).toLocaleDateString() : 'Never'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-500">{habit.current_streak}</div>
                      <div className="text-xs text-muted-foreground">day streak</div>
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="completions" className="space-y-4">
                {habitAnalytics.map((habit) => (
                  <div key={habit.habit_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{habit.title}</h3>
                        <Badge className={getDifficultyColor(habit.difficulty)}>
                          {habit.difficulty}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Total: {habit.total_completions}</span>
                        <span>Last 7 days: {habit.completions_last_7_days}</span>
                        <span>Last 30 days: {habit.completions_last_30_days}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-500">{habit.total_completions}</div>
                      <div className="text-xs text-muted-foreground">total completions</div>
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="recent" className="space-y-4">
                {habitAnalytics
                  .filter(habit => habit.completions_last_7_days > 0)
                  .sort((a, b) => b.completions_last_7_days - a.completions_last_7_days)
                  .map((habit) => (
                    <div key={habit.habit_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{habit.title}</h3>
                          <Badge className={getDifficultyColor(habit.difficulty)}>
                            {habit.difficulty}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>This week: {habit.completions_last_7_days} times</span>
                          <span>This month: {habit.completions_last_30_days} times</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-500">{habit.completions_last_7_days}</div>
                        <div className="text-xs text-muted-foreground">this week</div>
                      </div>
                    </div>
                  ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
