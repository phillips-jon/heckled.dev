import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { Beat, Script, Timeline, Word } from "./heckles";
import { getRoaster, voiceFor, type LanguageId, type RoasterId } from "./roasters";

const run = promisify(execFile);
const TTS_URL = "https://api.gradium.ai/api/post/speech/tts";
// Silence between beats, so the jokes land.
const GAP_S = 0.45;
// Gradium allows two TTS sessions at once for the whole account, so every
// heckle in this process shares two slots.
const SLOTS = Number(process.env.GRADIUM_CONCURRENCY || 2);

const g = globalThis as unknown as { __heckledTts?: { active: number; waiting: (() => void)[] } };
const tts = (g.__heckledTts ??= { active: 0, waiting: [] });

async function withSlot<T>(fn: () => Promise<T>) {
  while (tts.active >= SLOTS) await new Promise<void>((r) => tts.waiting.push(r));
  tts.active++;
  try {
    return await fn();
  } finally {
    tts.active--;
    tts.waiting.shift()?.();
  }
}

type Segment = { text: string; start: number; end: number };

// One TTS call. The JSON stream interleaves base64 Ogg Opus pages with text
// segments that carry start and stop times; the pages concatenate into one file.
async function speak(text: string, voiceId: string, pronunciationId: string | null, pace: number) {
  // Another process (a deploy check, a script) can hold a session too, so a
  // concurrency refusal waits and tries again rather than failing the roast.
  for (let attempt = 0; ; attempt++) {
    try {
      return await withSlot(() => speakOnce(text, voiceId, pronunciationId, pace));
    } catch (err) {
      if (attempt >= 5 || !String(err).includes("Concurrency limit")) throw err;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

async function speakOnce(text: string, voiceId: string, pronunciationId: string | null, pace: number) {
  const res = await fetch(TTS_URL, {
    method: "POST",
    headers: { "x-api-key": process.env.GRADIUM_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      output_format: "opus",
      model_name: "default",
      json_config: { padding_bonus: pace },
      ...(pronunciationId ? { pronunciation_id: pronunciationId } : {}),
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Gradium answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const audio: Buffer[] = [];
  const segments: Segment[] = [];
  for (const line of (await res.text()).split("\n")) {
    if (!line.trim()) continue;
    const msg = JSON.parse(line);
    if (msg.type === "audio") audio.push(Buffer.from(msg.audio, "base64"));
    else if (msg.type === "text") segments.push({ text: msg.text, start: msg.start_s, end: msg.stop_s });
    else if (msg.type === "error") throw new Error(`Gradium: ${msg.message || JSON.stringify(msg)}`);
  }
  if (!audio.length) throw new Error("Gradium returned no audio");
  return { audio: Buffer.concat(audio), segments };
}

// Timestamps describe the text as Gradium spoke it, after the pronunciation
// dictionary and number rewriting ("SaaS" becomes "sass"), and a segment can
// hold several words. Subtitles show the script as written, so each written
// word is placed on the spoken timeline by its position in the text.
function placeWords(text: string, segments: Segment[], offset: number): Word[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!segments.length) return [];
  const spoken: { from: number; to: number; start: number; end: number }[] = [];
  const total = segments.reduce((n, s) => n + s.text.length + 1, 0);
  let pos = 0;
  for (const s of segments) {
    spoken.push({ from: pos / total, to: (pos + s.text.length + 1) / total, start: s.start, end: s.end });
    pos += s.text.length + 1;
  }
  const at = (fraction: number) => {
    const s = spoken.find((x) => fraction <= x.to) ?? spoken[spoken.length - 1];
    const within = s.to > s.from ? (fraction - s.from) / (s.to - s.from) : 0;
    return s.start + Math.min(1, Math.max(0, within)) * (s.end - s.start);
  };
  const chars = words.reduce((n, w) => n + w.length + 1, 0);
  let c = 0;
  return words.map((w) => {
    const s = at(c / chars);
    c += w.length + 1;
    const e = at(c / chars);
    return { w, s: round(offset + s), e: round(offset + e) };
  });
}

const round = (n: number) => Math.round(n * 1000) / 1000;

// Gradium bills a credit per character spoken, about 1,200 for a full set.
// New heckles stop being accepted below this many, so a roast never runs out
// of voice halfway through.
const CREDIT_FLOOR = Number(process.env.GRADIUM_CREDIT_FLOOR || 5000);
const credits = (globalThis as unknown as { __heckledCredits?: { at: number; remaining: number } });

export async function hasVoiceCredits() {
  const hit = credits.__heckledCredits;
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.remaining > CREDIT_FLOOR;
  try {
    const res = await fetch("https://api.gradium.ai/api/usages/credits", {
      headers: { "x-api-key": process.env.GRADIUM_API_KEY! },
      signal: AbortSignal.timeout(5000),
    });
    const { remaining_credits } = (await res.json()) as { remaining_credits: number };
    credits.__heckledCredits = { at: Date.now(), remaining: remaining_credits };
    if (remaining_credits <= CREDIT_FLOOR) console.warn(`[heckled] Gradium credits low: ${remaining_credits}`);
    return remaining_credits > CREDIT_FLOOR;
  } catch {
    // If the balance can't be read, don't block the show over it.
    return true;
  }
}

const TARGET = "I=-16:TP=-1.5:LRA=11";

export async function normalize(input: string, output: string) {
  const { stderr } = await run("ffmpeg", ["-hide_banner", "-i", input, "-af", `loudnorm=${TARGET}:print_format=json`, "-f", "null", "-"]);
  const m = JSON.parse(stderr.slice(stderr.lastIndexOf("{"), stderr.lastIndexOf("}") + 1));
  const measured = `measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  await run("ffmpeg", ["-y", "-loglevel", "error", "-i", input, "-af", `loudnorm=${TARGET}:${measured}`, "-ar", "48000", "-ac", "1", "-b:a", "96k", output]);
}

async function duration(file: string) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return parseFloat(stdout);
}

// The script marks comic pauses with [beat]: the voice waits there, and the
// captions just leave it out.
const PAUSE = /\s*\[beat\]\s*/gi;
const spoken = (text: string) => text.replace(PAUSE, ' <break time="0.6s" /> ').trim();
const shown = (text: string) => text.replace(PAUSE, " ").replace(/\s+/g, " ").trim();

function beatsOf(script: Script, language: LanguageId) {
  const score = language === "fr" ? String(script.score).replace(".", ",") : String(script.score);
  const beats: Omit<Beat, "start" | "end" | "words">[] = [
    { kind: "intro", text: script.intro, targets: [] },
    ...script.lines.map((l) => ({ kind: "line" as const, text: l.text, targets: l.targets })),
    {
      kind: "score",
      text: language === "fr" ? `Je lui donne ${score} sur dix.` : `I'm giving it a ${score} out of ten.`,
      targets: [],
    },
    { kind: "fix", text: (language === "fr" ? "Le vrai conseil : " : "One real fix. ") + script.fix, targets: [] },
  ];
  return beats;
}

// Speaks every beat (several at once), then joins them into one MP3 with a
// short pause between beats. Returns the timeline the player syncs to.
export async function perform(script: Script, roaster: RoasterId, language: LanguageId, outFile: string) {
  const { voiceId, pronunciationId } = voiceFor(roaster, language);
  const pace = getRoaster(roaster)?.pace ?? 0;
  const beats = beatsOf(script, language);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "heckled-"));
  try {
    const results: { file: string; segments: Segment[] }[] = new Array(beats.length);
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(SLOTS, beats.length) }, async () => {
        while (next < beats.length) {
          const i = next++;
          const { audio, segments } = await speak(spoken(beats[i].text), voiceId, pronunciationId, pace);
          const file = path.join(dir, `${i}.ogg`);
          await fs.writeFile(file, audio);
          results[i] = { file, segments };
        }
      }),
    );

    const timeline: Beat[] = [];
    let t = 0;
    for (let i = 0; i < beats.length; i++) {
      const d = await duration(results[i].file);
      const text = shown(beats[i].text);
      timeline.push({ ...beats[i], text, start: round(t), end: round(t + d), words: placeWords(text, results[i].segments, t) });
      t += d + GAP_S;
    }

    const inputs = results.flatMap((r) => ["-i", r.file]);
    const pads = results.map((_, i) => `[${i}:a]aresample=48000,apad=pad_dur=${i < results.length - 1 ? GAP_S : 0}[a${i}]`);
    const filter = `${pads.join(";")};${results.map((_, i) => `[a${i}]`).join("")}concat=n=${results.length}:v=0:a=1[out]`;
    await fs.mkdir(path.dirname(outFile), { recursive: true });
    // Designed voices come out at very different levels (the VC is quiet), so
    // every roast is normalized to the same loudness, -16 LUFS, the usual
    // target for speech on the web: one pass to measure, one to apply.
    const joined = path.join(dir, "joined.wav");
    await run("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filter, "-map", "[out]", "-ac", "1", joined]);
    await fs.mkdir(path.dirname(outFile), { recursive: true });
    await normalize(joined, outFile);

    return { duration: round(await duration(outFile)), beats: timeline } satisfies Timeline;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
