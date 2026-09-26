import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

declare global {
  // eslint-disable-next-line no-var
  var __gstdb: Database.Database | undefined;
}

function open() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "gst.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      correct INTEGER NOT NULL,
      mode TEXT NOT NULL,
      answered_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_attempts_topic ON attempts(topic, answered_at);
    CREATE TABLE IF NOT EXISTS reviews (
      question_id TEXT PRIMARY KEY,
      ease REAL NOT NULL DEFAULT 2.5,
      interval_days REAL NOT NULL DEFAULT 0,
      reps INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      due_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ai_questions (
      id TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      json TEXT NOT NULL,
      model_used TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id TEXT NOT NULL,
      note TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  return db;
}

export function db() {
  if (!globalThis.__gstdb) globalThis.__gstdb = open();
  return globalThis.__gstdb;
}

export function getSetting(key: string): string | null {
  const row = db().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}
export function setSetting(key: string, value: string) {
  db().prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, value);
}
