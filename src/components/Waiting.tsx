"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STEPS = [
  ["queued", "Waiting for the stage"],
  ["ingesting", "Squinting at your hero section"],
  ["writing", "Writing material. Some of it is mean"],
  ["voicing", "Warming up the voice"],
] as const;

// Listens for status changes over SSE (polling if that drops) and refreshes
// the page once the roast is ready, or once it isn't going to be.
export function Waiting({ slug, initial }: { slug: string; initial: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    let done = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    const update = (s: string) => {
      setStatus(s);
      if (!STEPS.some(([k]) => k === s) && !done) {
        done = true;
        router.refresh();
      }
    };
    const source = new EventSource(`/api/heckles/${slug}/events`);
    source.onmessage = (e) => update(JSON.parse(e.data).status);
    source.onerror = () => {
      source.close();
      if (done || poll) return;
      poll = setInterval(async () => {
        const r = await fetch(`/api/heckles/${slug}`).then((r) => r.json()).catch(() => null);
        if (r?.status) update(r.status);
      }, 1500);
    };
    return () => {
      source.close();
      clearInterval(poll);
    };
  }, [slug, router]);

  const step = Math.max(0, STEPS.findIndex(([k]) => k === status));
  return (
    <div className="rounded-xl border border-line bg-raised px-6 py-12 sm:px-10">
      <ol className="space-y-4" role="status">
        {STEPS.map(([key, text], i) => (
          <li key={key} className={`flex items-center gap-4 transition-opacity duration-500 ${i > step ? "opacity-35" : ""}`}>
            <span className="grid size-6 shrink-0 place-items-center">
              {i < step ? (
                <svg viewBox="0 0 24 24" className="pop size-5 text-ok" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : i === step ? (
                <span className="eq text-accent">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                <span className="size-1.5 rounded-full bg-faint" />
              )}
            </span>
            <span className={`text-lg ${i === step ? "text-ink" : "text-body"}`}>
              {text}
              {i === step && <span className="animate-pulse">…</span>}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-8 font-mono text-xs text-faint">Usually about forty seconds. Stay for the show.</p>
    </div>
  );
}
