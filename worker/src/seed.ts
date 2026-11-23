import type { D1Database } from "@cloudflare/workers-types";
import { defaultSave } from "../../shared/src/index";
import { hashPassword, randomId } from "./crypto";

const TEST_USERNAME = "russell";
const TEST_EMAIL = "russell@test.local";
const TEST_PASSWORD = "test1234";

export async function ensureSeedAccount(db: D1Database): Promise<void> {
  const existing = await db
    .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
    .bind(TEST_USERNAME)
    .first<{ id: string }>();
  if (existing) return;

  const id = randomId();
  const { hash, salt } = await hashPassword(TEST_PASSWORD);
  const now = Date.now();
  await db
    .prepare(
      "INSERT INTO users (id, username, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(id, TEST_USERNAME, TEST_EMAIL, hash, salt, now)
    .run();

  const save = defaultSave();
  await db
    .prepare("INSERT INTO characters (user_id, save_json, updated_at) VALUES (?, ?, ?)")
    .bind(id, JSON.stringify(save), now)
    .run();
}
