-- 1. Update handle_new_user to capture cv_url and certificate_url
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    nik,
    full_name,
    residential_address,
    city_province,
    date_of_birth,
    gender,
    whatsapp_number,
    expected_salary,
    has_automotive_experience,
    work_experience_duration,
    education_level,
    avatar_url,
    cv_url,
    certificate_url,
    info_source
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'nik',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'residential_address',
    NEW.raw_user_meta_data->>'city_province',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'date_of_birth', ''), NULL)::date,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'whatsapp_number',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'expected_salary', ''), '0')::numeric,
    COALESCE((NEW.raw_user_meta_data->>'has_automotive_experience')::boolean, false),
    NEW.raw_user_meta_data->>'work_experience_duration',
    NEW.raw_user_meta_data->>'education_level',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'cv_url',
    NEW.raw_user_meta_data->>'certificate_url',
    NEW.raw_user_meta_data->>'info_source'
  );
  RETURN NEW;
END;
$$;

-- 2. Update Storage Policies for 'application-documents' and 'avatars' to allow PUBLIC INSERT (for pre-signup)
-- WARNING: This allows anyone to upload, but we rely on UUID folder structure to avoid collisions.

-- buckets: 'application-documents'
DROP POLICY IF EXISTS "Public can upload application documents" ON storage.objects;
CREATE POLICY "Public can upload application documents"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'application-documents'
);

-- buckets: 'avatars'
DROP POLICY IF EXISTS "Public can upload avatars" ON storage.objects;
CREATE POLICY "Public can upload avatars"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'avatars'
);

-- Note: We do NOT need to change SELECT policies because they are already public.
