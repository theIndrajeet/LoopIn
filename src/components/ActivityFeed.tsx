import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityItem } from './ActivityItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users } from 'lucide-react';

export const ActivityFeed = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityFeed();
  }, []);

  const fetchActivityFeed = async () => {
    try {
      const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('social_events')
        .select(`
          *,
          profiles!inner(display_name, avatar_url)
        `)
        .gte('created_at', seventyTwoHoursAgo)
        .eq('privacy_visible', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching activity feed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">No recent activity from friends.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Complete habits and reach milestones to share with friends!
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-3">
        {events.map((event) => (
          <ActivityItem key={event.id} event={event} />
        ))}
      </div>
    </ScrollArea>
  );
};
