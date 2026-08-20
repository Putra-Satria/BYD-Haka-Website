-- Enable Admin Access for Profile Educations
DROP POLICY IF EXISTS "Admins can view all educations" ON public.profile_educations;
CREATE POLICY "Admins can view all educations"
ON public.profile_educations FOR SELECT
TO authenticated
USING (
  exists (
    select 1 from public.user_roles 
    where user_id = auth.uid() 
    and role = 'admin'
  )
);

-- Enable Admin Access for Profile Experiences
DROP POLICY IF EXISTS "Admins can view all experiences" ON public.profile_experiences;
CREATE POLICY "Admins can view all experiences"
ON public.profile_experiences FOR SELECT
TO authenticated
USING (
  exists (
    select 1 from public.user_roles 
    where user_id = auth.uid() 
    and role = 'admin'
  )
);
