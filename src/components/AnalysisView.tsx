"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Analysis } from "@/lib/heckles";
import { track } from "@/lib/track";

const EFFORT: Record<string, string> = { quick: "Quick win", medium: "An afternoon", big: "A project" };

export function AnalysisView({ analysis, prompt }: { analysis: Analysis; prompt: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <p className="max-w-2xl text-lg leading-relaxed text-ink text-pretty">{analysis.summary}</p>
      <p className="mt-2 font-mono text-xs text-faint">For: {analysis.audience}</p>

      {/* a score per area */}
      <dl className="mt-8 grid gap-x-10 gap-y-5 sm:grid-cols-2">
        {analysis.scores.map((s) => (
          <div key={s.area}>
            <dt className="flex items-baseline justify-between">
              <span className="font-semibold">{s.area}</span>
              <span className="font-mono text-sm text-muted tabular-nums">{s.score}/10</span>
            </dt>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full origin-left rounded-full bg-accent transition-transform duration-1000"
                style={{ width: `${s.score * 10}%`, opacity: 0.45 + s.score / 20 }}
              />
            </div>
            <dd className="mt-2 text-[15px] leading-relaxed text-body text-pretty">{s.verdict}</dd>
          </div>
        ))}
      </dl>

      {analysis.strengths.length > 0 && (
        <div className="mt-10">
          <h3 className="label">What works</h3>
          <ul className="mt-3 space-y-2">
            {analysis.strengths.map((s) => (
              <li key={s} className="flex gap-3 text-[15px] leading-relaxed text-body">
                <svg viewBox="0 0 24 24" className="mt-1 size-4 shrink-0 text-ok" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10">
        <h3 className="label">Fix these, in this order</h3>
        <ol className="mt-3 border-t border-line">
          {analysis.priorities.map((p, i) => (
            <li key={p.title} className="flex gap-5 border-b border-line py-5">
              <span className="w-6 shrink-0 pt-0.5 font-mono text-sm text-faint">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h4 className="text-[17px] font-semibold">{p.title}</h4>
                  <span className="rounded-full border border-line-strong px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] text-muted uppercase">
                    {p.area} · {EFFORT[p.effort] ?? p.effort}
                  </span>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-body text-pretty">{p.why}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink text-pretty">
                  <span className="font-mono text-xs text-accent uppercase">Do this </span>
                  {p.how}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* the whole thing, as a prompt for the agent that built the page */}
      <div className="mt-8 rounded-xl border border-line-strong bg-raised p-5">
        <p className="font-semibold">Hand it to your AI</p>
        <p className="mt-1 text-[15px] text-body">
          The fixes as one prompt for Claude Code, Cursor, or whatever built the page. Paste it in the repo and let it work
          through the list.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(prompt);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {}
              track("Copy fix prompt");
            }}
            className="inline-flex h-10 min-w-[190px] items-center justify-center gap-2 rounded-lg bg-accent px-4 text-[15px] font-semibold text-accent-ink transition hover:brightness-110 active:scale-[0.97]"
          >
            {copied ? (
              <>
                <svg viewBox="0 0 24 24" className="pop size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                Copied
              </>
            ) : (
              "Copy prompt for your AI"
            )}
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-sm text-muted underline decoration-line-strong underline-offset-4 hover:text-ink"
            aria-expanded={open}
          >
            {open ? "Hide the prompt" : "Read it first"}
          </button>
        </div>
        {open && (
          <pre className="rise mt-4 max-h-80 overflow-auto rounded-lg border border-line bg-paper p-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-body">
            {prompt}
          </pre>
        )}
      </div>
    </div>
  );
}

// Shown for the few seconds the analysis trails the audio; refreshes the
// page when it arrives.
export function AnalysisPending({ slug }: { slug: string }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(async () => {
      const r = await fetch(`/api/heckles/${slug}`).then((r) => r.json()).catch(() => null);
      if (r?.hasAnalysis) {
        clearInterval(t);
        router.refresh();
      }
    }, 2000);
    const stop = setTimeout(() => clearInterval(t), 90_000);
    return () => {
      clearInterval(t);
      clearTimeout(stop);
    };
  }, [slug, router]);
  return (
    <p className="flex items-center gap-3 text-body">
      <span className="eq text-accent">
        <span />
        <span />
        <span />
        <span />
      </span>
      Writing up the full analysis. It'll appear here in a few seconds.
    </p>
  );
}
