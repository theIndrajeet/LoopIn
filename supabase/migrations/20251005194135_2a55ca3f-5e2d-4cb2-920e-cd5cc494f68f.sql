-- Fix 1: Add RLS policy to allow anyone to view public profiles (for invite links)
CREATE POLICY "Anyone can view public profiles"
  ON public.profiles
  FOR SELECT
  USING (privacy_level = 'public');

-- Fix 2: Change default privacy to 'public' and update existing users
UPDATE public.profiles 
SET privacy_level = 'public' 
WHERE privacy_level = 'friends';

ALTER TABLE public.profiles 
ALTER COLUMN privacy_level SET DEFAULT 'public';

-- Fix 3: Update accept_friend_request to create bidirectional friendships
CREATE OR REPLACE FUNCTION public.accept_friend_request(friend_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;