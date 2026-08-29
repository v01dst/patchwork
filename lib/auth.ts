import { NextResponse } from 'next/server';

/**
 * Validates external API requests using the PATCHWORK_API_SECRET.
 * Used exclusively for external non-browser integrations accessing /api/* route handlers.
 */
export function requireApiSecret(request: Request): { authorized: boolean; response?: NextResponse } {
  const secret = process.env.PATCHWORK_API_SECRET;
  
  // If no secret configured in environment, allow local development access or log warning
  if (!secret) {
    return { authorized: true };
  }

  const authHeader = request.headers.get('Authorization');
  const customHeader = request.headers.get('x-patchwork-api-key');

  const providedKey = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : customHeader?.trim();

  if (!providedKey || providedKey !== secret) {
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
