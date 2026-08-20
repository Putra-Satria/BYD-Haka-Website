-- Migration: Create public.login_otp_challenges table for Production 2FA OTP Storage
CREATE TABLE IF NOT EXISTS public.login_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  otp_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS and grant full access to public, anon, authenticated, and service_role
ALTER TABLE public.login_otp_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to login_otp_challenges" ON public.login_otp_challenges;
CREATE POLICY "Public full access to login_otp_challenges" 
ON public.login_otp_challenges 
FOR ALL 
TO public, anon, authenticated, service_role 
USING (true) 
WITH CHECK (true);
