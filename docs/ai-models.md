# AI model routing

Every text AI call goes through `runAICall` in `server.ts`. Each call has a tier:

| Tier | Used for | Default model |
|---|---|---|
| fast (default) | chat, summaries, flashcards, quizzes, podcast scripts, reading and OCR of files, CGPA and planner helpers | `gemini-3.6-flash` |
| heavy | Academic Studio (`/api/ai/studio/*`) and semester outline analysis (`/api/ai/course-outline`) | `gemini-4-argon` |

The heavy tier always falls back to the fast models. It falls back when:
- the heavy model is not enabled for the API key (404/403/400). It is then skipped for 10 minutes so requests do not pay for a failed call each time;
- a heavy attempt takes longer than `GEMINI_HEAVY_TIMEOUT_MS` (default 35 s), to stay inside the serverless time limit;
- the heavy model returns an empty answer or a temporary error (429/5xx).

Environment variables (all optional):
- `GEMINI_MODEL`: fast model
- `GEMINI_FALLBACK_MODEL`: extra fast fallback
- `GEMINI_HEAVY_MODEL`: heavy model. Set it to `off` to send everything to the fast models.
- `GEMINI_HEAVY_TIMEOUT_MS`: heavy attempt timeout

Check the Vercel runtime logs: each successful call logs `[AI] tier=... model=...`, so you can see which model answered.
Pricing note: heavy models cost more per request. Argon's introductory price rises after 30 November 2026.
Tests: `npx tsx lib/aiModels.test.ts`
