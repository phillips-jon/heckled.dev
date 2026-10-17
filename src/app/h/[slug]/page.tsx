import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CountUp } from "@/components/CountUp";
import { Player } from "@/components/Player";
import { Portrait } from "@/components/Portraits";
import { RemoveButton } from "@/components/RemoveButton";
import { ShareBar } from "@/components/ShareBar";
import { Waiting } from "@/components/Waiting";
import { getHeckleBySlug, IN_PROGRESS, type Box } from "@/lib/heckles";
import { getRoaster } from "@/lib/roasters";

const SITE = process.env.SITE_URL || "https://heckled.dev";

function hostOf(url: string | null) {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

export async function generateMetadata({ params }: PageProps<"/h/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  await connection();
  const h = getHeckleBySlug(slug);
  if (!h) return { robots: { index: false } };
  const title = `${hostOf(h.sourceUrl)} ${h.score != null ? `${h.score}/10` : ""}`.trim();
  const description = h.script?.top_burn ?? "A voiced roast of a landing page, with one real fix.";
  return {
    title,
    description,
    // Roasts are shared by link, not found by search.
    robots: { index: false, follow: true },
    openGraph: { title: `${title} · Heckled`, description, type: "article" },
    twitter: { card: "summary_large_image", title: `${title} · Heckled`, description },
  };
}

export default function HecklePage({ params }: PageProps<"/h/[slug]">) {
  return (
    <div className="px-5 pt-12 sm:px-14 sm:pt-16">
      <Suspense fallback={<div className="aspect-[16/10] animate-pulse rounded-xl border border-line bg-raised" />}>
        <Heckle params={params} />
      </Suspense>
    </div>
  );
}

function Row({ label, children, accent }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="reveal grid gap-3 border-t border-line py-7 sm:grid-cols-[150px_1fr] sm:gap-10">
      <p className={`label pt-1 ${accent ? "!text-accent" : ""}`}>{label}</p>
      <div>{children}</div>
    </div>
  );
}

async function Heckle({ params }: Pick<PageProps<"/h/[slug]">, "params">) {
  const { slug } = await params;
  await connection();
  const h = getHeckleBySlug(slug);
  if (!h) notFound();
  const roaster = getRoaster(h.roaster)!;
  const host = hostOf(h.sourceUrl);

  const heading = (
    <div className="mb-8 flex items-center gap-4">
      <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-line bg-raised">
        <Portrait id={roaster.id} className="size-[52px]" />
      </div>
      <h1 className="text-[clamp(1.5rem,3.4vw,2.1rem)] leading-tight font-normal tracking-[-0.01em] text-balance">
        <b className="font-semibold break-all">{host}</b>, roasted by {roaster.name}.
      </h1>
    </div>
  );

  if (IN_PROGRESS.includes(h.status)) {
    return (
      <>
        {heading}
        <Waiting slug={h.slug} initial={h.status} />
      </>
    );
  }

  if (h.status !== "done" || !h.script || !h.timeline || !h.audioPath || !h.imagePath || !h.input) {
    return (
      <>
        {heading}
        <div className="rounded-xl border border-line bg-raised px-6 py-16 text-center">
          <p className="text-2xl font-semibold">{h.status === "rejected" ? "We don't roast that." : "That one didn't make it to the stage."}</p>
          {h.error && <p className="mx-auto mt-3 max-w-md text-muted">{h.error}</p>}
          <Link href="/" className="mt-8 inline-flex h-10 items-center rounded-lg bg-accent px-5 font-semibold text-accent-ink no-underline">
            Try another page
          </Link>
        </div>
      </>
    );
  }

  const boxes: Record<string, Box> = Object.fromEntries(h.input.elements.map((e) => [e.key, e.box]));
  const shareUrl = `${SITE}/h/${h.slug}`;

  return (
    <>
      {heading}
      <Player
        sourceUrl={h.input.finalUrl}
        audioSrc={`/media/${h.audioPath}`}
        imageSrc={`/media/${h.imagePath}`}
        imageWidth={h.imageWidth ?? 1280}
        imageHeight={h.imageHeight ?? 800}
        boxes={boxes}
        timeline={h.timeline}
        roaster={roaster.id}
        roasterName={roaster.name}
      />

      <div className="mt-12">
        <Row label="Score">
          <p className="leading-none">
            <CountUp value={h.script.score} className="text-7xl font-semibold tracking-tight text-accent tabular-nums" />
            <span className="ml-1 text-2xl text-muted">/10</span>
          </p>
        </Row>
        <Row label="The line">
          <blockquote className="max-w-[26em] text-[clamp(1.4rem,3vw,1.9rem)] leading-snug tracking-[-0.01em] text-balance">
            “{h.script.top_burn}”
          </blockquote>
        </Row>
        <Row label="One real fix" accent>
          <p className="max-w-2xl text-lg leading-relaxed text-ink text-pretty">{h.script.fix}</p>
        </Row>
        <Row label="Share">
          {/* The card people see when the link is posted, with its own download. */}
          <figure className="group mb-6 max-w-[600px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/h/${h.slug}/opengraph-image`}
              alt={`Share card: ${host}, ${h.script.score} out of 10`}
              width={1200}
              height={630}
              className="w-full rounded-xl border border-line-strong shadow-2xl shadow-black/30 transition-transform duration-500 group-hover:-rotate-1"
            />
            <figcaption className="mt-3 flex items-center justify-between gap-4 text-sm text-muted">
              <span>This is what shows up when you post the link.</span>
              <a
                href={`/h/${h.slug}/opengraph-image`}
                download={`heckled-${host || h.slug}.png`}
                className="shrink-0 text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
                data-runlight="Share: download card"
              >
                Download card ↓
              </a>
            </figcaption>
          </figure>
          <ShareBar url={shareUrl} text={`“${h.script.top_burn}” I got heckled.`} />
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/"
              className="group text-[15px] text-ink underline decoration-line-strong underline-offset-[5px] hover:decoration-ink"
              data-runlight="Heckle your own"
            >
              Heckle your own page <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
            <RemoveButton slug={h.slug} />
          </div>
        </Row>
      </div>
    </>
  );
}
