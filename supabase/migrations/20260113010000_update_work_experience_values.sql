-- Update profiles table
UPDATE public.profiles SET work_experience_duration = '<1 year/fresh graduate' WHERE work_experience_duration = '<1';
UPDATE public.profiles SET work_experience_duration = '1-3 years' WHERE work_experience_duration = '1-3';
UPDATE public.profiles SET work_experience_duration = '3-5 years' WHERE work_experience_duration = '3-5';
UPDATE public.profiles SET work_experience_duration = '>5 years' WHERE work_experience_duration = '>5';

-- Update applications table
UPDATE public.applications SET work_experience_duration = '<1 year/fresh graduate' WHERE work_experience_duration = '<1';
UPDATE public.applications SET work_experience_duration = '1-3 years' WHERE work_experience_duration = '1-3';
UPDATE public.applications SET work_experience_duration = '3-5 years' WHERE work_experience_duration = '3-5';
UPDATE public.applications SET work_experience_duration = '>5 years' WHERE work_experience_duration = '>5';
