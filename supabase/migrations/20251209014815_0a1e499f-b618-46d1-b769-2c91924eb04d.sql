-- Add admin SELECT policy for profiles table (for support/verification needs)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin DELETE policy for applications table (GDPR compliance)
CREATE POLICY "Admins can delete applications"
ON public.applications
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));