import { createClient, type User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment (.env locally, hosting env vars in production).'
  );
}

const memoryStorage = new Map<string, string>();

/** Storage adapter that safely falls back to in-memory storage when localStorage throws SecurityError or is unavailable (e.g. crawlers/restricted contexts). */
const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fall back to in-memory storage
    }
    return memoryStorage.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fall back to in-memory storage
    }
    memoryStorage.set(key, value);
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Fall back to in-memory storage
    }
    memoryStorage.delete(key);
  },
};

/** Returns true only if a persisted Supabase auth session key is readable in localStorage. Never throws. */
export function hasStoredSupabaseSession(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
        const val = window.localStorage.getItem(k);
        if (val && val !== 'null' && val !== '{}') return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'missing-anon-key',
  {
    auth: {
      storage: safeStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

/** Minimal user shape used across the UI. */
export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
}

export function toAuthUser(user: User): AuthUser {
  return {
    uid: user.id,
    email: user.email ?? null,
    emailVerified: !!user.email_confirmed_at,
    displayName: (user.user_metadata?.full_name as string | undefined) ?? null,
  };
}

let currentUserId: string | undefined;

/** Called by the auth listener in App so non-React code can read the signed-in user synchronously. */
export function setCurrentUserId(id: string | undefined) {
  currentUserId = id;
}

export function getCurrentUserId(): string | undefined {
  return currentUserId;
}

/** Access token for calling our own /api routes. Proactively refreshes if expired or expiring within 30s. */
export async function getAccessToken(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return undefined;

  const expiresAtSec = session.expires_at ?? 0;
  const nowSec = Math.floor(Date.now() / 1000);
  if (expiresAtSec > 0 && expiresAtSec - nowSec <= 30) {
    try {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session?.access_token) {
        return refreshed.session.access_token;
      }
    } catch {
      // Fall back to existing token if refresh fails transiently
    }
  }
  return session.access_token;
}
