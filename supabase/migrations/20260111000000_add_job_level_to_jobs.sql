-- Add job_level column to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS job_level TEXT DEFAULT 'STAFF';
