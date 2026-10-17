// Audition voices before committing to one. Voice Design samples a different
// voice on every request, so instead of shipping the first one this makes a
// few, records each, and lets a person choose by ear.
//
//   npx tsx --env-file=.env.local scripts/audition.mts generate vc director   # 3 candidates each
//   open http://localhost:3015/auditions/                                    # listen (dev server)
//   npx tsx --env-file=.env.local scripts/audition.mts pick director 2       # keep candidate 2
//
// `pick` deletes the roaster's current voices, converts the chosen candidate,
// localizes it to French, writes src/config/voices.json, and records the
// homepage sample. Candidates don't use a custom-voice slot until converted.
// public/auditions/ is for local listening only and is not committed.

import fs from "node:fs";
import path from "node:path";
import { getRoaster, type RoasterId } from "../src/lib/roasters";
import { normalize } from "../src/lib/voice";

const BASE = "https://api.gradium.ai/api";
const KEY = process.env.GRADIUM_API_KEY;
if (!KEY) throw new Error("GRADIUM_API_KEY is not set");
const ROOT = path.join(import.meta.dirname, "..");
const DIR = path.join(ROOT, "public/auditions");
const CONFIG = path.join(ROOT, "src/config/voices.json");
const N = 3;

// Under 100 characters: the limit for speaking with a candidate.
const AUDITION: Record<RoasterId, string> = {
  vc: "Three tiers and no prices. Bold. So what's the moat here? Vibes?",
  bro: "Bro. Your hero section? Insane. But nobody knows what you sell.",
  director: "Three fonts, four blues, and a stock handshake. Who approved this?",
  doc: "And here, beneath the fold, the call to action. Shy. Alone.",
};

// The homepage sample, said by the converted voice.
const SAMPLE: Record<RoasterId, string> = {
  vc: "Your pricing page has three tiers and no numbers. Bold. What's the moat? Vibes?",
  bro: "Bro. Your hero section? Insane. Love it. Ten out of ten. Except nobody knows what you sell. So, zero.",
  director: "Three fonts. Four shades of blue. And a stock photo of two people shaking hands. Who approved this?",
  doc: "And here, beneath the fold, the call to action. Shy. Alone. It has not been clicked in many seasons.",
};

async function api<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + url, {
    method,
    headers: { "x-api-key": KEY!, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : ({} as T);
}

async function waitReady(id: string) {
  for (let i = 0; i < 60; i++) {
    const r = await api<{ embeddings: { ready: boolean }[] }>("GET", `/voice-generator/embeddings?embedding_id=${id}`);
    if (r.embeddings[0]?.ready) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${id} never became ready`);
}

async function speak(voiceId: string, text: string, pace: number, out: string) {
  const res = await fetch(`${BASE}/post/speech/tts`, {
    method: "POST",
    headers: { "x-api-key": KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice_id: voiceId, output_format: "wav", only_audio: true, json_config: { padding_bonus: pace } }),
  });
  if (!res.ok) throw new Error(`tts: ${res.status} ${await res.text()}`);
  const wav = out.replace(/\.mp3$/, ".wav");
  fs.writeFileSync(wav, Buffer.from(await res.arrayBuffer()));
  await normalize(wav, out);
  fs.rmSync(wav);
}

type Candidates = Record<string, string[]>;
const listFile = path.join(DIR, "candidates.json");
const readList = (): Candidates => (fs.existsSync(listFile) ? JSON.parse(fs.readFileSync(listFile, "utf8")) : {});

function writePage(list: Candidates) {
  const rows = Object.entries(list)
    .map(([id, cands]) => {
      const r = getRoaster(id)!;
      const clips = cands
        .map((_, i) => `<div class="c"><b>${i + 1}</b><audio controls preload="none" src="${id}-${i + 1}.mp3"></audio></div>`)
        .join("");
      return `<section><h2>${r.name}</h2><p>${r.voicePrompt}</p><p class="line">“${AUDITION[r.id]}”</p>${clips}</section>`;
    })
    .join("");
  fs.writeFileSync(
    path.join(DIR, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Voice auditions</title>
<style>body{font:16px/1.5 system-ui;background:#0f0f11;color:#eee;max-width:760px;margin:40px auto;padding:0 20px}
section{border-top:1px solid #333;padding:20px 0}p{color:#aaa}.line{color:#fff;font-style:italic}
.c{display:flex;gap:12px;align-items:center;margin:8px 0}b{width:20px}</style>
<h1>Voice auditions</h1><p>Pick one per roaster, then: <code>scripts/audition.mts pick &lt;roaster&gt; &lt;number&gt;</code></p>${rows}`,
  );
}

const [cmd, ...args] = process.argv.slice(2);
fs.mkdirSync(DIR, { recursive: true });

if (cmd === "generate") {
  const list = readList();
  for (const id of args) {
    const r = getRoaster(id);
    if (!r) throw new Error(`No roaster ${id}`);
    const gen = await api<{ embeddings: { embedding_id: string }[] }>("POST", "/voice-generator/generate", {
      prompt: r.voicePrompt,
      language: "en",
      n_samples: N,
    });
    const ids = gen.embeddings.map((e) => e.embedding_id);
    for (const [i, cand] of ids.entries()) {
      await waitReady(cand);
      await speak(cand, AUDITION[r.id], r.pace, path.join(DIR, `${id}-${i + 1}.mp3`));
    }
    list[id] = ids;
    console.log(`${id}: ${ids.length} candidates`);
  }
  fs.writeFileSync(listFile, JSON.stringify(list, null, 2));
  writePage(list);
  console.log("Listen at http://localhost:3015/auditions/");
} else if (cmd === "pick") {
  const [id, n] = args;
  const r = getRoaster(id);
  const cand = readList()[id]?.[Number(n) - 1];
  if (!r || !cand) throw new Error(`No candidate ${n} for ${id}`);
  const config = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
  config.voices ??= {};
  // Free the slots this roaster held. A roaster being replaced (the old French
  // Critic) is named on the command line after the number.
  for (const old of [id, ...args.slice(2)]) {
    for (const uid of Object.values(config.voices[old] ?? {}) as string[]) {
      await api("DELETE", `/voices/${uid}`).catch(() => {});
    }
    delete config.voices[old];
  }
  fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2) + "\n");

  const en = await api<{ uid: string }>("POST", "/voices/from-embedding", {
    voxium_embedding_id: cand,
    name: `Heckled: ${r.name}`,
    description: r.tagline,
  });
  const loc = await api<{ embeddings: { embedding_id: string }[] }>("POST", "/voice-generator/localize", {
    src_voice: en.uid,
    target_language: "fr",
    accent: "General French",
    gender: r.voiceGender,
    n_samples: 1,
  });
  await waitReady(loc.embeddings[0].embedding_id);
  const fr = await api<{ uid: string }>("POST", "/voices/from-embedding", {
    voxium_embedding_id: loc.embeddings[0].embedding_id,
    name: `Heckled: ${r.name} (FR)`,
    description: r.tagline,
  }).catch((e) => {
    console.log(`No French voice (${String(e).slice(0, 80)}); the flagship French voice covers it.`);
    return null;
  });
  config.voices[id] = { en: en.uid, ...(fr ? { fr: fr.uid } : {}) };
  fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2) + "\n");
  await speak(en.uid, SAMPLE[r.id], r.pace, path.join(ROOT, `public/samples/${id}.mp3`));
  console.log(`${id}: en ${en.uid}${fr ? `, fr ${fr.uid}` : ""}; sample recorded`);
} else {
  console.log("Usage: audition.mts generate <roaster...> | pick <roaster> <n> [replaced-roaster]");
}
