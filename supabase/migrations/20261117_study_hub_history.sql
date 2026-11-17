-- Migration: Add study_hub_history table for AI Summaries, Flashcards, Quizzes, Tests, and Podcasts
CREATE TABLE IF NOT EXISTS public.study_hub_history (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  tool_type TEXT NOT NULL CHECK (tool_type IN ('summary', 'flashcards', 'quiz', 'test', 'podcast')),
  title TEXT NOT NULL DEFAULT 'Generated Study Asset',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_hub_history_user_course_tool
  ON public.study_hub_history (user_id, course_id, tool_type, created_at DESC);

ALTER TABLE public.study_hub_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own study hub history" ON public.study_hub_history;
CREATE POLICY "Users can view their own study hub history"
  ON public.study_hub_history
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own study hub history" ON public.study_hub_history;
CREATE POLICY "Users can insert their own study hub history"
  ON public.study_hub_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own study hub history" ON public.study_hub_history;
CREATE POLICY "Users can delete their own study hub history"
  ON public.study_hub_history
  FOR DELETE
  USING (auth.uid() = user_id);
