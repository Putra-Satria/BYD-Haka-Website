-- Create profile_experiences table
CREATE TABLE IF NOT EXISTS public.profile_experiences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    position TEXT NOT NULL, -- Posisi
    job_level TEXT NOT NULL, -- Jabatan / Level
    company TEXT NOT NULL, -- Nama Perusahaan
    company_location TEXT, -- Lokasi Perusahaan (Optional)
    division TEXT NOT NULL, -- Divisi
    industry TEXT NOT NULL, -- Industri
    employment_type TEXT NOT NULL, -- Status Kekaryawanan
    
    start_month VARCHAR(20) NOT NULL, -- Bulan Mulai
    start_year VARCHAR(4) NOT NULL, -- Tahun Mulai
    end_month VARCHAR(20), -- Bulan Selesai
    end_year VARCHAR(4), -- Tahun Selesai
    is_current BOOLEAN DEFAULT false, -- Hingga Saat Ini
    
    net_salary NUMERIC(15, 2) NOT NULL, -- Gaji Bersih
    leaving_reason TEXT, -- Alasan Mengundurkan Diri
    subordinates_count INT DEFAULT 0, -- Jumlah Bawahan
    job_description TEXT NOT NULL, -- Deskripsi Tugas
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profile_experiences ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own experiences" ON public.profile_experiences;
CREATE POLICY "Users can view own experiences"
    ON public.profile_experiences
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own experiences" ON public.profile_experiences;
CREATE POLICY "Users can insert own experiences"
    ON public.profile_experiences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own experiences" ON public.profile_experiences;
CREATE POLICY "Users can update own experiences"
    ON public.profile_experiences
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own experiences" ON public.profile_experiences;
CREATE POLICY "Users can delete own experiences"
    ON public.profile_experiences
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for updated_at
-- Assuming handle_updated_at function exists from previous migrations
DROP TRIGGER IF EXISTS on_experience_updated ON public.profile_experiences;
CREATE TRIGGER on_experience_updated
    BEFORE UPDATE ON public.profile_experiences
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
