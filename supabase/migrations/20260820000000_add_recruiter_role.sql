-- Migration: Add 'recruiter' to app_role enum and update RLS policies
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'recruiter';

-- Update applications RLS policies to allow recruiters access
DROP POLICY IF EXISTS "Recruiters can view all applications" ON public.applications;
CREATE POLICY "Recruiters can view all applications"
ON public.applications
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter')
);

DROP POLICY IF EXISTS "Recruiters can update all applications" ON public.applications;
CREATE POLICY "Recruiters can update all applications"
ON public.applications
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter')
);

-- Update user_roles policies so staff can view roles
DROP POLICY IF EXISTS "Staff can view all roles" ON public.user_roles;
CREATE POLICY "Staff can view all roles"
ON public.user_roles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter')
);

-- Update employee_onboarding policies so recruiters can view onboarding data
DROP POLICY IF EXISTS "Recruiters can view all onboarding data" ON public.employee_onboarding;
CREATE POLICY "Recruiters can view all onboarding data"
  ON public.employee_onboarding
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter')
  );
