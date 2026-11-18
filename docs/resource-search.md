# Resource Search

The shared `ResourceSearch` component ([`components/ResourceSearch.tsx`](../components/ResourceSearch.tsx)) provides fast, debounced Supabase search across a student's uploaded resources (`public.user_files`) from the header of both **Library** (`components/ResourcesView.tsx`) and **Study Hub** (`components/StudyHub.tsx`).

## Usage & Shortcuts

- **Open**: Click the **Search** icon button (`aria-label="Search resources"`) in the header, or press `/` or `Ctrl+K` (`Cmd+K` on macOS) on desktop.
- **Filter**: Combine text queries (250 ms debounce) with file-type chips (`PDF`, `PPT`, `DOCX`) and course code chips (`CSC 201`, etc.).
- **Open / Download**: Click **Study tools** (in Library) or **Open in Hub** (in Study Hub) to open a result, or use the **Download** icon when a signed URL is available.
- **Close & Clear**: Click **Close** or press `Esc` to clear the query and filters and restore the normal list view.

## Schema Notes

Queries target `public.user_files` (scoped by `user_id` and existing RLS policies):
- Text search (`ilike`, limit 30) runs on `file_name`, `course_code`, and `course_title` (`description` does not exist on `user_files`).
- Filter chips are rendered only for columns that exist (`file_type`/`file_name` and `course_code`; `level` does not exist on `user_files`).

## Optional Index Proposal (Not Applied)

If a student's `user_files` table grows large, a `pg_trgm` GIN index can speed up `ilike` queries without changing table columns or RLS:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_user_files_search_trgm
  ON public.user_files
  USING gin (
    file_name gin_trgm_ops,
    course_code gin_trgm_ops,
    course_title gin_trgm_ops
  );
```
