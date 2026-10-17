import { HeckleStudio } from "@/components/HeckleStudio";
import { HeroScene } from "@/components/HeroScene";
import { ROASTERS } from "@/lib/roasters";

function Section({ id, label, title, children }: { id?: string; label: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="reveal scroll-mt-8 border-t border-line px-5 pt-14 sm:px-14 sm:pt-16">
      <div className="grid gap-4 sm:grid-cols-[150px_1fr] sm:gap-10">
        <p className="label pt-1.5">{label}</p>
        <div>
          <h2 className="max-w-[24em] text-[24px] leading-tight font-semibold tracking-tight text-balance sm:text-[26px]">{title}</h2>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <section className="grid items-center gap-10 px-5 pt-14 pb-10 sm:px-14 sm:pt-20 lg:grid-cols-[1fr_420px] lg:gap-12">
        <div>
          <h1 className="rise max-w-[13em] text-[clamp(2.2rem,5.2vw,3.4rem)] leading-[1.06] font-normal tracking-[-0.025em] text-balance">
            <b className="font-semibold">Your landing page walks on stage.</b>{" "}
            <span className="text-muted">Four hecklers are waiting, and they&apos;ve read every word.</span>
          </h1>
          <p className="rise mt-7 max-w-[34em] text-[17px] leading-relaxed text-body [animation-delay:80ms]">
            Pick one and paste a URL. In under a minute you&apos;ll hear a minute of material about what&apos;s
            actually on your page, voiced by{" "}
            <a href="https://gradium.ai" className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
              Gradium
            </a>
            . Then you get the real review: what to fix, in order, and a prompt to
            hand straight to your AI.
          </p>
        </div>
        <div className="rise hidden sm:block [animation-delay:160ms]">
          <HeroScene />
        </div>
      </section>

      <section id="roasters" className="rise scroll-mt-8 px-5 pt-6 pb-20 sm:px-14 [animation-delay:240ms]">
        <HeckleStudio roasters={ROASTERS.map((r) => ({ id: r.id, name: r.name, tagline: r.tagline, bio: r.bio, pronoun: r.pronoun }))} />
      </section>

      <Section id="how" label="How it works" title="From a URL to a roast in under a minute.">
        <ol className="border-t border-line">
          {[
            ["Read", "A real browser loads your page, takes a screenshot, and notes the headline, every button, the pricing, and the social proof, with where each one sits."],
            ["Write", "Claude looks at the screenshot and writes five beats, each about one thing on the page, plus a score, the line people will quote, and one fix that actually helps."],
            ["Perform", "Gradium voices it in the roaster's designed voice, with word timestamps that drive the captions and move the spotlight to whatever is being roasted."],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-6 border-b border-line py-5">
              <span className="w-8 shrink-0 pt-0.5 font-mono text-sm text-faint">0{i + 1}</span>
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-1 max-w-xl leading-relaxed text-body text-pretty">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section label="House rules" title="We roast pages, not people.">
        <p className="max-w-xl leading-relaxed text-body text-pretty">
          No jokes about faces, bodies, names, or anything a person can&apos;t change. Pages that are adult, hateful, or
          illegal get a polite no. Only public pages are fetched, and every roast has a remove link for whoever made it.
        </p>
      </Section>
    </>
  );
}
