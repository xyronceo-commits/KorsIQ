/**
 * Validates that an external URL uses an explicit http:// or https:// scheme.
 * Prevents javascript:, data:, vbscript:, or file: URL execution in href / window.open sinks.
 */
export function toSafeExternalUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}
