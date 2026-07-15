/**
 * Simple in-memory rate limiter for auth endpoints.
 * Uses a sliding window approach per key (IP or email).
 *
 * In production, this should be replaced with Redis-backed rate limiting.
 * For v1, in-memory is sufficient for a single-server deployment on Vercel.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Max attempts per window
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(namespace: string): Map<string, RateLimitEntry> {
  if (!stores.has(namespace)) {
    stores.set(namespace, new Map());
  }
  return stores.get(namespace)!;
}

export function createRateLimiter(namespace: string, config: RateLimitConfig) {
  const store = getStore(namespace);

  return {
    /**
     * Check if a key has exceeded the rate limit.
     * Returns { limited: true, retryAfterMs } if exceeded.
     */
    check(key: string): { limited: boolean; retryAfterMs?: number; remaining: number } {
      if (process.env.NODE_ENV === 'test') {
        return { limited: false, remaining: config.maxAttempts };
      }
      const now = Date.now();
      const entry = store.get(key);

      // Clean up expired entry
      if (entry && now > entry.resetTime) {
        store.delete(key);
      }

      const current = store.get(key);

      if (!current) {
        // First request in window
        store.set(key, { count: 1, resetTime: now + config.windowMs });
        return { limited: false, remaining: config.maxAttempts - 1 };
      }

      if (current.count >= config.maxAttempts) {
        return {
          limited: true,
          retryAfterMs: current.resetTime - now,
          remaining: 0,
        };
      }

      current.count++;
      return { limited: false, remaining: config.maxAttempts - current.count };
    },

    /**
     * Reset the rate limit for a key (e.g., after successful login).
     */
    reset(key: string): void {
      store.delete(key);
    },
  };
}

// Pre-configured rate limiters for auth endpoints
export const loginRateLimiter = createRateLimiter('login', {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 10,
});

export const signupRateLimiter = createRateLimiter('signup', {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAttempts: 5,
});

export const refreshRateLimiter = createRateLimiter('refresh', {
  windowMs: 60 * 1000, // 1 minute
  maxAttempts: 10,
});

/**
 * Extract a rate-limit key from a NextRequest.
 * Uses x-forwarded-for (Vercel) or falls back to a default.
 */
export function getRateLimitKey(req: Request, suffix?: string): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return suffix ? `${ip}:${suffix}` : ip;
}
