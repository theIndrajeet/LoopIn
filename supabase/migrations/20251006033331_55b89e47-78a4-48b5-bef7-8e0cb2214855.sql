-- Fix critical security vulnerability: Remove permissive notification INSERT policy
-- Notifications should only be created by database triggers (SECURITY DEFINER functions)
-- which bypass RLS and execute with elevated privileges

-- Drop the overly permissive policy that allows anyone to insert notifications
DROP POLICY IF EXISTS "System can insert notifications for users" ON public.notifications;

-- No user-facing INSERT policy needed - all notifications are created via triggers:
-- 1. create_friend_request_notification (when friend request is sent)
-- 2. create_friend_accepted_notification (when friend request is accepted)
-- These triggers are SECURITY DEFINER and bypass RLS, so they can insert even without a policy

-- Verify that the trigger functions have proper security settings
-- (They should already have SECURITY DEFINER and SET search_path = public)

-- The existing SELECT, UPDATE, and DELETE policies remain unchanged and secure:
-- - Users can only view/update/delete their own notifications (user_id = auth.uid())