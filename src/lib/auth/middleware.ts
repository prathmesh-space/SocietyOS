import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, type AccessTokenPayload } from './jwt';
import { runWithTenantContext, type TenantContext } from '@/lib/tenant';
import type { UserRole } from '@/models/User';

// --- Types ---

export interface AuthenticatedRequest extends NextRequest {
  auth: AccessTokenPayload;
}

export type AuthenticatedHandler = (
  req: NextRequest,
  context: { params: Record<string, string>; auth: AccessTokenPayload }
) => Promise<NextResponse>;

interface WithAuthOptions {
  roles?: UserRole[]; // Allowed roles; empty = any authenticated role
}

// --- Error Responses ---

function unauthorizedResponse(message = 'Authentication required') {
  return NextResponse.json({ error: message }, { status: 401 });
}

function forbiddenResponse(message = 'Insufficient permissions') {
  return NextResponse.json({ error: message }, { status: 403 });
}

// --- Middleware ---

/**
 * Higher-order function that wraps a Next.js API route handler
 * with authentication and tenant context.
 *
 * Usage:
 * ```ts
 * export const GET = withAuth(async (req, { auth }) => {
 *   // auth.userId, auth.role, auth.societyId are available
 *   return NextResponse.json({ ok: true });
 * }, { roles: ['admin'] });
 * ```
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options: WithAuthOptions = {}
) {
  return async (
    req: NextRequest,
    routeContext: { params: Record<string, string> }
  ): Promise<NextResponse> => {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorizedResponse();
    }

    const token = authHeader.slice(7);
    if (!token) {
      return unauthorizedResponse();
    }

    // 2. Verify the token
    let payload: AccessTokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return unauthorizedResponse('Invalid or expired token');
    }

    // 3. Check role authorization
    if (options.roles && options.roles.length > 0) {
      if (!options.roles.includes(payload.role)) {
        return forbiddenResponse();
      }
    }

    // 4. Enforce societyId for non-superadmin roles
    if (payload.role !== 'superadmin' && !payload.societyId) {
      return unauthorizedResponse('Society context is required');
    }

    // 5. Set up tenant context and run the handler
    const tenantCtx: TenantContext = {
      userId: payload.userId,
      role: payload.role,
      societyId: payload.societyId,
    };

    return runWithTenantContext(tenantCtx, () =>
      handler(req, { params: routeContext.params, auth: payload })
    );
  };
}

/**
 * Extract auth token from request without enforcing authentication.
 * Useful for endpoints that behave differently for authenticated vs anonymous users.
 */
export function extractAuth(req: NextRequest): AccessTokenPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    return verifyAccessToken(authHeader.slice(7));
  } catch {
    return null;
  }
}
