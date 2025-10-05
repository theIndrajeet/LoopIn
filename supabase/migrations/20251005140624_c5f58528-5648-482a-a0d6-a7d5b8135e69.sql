-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for habit difficulty
CREATE TYPE public.habit_difficulty AS ENUM ('easy', 'medium', 'hard');

-- Create enum for privacy levels
CREATE TYPE public.privacy_level AS ENUM ('public', 'friends', 'private');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  privacy_level privacy_level DEFAULT 'friends',
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create habits table
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  difficulty habit_difficulty DEFAULT 'medium',
  schedule_days INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6], -- 0=Sunday, 6=Saturday
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on habits
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

-- Habits policies
CREATE POLICY "Users can view their own habits"
  ON public.habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own habits"
  ON public.habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
  ON public.habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
  ON public.habits FOR DELETE
  USING (auth.uid() = user_id);

-- Create habit_logs table
CREATE TABLE public.habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  xp_earned INTEGER DEFAULT 10,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on habit_logs
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- Habit logs policies
CREATE POLICY "Users can view logs for their habits"
  ON public.habit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.habits
    WHERE habits.id = habit_logs.habit_id
    AND habits.user_id = auth.uid()
  ));

CREATE POLICY "Users can create logs for their habits"
  ON public.habit_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.habits
    WHERE habits.id = habit_logs.habit_id
    AND habits.user_id = auth.uid()
  ));

-- Create streaks table
CREATE TABLE public.streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  current_count INTEGER DEFAULT 0,
  best_count INTEGER DEFAULT 0,
  last_completed_date DATE,
  freeze_tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id)
);

-- Enable RLS on streaks
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

-- Streaks policies
CREATE POLICY "Users can view streaks for their habits"
  ON public.streaks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.habits
    WHERE habits.id = streaks.habit_id
    AND habits.user_id = auth.uid()
  ));

CREATE POLICY "Users can update streaks for their habits"
  ON public.streaks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.habits
    WHERE habits.id = streaks.habit_id
    AND habits.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert streaks for their habits"
  ON public.streaks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.habits
    WHERE habits.id = streaks.habit_id
    AND habits.user_id = auth.uid()
  ));

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();