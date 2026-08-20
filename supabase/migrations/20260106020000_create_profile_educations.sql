-- Create profile_educations table
CREATE TABLE IF NOT EXISTS public.profile_educations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    degree TEXT NOT NULL, -- Gelar (e.g., S1, D3)
    major TEXT NOT NULL, -- Jurusan
    institution TEXT NOT NULL, -- Nama Institusi
    city TEXT NOT NULL, -- Kota
    gpa NUMERIC(4, 2), -- IPK
    gpa_max NUMERIC(4, 2) DEFAULT 4.00,
    start_year VARCHAR(4) NOT NULL, -- Tahun Mulai
    end_year VARCHAR(4), -- Tahun Lulus (nullable if is_current)
    is_current BOOLEAN DEFAULT false, -- Hingga Saat Ini
    study_program TEXT, -- Program Studi (if different from major)
    thesis_title TEXT, -- Judul Skripsi/Tugas Akhir
    link TEXT, -- Tautan repository/jurnal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profile_educations ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own educations" ON public.profile_educations;
CREATE POLICY "Users can view own educations"
    ON public.profile_educations
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own educations" ON public.profile_educations;
CREATE POLICY "Users can insert own educations"
    ON public.profile_educations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own educations" ON public.profile_educations;
CREATE POLICY "Users can update own educations"
    ON public.profile_educations
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own educations" ON public.profile_educations;
CREATE POLICY "Users can delete own educations"
    ON public.profile_educations
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_education_updated ON public.profile_educations;
CREATE TRIGGER on_education_updated
    BEFORE UPDATE ON public.profile_educations
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
