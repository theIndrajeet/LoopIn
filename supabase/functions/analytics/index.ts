import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'overview';

    let analytics;

    switch (type) {
      case 'overview':
        analytics = await getOverviewAnalytics(supabase, user.id);
        break;
      case 'habits':
        analytics = await getHabitAnalytics(supabase, user.id);
        break;
      case 'streaks':
        analytics = await getStreakAnalytics(supabase, user.id);
        break;
      case 'social':
        analytics = await getSocialAnalytics(supabase, user.id);
        break;
      case 'productivity':
        analytics = await getProductivityAnalytics(supabase, user.id);
        break;
      default:
        throw new Error('Invalid analytics type');
    }

    return new Response(
      JSON.stringify({ success: true, data: analytics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in analytics function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: 'Check server logs for more information'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function getOverviewAnalytics(supabase: any, userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp, created_at')
    .eq('id', userId)
    .single();

  // Get habits count
  const { count: totalHabits } = await supabase
    .from('habits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null);

  // Get active habits count
  const { count: activeHabits } = await supabase
    .from('habits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('active', true)
    .is('deleted_at', null);

  // Get tasks count
  const { count: totalTasks } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null);

  // Get completed tasks count
  const { count: completedTasks } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)
    .is('deleted_at', null);

  // Get habit completions in last 30 days
  const { data: recentCompletions } = await supabase
    .from('habit_logs')
    .select('completed_at')
    .eq('user_id', userId)
    .gte('completed_at', thirtyDaysAgo.toISOString());

  // Get streaks data
  const { data: streaks } = await supabase
    .from('streaks')
    .select('current_count, best_count')
    .in('habit_id', 
      supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('active', true)
        .is('deleted_at', null)
    );

  const totalStreaks = streaks?.reduce((sum, s) => sum + s.current_count, 0) || 0;
  const bestStreak = streaks?.reduce((max, s) => Math.max(max, s.best_count), 0) || 0;

  return {
    profile: {
      total_xp: profile?.total_xp || 0,
      level: Math.floor((profile?.total_xp || 0) / 100),
      days_active: Math.ceil((Date.now() - new Date(profile?.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24))
    },
    habits: {
      total: totalHabits || 0,
      active: activeHabits || 0,
      completion_rate: recentCompletions?.length || 0
    },
    tasks: {
      total: totalTasks || 0,
      completed: completedTasks || 0,
      completion_rate: totalTasks > 0 ? (completedTasks || 0) / totalTasks : 0
    },
    streaks: {
      current_total: totalStreaks,
      best_ever: bestStreak
    }
  };
}

async function getHabitAnalytics(supabase: any, userId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Get habits with completion data
  const { data: habits } = await supabase
    .from('habits')
    .select(`
      id,
      title,
      difficulty,
      created_at,
      streaks(current_count, best_count),
      habit_logs!inner(completed_at)
    `)
    .eq('user_id', userId)
    .eq('active', true)
    .is('deleted_at', null)
    .gte('habit_logs.completed_at', sevenDaysAgo.toISOString());

  // Get completion patterns
  const { data: completionPatterns } = await supabase
    .from('habit_logs')
    .select('habit_id, completed_at')
    .eq('user_id', userId)
    .gte('completed_at', sevenDaysAgo.toISOString())
    .order('completed_at', { ascending: true });

  return {
    habits: habits?.map(habit => ({
      id: habit.id,
      title: habit.title,
      difficulty: habit.difficulty,
      current_streak: habit.streaks?.[0]?.current_count || 0,
      best_streak: habit.streaks?.[0]?.best_count || 0,
      completions_this_week: habit.habit_logs?.length || 0
    })) || [],
    patterns: completionPatterns || []
  };
}

async function getStreakAnalytics(supabase: any, userId: string) {
  // Get all streaks for user's habits
  const { data: streaks } = await supabase
    .from('streaks')
    .select(`
      current_count,
      best_count,
      last_completed_date,
      habits(title, difficulty)
    `)
    .in('habit_id', 
      supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('active', true)
        .is('deleted_at', null)
    );

  const activeStreaks = streaks?.filter(s => s.current_count > 0) || [];
  const totalCurrentStreaks = activeStreaks.reduce((sum, s) => sum + s.current_count, 0);
  const totalBestStreaks = streaks?.reduce((sum, s) => sum + s.best_count, 0) || 0;

  return {
    total_current: totalCurrentStreaks,
    total_best: totalBestStreaks,
    active_count: activeStreaks.length,
    streaks: streaks?.map(streak => ({
      habit_title: streak.habits?.title || 'Unknown',
      difficulty: streak.habits?.difficulty || 'medium',
      current: streak.current_count,
      best: streak.best_count,
      last_completed: streak.last_completed_date
    })) || []
  };
}

async function getSocialAnalytics(supabase: any, userId: string) {
  // Get friends count
  const { count: friendsCount } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'accepted');

  // Get social events created by user
  const { data: socialEvents } = await supabase
    .from('social_events')
    .select('type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get user's rank in global leaderboard
  const { data: leaderboard } = await supabase
    .from('leaderboard_view')
    .select('rank')
    .eq('id', userId)
    .single();

  return {
    friends_count: friendsCount || 0,
    social_events: socialEvents?.length || 0,
    global_rank: leaderboard?.rank || null,
    recent_activity: socialEvents?.slice(0, 10) || []
  };
}

async function getProductivityAnalytics(supabase: any, userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get daily completion patterns
  const { data: dailyCompletions } = await supabase
    .from('habit_logs')
    .select('completed_at')
    .eq('user_id', userId)
    .gte('completed_at', thirtyDaysAgo.toISOString())
    .order('completed_at', { ascending: true });

  // Get task completion patterns
  const { data: taskCompletions } = await supabase
    .from('tasks')
    .select('completed, completed_at, priority')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  // Calculate productivity metrics
  const totalDays = 30;
  const daysWithActivity = new Set(
    dailyCompletions?.map(log => 
      new Date(log.completed_at).toDateString()
    ) || []
  ).size;

  const productivityScore = (daysWithActivity / totalDays) * 100;

  return {
    productivity_score: Math.round(productivityScore),
    days_active: daysWithActivity,
    total_days: totalDays,
    daily_completions: dailyCompletions?.length || 0,
    task_completion_rate: taskCompletions?.length > 0 
      ? (taskCompletions.filter(t => t.completed).length / taskCompletions.length) * 100 
      : 0,
    patterns: {
      daily: dailyCompletions || [],
      tasks: taskCompletions || []
    }
  };
}
