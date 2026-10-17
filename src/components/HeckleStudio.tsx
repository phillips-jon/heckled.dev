"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { LanguageId, RoasterId } from "@/lib/roasters";
import { track } from "@/lib/track";
import { Portrait } from "./Portraits";

type Roaster = { id: RoasterId; name: string; tagline: string; bio: string; pronoun: "her" | "him" };

const ERRORS: Record<string, string> = {
  url: "That doesn't look like a public web address.",
  rate: "You've been heckled enough for one hour. Come back soon.",
  busy: "Heckled is out of material for today. Come back tomorrow.",
  generic: "Something went wrong backstage. Try again.",
};

function Eq() {
  return (
    <span className="eq">
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

// The whole ask, in order: pick who roasts you (and hear them first), then
// hand over the page.
export function HeckleStudio({ roasters }: { roasters: Roaster[] }) {
  const router = useRouter();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [roaster, setRoaster] = useState<RoasterId>("vc");
  const [playing, setPlaying] = useState<RoasterId | null>(null);
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState<LanguageId>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function play(id: RoasterId) {
    audio.current?.pause();
    if (playing === id) return setPlaying(null);
    const a = new Audio(`/samples/${id}.mp3`);
    a.onended = () => setPlaying(null);
    audio.current = a;
    void a.play();
    setPlaying(id);
    setRoaster(id);
    track(`Sample: ${id}`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    audio.current?.pause();
    try {
      const res = await fetch("/api/heckles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, roaster, language }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "generic");
      if (data.deleteToken) {
        try {
          localStorage.setItem(`heckled:delete:${data.slug}`, data.deleteToken);
        } catch {}
      }
      track("Heckle submitted");
      router.push(data.path);
    } catch (err) {
      setError(ERRORS[(err as Error).message] ?? ERRORS.generic);
      setBusy(false);
    }
  }

  const chosen = roasters.find((r) => r.id === roaster)!;
  const host = url.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "") || "your page";

  return (
    <form id="heckle" onSubmit={submit}>
      {busy && <Curtain roaster={chosen} host={host} />}
      <fieldset>
        <legend className="label mb-4 flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-full border border-line-strong text-[10px] text-ink">1</span>
          Pick your heckler
        </legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roasters.map((r) => {
            const on = roaster === r.id;
            const talking = playing === r.id;
            return (
              <label
                key={r.id}
                // A click on the card would focus its hidden radio, and the
                // browser scrolls to whatever it focuses. Select it here and
                // focus without scrolling instead.
                onClick={(e) => {
                  e.preventDefault();
                  setRoaster(r.id);
                  e.currentTarget.querySelector("input")?.focus({ preventScroll: true });
                }}
                className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-raised transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                  on ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-line hover:border-line-strong"
                }`}
              >
                <input type="radio" name="roaster" value={r.id} checked={on} onChange={() => setRoaster(r.id)} className="sr-only" />
                <div className="portrait-tile relative grid aspect-square place-items-center overflow-hidden border-b border-line">
                  <span
                    className={`absolute inset-0 transition-opacity duration-500 ${on || talking ? "opacity-100" : "opacity-0 group-hover:opacity-70"}`}
                    style={{ background: "radial-gradient(55% 55% at 50% 35%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 72%)" }}
                  />
                  <Portrait
                    id={r.id}
                    className={`relative size-[84%] translate-y-[8%] transition-transform duration-500 ease-[cubic-bezier(0.3,0.7,0.2,1)] group-hover:scale-[1.04] ${talking ? "talking" : ""}`}
                  />
                  {on && (
                    <span className="pop absolute top-3 left-3 grid size-7 place-items-center rounded-full bg-accent text-accent-ink">
                      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      play(r.id);
                    }}
                    className={`absolute top-3 right-3 inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] backdrop-blur transition-all duration-300 active:scale-95 ${
                      talking ? "border-accent bg-accent text-accent-ink" : "border-line-strong bg-sheet/80 text-ink hover:border-ink"
                    }`}
                    aria-label={talking ? `Stop ${r.name}` : `Hear ${r.name}`}
                  >
                    {talking ? (
                      <Eq />
                    ) : (
                      <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                    {talking ? "Stop" : `Hear ${r.pronoun}`}
                  </button>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-xl font-semibold tracking-tight">{r.name}</h3>
                  <p className="text-muted italic">“{r.tagline}”</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-body text-pretty">{r.bio}</p>
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-12">
        <p className="label mb-4 flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-full border border-line-strong text-[10px] text-ink">2</span>
          Hand over the URL
        </p>
        <label htmlFor="url" className="sr-only">
          Your landing page
        </label>
        <div className="flex max-w-[680px] items-center rounded-xl border border-line-strong bg-paper p-1.5 pl-4 transition-colors focus-within:border-accent">
          <input
            id="url"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="off"
            spellCheck={false}
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yourstartup.com"
            className="h-11 w-full min-w-0 bg-transparent font-mono text-base text-ink placeholder:text-faint focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="group inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-accent pr-4 pl-2 text-[15px] font-semibold text-accent-ink transition hover:brightness-110 active:scale-[0.97] disabled:opacity-80"
          >
            <Portrait id={roaster} className={`size-8 rounded-md bg-accent-ink/10 transition-transform ${busy ? "talking" : "group-hover:-rotate-6"}`} />
            {busy ? (
              <>
                Taking the stage <Eq />
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Heckle it with {chosen.name.replace(/^The /, "the ")}</span>
                <span className="sm:hidden">Heckle it</span>
                <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
              </>
            )}
          </button>
        </div>
        {error && (
          <p role="alert" className="pop mt-3 text-sm text-bad">
            {error}
          </p>
        )}
        <fieldset className="mt-4 flex items-center gap-2">
          <legend className="sr-only">Roast language</legend>
          <span className="label mr-1" aria-hidden="true">
            Roast in
          </span>
          {(
            [
              ["en", "English"],
              ["fr", "French"],
            ] as [LanguageId, string][]
          ).map(([id, name]) => (
            <label
              key={id}
              className={`inline-flex h-8 cursor-pointer items-center rounded-full border px-3 font-mono text-[11px] tracking-[0.1em] uppercase transition-all duration-200 active:scale-95 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                language === id ? "border-ink text-ink" : "border-line-strong text-muted hover:border-faint hover:text-body"
              }`}
            >
              <input type="radio" name="language" value={id} checked={language === id} onChange={() => setLanguage(id)} className="sr-only" />
              {name}
            </label>
          ))}
        </fieldset>
      </div>
    </form>
  );
}

// The moment after "Heckle it": a curtain drops over the page with the
// heckler under the spotlight, so there's no doubt the show is starting. It
// stays up until the roast page replaces it.
function Curtain({ roaster, host }: { roaster: Roaster; host: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-paper/85 p-6 backdrop-blur-md" role="status" aria-live="assertive">
      <div className="rise w-full max-w-md overflow-hidden rounded-2xl border border-line-strong bg-raised text-center shadow-2xl shadow-black/50">
        <div className="portrait-tile relative grid aspect-[4/3] place-items-center overflow-hidden">
          <span
            className="absolute inset-0"
            style={{ background: "radial-gradient(40% 60% at 50% 25%, color-mix(in srgb, var(--accent) 32%, transparent), transparent 72%)" }}
          />
          <Portrait id={roaster.id} className="talking relative w-[58%] translate-y-[10%]" />
        </div>
        <div className="border-t border-line px-6 py-6">
          <p className="text-xl leading-snug font-semibold text-balance">
            Sending <span className="text-accent [overflow-wrap:anywhere]">{host}</span> to {roaster.name.replace(/^The /, "the ")}
          </p>
          <p className="mt-2 text-[15px] text-muted">Booking the stage. The show starts in a second.</p>
          <div className="mt-5 h-1 overflow-hidden rounded-full bg-line">
            <div className="shimmer h-full w-1/3 rounded-full bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}
