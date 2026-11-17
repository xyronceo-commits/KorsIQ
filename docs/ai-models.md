# KorsIQ AI Model Routing

KorsIQ uses a two-tier Gemini model routing strategy so everyday student tools stay fast and inexpensive while complex academic reasoning routes to a stronger heavy model with automatic fallback.

## Tiers & Routes

| Tier | Default Model | Routes |
| --- | --- | --- |
| **Fast** (`fast`) | `gemini-3.5-flash` (plus fallback chain) | Chat & assistants, summaries, flashcards, quizzes, exam simulations, podcast scripts, CGPA analysis, study planner helpers, uploaded file OCR (`ocrMediaWithGemini`), and Vision Scan (`/api/ai/vision-scan`) |
| **Heavy** (`heavy`) | `gemini-4-argon` (falls back to fast chain) | Academic Studio (`/api/ai/studio/plan`, `/api/ai/studio/generate-section`, `/api/ai/studio/review`, `/api/ai/studio/assist`) and semester outline analysis (`/api/ai/course-outline`) |

## Environment Variables (all optional)

- `GEMINI_MODEL`: Primary fast model (default `gemini-3.5-flash`).
- `GEMINI_FALLBACK_MODEL`: Optional extra fallback inserted right after `GEMINI_MODEL`.
- `GEMINI_HEAVY_MODEL`: Heavy-tier model name (default `gemini-4-argon`; can be swapped to e.g. `gemini-4-hydrogen`). Set to `off`, `none`, `false`, `0`, or `disabled` (any case) to disable the heavy tier completely.
- `GEMINI_HEAVY_TIMEOUT_MS`: Abort timeout for heavy attempts in milliseconds (default `35000`, minimum `5000`). Kept well below `vercel.json`'s `maxDuration: 60` so fast fallback still completes within the serverless limit.
- `GEMINI_HEAVY_THINKING_LEVEL`: Thinking level for heavy attempts (`low` | `medium` | `high`, default `low`). Outline analysis stays on `low` via per-route override; Studio routes use the configured level.

## Heavy-Attempt Behavior, Fallback & Cooldown

1. **Argon / Hydrogen request shaping**: Heavy attempts strip sampling parameters (`temperature`, `topP`, `topK`) and never send `thinkingBudget`. They always set `thinkingConfig.thinkingLevel` explicitly. If `maxOutputTokens` is set on a heavy call, it is raised to at least `32768` (or left unset). Fast attempts keep sampling parameters and never send `thinkingConfig`.
2. **Incomplete-response retry**: If a heavy attempt returns empty or nearly empty text (e.g. truncated at `MAX_TOKENS`), `runAICall` lowers the thinking level once (`high` -> `medium` -> `low`) and retries on the heavy model before falling back to the fast chain.
3. **Timeouts & transient errors**: Heavy attempts run under an `AbortController` (`GEMINI_HEAVY_TIMEOUT_MS`). Timeouts, aborts, `429`, and `5xx` errors fall through to the fast chain for that request only.
4. **Permanent error cooldown (`HeavyModelGuard`)**: If the heavy model fails with a permanent error (`400`/`401`/`403`/`404` or messages about `not found`, `not supported`, `permission`, `paid tier`, `billing`, `invalid argument`, or `api key not valid`), the heavy model is disabled for **10 minutes** and subsequent requests skip straight to the fast chain.

## Reading the Logs

Logs never include prompts, user text, or user IDs:

- **Fast success**: `[AI] tier=fast model=<model>`
- **Heavy success**: `[AI] tier=heavy model=<model> thinking=<level> inputTokens=<n> outputTokens=<n>` (where `outputTokens` includes thinking tokens)
- **Permanent heavy failure (cooldown tripped)**: `[AI] Heavy model '<model>' failed permanently (<status>); disabled for 10 minutes.`
- **Transient heavy failure (single-request fallback)**: `[AI] Heavy model '<model>' call warning (<status>): ...`
