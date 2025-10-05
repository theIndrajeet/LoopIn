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

    // Get all active users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name');

    if (profilesError) throw profilesError;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const summaries = [];

    for (const profile of profiles || []) {
      // Get weekly logs
      const { data: logs } = await supabase
        .from('habit_logs')
        .select('habit_id, xp_earned, completed_at')
        .eq('habit_id', profile.id)
        .gte('completed_at', oneWeekAgo.toISOString());

      if (!logs || logs.length === 0) continue;

      const totalXP = logs.reduce((sum, log) => sum + (log.xp_earned || 0), 0);
      const completions = logs.length;

      // Group by day to find best day
      const dayGroups = logs.reduce((acc, log) => {
        const day = new Date(log.completed_at).toDateString();
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const bestDay = Object.entries(dayGroups).sort(([, a], [, b]) => b - a)[0]?.[0];
      const bestDayName = bestDay ? new Date(bestDay).toLocaleDateString('en-US', { weekday: 'long' }) : 'N/A';

      // Get active streaks
      const { data: streaks } = await supabase
        .from('streaks')
        .select('current_count, habit_id')
        .gt('current_count', 0);

      const activeStreaks = streaks?.length || 0;

      // Store summary event
      await supabase.from('suggestion_events').insert({
        user_id: profile.id,
        suggestion_type: 'weekly_summary',
        action: 'weekly_summary_shown',
        suggestion_id: 'weekly',
        metadata: { xp: totalXP, completions, best_day: bestDayName, active_streaks: activeStreaks }
      });

      summaries.push({
        user_id: profile.id,
        xp: totalXP,
        completions,
        bestDay: bestDayName,
        activeStreaks
      });
    }

    console.log(`Processed ${summaries.length} weekly summaries`);

    return new Response(
      JSON.stringify({ success: true, count: summaries.length, summaries }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-weekly-summary:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});