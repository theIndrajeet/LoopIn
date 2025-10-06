import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeSubscription {
  channel: RealtimeChannel;
  table: string;
  event: string;
  filter?: string;
}

interface UseRealtimeOptions {
  table: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  filter?: string;
  onUpdate: (payload: any) => void;
  enabled?: boolean;
  debounceMs?: number;
}

export const useRealtime = ({
  table,
  event = '*',
  filter,
  onUpdate,
  enabled = true,
  debounceMs = 100
}: UseRealtimeOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const debouncedOnUpdate = useCallback((payload: any) => {
    const now = Date.now();
    lastUpdateRef.current = now;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (lastUpdateRef.current === now) {
        onUpdate(payload);
      }
    }, debounceMs);
  }, [onUpdate, debounceMs]);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${table}-${event}-${filter || 'all'}`;
    
    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create new channel
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter
        },
        debouncedOnUpdate
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Realtime connected: ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Realtime error: ${channelName}`);
        } else if (status === 'TIMED_OUT') {
          console.warn(`⏰ Realtime timeout: ${channelName}`);
        }
      });

    channelRef.current = channel;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, event, filter, enabled, debouncedOnUpdate]);

  return {
    isConnected: channelRef.current?.state === 'joined',
    channel: channelRef.current
  };
};

// Hook for managing multiple realtime subscriptions
export const useRealtimeManager = () => {
  const subscriptionsRef = useRef<Map<string, RealtimeSubscription>>(new Map());

  const addSubscription = useCallback((
    key: string,
    table: string,
    event: string,
    filter: string | undefined,
    onUpdate: (payload: any) => void
  ) => {
    // Remove existing subscription with same key
    removeSubscription(key);

    const channel = supabase
      .channel(`realtime-${key}`)
      .on(
        'postgres_changes',
        {
          event: event as any,
          schema: 'public',
          table,
          filter
        },
        onUpdate
      )
      .subscribe();

    subscriptionsRef.current.set(key, {
      channel,
      table,
      event,
      filter
    });

    return channel;
  }, []);

  const removeSubscription = useCallback((key: string) => {
    const subscription = subscriptionsRef.current.get(key);
    if (subscription) {
      supabase.removeChannel(subscription.channel);
      subscriptionsRef.current.delete(key);
    }
  }, []);

  const removeAllSubscriptions = useCallback(() => {
    subscriptionsRef.current.forEach((subscription) => {
      supabase.removeChannel(subscription.channel);
    });
    subscriptionsRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      removeAllSubscriptions();
    };
  }, [removeAllSubscriptions]);

  return {
    addSubscription,
    removeSubscription,
    removeAllSubscriptions,
    subscriptionCount: subscriptionsRef.current.size
  };
};

// Hook for connection status and reconnection logic
export const useRealtimeStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const maxRetries = 5;
  const retryDelay = 1000;

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        if (error) throw error;
        setIsConnected(true);
        setConnectionAttempts(0);
      } catch (error) {
        console.error('Connection check failed:', error);
        setIsConnected(false);
        
        if (connectionAttempts < maxRetries) {
          setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
          }, retryDelay * Math.pow(2, connectionAttempts));
        }
      }
    };

    checkConnection();
    
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [connectionAttempts]);

  return {
    isConnected,
    connectionAttempts,
    isRetrying: connectionAttempts > 0 && connectionAttempts < maxRetries
  };
};
