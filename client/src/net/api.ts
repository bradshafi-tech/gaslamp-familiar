import type { AuthUser, CharacterSave } from "@shared/index";

const TOKEN_KEY = "va_session";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
  return data as T;
}

export async function signup(username: string, email: string, password: string) {
  const data = await api<{ user: AuthUser; token: string }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function login(username: string, password: string) {
  const data = await api<{ user: AuthUser; token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
  } finally {
    setToken(null);
  }
}

export async function me() {
  return api<{ user: AuthUser }>("/api/auth/me");
}

export async function loadCharacter() {
  return api<{ save: CharacterSave }>("/api/character");
}

export async function saveCharacter(save: CharacterSave) {
  return api<{ ok: boolean }>("/api/character", {
    method: "PUT",
    body: JSON.stringify({ save }),
  });
}

export type ChatMessage = {
  id: string;
  username: string;
  body: string;
  created_at: number;
};

export async function fetchChat(after = 0) {
  return api<{ messages: ChatMessage[] }>(`/api/chat?after=${after}&limit=50`);
}

export async function sendChat(body: string) {
  return api<{ message: ChatMessage }>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}
