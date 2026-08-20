-- Create employees table (replacing/migrating from employee_onboarding)
CREATE TABLE IF NOT EXISTS public.employees (
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
    
    -- Metadata
    onboarding_status TEXT DEFAULT 'draft', -- draft, submitted, verified
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT employees_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Policies
-- Policies
DROP POLICY IF EXISTS "Users can create their own employee data" ON public.employees;
CREATE POLICY "Users can create their own employee data"
    ON public.employees
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own employee data" ON public.employees;
CREATE POLICY "Users can view their own employee data"
    ON public.employees
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own employee data" ON public.employees;
CREATE POLICY "Users can update their own employee data"
    ON public.employees
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view and update all employee data" ON public.employees;
CREATE POLICY "Admins can view and update all employee data"
    ON public.employees
    FOR ALL
    USING (
        exists (
            select 1 from user_roles
            where user_id = auth.uid()
            and role = 'admin'
        )
    );
