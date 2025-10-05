-- Add archive and delete tracking columns to habits table
ALTER TABLE habits 
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN deleted_at TIMESTAMPTZ;

-- Add foreign key constraints with CASCADE for final purge
-- First, check if constraints exist and drop them if they do
ALTER TABLE habit_logs DROP CONSTRAINT IF EXISTS habit_logs_habit_id_fkey;
ALTER TABLE streaks DROP CONSTRAINT IF EXISTS streaks_habit_id_fkey;

-- Add new foreign key constraints with ON DELETE CASCADE
ALTER TABLE habit_logs
  ADD CONSTRAINT habit_logs_habit_id_fkey
    FOREIGN KEY (habit_id) REFERENCES habits(id)
    ON DELETE CASCADE;

ALTER TABLE streaks
  ADD CONSTRAINT streaks_habit_id_fkey
    FOREIGN KEY (habit_id) REFERENCES habits(id)
    ON DELETE CASCADE;

-- Update RLS policies for archived/deleted habits
-- Users can view their archived and deleted habits
DROP POLICY IF EXISTS "Users can view their own habits" ON habits;
CREATE POLICY "Users can view their own habits" 
ON habits 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can archive their own habits
CREATE POLICY "Users can archive their own habits" 
ON habits 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);