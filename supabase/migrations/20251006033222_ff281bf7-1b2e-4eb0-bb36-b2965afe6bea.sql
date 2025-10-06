-- Fix critical security issues

-- 1. Add INSERT policy for notifications table to allow system-level inserts
-- This allows database triggers to create notifications for users
CREATE POLICY "System can insert notifications for users"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- 2. Update database functions to set search_path = public for security

-- Update accept_friend_request function
CREATE OR REPLACE FUNCTION public.accept_friend_request(friend_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update the original pending request to accepted
  UPDATE public.friendships
  SET status = 'accepted', updated_at = now()
  WHERE friend_id = auth.uid() 
    AND user_id = friend_user_id 
    AND status = 'pending';
  
  -- Create the reciprocal friendship record (bidirectional)
  INSERT INTO public.friendships (user_id, friend_id, requester_id, status)
  VALUES (auth.uid(), friend_user_id, friend_user_id, 'accepted')
  ON CONFLICT (user_id, friend_id) 
  DO UPDATE SET 
    status = 'accepted', 
    updated_at = now();
END;
$function$;

-- Update reject_friend_request function
CREATE OR REPLACE FUNCTION public.reject_friend_request(friend_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.friendships
  SET status = 'rejected', updated_at = now()
  WHERE friend_id = auth.uid() 
    AND user_id = friend_user_id 
    AND status = 'pending';
END;
$function$;

-- Update update_profile_xp_on_log function
CREATE OR REPLACE FUNCTION public.update_profile_xp_on_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user_id from the habit
  SELECT user_id INTO v_user_id
  FROM habits
  WHERE id = NEW.habit_id;
  
  -- Update the user's total XP
  UPDATE profiles
  SET total_xp = total_xp + NEW.xp_earned
  WHERE id = v_user_id;
  
  RETURN NEW;
END;
$function$;