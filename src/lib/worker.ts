import fs from "node:fs/promises";
import path from "node:path";
import { MEDIA_DIR } from "./db";
import {
  claimNext,
  deleteHeckle,
  expiredIds,
  requeueInterrupted,
  updateHeckle,
  type Heckle,
} from "./heckles";
import { IngestError, ingestLanding } from "./landing";
import { getRoaster } from "./roasters";
import { writeLandingScript } from "./script";
import { perform } from "./voice";

// The queue is the heckles table: the worker claims the oldest queued row and
// walks it through ingest, script and voice, writing the status at each step
// for the page to show. One process, a few at a time, which is all one server
// with one browser needs.
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 2);
const POLL_MS = 1000;

const g = globalThis as unknown as { __heckledWorker?: { running: number; wake: () => void } };

export function mediaPath(id: string, file: string) {
  return path.join(/*turbopackIgnore: true*/ MEDIA_DIR, id, file);
}

async function runHeckle(h: Heckle) {
  const roaster = getRoaster(h.roaster)!;
  if (h.mode !== "landing" || !h.sourceUrl) throw new Error(`Mode ${h.mode} isn't supported yet`);

  const { input, screenshot, height } = await ingestLanding(new URL(h.sourceUrl));
  await fs.mkdir(path.join(/*turbopackIgnore: true*/ MEDIA_DIR, h.id), { recursive: true });
  await fs.writeFile(mediaPath(h.id, "screenshot.jpg"), screenshot);
  updateHeckle(h.id, {
    status: "writing",
    input_data: JSON.stringify(input),
    image_path: `${h.id}/screenshot.jpg`,
    image_width: 1280,
    image_height: height,
  });

  const result = await writeLandingScript(input, screenshot, roaster, h.language);
  if (result.refused) {
    updateHeckle(h.id, { status: "rejected", error: result.reason });
    return;
  }
  updateHeckle(h.id, { status: "voicing", script: JSON.stringify(result.script), score: result.script.score });

  const timeline = await perform(result.script, h.roaster, h.language, mediaPath(h.id, "roast.mp3"));
  updateHeckle(h.id, { status: "done", audio_path: `${h.id}/roast.mp3`, timestamps: JSON.stringify(timeline) });
}

async function loop(state: { running: number; wake: () => void }) {
  while (state.running < CONCURRENCY) {
    const h = claimNext();
    if (!h) return;
    state.running++;
    const started = Date.now();
    runHeckle(h)
      .then(() => console.log(`[heckled] ${h.slug} done in ${Date.now() - started}ms`))
      .catch((err) => {
        console.error(`[heckled] ${h.slug} failed:`, err);
        const message =
          err instanceof IngestError ? err.message : "Something broke backstage. Try again in a minute.";
        updateHeckle(h.id, { status: "failed", error: message });
      })
      .finally(() => {
        state.running--;
        state.wake();
      });
  }
}

async function sweep() {
  for (const id of expiredIds()) {
    await fs.rm(path.join(/*turbopackIgnore: true*/ MEDIA_DIR, id), { recursive: true, force: true });
    deleteHeckle(id);
  }
}

export function startWorker() {
  if (g.__heckledWorker) return;
  requeueInterrupted();
  const state = { running: 0, wake: () => void loop(state) };
  g.__heckledWorker = state;
  setInterval(state.wake, POLL_MS).unref();
  setInterval(() => void sweep().catch((e) => console.error("[heckled] sweep", e)), 3600_000).unref();
  console.log(`[heckled] worker started, ${CONCURRENCY} at a time`);
  state.wake();
}

// Called after a heckle is created so it starts without waiting for the poll.
export function wakeWorker() {
  g.__heckledWorker?.wake();
}
