import type { D1Database, ExecutionContext } from "@cloudflare/workers-types";
import { defaultSave, type CharacterSave } from "../../shared/src/index";
import { hashPassword, randomId, verifyPassword } from "./crypto";
import { ensureSchema } from "./schema";
import { ensureSeedAccount } from "./seed";

export interface Env {
  DB: D1Database;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  JWT_SECRET: string;
  JWT_ISSUER: string;
}

const SESSION_DAYS = 14;
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function bad(message: string, status = 400): Response {
  return json({ error: message }, status);
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function cookieHeader(token: string, maxAgeSec: number): string {
  return `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join("=") || "");
  }
  return out;
}

async function getSessionUser(request: Request, env: Env): Promise<{ id: string; username: string; email: string } | null> {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const auth = request.headers.get("Authorization");
  const token = cookies.session || (auth?.startsWith("Bearer ") ? auth.slice(7) : "");
  if (!token) return null;

  const row = await env.DB.prepare(
    `SELECT s.user_id, s.expires_at, u.username, u.email
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`
  )
    .bind(token)
    .first<{ user_id: string; expires_at: number; username: string; email: string }>();

  if (!row || row.expires_at < Date.now()) return null;
  return { id: row.user_id, username: row.username, email: row.email };
}

async function createSession(env: Env, userId: string): Promise<{ token: string; expiresAt: number }> {
  const token = randomId(32);
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(token, userId, expiresAt, Date.now())
    .run();
  return { token, expiresAt };
}

function validUsername(u: string): boolean {
  return /^[a-zA-Z0-9_]{3,24}$/.test(u);
}

function validEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 120;
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  await ensureSchema(env.DB);
  await ensureSeedAccount(env.DB);

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (path === "/api/health" && request.method === "GET") {
    return json({ ok: true, service: "victorian-adventure" });
  }

  if (path === "/api/auth/signup" && request.method === "POST") {
    const body = await readJson<{ username?: string; email?: string; password?: string }>(request);
    if (!body?.username || !body.email || !body.password) return bad("username, email, and password required");
    if (!validUsername(body.username)) return bad("username must be 3-24 letters, numbers, or _");
    if (!validEmail(body.email)) return bad("invalid email");
    if (body.password.length < 8 || body.password.length > 72) return bad("password must be 8-72 characters");

    const taken = await env.DB.prepare(
      "SELECT id FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE"
    )
      .bind(body.username, body.email)
      .first();
    if (taken) return bad("username or email already taken", 409);

    const id = randomId();
    const { hash, salt } = await hashPassword(body.password);
    const now = Date.now();
    await env.DB.prepare(
      "INSERT INTO users (id, username, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(id, body.username, body.email.toLowerCase(), hash, salt, now)
      .run();
    await env.DB.prepare("INSERT INTO characters (user_id, save_json, updated_at) VALUES (?, ?, ?)")
      .bind(id, JSON.stringify(defaultSave()), now)
      .run();

    const session = await createSession(env, id);
    const res = json({ user: { id, username: body.username, email: body.email.toLowerCase() }, token: session.token });
    res.headers.set("Set-Cookie", cookieHeader(session.token, SESSION_DAYS * 86400));
    return res;
  }

  if (path === "/api/auth/login" && request.method === "POST") {
    const body = await readJson<{ username?: string; password?: string }>(request);
    if (!body?.username || !body.password) return bad("username and password required");

    const user = await env.DB.prepare(
      "SELECT id, username, email, password_hash, password_salt FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE"
    )
      .bind(body.username, body.username)
      .first<{ id: string; username: string; email: string; password_hash: string; password_salt: string }>();

    if (!user || !(await verifyPassword(body.password, user.password_hash, user.password_salt))) {
      return bad("invalid credentials", 401);
    }

    const session = await createSession(env, user.id);
    const res = json({
      user: { id: user.id, username: user.username, email: user.email },
      token: session.token,
    });
    res.headers.set("Set-Cookie", cookieHeader(session.token, SESSION_DAYS * 86400));
    return res;
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    const cookies = parseCookies(request.headers.get("Cookie"));
    const auth = request.headers.get("Authorization");
    const token = cookies.session || (auth?.startsWith("Bearer ") ? auth.slice(7) : "");
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    const res = json({ ok: true });
    res.headers.set("Set-Cookie", cookieHeader("", 0));
    return res;
  }

  if (path === "/api/auth/me" && request.method === "GET") {
    const user = await getSessionUser(request, env);
    if (!user) return bad("unauthorized", 401);
    return json({ user });
  }

  if (path === "/api/character" && request.method === "GET") {
    const user = await getSessionUser(request, env);
    if (!user) return bad("unauthorized", 401);
    const row = await env.DB.prepare("SELECT save_json FROM characters WHERE user_id = ?")
      .bind(user.id)
      .first<{ save_json: string }>();
    if (!row) {
      const save = defaultSave();
      await env.DB.prepare("INSERT INTO characters (user_id, save_json, updated_at) VALUES (?, ?, ?)")
        .bind(user.id, JSON.stringify(save), Date.now())
        .run();
      return json({ save });
    }
    return json({ save: JSON.parse(row.save_json) as CharacterSave });
  }

  if (path === "/api/character" && request.method === "PUT") {
    const user = await getSessionUser(request, env);
    if (!user) return bad("unauthorized", 401);
    const body = await readJson<{ save?: CharacterSave }>(request);
    if (!body?.save || typeof body.save !== "object") return bad("save required");
    await env.DB.prepare(
      "INSERT INTO characters (user_id, save_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET save_json = excluded.save_json, updated_at = excluded.updated_at"
    )
      .bind(user.id, JSON.stringify(body.save), Date.now())
      .run();
    return json({ ok: true });
  }

  // Global chat (short-poll via D1 until shared MMO / Durable Objects)
  if (path === "/api/chat" && request.method === "GET") {
    const user = await getSessionUser(request, env);
    if (!user) return bad("unauthorized", 401);
    const after = Number(url.searchParams.get("after") || "0");
    const limit = Math.min(80, Math.max(1, Number(url.searchParams.get("limit") || "40")));
    const rows = await env.DB.prepare(
      `SELECT id, username, body, created_at FROM chat_messages
       WHERE created_at > ?
       ORDER BY created_at ASC
       LIMIT ?`
    )
      .bind(after, limit)
      .all<{ id: string; username: string; body: string; created_at: number }>();
    return json({ messages: rows.results ?? [] });
  }

  if (path === "/api/chat" && request.method === "POST") {
    const user = await getSessionUser(request, env);
    if (!user) return bad("unauthorized", 401);
    const body = await readJson<{ body?: string }>(request);
    const text = (body?.body || "").trim().slice(0, 240);
    if (!text) return bad("message required");
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) return bad("invalid characters");
    const id = randomId(12);
    const createdAt = Date.now();
    await env.DB.prepare(
      "INSERT INTO chat_messages (id, user_id, username, body, created_at) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(id, user.id, user.username, text, createdAt)
      .run();
    // Keep table lean (2-day window)
    await env.DB.prepare("DELETE FROM chat_messages WHERE created_at < ?")
      .bind(createdAt - 2 * 24 * 60 * 60 * 1000)
      .run();
    return json({ message: { id, username: user.username, body: text, created_at: createdAt } });
  }

  return bad("not found", 404);
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env);
      }
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error(err);
      return json({ error: "internal error" }, 500);
    }
  },
};
