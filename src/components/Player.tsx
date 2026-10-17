"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Box, Timeline } from "@/lib/heckles";
import type { RoasterId } from "@/lib/roasters";
import { track } from "@/lib/track";
import { Portrait } from "./Portraits";

type Props = {
  audioSrc: string;
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  boxes: Record<string, Box>;
  timeline: Timeline;
  sourceUrl: string;
  roaster: RoasterId;
  roasterName: string;
};

const labels = { play: "Play the roast", pause: "Pause", replay: "Play it again" };

// The stage shows the page through a 16:10 window, like a laptop screen, or
// a taller 4:5 one on phones, where the camera also zooms in on the target.
const NARROW = 640;

export function Player({ audioSrc, imageSrc, imageWidth, imageHeight, boxes, timeline, sourceUrl, roaster, roasterName }: Props) {
  const audio = useRef<HTMLAudioElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // timeupdate fires only a few times a second; a frame loop keeps the
  // karaoke words in step with the voice.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      if (audio.current) setTime(audio.current.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      if (ended) a.currentTime = 0;
      setEnded(false);
      void a.play();
      if (!started) track("Roast played");
      setStarted(true);
    } else {
      a.pause();
    }
  }, [ended, started]);

  // Space toggles playback when focus isn't in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || (e.target as HTMLElement).closest("input, textarea, button, a")) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const beats = timeline.beats;
  const index = beats.findLastIndex((b) => time >= b.start - 0.05);
  const beat = index >= 0 ? beats[index] : null;
  // Each thing the line mentions gets its own box. The camera frames all of
  // them when they fit on screen together, and otherwise follows the first.
  const keys = (beat?.targets ?? (beat?.target ? [beat.target] : [])).filter((k) => boxes[k]);
  const marks: Box[] = keys.map((k) => boxes[k]);
  const union = (bs: Box[]): Box => {
    const x = Math.min(...bs.map((b) => b.x));
    const y = Math.min(...bs.map((b) => b.y));
    return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y };
  };

  // The camera: centre the focus a little above the middle (the captions sit
  // at the bottom), never past the edges of the screenshot.
  const narrow = width > 0 && width < NARROW;
  const scale = width / imageWidth;
  const viewH = width * (narrow ? 5 / 4 : 10 / 16);
  const all = marks.length ? union(marks) : null;
  const focus = all && all.w * scale <= width * 0.92 && all.h * scale <= viewH * 0.6 ? all : (marks[0] ?? null);
  const zoom = focus && narrow ? Math.min(2, Math.max(1, (width * 0.9) / (focus.w * scale))) : 1;
  const s = scale * zoom;
  const clamp = (v: number, max: number) => Math.min(Math.max(0, max), Math.max(0, v));
  const panX = focus ? clamp((focus.x + focus.w / 2) * s - width / 2, imageWidth * s - width) : 0;
  const panY = focus ? clamp((focus.y + focus.h / 2) * s - viewH * 0.38, imageHeight * s - viewH) : 0;
  const pad = 6;

  return (
    <div className="overflow-hidden rounded-xl border border-line-strong bg-raised shadow-2xl shadow-black/40">
      {/* browser chrome, showing whose page this is */}
      <div className="flex items-center gap-1.5 border-b border-line px-3.5 py-2.5">
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="mx-auto max-w-[60%] truncate rounded-md border border-line bg-paper px-6 py-1 font-mono text-[11px] text-muted">
          {sourceUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </span>
        <span className="w-12" />
      </div>
      <div ref={stage} className="relative aspect-[4/5] overflow-hidden bg-paper sm:aspect-[16/10]">
        {width > 0 && (
          <div
            className="absolute top-0 left-0 origin-top-left transition-transform duration-700 ease-[cubic-bezier(0.3,0.7,0.2,1)] motion-reduce:transition-none"
            style={{ width, transform: `translate(${-panX}px, ${-panY}px) scale(${zoom})` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc} alt="" width={imageWidth} height={imageHeight} className="block h-auto w-full" />
            {/* Everything but the target dims while a line is about it. */}
            <div
              className="pointer-events-none absolute inset-0 transition-opacity duration-500"
              style={{ background: "rgba(0,0,0,0.55)", opacity: marks.length ? 1 : started ? 0.15 : 0 }}
            />
            {marks.map((m, i) => (
              <div
                key={`${index}-${keys[i]}`}
                className="land pointer-events-none absolute rounded-lg border-2 border-accent"
                style={{
                  left: m.x * scale - pad,
                  top: m.y * scale - pad,
                  width: m.w * scale + pad * 2,
                  height: m.h * scale + pad * 2,
                  background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                  animationDelay: `${i * 120}ms`,
                }}
              />
            ))}
          </div>
        )}

        {/* Captions over the stage, like a clip: spoken words in white, the
            rest waiting. */}
        {started && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent px-5 pt-16 pb-5 sm:px-8 sm:pb-7">
            <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.14em] text-white/70 uppercase">
              <Portrait id={roaster} className={`size-7 rounded-full bg-raised ${playing ? "talking" : ""}`} />
              <span className={`eq text-accent ${playing ? "" : "paused"}`} aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
              {roasterName}
            </div>
            <p className="mt-2.5 max-w-4xl text-[clamp(1.15rem,2.8vw,1.85rem)] leading-[1.18] font-semibold tracking-[-0.01em] text-balance">
              {(beat ?? beats[0]).words.map((w, i) => (
                <span key={i} className={`transition-colors duration-150 ${time >= w.s ? "text-white" : "text-white/35"}`}>
                  {w.w}{" "}
                </span>
              ))}
            </p>
          </div>
        )}

        {!playing && (
          <button
            type="button"
            onClick={toggle}
            className="group absolute inset-0 grid place-items-center bg-black/40 transition-colors hover:bg-black/30"
            aria-label={ended ? labels.replay : labels.play}
          >
            <span className="flex items-center gap-3 rounded-xl bg-accent py-3 pr-5 pl-3 text-lg font-semibold text-accent-ink shadow-2xl shadow-black/50 transition duration-300 group-hover:scale-[1.04] group-active:scale-95">
              <Portrait id={roaster} className="size-10 rounded-lg bg-accent-ink/10" />
              <svg viewBox="0 0 24 24" className="-ml-1 size-5" fill="currentColor" aria-hidden="true">
                {ended ? <path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z" /> : <path d="M8 5v14l11-7z" />}
              </svg>
              {ended ? labels.replay : labels.play}
            </span>
          </button>
        )}
      </div>

      <div className="border-t border-line px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong text-ink hover:border-ink"
            aria-label={playing ? labels.pause : labels.play}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
              {playing ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
            </svg>
          </button>
          <div
            className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-line"
            onClick={(e) => {
              const a = audio.current;
              if (!a) return;
              const r = e.currentTarget.getBoundingClientRect();
              a.currentTime = ((e.clientX - r.left) / r.width) * timeline.duration;
              setTime(a.currentTime);
            }}
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${Math.min(100, (time / timeline.duration) * 100)}%` }} />
            {beats.slice(1).map((b, i) => (
              <span key={i} className="absolute top-0 h-full w-px bg-paper" style={{ left: `${(b.start / timeline.duration) * 100}%` }} />
            ))}
          </div>
          <span className="w-10 text-right font-mono text-xs text-muted tabular-nums">
            {Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, "0")}
          </span>
        </div>
      </div>

      <audio
        ref={audio}
        src={audioSrc}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setEnded(true);
          track("Roast finished");
        }}
      />
    </div>
  );
}
