-- ==========================================
-- KORSIQ ACADEMIC STUDIO V2: JOBS & BRIEF SCHEMA
-- Do NOT apply automatically; apply manually in Supabase SQL Editor.
-- ==========================================

-- 1. Extend academic_documents with brief, chosen format, structured blocks, and converted variants
ALTER TABLE IF EXISTS public.academic_documents
  ADD COLUMN IF NOT EXISTS brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS file_format TEXT NOT NULL DEFAULT 'docx',
  ADD COLUMN IF NOT EXISTS content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS converted_variants JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_count INT NOT NULL DEFAULT 0;

-- 2. Background job queue table for Academic Studio v2
CREATE TABLE IF NOT EXISTS public.studio_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.academic_documents(id) ON DELETE CASCADE,
  job_kind TEXT NOT NULL DEFAULT 'generate',
  status TEXT NOT NULL DEFAULT 'queued',
  plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_step INT NOT NULL DEFAULT 0,
  total_steps INT NOT NULL DEFAULT 0,
  progress INT NOT NULL DEFAULT 0,
  error TEXT,
  cancel_requested BOOLEAN NOT NULL DEFAULT false,
  lease_until TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_studio_jobs_status CHECK (
    status IN ('queued', 'running', 'completed', 'completed_with_issues', 'failed', 'cancelled')
  ),
  CONSTRAINT chk_studio_jobs_kind CHECK (
    job_kind IN ('generate', 'convert_to_slides', 'convert_to_document')
  )
);

CREATE INDEX IF NOT EXISTS idx_studio_jobs_user_status
  ON public.studio_jobs (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_studio_jobs_document
  ON public.studio_jobs (document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_studio_jobs_stalled
  ON public.studio_jobs (status, lease_until)
  WHERE status IN ('queued', 'running');

-- 3. Strict RLS: users read only their own rows; all writes are server-side (service_role)
ALTER TABLE public.studio_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own studio jobs" ON public.studio_jobs;
CREATE POLICY "Users can read own studio jobs"
  ON public.studio_jobs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages studio jobs" ON public.studio_jobs;
CREATE POLICY "Service role manages studio jobs"
  ON public.studio_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
