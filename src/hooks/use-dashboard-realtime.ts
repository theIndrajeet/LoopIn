import { useEffect, useCallback, useRef } from 'react';
import { useRealtime } from './use-realtime';
import { useCache } from './use-cache';
import { usePerformance } from './use-performance';
import { supabase } from '@/integrations/supabase/client';

interface DashboardData {
  habits: any[];
  tasks: any[];
  profile: any;
  streaks: any[];
  notifications: any[];
  socialEvents: any[];
}

interface UseDashboardRealtimeOptions {
  userId: string;
  onDataUpdate: (data: Partial<DashboardData>) => void;
  enabled?: boolean;
}

export const useDashboardRealtime = ({
  userId,
  onDataUpdate,
  enabled = true
}: UseDashboardRealtimeOptions) => {
  const { measureAsync } = usePerformance();
  const lastUpdateRef = useRef<number>(0);
  const updateQueueRef = useRef<Partial<DashboardData>>({});

  // Debounced update function to batch multiple changes
  const debouncedUpdate = useCallback(() => {
    const now = Date.now();
    lastUpdateRef.current = now;

    setTimeout(() => {
      if (lastUpdateRef.current === now && Object.keys(updateQueueRef.current).length > 0) {
        onDataUpdate(updateQueueRef.current);
        updateQueueRef.current = {};
      }
    }, 100);
  }, [onDataUpdate]);

  const queueUpdate = useCallback((data: Partial<DashboardData>) => {
    updateQueueRef.current = { ...updateQueueRef.current, ...data };
    debouncedUpdate();
  }, [debouncedUpdate]);

  // Habits realtime subscription
  useRealtime({
    table: 'habits',
    event: '*',
    filter: `user_id=eq.${userId}`,
    onUpdate: useCallback(async (payload) => {
      console.log('🔄 Habits updated:', payload.eventType);
      
      const { data: habits } = await measureAsync('fetch_habits', () =>
        supabase
          .from('habits')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('order_index')
      );

      queueUpdate({ habits: habits || [] });
    }, [userId, measureAsync, queueUpdate]),
    enabled
  });

  // Tasks realtime subscription
  useRealtime({
    table: 'tasks',
    event: '*',
    filter: `user_id=eq.${userId}`,
    onUpdate: useCallback(async (payload) => {
      console.log('🔄 Tasks updated:', payload.eventType);
      
      const { data: tasks } = await measureAsync('fetch_tasks', () =>
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('order_index')
      );

      queueUpdate({ tasks: tasks || [] });
    }, [userId, measureAsync, queueUpdate]),
    enabled
  });

  // Profile realtime subscription
  useRealtime({
    table: 'profiles',
    event: 'UPDATE',
    filter: `id=eq.${userId}`,
    onUpdate: useCallback(async (payload) => {
      console.log('🔄 Profile updated:', payload.eventType);
      
      const { data: profile } = await measureAsync('fetch_profile', () =>
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
      );

      queueUpdate({ profile: profile || null });
    }, [userId, measureAsync, queueUpdate]),
    enabled
  });

  // Streaks realtime subscription
  useRealtime({
    table: 'streaks',
    event: '*',
    onUpdate: useCallback(async (payload) => {
      console.log('🔄 Streaks updated:', payload.eventType);
      
      const { data: streaks } = await measureAsync('fetch_streaks', () =>
        supabase
          .from('streaks')
          .select(`
            *,
            habits!inner(user_id)
          `)
          .eq('habits.user_id', userId)
      );

      queueUpdate({ streaks: streaks || [] });
    }, [userId, measureAsync, queueUpdate]),
    enabled
  });

  // Notifications realtime subscription
  useRealtime({
    table: 'notifications',
    event: '*',
    filter: `user_id=eq.${userId}`,
    onUpdate: useCallback(async (payload) => {
      console.log('🔄 Notifications updated:', payload.eventType);
      
      const { data: notifications } = await measureAsync('fetch_notifications', () =>
        supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)
      );

      queueUpdate({ notifications: notifications || [] });
    }, [userId, measureAsync, queueUpdate]),
    enabled
  });

  // Social events realtime subscription
  useRealtime({
    table: 'social_events',
    event: '*',
    onUpdate: useCallback(async (payload) => {
      console.log('🔄 Social events updated:', payload.eventType);
      
      const { data: socialEvents } = await measureAsync('fetch_social_events', () =>
        supabase
          .from('social_events')
          .select(`
            *,
            profiles!inner(display_name, avatar_url, privacy_level)
          `)
          .or(`user_id.eq.${userId},profiles.privacy_level.eq.public`)
          .order('created_at', { ascending: false })
          .limit(20)
      );

      queueUpdate({ socialEvents: socialEvents || [] });
    }, [userId, measureAsync, queueUpdate]),
    enabled
  });

  return {
    isConnected: true // This would be determined by the realtime connection status
  };
};

// Hook for optimized data fetching with caching
export const useOptimizedDashboardData = (userId: string) => {
  const { measureAsync } = usePerformance();
  
  // Don't fetch if userId is empty or invalid
  const isValidUserId = userId && userId.trim() !== '' && userId !== 'undefined';
  
  // Return empty data if userId is invalid
  if (!isValidUserId) {
    return {
      data: {
        habits: [],
        tasks: [],
        profile: null,
        streaks: [],
        notifications: [],
        socialEvents: []
      },
      loading: false,
      refreshAll: () => {},
      refreshHabits: () => {},
      refreshTasks: () => {},
      refreshProfile: () => {},
      refreshStreaks: () => {},
      refreshNotifications: () => {},
      refreshSocialEvents: () => {}
    };
  }

  // Cached habits data
  const { data: habits, loading: habitsLoading, refresh: refreshHabits } = useCache(
    `habits-${userId}`,
    () => measureAsync('fetch_habits_cached', () =>
      supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('order_index')
        .then(({ data }) => data || [])
    ),
    { ttl: 2 * 60 * 1000, staleWhileRevalidate: true } // 2 minutes cache
  );

  // Cached tasks data
  const { data: tasks, loading: tasksLoading, refresh: refreshTasks } = useCache(
    `tasks-${userId}`,
    () => measureAsync('fetch_tasks_cached', () =>
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('order_index')
        .then(({ data }) => data || [])
    ),
    { ttl: 2 * 60 * 1000, staleWhileRevalidate: true }
  );

  // Cached profile data
  const { data: profile, loading: profileLoading, refresh: refreshProfile } = useCache(
    `profile-${userId}`,
    () => measureAsync('fetch_profile_cached', () =>
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then(({ data }) => data)
    ),
    { ttl: 5 * 60 * 1000, staleWhileRevalidate: true } // 5 minutes cache
  );

  // Cached streaks data
  const { data: streaks, loading: streaksLoading, refresh: refreshStreaks } = useCache(
    `streaks-${userId}`,
    () => measureAsync('fetch_streaks_cached', () =>
      supabase
        .from('streaks')
        .select(`
          *,
          habits!inner(user_id)
        `)
        .eq('habits.user_id', userId)
        .then(({ data }) => data || [])
    ),
    { ttl: 3 * 60 * 1000, staleWhileRevalidate: true } // 3 minutes cache
  );

  // Cached notifications data
  const { data: notifications, loading: notificationsLoading, refresh: refreshNotifications } = useCache(
    `notifications-${userId}`,
    () => measureAsync('fetch_notifications_cached', () =>
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data }) => data || [])
    ),
    { ttl: 1 * 60 * 1000, staleWhileRevalidate: true } // 1 minute cache
  );

  // Cached social events data
  const { data: socialEvents, loading: socialEventsLoading, refresh: refreshSocialEvents } = useCache(
    `social-events-${userId}`,
    () => measureAsync('fetch_social_events_cached', () =>
      supabase
        .from('social_events')
        .select(`
          *,
          profiles!inner(display_name, avatar_url, privacy_level)
        `)
        .or(`user_id.eq.${userId},profiles.privacy_level.eq.public`)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => data || [])
    ),
    { ttl: 2 * 60 * 1000, staleWhileRevalidate: true } // 2 minutes cache
  );

  const refreshAll = useCallback(() => {
    refreshHabits();
    refreshTasks();
    refreshProfile();
    refreshStreaks();
    refreshNotifications();
    refreshSocialEvents();
  }, [refreshHabits, refreshTasks, refreshProfile, refreshStreaks, refreshNotifications, refreshSocialEvents]);

  const loading = habitsLoading || tasksLoading || profileLoading || streaksLoading || notificationsLoading || socialEventsLoading;

  return {
    data: {
      habits: habits || [],
      tasks: tasks || [],
      profile: profile || null,
      streaks: streaks || [],
      notifications: notifications || [],
      socialEvents: socialEvents || []
    },
    loading,
    refreshAll,
    refreshHabits,
    refreshTasks,
    refreshProfile,
    refreshStreaks,
    refreshNotifications,
    refreshSocialEvents
  };
};
