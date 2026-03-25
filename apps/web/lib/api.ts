/**
 * Centralized fetch wrapper for the web app.
 * Uses HttpOnly cookies for auth — no manual token handling needed.
 * Automatically retries with a token refresh on 401.
 */

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      ...options.headers,
    },
  });

  // If 401, try refreshing the access token once
  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken();
    }
    const refreshed = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (refreshed) {
      // Retry the original request
      return fetch(path, {
        ...options,
        credentials: 'include',
        headers: {
          ...options.headers,
        },
      });
    }

    // Refresh failed — redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  return res;
}

/** Helper to get the current user info from the access token cookie via /auth/me */
export async function getCurrentUser(): Promise<{ userId: string; email: string; role: string } | null> {
  try {
    const res = await apiFetch('/api/auth/me');
    if (res.ok) return res.json();
    return null;
  } catch {
    return null;
  }
}
