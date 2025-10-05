-- Create user_preferences table for personalized suggestions
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Tier 1: Onboarding (3 questions)
  primary_goals TEXT[] DEFAULT '{}',
  schedule_type TEXT,
  energy_level TEXT,
  -- Tier 2: Progressive profiling (week 1-2)
  work_environment TEXT,
  living_situation TEXT,
  main_struggles TEXT[] DEFAULT '{}',
  -- Tier 3: Advanced (week 3-4)
  experience_level TEXT,
  preferred_styles TEXT[] DEFAULT '{}',
  -- Meta
  onboarding_completed BOOLEAN DEFAULT FALSE,
  dismissed_progressive_prompts TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies (owner-only)
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-create empty preferences on user signup (prevent race conditions)
CREATE OR REPLACE FUNCTION public.init_user_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.init_user_preferences();

-- Add suggestion tracking to habits table
ALTER TABLE public.habits 
  ADD COLUMN added_from_suggestion BOOLEAN DEFAULT FALSE,
  ADD COLUMN suggestion_source TEXT;

-- Create suggestion_events table for analytics
CREATE TABLE public.suggestion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  suggestion_id TEXT NOT NULL,
  suggestion_type TEXT NOT NULL, -- 'ai', 'quick_pick', 'contextual', 'category'
  action TEXT NOT NULL, -- 'impression', 'click', 'add', 'dismiss', 'edit', 'undo'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.suggestion_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own suggestion events"
  ON public.suggestion_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suggestion events"
  ON public.suggestion_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);