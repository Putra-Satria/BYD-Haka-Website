-- Drop the incorrect foreign key constraint
ALTER TABLE public.saved_jobs
DROP CONSTRAINT IF EXISTS saved_jobs_user_id_fkey;

-- Add the correct foreign key constraint referencing auth.users
-- Clean up orphaned rows first
DELETE FROM public.saved_jobs
WHERE user_id NOT IN (SELECT id FROM auth.users);

ALTER TABLE public.saved_jobs
ADD CONSTRAINT saved_jobs_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users (id)
ON DELETE CASCADE;
