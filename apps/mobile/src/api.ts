import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './config';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Login failed');
  }
  const data = await res.json();
  await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
  return data;
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getUser(): Promise<any | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function logout() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = await getToken();
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}
