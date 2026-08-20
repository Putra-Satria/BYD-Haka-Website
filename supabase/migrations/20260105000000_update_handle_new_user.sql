-- Update handle_new_user to capture all profile fields from metadata
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
    education_level
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
    NEW.raw_user_meta_data->>'education_level'
  );
  RETURN NEW;
END;
$$;
