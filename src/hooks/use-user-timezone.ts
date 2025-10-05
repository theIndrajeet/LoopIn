import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectTimezone } from '@/lib/timezone-utils';

/**
 * Hook to get the current user's timezone
 * Falls back to browser-detected timezone if not set in profile
 */
export const useUserTimezone = () => {
  const [timezone, setTimezone] = useState<string>(detectTimezone());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserTimezone = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setTimezone(detectTimezone());
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('timezone')
          .eq('id', user.id)
          .single();

        if (profile?.timezone) {
          setTimezone(profile.timezone);
        } else {
          setTimezone(detectTimezone());
        }
      } catch (error) {
        console.error('Error fetching timezone:', error);
        setTimezone(detectTimezone());
      } finally {
        setLoading(false);
      }
    };

    fetchUserTimezone();
  }, []);

  return { timezone, loading };
};
