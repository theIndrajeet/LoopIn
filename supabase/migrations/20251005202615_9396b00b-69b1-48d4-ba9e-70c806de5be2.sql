-- Fix: Restrict public profile viewing to authenticated users only
-- This prevents anonymous data scraping while maintaining social features for logged-in users

DROP POLICY IF EXISTS "Anyone can view public profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles
FOR SELECT
USING (
  privacy_level = 'public'::privacy_level 
  AND auth.uid() IS NOT NULL
);