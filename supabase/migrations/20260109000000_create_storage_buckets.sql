-- Create 'application-documents' bucket (Public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-documents', 
  'application-documents', 
  true, 
  5242880, -- 5MB
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create 'documents' bucket (Public) for onboarding
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  true, 
  5242880, -- 5MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;


-- POLICIES FOR application-documents

-- Allow authenticated users to upload their own documents
DROP POLICY IF EXISTS "Users can upload own application documents" ON storage.objects;
CREATE POLICY "Users can upload own application documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'application-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own documents
DROP POLICY IF EXISTS "Users can update own application documents" ON storage.objects;
CREATE POLICY "Users can update own application documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'application-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (Required for getPublicUrl usage in frontend)
DROP POLICY IF EXISTS "Public can view application documents" ON storage.objects;
CREATE POLICY "Public can view application documents"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'application-documents'
);


-- POLICIES FOR documents (Onboarding)

-- Allow authenticated users to upload their own documents
DROP POLICY IF EXISTS "Users can upload own onboarding documents" ON storage.objects;
CREATE POLICY "Users can upload own onboarding documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own documents
DROP POLICY IF EXISTS "Users can update own onboarding documents" ON storage.objects;
CREATE POLICY "Users can update own onboarding documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access
DROP POLICY IF EXISTS "Public can view onboarding documents" ON storage.objects;
CREATE POLICY "Public can view onboarding documents"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'documents'
);
