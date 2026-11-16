-- Free Beta Mode:
-- 1. Ensure archived_at exists on public.courses and enforce 15 active courses per user via BEFORE INSERT/UPDATE trigger.
-- 2. Add lightweight public.ai_action_logs for non-blocking AI usage tracking (no credit ledger writes during beta).
-- All existing billing, subscription, payment, and credit tables/RPCs remain untouched.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_courses_user_archived
  ON public.courses (user_id, archived_at);

CREATE OR REPLACE FUNCTION public.enforce_course_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit CONSTANT INTEGER := 15;
  v_active_count INTEGER;
BEGIN
  -- Only enforce when a course is being created as active or unarchived to active.
  IF (TG_OP = 'INSERT' AND NEW.archived_at IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE' AND NOT (OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL)) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO v_active_count
  FROM public.courses
  WHERE user_id = NEW.user_id
    AND archived_at IS NULL
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_active_count >= v_limit THEN
    RAISE EXCEPTION 'Limit reached: % of % active courses used. Archive or remove a course to add another.', v_active_count, v_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_course_plan_limit ON public.courses;

CREATE TRIGGER trg_enforce_course_plan_limit
  BEFORE INSERT OR UPDATE OF archived_at
  ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_course_plan_limit();

-- Lightweight AI action log for usage visibility and daily backstop
CREATE TABLE IF NOT EXISTS public.ai_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_action_logs_user_created
  ON public.ai_action_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_action_logs_created
  ON public.ai_action_logs (created_at DESC);

ALTER TABLE public.ai_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own ai action logs" ON public.ai_action_logs;
CREATE POLICY "Users can view their own ai action logs"
  ON public.ai_action_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
