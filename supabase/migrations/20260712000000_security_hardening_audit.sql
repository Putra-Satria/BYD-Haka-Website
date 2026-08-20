-- Security Hardening & Security Audit for BYD Haka recruitment app
-- Run this in Supabase SQL Editor before using the real audit log feature.

-- 1) Security audit table: mencatat akses dokumen, export data, dan blocked access.
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_application_id UUID,
  document_path TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'blocked')),
  description TEXT,
  user_agent TEXT
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view security audit logs" ON public.security_audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert own security audit logs" ON public.security_audit_logs;

CREATE POLICY "Admins can view security audit logs"
ON public.security_audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert own security audit logs"
ON public.security_audit_logs
FOR INSERT
WITH CHECK (auth.uid() = actor_user_id OR actor_user_id IS NULL);

-- 2) Hardening Supabase Storage: bucket dokumen dibuat private.
-- Jika bucket belum ada, buat dulu. Jika sudah ada, ubah menjadi private.
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-documents', 'application-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 3) Storage RLS policies.
-- Catatan: path dokumen memakai format userId/folder/uuid.ext.
DROP POLICY IF EXISTS "Users can upload own application documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own application documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all application documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own application documents" ON storage.objects;

CREATE POLICY "Users can upload own application documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'application-documents'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own application documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'application-documents'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all application documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'application-documents'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update own application documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'application-documents'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

COMMENT ON TABLE public.security_audit_logs IS 'Audit log untuk security hardening: mencatat akses dokumen sensitif, download, export data, dan akses yang diblokir.';
