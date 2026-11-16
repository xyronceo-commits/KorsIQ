// Gemini model routing.
//
// Two tiers:
//   fast  - chat, summaries, flashcards, quizzes, reading/OCR of files. Cheap and quick.
//   heavy - Academic Studio and semester outline analysis. Slower, costs more, reasons better.
//
// The heavy tier always falls back to the fast chain, so a student never sees a failure just because the
// flagship model is unavailable, too slow, or not enabled for the API key.
//
// Environment variables (all optional):
//   GEMINI_MODEL              fast model (default below)
//   GEMINI_FALLBACK_MODEL     extra fast fallback tried before the built-in ones
//   GEMINI_HEAVY_MODEL        heavy model (default below). Set to "off" to send everything to the fast chain.
//   GEMINI_HEAVY_TIMEOUT_MS   how long one heavy attempt may run before falling back (default 35000)

export type ModelTier = 'fast' | 'heavy';

export const DEFAULT_FAST_MODEL = 'gemini-3.6-flash';
export const DEFAULT_HEAVY_MODEL = 'gemini-4-argon';
export const BUILT_IN_FALLBACKS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];

const OFF_VALUES = ['off', 'none', 'false', '0', 'disabled'];

/** Returns the heavy model name, or '' when the heavy tier is switched off. */
export function resolveHeavyModel(raw: string | undefined | null): string {
  const value = String(raw ?? '').trim();
  if (!value) return DEFAULT_HEAVY_MODEL;
  return OFF_VALUES.includes(value.toLowerCase()) ? '' : value;
}

export interface ModelChainConfig {
  fastPrimary: string;
  fallbacks: string[];
  heavyModel: string; // '' = heavy tier disabled
}

/** Ordered, de-duplicated list of models to try for a request. */
export function buildModelChain(tier: ModelTier, cfg: ModelChainConfig, heavyAvailable = true): string[] {
  const chain: string[] = [];
  if (tier === 'heavy' && cfg.heavyModel && heavyAvailable) chain.push(cfg.heavyModel);
  chain.push(cfg.fastPrimary, ...cfg.fallbacks);
  return Array.from(new Set(chain.filter(Boolean)));
}

/**
 * Remembers that the heavy model recently failed in a way that will keep failing (not enabled for this key,
 * model not found, bad request) so we stop paying a failed round trip on every request. Per server instance.
 */
export class HeavyModelGuard {
  private disabledUntil = 0;
  constructor(
    private readonly cooldownMs = 10 * 60 * 1000,
    private readonly now: () => number = Date.now
  ) {}

  isAvailable(): boolean {
    return this.now() >= this.disabledUntil;
  }

  trip(): void {
    this.disabledUntil = this.now() + this.cooldownMs;
  }
}

/** True for errors that will not fix themselves on retry (as opposed to timeouts, 429 and 5xx). */
export function isPermanentModelError(err: any): boolean {
  const status = Number(err?.status ?? err?.code ?? err?.error?.code);
  if ([400, 401, 403, 404].includes(status)) return true;
  const message = String(err?.message || err || '');
  return /not found|not supported|permission|paid tier|billing|invalid argument|api key not valid|unsupported/i.test(message);
}
