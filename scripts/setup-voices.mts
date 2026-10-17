// Designs each roaster's voice with Gradium Voice Design, localizes it to
// French, and creates the pronunciation dictionaries. Writes the ids to
// src/config/voices.json, which the app reads and the repo commits.
//
//   npx tsx --env-file=.env.local scripts/setup-voices.mts            # whatever is missing
//   npx tsx --env-file=.env.local scripts/setup-voices.mts --redo vc  # redesign one roaster
//
// Each voice gets an audition clip in data/auditions/ to listen to.

import fs from "node:fs";
import path from "node:path";
import { ROASTERS, type LanguageId, type RoasterId } from "../src/lib/roasters";

const BASE = "https://api.gradium.ai/api";
const KEY = process.env.GRADIUM_API_KEY;
if (!KEY) throw new Error("GRADIUM_API_KEY is not set");
const CONFIG = path.join(import.meta.dirname, "../src/config/voices.json");
const AUDITIONS = path.join(import.meta.dirname, "../data/auditions");

type Config = {
  pronunciations: Partial<Record<LanguageId, string>>;
  voices: Partial<Record<RoasterId, Partial<Record<LanguageId, string>>>>;
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

async function waitReady(embeddingId: string) {
  for (let i = 0; i < 60; i++) {
    const r = await api<{ embeddings: { ready: boolean }[] }>(
      "GET",
      `/voice-generator/embeddings?embedding_id=${embeddingId}`,
    );
    if (r.embeddings[0]?.ready) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${embeddingId} never became ready`);
}

async function audition(voiceId: string, text: string, file: string) {
  const res = await fetch(`${BASE}/post/speech/tts`, {
    method: "POST",
    headers: { "x-api-key": KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice_id: voiceId, output_format: "wav", only_audio: true }),
  });
  if (!res.ok) throw new Error(`audition: ${res.status} ${await res.text()}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

const LINES: Record<LanguageId, string> = {
  en: "Your headline says synergy twice. I've funded worse. Not recently, but I have.",
  fr: "Votre titre dit synergie deux fois. J'ai vu pire. Pas récemment, mais j'ai vu pire.",
};

// Words the voices would otherwise get wrong. Rewrites are spelled for the ear.
const RULES: Record<LanguageId, { original: string; rewrite: string; case_sensitive?: boolean }[]> = {
  en: [
    { original: "SaaS", rewrite: "sass", case_sensitive: true },
    { original: "Vercel", rewrite: "ver-sell" },
    { original: "shadcn", rewrite: "shad c n" },
    { original: "Next.js", rewrite: "next jay ess" },
    { original: "Nuxt", rewrite: "nukst" },
    { original: "Supabase", rewrite: "soopa base" },
    { original: "nginx", rewrite: "engine x" },
    { original: "GitHub", rewrite: "git hub" },
    { original: "README", rewrite: "read me" },
    { original: "CTA", rewrite: "C T A", case_sensitive: true },
    { original: "MRR", rewrite: "M R R", case_sensitive: true },
    { original: "TAM", rewrite: "tam", case_sensitive: true },
    { original: "UI", rewrite: "U I", case_sensitive: true },
    { original: "UX", rewrite: "U X", case_sensitive: true },
    { original: "Fujifilm", rewrite: "fooji film" },
    { original: "bokeh", rewrite: "boh-kay" },
    { original: "Heckled", rewrite: "heckled" },
  ],
  fr: [
    { original: "SaaS", rewrite: "sasse", case_sensitive: true },
    { original: "Vercel", rewrite: "veur-sel" },
    { original: "shadcn", rewrite: "chad cé ène" },
    { original: "CTA", rewrite: "cé té a", case_sensitive: true },
    { original: "MRR", rewrite: "èm èr èr", case_sensitive: true },
    { original: "startup", rewrite: "starteupe" },
    { original: "bokeh", rewrite: "bokè" },
  ],
};

const args = process.argv.slice(2);
const redo = args[0] === "--redo" ? args[1] : null;
const config: Config = JSON.parse(fs.readFileSync(CONFIG, "utf8"));
config.voices ??= {};
config.pronunciations ??= {};
fs.mkdirSync(AUDITIONS, { recursive: true });
const save = () => fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2) + "\n");

for (const language of ["en", "fr"] as LanguageId[]) {
  if (config.pronunciations[language]) continue;
  const dict = await api<{ uid: string }>("POST", "/pronunciations/", {
    name: `Heckled ${language}`,
    description: "Tech and camera names, said right",
    language,
    rules: RULES[language],
  });
  config.pronunciations[language] = dict.uid;
  save();
  console.log(`pronunciations ${language}: ${dict.uid}`);
}

// Custom voices are limited by the plan, so they go to every roaster in
// English first, then French. When the limit is reached the rest keep their
// flagship voice (FLAGSHIP in src/lib/roasters.ts).
let full = false;

async function convert(candidate: string, name: string, description: string) {
  try {
    const voice = await api<{ uid: string }>("POST", "/voices/from-embedding", {
      voxium_embedding_id: candidate,
      name,
      description,
    });
    return voice.uid;
  } catch (err) {
    if (String(err).includes("Custom voice limit")) {
      full = true;
      console.log(`Custom voice limit reached; ${name} keeps its flagship voice.`);
      await api("DELETE", `/voice-generator/embeddings/${candidate}`).catch(() => {});
      return null;
    }
    throw err;
  }
}

if (redo) {
  const slot = config.voices[redo as RoasterId];
  if (slot) for (const language of ["en", "fr"] as LanguageId[]) {
    if (slot[language]) await api("DELETE", `/voices/${slot[language]}`).catch(() => {});
    delete slot[language];
  }
  save();
}

for (const roaster of ROASTERS) {
  const slot = (config.voices[roaster.id] ??= {});
  if (slot.en || full) continue;
  const gen = await api<{ embeddings: { embedding_id: string }[] }>("POST", "/voice-generator/generate", {
    prompt: roaster.voicePrompt,
    language: "en",
    n_samples: 1,
  });
  const candidate = gen.embeddings[0].embedding_id;
  await waitReady(candidate);
  const uid = await convert(candidate, `Heckled: ${roaster.name}`, roaster.tagline);
  if (uid) {
    slot.en = uid;
    save();
    console.log(`${roaster.id} en: ${uid}`);
  }
}

for (const roaster of ROASTERS) {
  const slot = config.voices[roaster.id] ?? {};
  if (slot.fr || !slot.en || full) continue;
  // The same speaker, now speaking French with a Paris accent.
  const loc = await api<{ embeddings: { embedding_id: string }[] }>("POST", "/voice-generator/localize", {
    src_voice: slot.en,
    target_language: "fr",
    accent: "General French",
    gender: roaster.voiceGender,
    n_samples: 1,
  });
  const candidate = loc.embeddings[0].embedding_id;
  await waitReady(candidate);
  const uid = await convert(candidate, `Heckled: ${roaster.name} (FR)`, roaster.tagline);
  if (uid) {
    slot.fr = uid;
    save();
    console.log(`${roaster.id} fr: ${uid}`);
  }
}

for (const roaster of ROASTERS) {
  for (const language of ["en", "fr"] as LanguageId[]) {
    const id = config.voices[roaster.id]?.[language];
    const file = path.join(AUDITIONS, `${roaster.id}-${language}.wav`);
    if (id && (!fs.existsSync(file) || redo === roaster.id)) await audition(id, LINES[language], file);
  }
}

console.log(`Done. Listen in ${AUDITIONS}`);
