-- Harden notifications: explicitly deny direct INSERTs
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Deny all client-side inserts; system code (triggers/ service role) still works
DROP POLICY IF EXISTS "System-only inserts to notifications" ON public.notifications;
CREATE POLICY "System-only inserts to notifications"
ON public.notifications
FOR INSERT
WITH CHECK (false);

-- Note: SECURITY DEFINER triggers and calls with the service role key bypass RLS as intended.
-- Existing SELECT/UPDATE/DELETE policies remain unchanged.