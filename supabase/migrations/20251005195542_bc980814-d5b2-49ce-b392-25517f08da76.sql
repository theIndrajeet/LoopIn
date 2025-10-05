-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'friend_request',
  'friend_accepted',
  'streak_milestone',
  'level_up',
  'friend_activity'
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to create friend request notification
CREATE OR REPLACE FUNCTION public.create_friend_request_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_name TEXT;
BEGIN
  -- Get the requester's display name
  SELECT display_name INTO requester_name
  FROM profiles
  WHERE id = NEW.requester_id;

  -- Create notification for the friend (recipient)
  INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
  VALUES (
    NEW.friend_id,
    'friend_request',
    'New Friend Request',
    requester_name || ' sent you a friend request',
    '/friends',
    jsonb_build_object('requester_id', NEW.requester_id, 'friendship_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

-- Function to create friend accepted notification
CREATE OR REPLACE FUNCTION public.create_friend_accepted_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  accepter_name TEXT;
BEGIN
  -- Only create notification when status changes to accepted
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Get the accepter's display name
    SELECT display_name INTO accepter_name
    FROM profiles
    WHERE id = NEW.friend_id;

    -- Create notification for the requester
    INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
    VALUES (
      NEW.requester_id,
      'friend_accepted',
      'Friend Request Accepted',
      accepter_name || ' accepted your friend request',
      '/friends',
      jsonb_build_object('friend_id', NEW.friend_id, 'friendship_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers for friend request notifications
CREATE TRIGGER on_friend_request_created
  AFTER INSERT ON public.friendships
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.create_friend_request_notification();

CREATE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.create_friend_accepted_notification();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;