-- Create social_events table for friend activity feed
CREATE TABLE IF NOT EXISTS public.social_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('streak_milestone', 'habit_completed', 'level_up', 'first_completion')),
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  privacy_visible boolean DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_events_created ON public.social_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_events_user ON public.social_events(user_id);
CREATE INDEX IF NOT EXISTS idx_social_events_type ON public.social_events(type);

-- Enable RLS
ALTER TABLE public.social_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view events from their friends
CREATE POLICY "Users can view events from friends"
  ON public.social_events FOR SELECT
  USING (
    user_id IN (
      SELECT friend_id FROM public.friendships 
      WHERE user_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT user_id FROM public.friendships
      WHERE friend_id = auth.uid() AND status = 'accepted'
    )
    OR user_id = auth.uid()
  );

-- RLS Policy: Users can insert their own events
CREATE POLICY "Users can insert their own events"
  ON public.social_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add celebration preferences to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS celebrations_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sounds_enabled boolean DEFAULT true;