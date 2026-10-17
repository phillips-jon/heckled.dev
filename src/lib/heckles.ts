import crypto from "node:crypto";
import { customAlphabet } from "nanoid";
import { db } from "./db";
import type { LanguageId, RoasterId } from "./roasters";

export type Mode = "landing" | "photo";

export type Status =
  | "queued"
  | "ingesting"
  | "writing"
  | "voicing"
  | "done"
  | "failed"
  | "rejected";

export const IN_PROGRESS: Status[] = ["queued", "ingesting", "writing", "voicing"];

export type Box = { x: number; y: number; w: number; h: number };

// One element on a landing page the script can point at. Boxes are in page
// pixels, measured against the screenshot.
export type PageElement = { key: string; kind: string; text: string; box: Box };

export type LandingInput = {
  url: string;
  finalUrl: string;
  title: string;
  description: string;
  facts: Record<string, string | number | boolean>;
  text: string;
  elements: PageElement[];
};

// A line points at the elements it's about (up to three, boxed together), or
// at nothing when no element on the list is exactly what it means.
export type ScriptLine = { text: string; targets: string[] };

// What the writer decided the site is, before writing a joke about it.
export type Understanding = { kind: string; purpose: string; content: string };

export type Script = {
  understanding?: Understanding;
  intro: string;
  lines: ScriptLine[];
  score: number;
  top_burn: string;
  fix: string;
  fixes: string[];
};

// The serious half: a plain-spoken review with fixes in priority order.
export const AREAS = ["Message", "Calls to action", "Design", "Trust", "Offer", "Basics"] as const;
export type Analysis = {
  summary: string;
  audience: string;
  scores: { area: (typeof AREAS)[number]; score: number; verdict: string }[];
  strengths: string[];
  priorities: { title: string; area: string; effort: "quick" | "medium" | "big"; why: string; how: string }[];
};

// A beat is one TTS call: the intro, each line, the score, and the fix.
export type Word = { w: string; s: number; e: number };
export type Beat = {
  kind: "intro" | "line" | "score" | "fix";
  text: string;
  targets: string[];
  // Roasts made before lines could point at several elements.
  target?: string | null;
  start: number;
  end: number;
  words: Word[];
};
export type Timeline = { duration: number; beats: Beat[] };

export type Heckle = {
  id: string;
  slug: string;
  mode: Mode;
  sourceUrl: string | null;
  inputHash: string;
  roaster: RoasterId;
  language: LanguageId;
  status: Status;
  error: string | null;
  input: LandingInput | null;
  script: Script | null;
  score: number | null;
  imagePath: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  audioPath: string | null;
  timeline: Timeline | null;
  analysis: Analysis | null;
  isPublic: boolean;
  deleteToken: string;
  createdAt: number;
  updatedAt: number;
};

type Row = {
  id: string;
  slug: string;
  mode: string;
  source_url: string | null;
  input_hash: string;
  roaster: string;
  language: string;
  status: string;
  error: string | null;
  input_data: string | null;
  script: string | null;
  score: number | null;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  audio_path: string | null;
  timestamps: string | null;
  analysis: string | null;
  is_public: number;
  delete_token: string;
  created_at: number;
  updated_at: number;
};

function fromRow(r: Row): Heckle {
  return {
    id: r.id,
    slug: r.slug,
    mode: r.mode as Mode,
    sourceUrl: r.source_url,
    inputHash: r.input_hash,
    roaster: r.roaster as RoasterId,
    language: r.language as LanguageId,
    status: r.status as Status,
    error: r.error,
    input: r.input_data ? JSON.parse(r.input_data) : null,
    script: r.script ? JSON.parse(r.script) : null,
    score: r.score,
    imagePath: r.image_path,
    imageWidth: r.image_width,
    imageHeight: r.image_height,
    audioPath: r.audio_path,
    timeline: r.timestamps ? JSON.parse(r.timestamps) : null,
    analysis: r.analysis ? JSON.parse(r.analysis) : null,
    isPublic: r.is_public === 1,
    deleteToken: r.delete_token,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Short, unambiguous, and unguessable enough for a share link.
const slugId = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 10);

export function hashIp(ip: string) {
  return crypto
    .createHmac("sha256", process.env.HECKLED_SECRET || "dev-secret")
    .update(ip)
    .digest("hex")
    .slice(0, 32);
}

export function createHeckle(input: {
  mode: Mode;
  sourceUrl: string | null;
  inputHash: string;
  roaster: RoasterId;
  language: LanguageId;
  ipHash: string | null;
}) {
  const now = Date.now();
  const heckle = {
    id: crypto.randomUUID(),
    slug: slugId(),
    deleteToken: crypto.randomBytes(18).toString("base64url"),
  };
  db()
    .prepare(
      `INSERT INTO heckles (id, slug, mode, source_url, input_hash, roaster, language, status,
         delete_token, ip_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?)`,
    )
    .run(
      heckle.id,
      heckle.slug,
      input.mode,
      input.sourceUrl,
      input.inputHash,
      input.roaster,
      input.language,
      heckle.deleteToken,
      input.ipHash,
      now,
      now,
    );
  return heckle;
}

export function getHeckleBySlug(slug: string) {
  const row = db().prepare("SELECT * FROM heckles WHERE slug = ?").get(slug) as Row | undefined;
  return row ? fromRow(row) : null;
}

export function getHeckle(id: string) {
  const row = db().prepare("SELECT * FROM heckles WHERE id = ?").get(id) as Row | undefined;
  return row ? fromRow(row) : null;
}

// A finished roast of the same input, roaster and language from the last day.
export function findCached(inputHash: string, roaster: string, language: string) {
  const row = db()
    .prepare(
      `SELECT * FROM heckles WHERE input_hash = ? AND roaster = ? AND language = ?
         AND status = 'done' AND created_at > ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(inputHash, roaster, language, Date.now() - 24 * 3600_000) as Row | undefined;
  return row ? fromRow(row) : null;
}

export function countRecentByIp(ipHash: string, sinceMs: number) {
  const r = db()
    .prepare("SELECT COUNT(*) AS n FROM heckles WHERE ip_hash = ? AND created_at > ?")
    .get(ipHash, Date.now() - sinceMs) as { n: number };
  return r.n;
}

export function countSince(sinceMs: number) {
  const r = db()
    .prepare("SELECT COUNT(*) AS n FROM heckles WHERE created_at > ?")
    .get(Date.now() - sinceMs) as { n: number };
  return r.n;
}

type Patch = Partial<{
  status: Status;
  error: string | null;
  input_data: string;
  script: string;
  score: number;
  image_path: string;
  image_width: number;
  image_height: number;
  audio_path: string;
  timestamps: string;
  analysis: string;
}>;

export function updateHeckle(id: string, patch: Patch) {
  const keys = Object.keys(patch) as (keyof Patch)[];
  if (!keys.length) return;
  const sets = keys.map((k) => `${k} = @${k}`).join(", ");
  db()
    .prepare(`UPDATE heckles SET ${sets}, updated_at = @updated_at WHERE id = @id`)
    .run({ ...patch, updated_at: Date.now(), id });
}

// Takes the oldest queued heckle and marks it as started, in one statement so
// two workers can never pick up the same row.
export function claimNext() {
  const row = db()
    .prepare(
      `UPDATE heckles SET status = 'ingesting', updated_at = ?
       WHERE id = (SELECT id FROM heckles WHERE status = 'queued' ORDER BY created_at LIMIT 1)
       RETURNING *`,
    )
    .get(Date.now()) as Row | undefined;
  return row ? fromRow(row) : null;
}

// After a restart, anything caught mid-pipeline starts over from the top.
export function requeueInterrupted() {
  db()
    .prepare(
      `UPDATE heckles SET status = 'queued', updated_at = ?
       WHERE status IN ('ingesting', 'writing', 'voicing')`,
    )
    .run(Date.now());
}

export function deleteHeckle(id: string) {
  db().prepare("DELETE FROM heckles WHERE id = ?").run(id);
}

// Heckles nobody made public are removed after 30 days, media and all.
export function expiredIds() {
  return (
    db()
      .prepare("SELECT id FROM heckles WHERE is_public = 0 AND created_at < ?")
      .all(Date.now() - 30 * 24 * 3600_000) as { id: string }[]
  ).map((r) => r.id);
}
