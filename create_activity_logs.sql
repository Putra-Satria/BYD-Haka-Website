-- SQL Migration: Create activity_logs & user_sessions tables for BYD HAKA Session & Security Monitoring
-- Run this script in your Supabase Dashboard -> SQL Editor

-- 1. Create activity_logs table (Historical & Real-time Activity Trail)
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
    ip_address TEXT DEFAULT '127.0.0.1',
    status TEXT DEFAULT 'info' NOT NULL CHECK (status IN ('info', 'success', 'failed', 'denied')),
    severity TEXT DEFAULT 'info' NOT NULL CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create user_sessions table (Active Session Tracking & Heartbeat Engine)
CREATE TABLE IF NOT EXISTS public.user_sessions (
    session_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    role TEXT DEFAULT 'guest' NOT NULL CHECK (role IN ('guest', 'user', 'applicant', 'recruiter', 'admin')),
    ip_address TEXT DEFAULT '127.0.0.1',
    current_page TEXT DEFAULT '/',
    started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_seen_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    ended_at TIMESTAMPTZ,
    end_reason TEXT CHECK (end_reason IN ('logout', 'inactivity_timeout', 'browser_closed', 'session_expired', 'manual')),
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'ended')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_session_id ON public.activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_role ON public.activity_logs(role);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON public.activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_source ON public.activity_logs(source);

CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON public.user_sessions(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON public.user_sessions(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for activity_logs
DROP POLICY IF EXISTS "Allow public insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow staff select activity logs" ON public.activity_logs;

CREATE POLICY "Allow public insert activity logs"
    ON public.activity_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow staff select activity logs"
    ON public.activity_logs FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'recruiter'))
            OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND (email LIKE '%admin%' OR email LIKE '%recruiter%' OR email LIKE '%hrd%'))
        )
    );

-- Policies for user_sessions
DROP POLICY IF EXISTS "Allow public insert user sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Allow public update user sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Allow staff select user sessions" ON public.user_sessions;

CREATE POLICY "Allow public insert user sessions"
    ON public.user_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update user sessions"
    ON public.user_sessions FOR UPDATE USING (true);

CREATE POLICY "Allow staff select user sessions"
    ON public.user_sessions FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'recruiter'))
            OR EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND (email LIKE '%admin%' OR email LIKE '%recruiter%' OR email LIKE '%hrd%'))
        )
    );

-- Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'activity_logs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_sessions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
    END IF;
END $$;
