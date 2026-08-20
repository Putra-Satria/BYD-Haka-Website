-- Enable RLS just in case it wasn't
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 1. VIEW Policy for Users (Critical for the count query to work)
DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;
CREATE POLICY "Users can view own applications"
ON public.applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. INSERT Policy for Users
DROP POLICY IF EXISTS "Users can insert own applications" ON public.applications;
CREATE POLICY "Users can insert own applications"
ON public.applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Admin Policies (View and Update)
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;
CREATE POLICY "Admins can view all applications"
ON public.applications FOR SELECT
TO authenticated
USING (
  exists (
    select 1 from public.user_roles 
    where user_id = auth.uid() 
    and role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update applications" ON public.applications;
CREATE POLICY "Admins can update applications"
ON public.applications FOR UPDATE
TO authenticated
USING (
  exists (
    select 1 from public.user_roles 
    where user_id = auth.uid() 
    and role = 'admin'
  )
);
