-- Create friendship status enum
CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create friendships table
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'pending',
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_friendship CHECK (user_id != friend_id),
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their friendships"
  ON public.friendships
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests"
  ON public.friendships
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update received requests"
  ON public.friendships
  FOR UPDATE
  USING (auth.uid() = friend_id);

CREATE POLICY "Users can delete their friendships"
  ON public.friendships
  FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendships_updated_at();

-- Helper function to accept friend request
CREATE OR REPLACE FUNCTION accept_friend_request(friend_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.friendships
  SET status = 'accepted', updated_at = now()
  WHERE friend_id = auth.uid() 
    AND user_id = friend_user_id 
    AND status = 'pending';
END;
$$;

-- Helper function to reject friend request
CREATE OR REPLACE FUNCTION reject_friend_request(friend_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.friendships
  SET status = 'rejected', updated_at = now()
  WHERE friend_id = auth.uid() 
    AND user_id = friend_user_id 
    AND status = 'pending';
END;
$$;