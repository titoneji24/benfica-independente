DROP POLICY IF EXISTS "profiles public read" ON public.profiles;
CREATE POLICY "profiles own read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
REVOKE SELECT ON public.profiles FROM anon;