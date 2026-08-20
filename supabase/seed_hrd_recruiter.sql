-- ============================================================
-- SCRIPT: Seed HRD / Recruiter Dummy Accounts
-- Jalankan di Supabase SQL Editor (https://supabase.com/dashboard)
-- Buka project → SQL Editor → New Query → Paste & Run
-- ============================================================

-- Pastikan pgcrypto extension aktif
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- STEP 1: Tambahkan 'recruiter' ke enum jika belum ada
-- (Skip error jika sudah ada dari migration sebelumnya)
DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'recruiter';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- STEP 2: Buat 2 Akun HRD / Recruiter Dummy
DO $$
DECLARE
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';

  -- HRD 1
  v_hrd1_id uuid := gen_random_uuid();
  v_hrd1_email text := 'hrd1@haka.com';
  v_hrd1_password text := 'password123';
  v_hrd1_name text := 'HRD Recruiter Satu';
  v_hrd1_nik text := '7890123456789012';

  -- HRD 2
  v_hrd2_id uuid := gen_random_uuid();
  v_hrd2_email text := 'hrd2@haka.com';
  v_hrd2_password text := 'password123';
  v_hrd2_name text := 'HRD Recruiter Dua';
  v_hrd2_nik text := '8901234567890123';

BEGIN
  -- =====================
  -- Insert HRD 1 ke auth.users
  -- =====================
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_instance_id, v_hrd1_id, 'authenticated', 'authenticated',
    v_hrd1_email,
    crypt(v_hrd1_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', v_hrd1_name, 'nik', v_hrd1_nik),
    now(), now()
  )
  ON CONFLICT (email) DO NOTHING;

  -- =====================
  -- Insert HRD 2 ke auth.users
  -- =====================
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_instance_id, v_hrd2_id, 'authenticated', 'authenticated',
    v_hrd2_email,
    crypt(v_hrd2_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', v_hrd2_name, 'nik', v_hrd2_nik),
    now(), now()
  )
  ON CONFLICT (email) DO NOTHING;

  -- Catatan: Trigger database (on_auth_user_created & on_auth_user_created_role)
  -- secara otomatis akan membuat row di public.profiles dan public.user_roles (default role = 'user').
  -- Kita perlu UPDATE role-nya menjadi 'recruiter'.

  -- =====================
  -- STEP 3: Update role HRD 1 & HRD 2 menjadi 'recruiter'
  -- =====================
  UPDATE public.user_roles
  SET role = 'recruiter'
  WHERE user_id IN (v_hrd1_id, v_hrd2_id);

  RAISE NOTICE '✅ HRD Dummy accounts created successfully!';
  RAISE NOTICE '   📧 hrd1@haka.com / password123';
  RAISE NOTICE '   📧 hrd2@haka.com / password123';

END $$;

-- ============================================================
-- VERIFIKASI: Cek apakah akun HRD sudah terdaftar
-- ============================================================
SELECT
  u.email,
  p.full_name,
  ur.role,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email IN ('hrd1@haka.com', 'hrd2@haka.com')
ORDER BY u.email;
