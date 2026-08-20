-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    position TEXT NOT NULL,
    branch TEXT NOT NULL,
    location TEXT NOT NULL,
    province TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT[] DEFAULT '{}'::TEXT[],
    general_requirements TEXT[] DEFAULT '{}'::TEXT[],
    specific_requirements TEXT[] DEFAULT '{}'::TEXT[],
    benefits TEXT[] DEFAULT '{}'::TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to everyone
CREATE POLICY "Allow public read access" ON public.jobs
    FOR SELECT USING (true);

-- Policy: Allow all access to admins only
-- Note: usage of auth.uid() assumes you have authentication set up.
-- You might want to check the user's role in a real internal tool.
-- For now, we'll assume a 'service_role' or specific app metadata check, 
-- but simpler RLS for this context often checks the user_roles table or similar.
-- Here is a generic one assuming an 'admin' claim or similar logic you use.
-- Since the user_roles table exists as per types.ts:
CREATE POLICY "Allow admin full access" ON public.jobs
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );
