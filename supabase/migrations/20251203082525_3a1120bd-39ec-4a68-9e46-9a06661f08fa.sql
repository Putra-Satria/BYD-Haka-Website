-- Drop existing enum and recreate with new statuses
-- First, we need to alter the applications table to use text temporarily
ALTER TABLE public.applications ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.applications ALTER COLUMN status TYPE text USING status::text;

-- Drop the old enum
DROP TYPE IF EXISTS public.application_status;

-- Create new enum with all hiring stages
CREATE TYPE public.application_status AS ENUM (
  'submitted',
  'on_review',
  'interview_hc',
  'interview_user',
  'psikotes',
  'test_bidang',
  'assessment',
  'background_check',
  'offering',
  'onboarding',
  'accepted',
  'rejected'
);

-- Convert the column back to the enum type
ALTER TABLE public.applications ALTER COLUMN status TYPE public.application_status USING status::public.application_status;
ALTER TABLE public.applications ALTER COLUMN status SET DEFAULT 'submitted'::public.application_status;