-- Clean up old completed tasks (older than 90 days) to improve performance
-- This keeps the database lean while preserving recent history
DELETE FROM tasks 
WHERE completed = true 
  AND completed_at < NOW() - INTERVAL '90 days';

-- Add index for faster task queries by completion status and date
CREATE INDEX IF NOT EXISTS idx_tasks_completed_date 
ON tasks(user_id, completed, deleted_at, created_at);

-- Add index for faster habits queries
CREATE INDEX IF NOT EXISTS idx_habits_active_user 
ON habits(user_id, active, deleted_at, archived_at);

-- Add index for faster habit logs queries
CREATE INDEX IF NOT EXISTS idx_habit_logs_recent 
ON habit_logs(habit_id, completed_at DESC);