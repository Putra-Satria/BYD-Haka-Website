-- "Nuclear Option" for Debugging
-- Disables RLS completely for the applications table.
-- If this fixes the issue, then RLS policies were definitely the problem.
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;
