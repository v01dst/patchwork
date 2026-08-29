import { NextResponse } from 'next/server';
import { resolveApiSecretAuth } from './auth-core';

/**
 * Validates external API requests using the PATCHWORK_API_SECRET.
 * Used exclusively for external non-browser integrations accessing /api/* route handlers.
 *
 * SECURITY: FAIL-CLOSED. If PATCHWORK_API_SECRET is not configured, this helper
 * logs a server-side error and rejects EVERY request with a 500, intentionally
 * disabling the external API surface entirely. A missing secret must NEVER open
 * the API to the public.
 *
 * This helper is NOT part of the Server Actions data flow (Browser -> Server
 * Actions -> Supabase service role -> Database); it only guards the optional
 * /api/* external integration surface.
 */
export function requireApiSecret(request: Request): { authorized: boolean; response?: NextResponse } {
  const secret = process.env.PATCHWORK_API_SECRET;

  const authHeader = request.headers.get('Authorization');
  const customHeader = request.headers.get('x-patchwork-api-key');

  const providedKey = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : customHeader?.trim() ?? null;

  const result = resolveApiSecretAuth(secret, providedKey);

  if (result.missingSecret) {
    console.error(
      'PATCHWORK_API_SECRET is not configured: rejecting request. ' +
      'The external /api/* surface is disabled until the secret is set. ' +
      '(This does not affect the app UI, which uses Server Actions.)'
    );
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 }),
    };
  }

  if (!result.authorized) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing API Secret key.' },
        { status: 401 }
      ),
    };
  }

  return { authorized: true };
}
