/**
 * Pure, framework-agnostic API-secret authorization decision logic.
 * Shared by lib/auth.ts (Next.js). Kept free of next/server imports so it can be
 * unit-tested directly with node:test.
 *
 * SECURITY: FAIL-CLOSED. If PATCHWORK_API_SECRET is not configured, ALL requests
 * are rejected. A missing secret must never open the API surface.
 */

/**
 * @param {string|undefined} configuredSecret The value of PATCHWORK_API_SECRET (may be undefined).
 * @param {string|null|undefined} providedKey The key supplied by the requester (may be null/undefined).
 * @returns {{ authorized: boolean, status: number, error?: string, missingSecret?: boolean }}
 */
function resolveApiSecretAuth(configuredSecret, providedKey) {
  // FAIL-CLOSED: no configured secret => reject everything with 500.
  if (configuredSecret === undefined || configuredSecret === null || configuredSecret === '') {
    return {
      authorized: false,
      status: 500,
      error: 'Server Configuration Error',
      missingSecret: true,
    };
  }

  if (!providedKey || providedKey !== configuredSecret) {
    return {
      authorized: false,
      status: 401,
      error: 'Unauthorized',
    };
  }

  return { authorized: true, status: 200 };
}

module.exports = { resolveApiSecretAuth };
