import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Placeholder values from .env.example — treated as "not configured". */
const PLACEHOLDERS = new Set([
  'https://your-project-ref.supabase.co',
  'https://placeholder.supabase.co',
  'your-service-role-key-placeholder',
]);

/**
 * Thrown on the first DB call when required env vars are missing or still
 * placeholders. Deliberately NOT thrown at import/build time so `next build`
 * works without secrets; the UI surfaces the message via toActionError().
 */
export class MissingEnvError extends Error {
  constructor(missing: string[]) {
    super(
      `Patchwork is not configured — missing environment variable${missing.length > 1 ? 's' : ''}: ` +
        `${missing.join(', ')}. ` +
        'Copy .env.example to .env.local, add your Supabase credentials, and restart the dev server. ' +
        'See README → Quick Start.'
    );
    this.name = 'MissingEnvError';
  }
}

function missingVars(): string[] {
  const missing: string[] = [];
  if (!SUPABASE_URL || PLACEHOLDERS.has(SUPABASE_URL)) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SERVICE_ROLE_KEY || PLACEHOLDERS.has(SERVICE_ROLE_KEY)) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  return missing;
}

let cachedClient: SupabaseClient | null = null;

/**
 * Strictly server-side admin client (service role bypasses RLS). Lazily built
 * on first use; fails fast with an actionable setup message instead of silently
 * querying a placeholder host and returning cryptic network errors.
 */
function getClient(): SupabaseClient {
  if (!cachedClient) {
    const missing = missingVars();
    if (missing.length > 0) throw new MissingEnvError(missing);
    cachedClient = createClient(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedClient;
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
