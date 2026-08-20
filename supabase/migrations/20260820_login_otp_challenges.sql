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

-- Enable Row Level Security (RLS)
ALTER TABLE public.login_otp_challenges ENABLE ROW LEVEL SECURITY;

-- Restrict direct client-side access (Only backend service role access allowed)
DROP POLICY IF EXISTS "Service role full access to login_otp_challenges" ON public.login_otp_challenges;
CREATE POLICY "Service role full access to login_otp_challenges" 
ON public.login_otp_challenges 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
