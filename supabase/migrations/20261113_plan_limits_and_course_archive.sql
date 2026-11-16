-- Add archived_at to courses so students can archive past courses without losing CGPA history,
-- and enforce active course limits per subscription tier on insert/unarchive.

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
  v_tier TEXT;
  v_limit INTEGER;
  v_active_count INTEGER;
BEGIN
  -- Only enforce when a course is being created as active or unarchived to active.
  IF (TG_OP = 'INSERT' AND NEW.archived_at IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE' AND NOT (OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL)) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(LOWER(subscription_tier), 'free')
  INTO v_tier
  FROM public.profiles
  WHERE id = NEW.user_id;

  v_tier := COALESCE(v_tier, 'free');

  v_limit := CASE v_tier
    WHEN 'studio' THEN 15
    WHEN 'sage' THEN 15
    WHEN 'plus' THEN 10
    WHEN 'scholar' THEN 10
    ELSE 5
  END;

  SELECT COUNT(*)
  INTO v_active_count
  FROM public.courses
  WHERE user_id = NEW.user_id
    AND archived_at IS NULL
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_active_count >= v_limit THEN
    RAISE EXCEPTION 'Plan limit reached: % of % active courses used. Archive or remove a course, or upgrade your plan.', v_active_count, v_limit
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
