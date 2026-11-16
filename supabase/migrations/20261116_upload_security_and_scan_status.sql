-- Upload Security Hardening:
-- 1. Add scan_status ('scanning' | 'clean' | 'blocked') and scan metadata to group_materials & user_files.
-- 2. Restrict Supabase storage buckets to allowed document/image MIME types and 25 MB max file size.

ALTER TABLE IF EXISTS public.group_materials
  ADD COLUMN IF NOT EXISTS scan_status TEXT NOT NULL DEFAULT 'clean',
  ADD COLUMN IF NOT EXISTS scan_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scan_provider TEXT,
  ADD COLUMN IF NOT EXISTS scan_detail TEXT,
  ADD COLUMN IF NOT EXISTS file_sha256 TEXT;

DO $$ BEGIN
  ALTER TABLE public.group_materials
    ADD CONSTRAINT chk_group_materials_scan_status
    CHECK (scan_status IN ('scanning', 'clean', 'blocked'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE IF EXISTS public.user_files
  ADD COLUMN IF NOT EXISTS scan_status TEXT NOT NULL DEFAULT 'clean',
  ADD COLUMN IF NOT EXISTS scan_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scan_provider TEXT,
  ADD COLUMN IF NOT EXISTS scan_detail TEXT,
  ADD COLUMN IF NOT EXISTS file_sha256 TEXT;

DO $$ BEGIN
  ALTER TABLE public.user_files
    ADD CONSTRAINT chk_user_files_scan_status
    CHECK (scan_status IN ('scanning', 'clean', 'blocked'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_group_materials_scan_status
  ON public.group_materials (group_id, scan_status);

CREATE INDEX IF NOT EXISTS idx_user_files_scan_status
  ON public.user_files (user_id, scan_status);

-- Enforce allowed MIME types and 25 MB per-file limit on storage buckets
UPDATE storage.buckets
SET
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'audio/wav'
  ]::text[]
WHERE id IN ('user-files', 'group-materials', 'scolaris-library');
