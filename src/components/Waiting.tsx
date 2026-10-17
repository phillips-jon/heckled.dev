"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Box } from "@/lib/heckles";
import type { RoasterId } from "@/lib/roasters";
import { Portrait } from "./Portraits";

const STEPS = [
  ["queued", "Your heckler is warming up"],
  ["ingesting", "Reading every word. Yes, even the footer"],
  ["writing", "Writing material. Some of it lands"],
  ["voicing", "Clearing throat. Adjusting mic"],
] as const;

type Found = { kind: string; text: string; box: Box };
type Page = { image: string; height: number; elements: Found[] };

const SHRUGS = ["Interesting.", "Bold.", "Sure.", "Brave.", "Okay then.", "Hmm."];

// What the heckler scribbles as each thing on the page gets found.
function note(e: Found, i: number) {
  const t = e.text.length > 60 ? e.text.slice(0, 58) + "…" : e.text;
  switch (e.kind) {
    case "headline":
      return [`“${t}”`, "Noted."];
    case "subhead":
      return [`“${t}”`, "Underlined twice."];
    case "cta":
      return [`A button that says “${t}”`, SHRUGS[i % SHRUGS.length]];
    case "pricing":
      return ["Found the pricing", "Eventually."];
    case "proof":
      return ["Social proof, spotted", "Checking if it's real."];
    case "image":
      return ["A big image", "Moving on."];
    default:
      return [`“${t}”`, i % 2 ? "Circled." : "Starred, not in a good way."];
  }
}

const LABEL: Record<string, string> = {
  headline: "Headline",
  subhead: "Subhead",
  cta: "Button",
  section: "Section",
  image: "Image",
  pricing: "Pricing",
  proof: "Proof",
};

// The waiting room: the heckler on stage on one side, the page being read on
// the other, and their notes filling in underneath. Listens for status over
// SSE (polling if that drops) and refreshes once the roast is ready.
export function Waiting({
  slug,
  initial,
  roaster,
  roasterName,
  host,
}: {
  slug: string;
  initial: string;
  roaster: RoasterId;
  roasterName: string;
  host: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [page, setPage] = useState<Page | null>(null);
  const [seen, setSeen] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let done = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    const update = (s: string, p?: Page | null) => {
      setStatus(s);
      if (p) setPage((old) => old ?? p);
      if (!STEPS.some(([k]) => k === s) && !done) {
        done = true;
        router.refresh();
      }
    };
    const source = new EventSource(`/api/heckles/${slug}/events`);
    source.onmessage = (e) => {
      const d = JSON.parse(e.data);
      update(d.status, d.page);
    };
    source.onerror = () => {
      source.close();
      if (done || poll) return;
      poll = setInterval(async () => {
        const r = await fetch(`/api/heckles/${slug}`).then((r) => r.json()).catch(() => null);
        if (r?.status) update(r.status);
      }, 1500);
    };
    const clock = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      source.close();
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [slug, router]);

  // Findings appear one at a time once the page is in.
  useEffect(() => {
    if (!page) return;
    const t = setInterval(() => setSeen((n) => (n < page.elements.length ? n + 1 : n)), 1300);
    return () => clearInterval(t);
  }, [page]);

  const step = Math.max(0, STEPS.findIndex(([k]) => k === status));
  const pose = status === "voicing" || status === "writing" ? "talking" : "bob";

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[340px_1fr]">
      {/* the stage */}
      <div className="relative flex flex-col overflow-hidden rounded-xl border border-line bg-raised">
        <div className="portrait-tile relative grid aspect-square place-items-center overflow-hidden">
          <span
            className="absolute inset-0"
            style={{ background: "radial-gradient(45% 55% at 50% 30%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 72%)" }}
          />
          <div className="relative w-[78%] max-w-[260px] translate-y-[6%]">
            <Portrait id={roaster} className={`w-full ${pose}`} />
          </div>
          <span className="absolute top-4 left-4 rounded-full border border-line-strong bg-sheet/80 px-3 py-1 font-mono text-[11px] tracking-[0.12em] text-muted uppercase backdrop-blur">
            {roasterName}
          </span>
          <span className="absolute top-4 right-4 font-mono text-xs text-muted tabular-nums">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        </div>
        <div className="border-t border-line p-5">
          <p key={status} className="rise min-h-[3em] text-xl leading-snug font-semibold text-balance" role="status">
            {STEPS[step][1]}
            <span className="animate-pulse">…</span>
          </p>
          <ol className="mt-4 flex gap-1.5" aria-hidden="true">
            {STEPS.map(([k], i) => (
              <li key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className={`block h-full rounded-full bg-accent transition-transform duration-700 ${
                    i < step ? "scale-x-100" : i === step ? "animate-pulse scale-x-60" : "scale-x-0"
                  }`}
                  style={{ transformOrigin: "left" }}
                />
              </li>
            ))}
          </ol>
          <p className="mt-4 font-mono text-xs text-faint">About a minute. Don’t leave, they can tell.</p>
        </div>
      </div>

      {/* the page under inspection, and the notes */}
      <div className="flex min-w-0 flex-col gap-4">
        <Reading page={page} seen={seen} host={host} />
        <div className="rounded-xl border border-line bg-raised p-5">
          <p className="label">Heckler&apos;s notes</p>
          {page && seen > 0 ? (
            <ul className="mt-3 space-y-2.5">
              {page.elements.slice(0, seen).map((e, i) => {
                const [what, verdict] = note(e, i);
                return (
                  <li key={i} className="rise flex items-baseline gap-3 text-[15px]">
                    <span className="w-16 shrink-0 font-mono text-[10px] tracking-[0.1em] text-faint uppercase">{LABEL[e.kind] ?? e.kind}</span>
                    <span className="min-w-0 text-body">
                      {what} <span className="text-accent italic">{verdict}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-[15px] text-muted">Opening {host} in a real browser. Taking notes shortly.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// The screenshot in a browser frame, drifting down as it's read, a scan line
// sweeping it, and a red box landing on each thing that gets noted.
function Reading({ page, seen, host }: { page: Page | null; seen: number; host: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = width / 1280;
  const viewH = width * (10 / 16);
  // Follow the newest finding down the page.
  const latest = page && seen > 0 ? page.elements[seen - 1] : null;
  const maxPan = page ? Math.max(0, page.height * scale - viewH) : 0;
  const pan = latest ? Math.min(maxPan, Math.max(0, (latest.box.y + latest.box.h / 2) * scale - viewH * 0.4)) : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-line-strong bg-raised shadow-2xl shadow-black/30">
      <div className="flex items-center gap-1.5 border-b border-line px-3.5 py-2.5">
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="mx-auto max-w-[60%] truncate rounded-md border border-line bg-paper px-6 py-1 font-mono text-[11px] text-muted">{host}</span>
        <span className="w-12" />
      </div>
      <div ref={frame} className="relative aspect-[16/10] overflow-hidden bg-paper">
        {page && width > 0 ? (
          <div
            className="rise absolute top-0 left-0 transition-transform duration-1000 ease-[cubic-bezier(0.3,0.7,0.2,1)]"
            style={{ width, transform: `translateY(${-pan}px)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.image} alt="" className="block h-auto w-full" />
            <div className="absolute inset-0 bg-black/25" />
            {page.elements.slice(0, seen).map((e, i) => (
              <div
                key={i}
                className="land absolute rounded-md border-2 border-accent bg-accent/10"
                style={{ left: e.box.x * scale - 4, top: e.box.y * scale - 4, width: e.box.w * scale + 8, height: e.box.h * scale + 8 }}
              >
                <span className="absolute -top-5 left-0 rounded bg-accent px-1.5 py-px font-mono text-[9px] tracking-[0.08em] text-accent-ink uppercase">
                  {LABEL[e.kind] ?? e.kind}
                </span>
              </div>
            ))}
          </div>
        ) : (
          // Before the screenshot: a page-shaped shimmer.
          <div className="absolute inset-0 animate-pulse p-[6%]">
            <div className="h-3 w-1/4 rounded bg-line" />
            <div className="mt-[8%] h-6 w-3/4 rounded bg-line" />
            <div className="mt-3 h-6 w-1/2 rounded bg-line" />
            <div className="mt-6 h-3 w-2/3 rounded bg-line" />
            <div className="mt-6 flex gap-3">
              <div className="h-8 w-28 rounded bg-line" />
              <div className="h-8 w-28 rounded bg-line" />
            </div>
          </div>
        )}
        {/* the scan line */}
        <div className="scan pointer-events-none absolute inset-x-0 h-16" />
      </div>
    </div>
  );
}
