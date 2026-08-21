-- SQL Migration: Create activity_logs table for BYD HAKA Security Monitoring
-- Run this script in your Supabase Dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    application TEXT DEFAULT 'BYD_HAKA' NOT NULL,
    session_id TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('application', 'wazuh', 'suricata')),
    event_type TEXT NOT NULL CHECK (event_type IN ('authentication', 'navigation', 'recruitment', 'admin', 'security', 'session')),
    action TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    role TEXT DEFAULT 'guest' NOT NULL CHECK (role IN ('guest', 'user', 'applicant', 'recruiter', 'admin')),
    page TEXT,
    resource TEXT,
    ip_address TEXT,
    status TEXT DEFAULT 'info' NOT NULL CHECK (status IN ('info', 'success', 'failed', 'denied')),
    severity TEXT DEFAULT 'info' NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create performance indexes for timeline correlation & search filters
CREATE INDEX IF NOT EXISTS idx_activity_logs_session_id ON public.activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_role ON public.activity_logs(role);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON public.activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_source ON public.activity_logs(source);

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow staff select activity logs" ON public.activity_logs;

-- Policy: Allow all clients (including guests) to insert activity events
CREATE POLICY "Allow public insert activity logs"
    ON public.activity_logs
    FOR INSERT
    WITH CHECK (true);

-- Policy: Allow staff (Admin & Recruiter) to select/view activity logs
CREATE POLICY "Allow staff select activity logs"
    ON public.activity_logs
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (
                SELECT 1 FROM user_roles
                WHERE user_id = auth.uid()
                AND role IN ('admin', 'recruiter')
            )
            OR
            EXISTS (
                SELECT 1 FROM auth.users
                WHERE id = auth.uid()
                AND (email LIKE '%admin%' OR email LIKE '%recruiter%' OR email LIKE '%hrd%')
            )
        )
    );

-- Enable Supabase Realtime for activity_logs table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'activity_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
    END IF;
END $$;
