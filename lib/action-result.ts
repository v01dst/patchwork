import { DbError } from '@/lib/db';
import { MissingEnvError } from '@/lib/supabase';

/**
 * Typed result shape shared by every Server Action. Lives OUTSIDE the
 * 'use server' modules because Next.js only allows async function exports
 * there — sync helpers in a server-action file fail the production build.
 */
export type ActionResult<T> = {
  data?: T;
  error?: string;
};

/** Convert any thrown error into a typed { error } result. */
export function toActionError(err: unknown, fallback: string): string {
  if (err instanceof DbError) return err.message;
  // Setup problems must reach the user verbatim — they are the fix instructions.
  if (err instanceof MissingEnvError) return err.message;
  const msg = err instanceof Error ? err.message : String(err);
  console.error('Server Action error:', msg);
  return fallback;
}
