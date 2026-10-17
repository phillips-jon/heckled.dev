"use client";

import { useEffect, useState } from "react";
import { Portrait } from "./Portraits";

// A roast in miniature, on a loop: a made-up landing page, the spotlight
// hopping from element to element, the caption filling in word by word, and
// the score and fix waiting at the side. Pure decoration; it says what the
// product does before anyone reads a word.

type Spot = { top: string; left: string; width: string; height: string };

const BEATS: { line: string; spot: Spot }[] = [
  {
    line: "Revolutionize your workflow. Bold. Nobody has ever said that.",
    spot: { top: "22%", left: "7%", width: "62%", height: "17%" },
  },
  {
    line: "Three buttons, all saying Get started. Which one, though?",
    spot: { top: "50%", left: "7%", width: "60%", height: "11%" },
  },
  {
    line: "Trusted by teams. Which teams? The logos are all grey blobs.",
    spot: { top: "73%", left: "7%", width: "86%", height: "13%" },
  },
];

export function HeroScene() {
  const [beat, setBeat] = useState(0);
  const [words, setWords] = useState(0);
  const total = BEATS[beat].line.split(" ").length;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setWords(99);
      return;
    }
    const t = setInterval(() => {
      setWords((w) => {
        if (w < total + 6) return w + 1; // a beat of silence after the line
        setBeat((b) => (b + 1) % BEATS.length);
        return 0;
      });
    }, 220);
    return () => clearInterval(t);
  }, [total]);

  const { line, spot } = BEATS[beat];

  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[460px] select-none" aria-hidden="true">
      {/* the page being roasted */}
      <div className="bob absolute top-[6%] left-0 w-[82%] rounded-xl border border-line-strong bg-raised shadow-2xl shadow-black/50">
        <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
          <span className="size-2 rounded-full bg-line-strong" />
          <span className="size-2 rounded-full bg-line-strong" />
          <span className="size-2 rounded-full bg-line-strong" />
          <span className="ml-3 font-mono text-[10px] text-faint">yourstartup.com</span>
        </div>
        <div className="relative aspect-[4/3] p-[7%]">
          <div className="h-[6%] w-[30%] rounded-sm bg-line-strong" />
          <div className="mt-[9%] space-y-[3%]">
            <div className="h-3 w-[78%] rounded-sm bg-faint/60" />
            <div className="h-3 w-[56%] rounded-sm bg-faint/60" />
          </div>
          <div className="mt-[5%] h-2 w-[64%] rounded-sm bg-line-strong" />
          <div className="mt-[8%] flex gap-[4%]">
            <div className="h-5 w-[24%] rounded bg-faint/50" />
            <div className="h-5 w-[24%] rounded border border-faint/50" />
            <div className="h-5 w-[24%] rounded border border-faint/50" />
          </div>
          <div className="mt-[10%] flex justify-between">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 w-[14%] rounded-full bg-line-strong" />
            ))}
          </div>
          {/* the spotlight */}
          <div className="pointer-events-none absolute inset-0 bg-black/35" />
          <div
            key={beat}
            className="land absolute rounded-md border-2 border-accent bg-accent/10 transition-all duration-500 ease-[cubic-bezier(0.3,0.7,0.2,1)]"
            style={spot}
          />
        </div>
      </div>

      {/* the caption, filling in as it's said */}
      <div className="bob absolute bottom-[4%] left-[6%] w-[78%] rounded-xl border border-line-strong bg-paper/95 p-4 shadow-2xl shadow-black/60 [animation-delay:-2s]">
        <div className="flex items-center gap-2">
          <Portrait id="vc" className="size-7 rounded-full bg-raised" />
          <span className="label">The Jaded VC</span>
          <span className="eq ml-auto text-accent">
            <span />
            <span />
            <span />
            <span />
          </span>
        </div>
        <p className="mt-2.5 min-h-[2.8em] text-[15px] leading-snug">
          {line.split(" ").map((w, i) => (
            <span key={`${beat}-${i}`} className={`transition-colors duration-200 ${i < words ? "text-ink" : "text-faint/60"}`}>
              {w}{" "}
            </span>
          ))}
        </p>
      </div>

      {/* the score */}
      <div className="bob absolute top-0 right-0 rounded-xl border border-line-strong bg-paper/95 px-4 py-3 shadow-2xl shadow-black/60 [animation-delay:-4s]">
        <p className="label">Score</p>
        <p className="mt-1 leading-none">
          <span className="text-4xl font-semibold text-accent tabular-nums">4.2</span>
          <span className="ml-0.5 text-sm text-muted">/10</span>
        </p>
      </div>

      {/* and the fix */}
      <div className="bob absolute right-0 bottom-[30%] w-[44%] rounded-xl border border-line-strong bg-paper/95 px-4 py-3 shadow-2xl shadow-black/60 [animation-delay:-1s]">
        <p className="label text-accent">One real fix</p>
        <p className="mt-1.5 text-[13px] leading-snug text-body">Say what it does in the headline. Keep one button.</p>
      </div>
    </div>
  );
}
