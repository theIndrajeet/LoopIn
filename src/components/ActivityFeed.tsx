import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityItem } from './ActivityItem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { ActivityItemSkeleton } from './skeletons/ActivityItemSkeleton';

export const ActivityFeed = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityFeed();

    // Real-time subscription for social events
    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_events'
        },
        () => {
          console.log('🔄 Social events updated - refreshing activity feed');
          fetchActivityFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActivityFeed = async () => {
    try {
      const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('social_events')
        .select(`
          *,
          profiles(display_name, avatar_url)
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
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <ActivityItemSkeleton key={i} />
          ))}
        </div>
      </ScrollArea>
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
      <motion.div 
        className="space-y-3"
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
          }
        }}
      >
        {events.map((event) => (
          <motion.div
            key={event.id}
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: { opacity: 1, y: 0 }
            }}
          >
            <ActivityItem event={event} />
          </motion.div>
        ))}
      </motion.div>
    </ScrollArea>
  );
};
