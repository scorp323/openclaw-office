const AUTH_TOKEN_KEY = "openclaw-mc-auth-token";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(pin: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, pin);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * Adds Authorization header to fetch requests for /mc-api endpoints.
 * Use this wrapper instead of raw fetch for authenticated API calls.
 */
export function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

/**
 * Validate a PIN against the server.
 * Returns true if the PIN is accepted.
 */
export async function validatePin(pin: string): Promise<boolean> {
  try {
    const res = await fetch("/mc-api/auth/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pin}`,
      },
      body: JSON.stringify({ pin }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
