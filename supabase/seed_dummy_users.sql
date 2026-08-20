-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper function to generate dummy users
DO $$
DECLARE
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';
  v_admin_role_type public.app_role := 'admin';
  v_user_role_type public.app_role := 'user';
  
  -- Admin 1
  v_admin1_id uuid := gen_random_uuid();
  v_admin1_email text := 'admin1@haka.com';
  v_admin1_password text := 'password123';
  v_admin1_name text := 'Admin Satu';
  v_admin1_nik text := '1234567890123456';
  
  -- Admin 2
  v_admin2_id uuid := gen_random_uuid();
  v_admin2_email text := 'admin2@haka.com';
  v_admin2_password text := 'password123';
  v_admin2_name text := 'Admin Dua';
  v_admin2_nik text := '2345678901234567';
  
  -- User 1
  v_user1_id uuid := gen_random_uuid();
  v_user1_email text := 'user1@haka.com';
  v_user1_password text := 'password123';
  v_user1_name text := 'User Satu';
  v_user1_nik text := '3456789012345678';

  -- User 2
  v_user2_id uuid := gen_random_uuid();
  v_user2_email text := 'user2@haka.com';
  v_user2_password text := 'password123';
  v_user2_name text := 'User Dua';
  v_user2_nik text := '4567890123456789';

  -- User 3
  v_user3_id uuid := gen_random_uuid();
  v_user3_email text := 'user3@haka.com';
  v_user3_password text := 'password123';
  v_user3_name text := 'User Tiga';
  v_user3_nik text := '5678901234567890';

  -- User 4
  v_user4_id uuid := gen_random_uuid();
  v_user4_email text := 'user4@haka.com';
  v_user4_password text := 'password123';
  v_user4_name text := 'User Empat';
  v_user4_nik text := '6789012345678901';
  
BEGIN
  -- Insert Admin 1
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_instance_id, v_admin1_id, 'authenticated', 'authenticated', v_admin1_email, crypt(v_admin1_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('full_name', v_admin1_name, 'nik', v_admin1_nik),
    now(), now()
  );

  -- Insert Admin 2
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_instance_id, v_admin2_id, 'authenticated', 'authenticated', v_admin2_email, crypt(v_admin2_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('full_name', v_admin2_name, 'nik', v_admin2_nik),
    now(), now()
  );

  -- Insert User 1
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_instance_id, v_user1_id, 'authenticated', 'authenticated', v_user1_email, crypt(v_user1_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('full_name', v_user1_name, 'nik', v_user1_nik),
    now(), now()
  );

  -- Insert User 2
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_instance_id, v_user2_id, 'authenticated', 'authenticated', v_user2_email, crypt(v_user2_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('full_name', v_user2_name, 'nik', v_user2_nik),
    now(), now()
  );

  -- Insert User 3
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_instance_id, v_user3_id, 'authenticated', 'authenticated', v_user3_email, crypt(v_user3_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('full_name', v_user3_name, 'nik', v_user3_nik),
    now(), now()
  );

  -- Insert User 4
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_instance_id, v_user4_id, 'authenticated', 'authenticated', v_user4_email, crypt(v_user4_password, gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', 
    jsonb_build_object('full_name', v_user4_name, 'nik', v_user4_nik),
    now(), now()
  );

  -- Note: Triggers in the database will automatically create "public.profiles" and "public.user_roles" (with default 'user' role).
  -- We just need to update the role for admins.

  -- Update Roles for Admins
  UPDATE public.user_roles
  SET role = 'admin'
  WHERE user_id IN (v_admin1_id, v_admin2_id);
  
END $$;
