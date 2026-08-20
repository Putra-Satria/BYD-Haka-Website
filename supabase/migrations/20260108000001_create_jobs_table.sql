
-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    position TEXT NOT NULL, -- keeping distinct if needed, or mapped to title
    branch TEXT NOT NULL,
    location TEXT NOT NULL,
    province TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Full Time',
    description TEXT[] DEFAULT '{}',
    general_requirements TEXT[] DEFAULT '{}',
    specific_requirements TEXT[] DEFAULT '{}',
    benefits TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active jobs
DROP POLICY IF EXISTS "Public can view active jobs" ON public.jobs;
CREATE POLICY "Public can view active jobs"
    ON public.jobs
    FOR SELECT
    USING (is_active = true);

-- Policy: Admins can view all jobs
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;
CREATE POLICY "Admins can view all jobs"
    ON public.jobs
    FOR SELECT
    USING (
        exists (
            select 1 from user_roles
            where user_id = auth.uid()
            and role = 'admin'
        )
    );

-- Policy: Admins can insert jobs
DROP POLICY IF EXISTS "Admins can insert jobs" ON public.jobs;
CREATE POLICY "Admins can insert jobs"
    ON public.jobs
    FOR INSERT
    WITH CHECK (
        exists (
            select 1 from user_roles
            where user_id = auth.uid()
            and role = 'admin'
        )
    );

-- Policy: Admins can update jobs
DROP POLICY IF EXISTS "Admins can update jobs" ON public.jobs;
CREATE POLICY "Admins can update jobs"
    ON public.jobs
    FOR UPDATE
    USING (
        exists (
            select 1 from user_roles
            where user_id = auth.uid()
            and role = 'admin'
        )
    );

-- Policy: Admins can delete jobs
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;
CREATE POLICY "Admins can delete jobs"
    ON public.jobs
    FOR DELETE
    USING (
        exists (
            select 1 from user_roles
            where user_id = auth.uid()
            and role = 'admin'
        )
    );
