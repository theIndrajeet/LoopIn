-- Function to update user's total XP when a habit log is created
CREATE OR REPLACE FUNCTION public.update_profile_xp_on_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Trigger to update XP when habit log is inserted
CREATE TRIGGER on_habit_log_insert_update_xp
  AFTER INSERT ON habit_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_xp_on_log();

-- Function to update streak when a habit log is created
CREATE OR REPLACE FUNCTION public.update_streak_on_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak_record RECORD;
  v_today date;
  v_yesterday date;
  v_user_timezone text;
  v_user_id uuid;
BEGIN
  -- Get user's timezone
  SELECT h.user_id INTO v_user_id FROM habits h WHERE h.id = NEW.habit_id;
  SELECT COALESCE(p.timezone, 'UTC') INTO v_user_timezone FROM profiles p WHERE p.id = v_user_id;
  
  -- Calculate today and yesterday in user's timezone
  v_today := (NEW.completed_at AT TIME ZONE v_user_timezone)::date;
  v_yesterday := v_today - INTERVAL '1 day';
  
  -- Get existing streak record
  SELECT * INTO v_streak_record
  FROM streaks
  WHERE habit_id = NEW.habit_id;
  
  IF v_streak_record IS NULL THEN
    -- Create new streak record
    INSERT INTO streaks (habit_id, current_count, best_count, last_completed_date)
    VALUES (NEW.habit_id, 1, 1, v_today);
  ELSE
    -- Check if already completed today
    IF v_streak_record.last_completed_date = v_today THEN
      -- Already completed today, don't update
      RETURN NEW;
    ELSIF v_streak_record.last_completed_date = v_yesterday OR v_streak_record.freeze_used_on = v_yesterday THEN
      -- Continuing streak (completed yesterday or used freeze yesterday)
      UPDATE streaks
      SET 
        current_count = current_count + 1,
        best_count = GREATEST(best_count, current_count + 1),
        last_completed_date = v_today
      WHERE habit_id = NEW.habit_id;
    ELSE
      -- Streak broken, reset to 1
      UPDATE streaks
      SET 
        current_count = 1,
        last_completed_date = v_today,
        freeze_used_on = NULL
      WHERE habit_id = NEW.habit_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to update streak when habit log is inserted
CREATE TRIGGER on_habit_log_insert_update_streak
  AFTER INSERT ON habit_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_streak_on_log();