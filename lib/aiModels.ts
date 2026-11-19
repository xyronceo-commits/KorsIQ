/**
 * Pure model-routing helpers for KorsIQ AI calls.
 * No server, filesystem, or SDK imports so this module is safe to unit-test in isolation.
 */

export type ModelTier = 'fast' | 'heavy';
export type HeavyThinkingLevel = 'low' | 'medium' | 'high';
export type SdkThinkingLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export const DEFAULT_HEAVY_MODEL = 'gemini-4-argon';
export const DEFAULT_HEAVY_TIMEOUT_MS = 35_000;
export const MIN_HEAVY_TIMEOUT_MS = 5_000;
export const DEFAULT_HEAVY_COOLDOWN_MS = 10 * 60 * 1000;
export const DEFAULT_HEAVY_THINKING_LEVEL: HeavyThinkingLevel = 'low';
export const HEAVY_MIN_MAX_OUTPUT_TOKENS = 32_768;

const DISABLED_VALUES = new Set(['off', 'none', 'false', '0', 'disabled']);
const PERMANENT_HTTP_STATUSES = new Set([400, 401, 403, 404]);
const TEMPORARY_HTTP_STATUSES = new Set([408, 429]);

const PERMANENT_ERROR_PATTERNS = [
  'not found',
  'not supported',
  'permission',
  'paid tier',
  'billing',
  'invalid argument',
  'api key not valid',
  'api_key_invalid',
];

const TEMPORARY_ERROR_PATTERNS = [
  'timeout',
  'timed out',
  'etimedout',
  'abort',
  'aborted',
  'rate limit',
  'resource_exhausted',
  'quota',
  'unavailable',
  'overloaded',
];

function stripEnvQuotes(value: string | undefined): string {
  if (!value) return '';
  let trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Resolves the configured heavy model name from environment variables.
 * Defaults to `gemini-4-argon`. Returns `''` when disabled (`off`, `none`, `false`, `0`, `disabled`).
 */
export function resolveHeavyModel(env: Record<string, string | undefined> = {}): string {
  const raw = stripEnvQuotes(env.GEMINI_HEAVY_MODEL);
  if (!raw) return DEFAULT_HEAVY_MODEL;
  if (DISABLED_VALUES.has(raw.toLowerCase())) return '';
  return raw;
}

/**
 * Resolves the heavy-model timeout in milliseconds (default 35000, minimum 5000).
 */
export function resolveHeavyTimeoutMs(env: Record<string, string | undefined> = {}): number {
  const raw = stripEnvQuotes(env.GEMINI_HEAVY_TIMEOUT_MS);
  if (!raw) return DEFAULT_HEAVY_TIMEOUT_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_HEAVY_TIMEOUT_MS;
  return Math.max(MIN_HEAVY_TIMEOUT_MS, Math.floor(parsed));
}

/**
 * Resolves the default heavy thinking level (`low` | `medium` | `high`, default `low`).
 */
export function resolveHeavyThinkingLevel(
  env: Record<string, string | undefined> = {},
  override?: HeavyThinkingLevel
): HeavyThinkingLevel {
  if (override === 'low' || override === 'medium' || override === 'high') {
    return override;
  }
  const raw = stripEnvQuotes(env.GEMINI_HEAVY_THINKING_LEVEL).toLowerCase();
  if (raw === 'low' || raw === 'medium' || raw === 'high') {
    return raw;
  }
  return DEFAULT_HEAVY_THINKING_LEVEL;
}

export interface ModelChainConfig {
  fastPrimary: string;
  fallbacks: string[];
  heavyModel: string;
}

/**
 * Builds an ordered, de-duplicated list of candidate models for the requested tier.
 * - `heavy`: heavy model first (only when configured and `heavyAvailable` is true), then fast primary and fallbacks.
 * - `fast`: fast primary and fallbacks only (never includes `heavyModel`).
 */
export function buildModelChain(
  tier: ModelTier,
  config: ModelChainConfig,
  heavyAvailable: boolean
): string[] {
  const heavy = (config.heavyModel || '').trim();
  const candidates: string[] = [];

  if (tier === 'heavy' && heavyAvailable && heavy) {
    candidates.push(heavy);
  }

  candidates.push(config.fastPrimary, ...(config.fallbacks || []));

  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of candidates) {
    const clean = (item || '').trim();
    if (!clean) continue;
    if (tier === 'fast' && heavy && clean === heavy) continue;
    if (seen.has(clean)) continue;
    seen.add(clean);
    result.push(clean);
  }

  return result;
}

/**
 * Cooldown guard that temporarily disables the heavy model after a permanent error.
 */
export class HeavyModelGuard {
  private readonly cooldownMs: number;
  private readonly now: () => number;
  private trippedAt: number | null = null;

  constructor(
    cooldownMs: number = DEFAULT_HEAVY_COOLDOWN_MS,
    now: () => number = () => Date.now()
  ) {
    this.cooldownMs = cooldownMs;
    this.now = now;
  }

  isAvailable(): boolean {
    if (this.trippedAt === null) return true;
    if (this.now() - this.trippedAt >= this.cooldownMs) {
      this.trippedAt = null;
      return true;
    }
    return false;
  }

  trip(): void {
    this.trippedAt = this.now();
  }
}

function extractNumericStatus(err: any): number | null {
  if (!err || typeof err !== 'object') return null;
  const raw = err.status ?? err.statusCode ?? err.response?.status ?? err.code;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && /^\d{3}$/.test(raw.trim())) {
    return Number(raw.trim());
  }
  return null;
}

/**
 * Returns true when an error indicates a permanent model/configuration failure
 * (400/401/403/404 or unsupported/billing/permission/key/not-found messages)
 * so the heavy model should enter cooldown.
 * Returns false for timeouts, aborts, 429, and 5xx errors.
 */
export function isPermanentModelError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as any;
  const name = String(anyErr?.name || '').toLowerCase();
  const message = String(anyErr?.message || anyErr || '').toLowerCase();
  const status = extractNumericStatus(anyErr);

  if (name === 'aborterror') return false;
  if (status !== null) {
    if (TEMPORARY_HTTP_STATUSES.has(status) || (status >= 500 && status < 600)) {
      return false;
    }
    if (PERMANENT_HTTP_STATUSES.has(status)) {
      return true;
    }
  }

  if (TEMPORARY_ERROR_PATTERNS.some((pattern) => message.includes(pattern))) {
    return false;
  }

  return PERMANENT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

export function toSdkThinkingLevel(level: HeavyThinkingLevel): SdkThinkingLevel {
  if (level === 'high') return 'HIGH';
  if (level === 'medium') return 'MEDIUM';
  return 'LOW';
}

export function lowerThinkingLevel(level: HeavyThinkingLevel): HeavyThinkingLevel | null {
  if (level === 'high') return 'medium';
  if (level === 'medium') return 'low';
  return null;
}

/**
 * Detects an incomplete heavy-model response with almost no usable text.
 */
export function isIncompleteHeavyResponse(text: string | undefined, finishReason?: string): boolean {
  const trimmed = (text || '').trim();
  if (trimmed.length < 20) return true;
  if (finishReason === 'MAX_TOKENS' && trimmed.length < 50) return true;
  return false;
}

export interface AttemptConfigOptions {
  isHeavyAttempt: boolean;
  thinkingLevel: HeavyThinkingLevel;
  abortSignal?: AbortSignal;
}

/**
 * Builds the `generateContent` config for a single model attempt.
 * - Heavy attempts strip sampling params (`temperature`, `topP`, `topK`) and `thinkingBudget`,
 *   set `thinkingConfig.thinkingLevel`, and ensure `maxOutputTokens` is unset or >= 32768.
 * - Fast attempts keep sampling params and never attach `thinkingConfig`.
 */
export function buildGenerateConfigForAttempt(
  baseConfig: Record<string, any>,
  options: AttemptConfigOptions
): Record<string, any> {
  const next: Record<string, any> = { ...baseConfig };

  if (options.isHeavyAttempt) {
    delete next.temperature;
    delete next.topP;
    delete next.topK;
    delete next.thinkingBudget;
    next.thinkingConfig = {
      thinkingLevel: toSdkThinkingLevel(options.thinkingLevel),
    };
    if (next.maxOutputTokens !== undefined && next.maxOutputTokens < HEAVY_MIN_MAX_OUTPUT_TOKENS) {
      next.maxOutputTokens = HEAVY_MIN_MAX_OUTPUT_TOKENS;
    }
  } else {
    delete next.thinkingConfig;
  }

  if (options.abortSignal) {
    next.abortSignal = options.abortSignal;
  }

  return next;
}
