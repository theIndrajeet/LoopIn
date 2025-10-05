-- Add freeze token fields to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS freeze_tokens_remaining INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS freeze_tokens_reset_at TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW() + INTERVAL '1 month');

-- Add order_index to habits table for drag-to-reorder
ALTER TABLE habits 
ADD COLUMN IF NOT EXISTS order_index INTEGER;

-- Add freeze tracking to streaks table
ALTER TABLE streaks
ADD COLUMN IF NOT EXISTS freeze_used_on DATE;