# Academic Studio v2

## Flow
1. **Brief** (`components/StudioBriefForm.tsx`): One mobile-first form prefilled from `profile`, `courses`, and `utils/nigerianUniversities.ts`, including file format (`.docx`, `.pdf`, `.pptx`), citation style (`APA 7`, `Harvard`, `MLA`, `IEEE`, `Chicago`, `Vancouver`), document style (`Classic academic` / `Modern clean`), visuals (`Off` / `On`), and optional sources (pasted references, DOIs/links, or uploaded materials).
2. **Outline** (`components/StudioOutlineReview.tsx`): Fast-model outline from cover page to references/appendices (or slide list for `.pptx`). Students can add, delete, rename, reorder, and adjust budgets before anything is written.
3. **Background Generation** (`lib/studioV2Server.ts`, `studio_jobs` table): Runs step-by-step on the server (`retrieve_sources`, body sections, visuals, `write_conclusion`, `write_abstract`, `cover_and_front_matter`, `final_consistency_pass`). Abstract and conclusion are written last from the finished body.
4. **Download & Switch Format**: Single Download button in the chosen format (no export menu, no sharing). Word↔PDF switches instantly with no AI call; Document↔Slides runs a short background conversion step while keeping the original.

## Optional Stalled-Job Sweep Endpoint
Vercel Hobby cron runs daily only. Stalled jobs (expired `lease_until`) are automatically re-kicked when the user opens the app or Studio (`POST /api/studio/v2/jobs/re-kick`).

For sub-minute recovery across all users, configure an external scheduler (every 1 minute) to call:
- `POST /api/studio/v2/jobs/sweep`
- Header: `x-cron-secret: <STUDIO_SWEEP_SECRET>` (or `Authorization: Bearer <CRON_SECRET>`)

## Limits & Kill Switch
- `1` active job per user, `5` generations per day, `8,000` words max (`STUDIO_V2_LIMITS` in `lib/studioV2.ts`).
- Set `STUDIO_V2_DISABLED=true` in environment variables to pause new v2 generations.
