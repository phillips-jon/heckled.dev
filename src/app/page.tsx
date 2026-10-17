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
          <h1 className="rise max-w-[12em] text-[clamp(2.6rem,6.4vw,4.4rem)] leading-[1] font-bold tracking-[-0.035em] text-balance">
            Your landing page walks on <span className="text-accent">stage.</span>{" "}
            <span className="text-muted">Four hecklers are waiting, and they&apos;ve read every word.</span>
          </h1>
          <p className="rise mt-7 max-w-[34em] text-[17px] leading-relaxed text-body [animation-delay:80ms]">
            Pick a heckler, hand over your URL, and try not to take it personally. You get about ninety seconds of material on
            what&apos;s actually on your page, voiced by{" "}
            <a href="https://gradium.ai" className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
              Gradium
            </a>
            . Then the real review: what to fix, in what order, and a prompt you can hand straight to your AI.
          </p>
        </div>
        <div className="rise hidden sm:block [animation-delay:160ms]">
          <HeroScene />
        </div>
      </section>

      <section id="roasters" className="rise scroll-mt-8 px-5 pt-6 pb-20 sm:px-14 [animation-delay:240ms]">
        <HeckleStudio roasters={ROASTERS.map((r) => ({ id: r.id, name: r.name, tagline: r.tagline, bio: r.bio, pronoun: r.pronoun }))} />
      </section>

      <Section id="how" label="How it works" title="From URL to public humiliation in about a minute.">
        <ol className="border-t border-line">
          {[
            [
              "We read it. All of it.",
              "A real browser loads your page and takes notes on everything: the headline you rewrote nine times, the button that just says “Learn more”, the pricing you hid three scrolls down.",
            ],
            [
              "We write the set.",
              "Claude studies your screenshot like it owes it money, then writes eight jokes about what’s really there, a score you’ll pretend not to care about, the line your friends will quote back at you, and one fix that genuinely helps.",
            ],
            [
              "We say it out loud.",
              "Gradium gives your heckler a voice, the captions keep up word for word, and a spotlight follows every joke to the exact thing it’s about. There’s nowhere to hide. That’s the point.",
            ],
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
          Your headline is fair game. Your face isn&apos;t. No jokes about looks, bodies, names, or anything you can&apos;t
          fix with a deploy, and no swearing: the material doesn&apos;t need it. Adult, hateful, or shady pages get a polite
          no. We only look at public pages, and if you&apos;d rather it never happened, every roast has a remove link.
        </p>
      </Section>
    </>
  );
}
