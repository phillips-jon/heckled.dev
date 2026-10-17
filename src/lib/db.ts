import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Everything the app keeps lives under DATA_DIR: the database and media/.
// On the server that is the shared data/ directory linked into every release.
// Set at runtime, so the build must not try to trace it.
export const DATA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || "data");
export const MEDIA_DIR = path.join(/*turbopackIgnore: true*/ DATA_DIR, "media");

const MIGRATIONS = [
  `CREATE TABLE heckles (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    mode TEXT NOT NULL,
    source_url TEXT,
    input_hash TEXT NOT NULL,
    roaster TEXT NOT NULL,
    language TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    input_data TEXT,
    script TEXT,
    score REAL,
    image_path TEXT,
    image_width INTEGER,
    image_height INTEGER,
    audio_path TEXT,
    timestamps TEXT,
    is_public INTEGER NOT NULL DEFAULT 0,
    delete_token TEXT NOT NULL,
    ip_hash TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX heckles_cache ON heckles (input_hash, roaster, language, created_at);
  CREATE INDEX heckles_status ON heckles (status, created_at);
  CREATE INDEX heckles_ip ON heckles (ip_hash, created_at);
  CREATE TABLE leads (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    heckle_id TEXT NOT NULL REFERENCES heckles (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL
  );`,
  // The written review, filled in while the roast is being voiced.
  `ALTER TABLE heckles ADD COLUMN analysis TEXT;`,
];

function open() {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  const db = new Database(process.env.DATABASE_PATH || path.join(/*turbopackIgnore: true*/ DATA_DIR, "heckled.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  const version = db.pragma("user_version", { simple: true }) as number;
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[i]);
      db.pragma(`user_version = ${i + 1}`);
    })();
  }
  return db;
}

// One connection per process. Route bundles and the worker started from
// instrumentation can be separate module instances, so the handle sits on
// globalThis rather than in a module variable.
const g = globalThis as unknown as { __heckledDb?: Database.Database };

export function db() {
  if (!g.__heckledDb) g.__heckledDb = open();
  return g.__heckledDb;
}
