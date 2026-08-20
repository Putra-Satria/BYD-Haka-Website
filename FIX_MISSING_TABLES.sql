-- 1. Create employee_onboarding table
CREATE TABLE IF NOT EXISTS public.employee_onboarding (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Personal Data
    ktp_number TEXT NOT NULL,
    kk_number TEXT NOT NULL,
    npwp_number TEXT NOT NULL,
    bank_name TEXT DEFAULT 'Mandiri',
    bank_account_number TEXT NOT NULL,
    bank_account_holder TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    email TEXT NOT NULL,
    ktp_address TEXT NOT NULL,
    domicile_address TEXT NOT NULL,
    birth_place TEXT NOT NULL,
    birth_date DATE NOT NULL,
    religion TEXT NOT NULL,
    bpjs_cair_status TEXT NOT NULL CHECK (bpjs_cair_status IN ('Ya', 'Tidak')),
    blood_type TEXT NOT NULL CHECK (blood_type IN ('A', 'B', 'AB', 'O')),
    marital_status TEXT NOT NULL CHECK (marital_status IN ('SINGLE', 'MENIKAH', 'CERAI HIDUP', 'CERAI MENINGGAL')),
    children_count INTEGER DEFAULT 0,
    has_sim_a TEXT NOT NULL CHECK (has_sim_a IN ('PUNYA', 'TIDAK PUNYA')),
    
    -- Family Data
    emergency_contact_name TEXT NOT NULL,
    emergency_contact_relation TEXT NOT NULL CHECK (emergency_contact_relation IN ('SUAMI', 'ISTRI', 'ANAK', 'Other')),
    emergency_contact_phone TEXT NOT NULL,
    father_name TEXT NOT NULL,
    mother_name TEXT NOT NULL,
    medical_history TEXT NOT NULL,
    
    -- Files (URLs)
    ktp_url TEXT,
    kk_url TEXT,
    npwp_url TEXT,
    cover_buku_rekening_url TEXT,
    ijazah_url TEXT,
    offering_letter_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT employee_onboarding_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.employee_onboarding ENABLE ROW LEVEL SECURITY;

-- Policies for employee_onboarding
DROP POLICY IF EXISTS "Users can create their own onboarding data" ON public.employee_onboarding;
CREATE POLICY "Users can create their own onboarding data"
    ON public.employee_onboarding
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own onboarding data" ON public.employee_onboarding;
CREATE POLICY "Users can view their own onboarding data"
    ON public.employee_onboarding
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own onboarding data" ON public.employee_onboarding;
CREATE POLICY "Users can update their own onboarding data"
    ON public.employee_onboarding
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all onboarding data" ON public.employee_onboarding;
CREATE POLICY "Admins can view all onboarding data"
    ON public.employee_onboarding
    FOR SELECT
    USING (
        exists (
            select 1 from user_roles
            where user_id = auth.uid()
            and role = 'admin'
        )
    );

-- 2. Create Storage Buckets
-- Create 'application-documents' bucket (Public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-documents', 
  'application-documents', 
  true, 
  5242880, -- 5MB
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create 'documents' bucket (Public) for onboarding
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  true, 
  5242880, -- 5MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;


-- POLICIES FOR application-documents

DROP POLICY IF EXISTS "Users can upload own application documents" ON storage.objects;
CREATE POLICY "Users can upload own application documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'application-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own application documents" ON storage.objects;
CREATE POLICY "Users can update own application documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'application-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Public can view application documents" ON storage.objects;
CREATE POLICY "Public can view application documents"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'application-documents'
);


-- POLICIES FOR documents (Onboarding)

DROP POLICY IF EXISTS "Users can upload own onboarding documents" ON storage.objects;
CREATE POLICY "Users can upload own onboarding documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own onboarding documents" ON storage.objects;
CREATE POLICY "Users can update own onboarding documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Public can view onboarding documents" ON storage.objects;
CREATE POLICY "Public can view onboarding documents"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'documents'
);
