/**
 * API client with automatic token refresh.
 * Wraps fetch with auth headers and handles 401 responses
 * by attempting a token refresh before retrying.
 */

interface ApiClientOptions extends RequestInit {
  skipAuth?: boolean;
}

interface TokenStore {
  accessToken: string | null;
  refreshToken: string | null;
}

let tokenStore: TokenStore = {
  accessToken: null,
  refreshToken: null,
};

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export function setTokens(accessToken: string, refreshToken: string) {
  tokenStore.accessToken = accessToken;
  tokenStore.refreshToken = refreshToken;

  if (typeof window !== 'undefined') {
    localStorage.setItem('societyos_access_token', accessToken);
    localStorage.setItem('societyos_refresh_token', refreshToken);
  }
}

export function getTokens(): TokenStore {
  if (typeof window !== 'undefined' && !tokenStore.accessToken) {
    tokenStore.accessToken = localStorage.getItem('societyos_access_token');
    tokenStore.refreshToken = localStorage.getItem('societyos_refresh_token');
  }
  return tokenStore;
}

export function clearTokens() {
  tokenStore = { accessToken: null, refreshToken: null };
  if (typeof window !== 'undefined') {
    localStorage.removeItem('societyos_access_token');
    localStorage.removeItem('societyos_refresh_token');
    localStorage.removeItem('societyos_user');
  }
}

async function attemptRefresh(): Promise<boolean> {
  const { refreshToken } = getTokens();
  if (!refreshToken) return false;

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function apiClient<T = unknown>(
  url: string,
  options: ApiClientOptions = {}
): Promise<{ data: T; status: number } | { error: string; status: number; details?: any }> {
  const { skipAuth, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const { accessToken } = getTokens();
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
  }

  let response = await fetch(url, { ...fetchOptions, headers });

  // If 401 and not skipping auth, try refresh
  if (response.status === 401 && !skipAuth) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = attemptRefresh();
    }

    const refreshed = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (refreshed) {
      const { accessToken } = getTokens();
      headers.set('Authorization', `Bearer ${accessToken}`);
      response = await fetch(url, { ...fetchOptions, headers });
    } else {
      // Refresh failed — redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return { error: 'Session expired', status: 401 };
    }
  }

  const data = await response.json();

  if (!response.ok) {
    return { error: data.error || 'Request failed', status: response.status, details: data.details };
  }

  return { data, status: response.status };
}
